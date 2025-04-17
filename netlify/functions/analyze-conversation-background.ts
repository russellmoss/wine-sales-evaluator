import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { Anthropic } from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getStorageProvider, JobStatus } from '../../app/utils/storage';
import { validateEvaluationData } from '../../app/utils/validation';
import { Rubric } from '../../app/types/rubric';
import type { EvaluationData as AppEvaluationData } from '../../app/types/evaluation';

// Timeout constants in milliseconds
const TIMEOUTS = {
  JOB_PROCESSING: 300000, // 5 minutes for entire job processing
  CLAUDE_API: 120000,     // 2 minutes for Claude API call
  STORAGE: 30000,         // 30 seconds for storage operations
  RETRY_DELAY: 1000       // 1 second delay between retries
};

// Rate limiting configuration
const RATE_LIMIT = {
  MAX_REQUESTS_PER_MINUTE: 10,
  REQUEST_WINDOW_MS: 60 * 1000, // 1 minute in milliseconds
  lastRequestTime: 0
};

/**
 * Utility function to wrap a promise with a timeout
 * @param promise The promise to wrap
 * @param timeoutMs Timeout in milliseconds
 * @param operationName Name of the operation for logging
 * @param jobId Job ID for logging context
 * @returns The result of the promise
 * @throws Error if the operation times out
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operationName: string,
  jobId: string
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`${operationName} timed out after ${timeoutMs}ms for job ${jobId}`));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
}

// Add diagnostic logging
console.log('Background function: Starting with environment:', {
  NODE_ENV: process.env.NODE_ENV,
  NETLIFY: process.env.NETLIFY,
  PWD: process.cwd(),
  dirContents: fs.existsSync('/var/task') ? fs.readdirSync('/var/task') : 'Directory not found'
});

// Add diagnostic logging for directory state
function _logDirectoryState() {
  try {
    console.log('Background function: Current directory state:', {
      cwd: process.cwd(),
      tmpDirExists: fs.existsSync('/tmp'),
      tmpDirContents: fs.existsSync('/tmp') ? fs.readdirSync('/tmp') : 'Directory not found'
    });
  } catch (error) {
    console.error('Background function: Error logging directory state:', error);
  }
}

// Ensure the jobs directory exists
const ensureJobsDir = () => {
  try {
    _logDirectoryState();
    if (!fs.existsSync('/tmp/jobs')) {
      console.log('Background function: Creating jobs directory:', '/tmp/jobs');
      fs.mkdirSync('/tmp/jobs', { recursive: true });
      console.log('Background function: Jobs directory created successfully');
      _logDirectoryState();
    }
  } catch (error) {
    console.error('Background function: Error ensuring jobs directory exists:', error);
    throw new Error(`Failed to create jobs directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Save a job to the filesystem
const saveJob = (job: JobStatus) => {
  try {
    ensureJobsDir();
    const jobPath = path.join('/tmp/jobs', `${job.id}.json`);
    console.log('Background function: Saving job to:', jobPath);
    console.log('Background function: Job data:', JSON.stringify(job, null, 2));
    fs.writeFileSync(jobPath, JSON.stringify(job, null, 2));
    
    // Verify the file was written
    if (fs.existsSync(jobPath)) {
      const fileStats = fs.statSync(jobPath);
      const fileContents = fs.readFileSync(jobPath, 'utf8');
      console.log('Background function: Job file verification:', {
        exists: true,
        size: fileStats.size,
        created: fileStats.birthtime,
        modified: fileStats.mtime,
        contents: fileContents.substring(0, 200) + '...' // Log first 200 chars
      });
    } else {
      console.error('Background function: Job file was not created successfully');
    }
  } catch (error) {
    console.error('Background function: Error saving job:', error);
    throw new Error(`Failed to save job: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Get a job by ID
const getJob = (jobId: string): JobStatus | null => {
  try {
    ensureJobsDir();
    const jobPath = path.join('/tmp/jobs', `${jobId}.json`);
    console.log('Background function: Reading job from:', jobPath);
    
    if (!fs.existsSync(jobPath)) {
      console.log('Background function: Job file not found:', jobPath);
      _logDirectoryState();
      return null;
    }
    
    const fileStats = fs.statSync(jobPath);
    console.log('Background function: Job file stats:', {
      size: fileStats.size,
      created: fileStats.birthtime,
      modified: fileStats.mtime
    });
    
    const jobData = fs.readFileSync(jobPath, 'utf8');
    const job = JSON.parse(jobData) as JobStatus;
    console.log('Background function: Successfully read job:', {
      id: job.id,
      status: job.status,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt
    });
    return job;
  } catch (error) {
    console.error(`Background function: Error reading job ${jobId}:`, error);
    _logDirectoryState();
    return null;
  }
};

// Remove the local file system functions since we're using the storage provider
const storage = getStorageProvider();

// Initialize the Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY || '',
});

// Add a function to check if we're in development mode
function _isDevelopmentMode() {
  return process.env.NODE_ENV === 'development' || process.env.NETLIFY_DEV === 'true';
}

// Embedded rubric and example evaluation
const EMBEDDED_RUBRIC = `# Wine Sales Performance Rubric

## Overview
This rubric is designed to evaluate the performance of winery tasting room staff members during guest interactions. Each criterion is scored on a scale of 1-5, with specific guidelines for each score level.

## Evaluation Criteria

### 1. Initial Greeting and Welcome (Weight: 8%)
*How effectively does the staff member welcome guests and set a positive tone?*

| Score | Description |
|-------|-------------|
| 1 | No greeting or unwelcoming approach |
| 2 | Basic greeting but minimal warmth |
| 3 | Friendly greeting but lacks personalization |
| 4 | Warm, friendly greeting with good eye contact |
| 5 | Exceptional welcome that makes guests feel valued and excited |

### 2. Building Rapport (Weight: 10%)
*How well does the staff member connect personally with the guests?*

| Score | Description |
|-------|-------------|
| 1 | No attempt to connect personally with guests |
| 2 | Minimal small talk, mostly transactional |
| 3 | Some rapport-building questions but limited follow-up |
| 4 | Good personal connection through meaningful conversation |
| 5 | Excellent rapport building, including origin questions, future plans, and genuine interest |

### 3. Winery History and Ethos (Weight: 10%)
*How effectively does the staff member communicate Milea Estate's story and values?*

| Score | Description |
|-------|-------------|
| 1 | No mention of winery history or values |
| 2 | Brief, factual mention of winery background |
| 3 | Adequate explanation of winery history and values |
| 4 | Compelling storytelling about winery history, connecting to wines |
| 5 | Passionate, engaging narrative that brings the winery ethos to life |

### 4. Storytelling and Analogies (Weight: 10%)
*How well does the staff member use storytelling and analogies to describe wines?*

| Score | Description |
|-------|-------------|
| 1 | Technical descriptions only, no storytelling or analogies |
| 2 | Minimal storytelling, mostly factual information |
| 3 | Some storytelling elements but lacking rich analogies |
| 4 | Good use of stories and analogies that help guests understand wines |
| 5 | Exceptional storytelling that creates memorable experiences and makes wine accessible |

### 5. Recognition of Buying Signals (Weight: 12%)
*How well does the staff member notice and respond to buying signals?*

| Score | Description |
|-------|-------------|
| 1 | Misses obvious buying signals completely |
| 2 | Notices some signals but response is delayed or inappropriate |
| 3 | Recognizes main buying signals with adequate response |
| 4 | Quickly identifies buying signals and responds effectively |
| 5 | Expertly recognizes subtle cues and capitalizes on buying moments |

### 6. Customer Data Capture (Weight: 8%)
*How effectively does the staff member attempt to collect customer information?*

| Score | Description |
|-------|-------------|
| 1 | No attempt to capture customer data |
| 2 | Single basic attempt at data collection |
| 3 | Multiple attempts but without explaining benefits |
| 4 | Good data capture attempts with clear value proposition |
| 5 | Natural, non-intrusive data collection that feels beneficial to guest |

### 7. Asking for the Sale (Weight: 12%)
*How effectively does the staff member ask for wine purchases?*

| Score | Description |
|-------|-------------|
| 1 | Never asks for sale or suggests purchase |
| 2 | Vague suggestion about purchasing without direct ask |
| 3 | Basic closing attempt but lacks confidence |
| 4 | Clear, confident ask for purchase at appropriate time |
| 5 | Multiple strategic closing attempts that feel natural and appropriate |

### 8. Personalized Wine Recommendations (Weight: 10%)
*How well does the staff member customize wine recommendations based on guest preferences?*

| Score | Description |
|-------|-------------|
| 1 | Generic recommendations unrelated to expressed interests |
| 2 | Basic recommendations with minimal personalization |
| 3 | Adequate recommendations based on general preferences |
| 4 | Well-tailored recommendations based on specific guest feedback |
| 5 | Expertly customized selections that perfectly match expressed interests |

### 9. Wine Club Presentation (Weight: 12%)
*How effectively does the staff member present and invite guests to join the wine club?*

| Score | Description |
|-------|-------------|
| 1 | No mention of wine club or inadequate response when asked |
| 2 | Basic wine club information without personalization |
| 3 | Adequate explanation of benefits but minimal customization |
| 4 | Good presentation of wine club with benefits tailored to guest interests |
| 5 | Compelling, personalized wine club presentation with clear invitation to join |

### 10. Closing Interaction (Weight: 8%)
*How well does the staff member conclude the interaction and encourage future visits?*

| Score | Description |
|-------|-------------|
| 1 | Abrupt ending with no thanks or future invitation |
| 2 | Basic thank you but no encouragement to return |
| 3 | Polite conclusion with general invitation to return |
| 4 | Warm thank you with specific suggestion for future visit |
| 5 | Memorable farewell that reinforces relationship and ensures future visits |

## Additional Evaluation Factors

### 11. Product Knowledge (No Weight - Observational Only)
*How well does the staff member demonstrate knowledge about wines and products?*

| Score | Description |
|-------|-------------|
| 1 | Significant gaps in product knowledge |
| 2 | Basic knowledge but unable to answer deeper questions |
| 3 | Solid understanding of core products |
| 4 | Comprehensive knowledge with ability to answer most questions |
| 5 | Expert knowledge with ability to discuss technical details |

### 12. Handling Objections (No Weight - Observational Only)
*How effectively does the staff member respond to concerns or objections?*

| Score | Description |
|-------|-------------|
| 1 | Avoids or dismisses objections |
| 2 | Acknowledges objections but provides inadequate responses |
| 3 | Addresses objections with standard responses |
| 4 | Effectively addresses objections with personalized solutions |
| 5 | Masterfully turns objections into opportunities |

## Scoring Guide

### Calculating the Final Score
1. For each criterion, assign a score from 1-5
2. Multiply each score by the criterion's weight
3. Sum all weighted scores
4. Divide by the total possible points (500) and multiply by 100 to get a percentage

### Performance Levels
* **Exceptional**: 90-100%
* **Strong**: 80-89%
* **Proficient**: 70-79%
* **Developing**: 60-69%
* **Needs Improvement**: Below 60%

## Feedback Template

\`\`\`
# Performance Evaluation Summary

## Overall Score: [X]% - [Performance Level]

### Strengths:
- [Specific positive observation 1]
- [Specific positive observation 2]
- [Specific positive observation 3]

### Areas for Improvement:
- [Specific suggestion 1]
- [Specific suggestion 2]
- [Specific suggestion 3]

### Key Recommendations:
1. [Action-oriented recommendation 1]
2. [Action-oriented recommendation 2]
3. [Action-oriented recommendation 3]
\`\`\``;

const EMBEDDED_EVALUATION_EXAMPLE = {
  "staffName": "John Smith",
  "date": "2024-03-15",
  "overallScore": 85,
  "performanceLevel": "Strong",
  "criteriaScores": [
    {
      "criterion": "Initial Greeting and Welcome",
      "weight": 8,
      "score": 4,
      "weightedScore": 32,
      "notes": "Strengths: Warm greeting with immediate eye contact and smile. Areas for Improvement: Could have used customer's name more naturally. Score Rationale: Strong greeting but room for more personalization."
    },
    {
      "criterion": "Wine Knowledge and Recommendations",
      "weight": 10,
      "score": 5,
      "weightedScore": 50,
      "notes": "Strengths: Excellent knowledge of wine regions and varietals. Areas for Improvement: Could provide more specific food pairing suggestions. Score Rationale: Demonstrated exceptional wine knowledge throughout."
    }
  ],
  "strengths": [
    "Strong wine knowledge and ability to make personalized recommendations",
    "Excellent customer engagement and active listening skills",
    "Natural sales approach that doesn't feel pushy"
  ],
  "areasForImprovement": [
    "Could use customer's name more naturally throughout the conversation",
    "More specific food pairing suggestions would enhance recommendations",
    "Follow-up plan could be more detailed"
  ],
  "keyRecommendations": [
    "Practice using customer names more naturally in conversation",
    "Develop a library of food pairing suggestions for different wines",
    "Create a structured follow-up plan template"
  ]
};

// Function to load the rubric from the markdown file
async function loadRubric(rubricId?: string): Promise<Rubric | null> {
  try {
    console.log(`Loading rubric: ${rubricId || 'default'}`);
    const storage = getStorageProvider();
    
    if (rubricId) {
      // Load the specific rubric
      const rubric = await storage.getRubric(rubricId);
      if (rubric) {
        console.log(`Found rubric: ${rubric.name}`);
        return rubric;
      }
      console.log(`Rubric not found: ${rubricId}, falling back to default`);
    }
    
    // Fall back to default rubric
    const defaultRubric = await storage.getDefaultRubric();
    if (defaultRubric) {
      console.log(`Using default rubric: ${defaultRubric.name}`);
      return defaultRubric;
    }
    
    console.log('No default rubric found');
    return null;
  } catch (error) {
    console.error('Error loading rubric:', error);
    return null;
  }
}

// Load the example evaluation with caching
const loadEvaluationExample = () => {
  console.log('Background function: Loading evaluation example, cached:', !!EMBEDDED_EVALUATION_EXAMPLE);
  
  if (EMBEDDED_EVALUATION_EXAMPLE) {
    console.log('Background function: Using cached evaluation example');
    return EMBEDDED_EVALUATION_EXAMPLE;
  }
  
  console.log('Background function: Using embedded evaluation example');
  return EMBEDDED_EVALUATION_EXAMPLE;
};

// Update the interface to extend the app type
interface EvaluationData extends AppEvaluationData {
  // Any additional fields specific to this module can be added here
}

// Helper function to process Claude's response and extract JSON
function processCloudeResponse(responseText: string): string {
  console.log('Processing Claude response to extract JSON');
  
  // First, try to clean up the response
  const cleanedText = responseText
    .replace(/```json\s*/g, '') // Remove JSON code block markers
    .replace(/```\s*/g, '')     // Remove any remaining code block markers
    .trim();                    // Remove whitespace
    
  // Log the cleaned text for debugging
  console.log('Cleaned response text:', cleanedText.substring(0, 200) + '...');
  
  // Try different patterns to extract JSON with detailed logging
  const patterns = [
    // Pattern 1: Complete JSON object
    { 
      pattern: /^\s*(\{[\s\S]*\})\s*$/,
      name: 'Complete JSON object'
    },
    // Pattern 2: JSON code block with or without language specifier
    { 
      pattern: /```(?:json)?\s*([\s\S]*?)\s*```/,
      name: 'JSON code block'
    },
    // Pattern 3: JSON object with possible surrounding text
    { 
      pattern: /(\{[\s\S]*\})/,
      name: 'JSON object with surrounding text'
    },
    // Pattern 4: JSON array with possible surrounding text
    { 
      pattern: /(\[[\s\S]*\])/,
      name: 'JSON array'
    }
  ];
  
  for (const { pattern, name } of patterns) {
    const match = cleanedText.match(pattern);
    if (match && match[1]) {
      console.log(`Found JSON using pattern: ${name}`);
      // Verify the extracted text is valid JSON
      try {
        const extracted = match[1].trim();
        JSON.parse(extracted); // Test parse
        return extracted;
      } catch (error) {
        console.log(`Found match with pattern ${name} but failed JSON validation:`, error);
        continue; // Try next pattern
      }
    }
  }
  
  // If no patterns match, try to find any JSON-like structure
  console.log('No standard patterns matched, trying to find valid JSON structure');
  
  // Look for the largest possible JSON structure
  const possibleJson = cleanedText.match(/\{(?:[^{}]|(?:\{[^{}]*\}))*\}/g);
  if (possibleJson) {
    // Sort by length to get the largest JSON object
    const sortedByLength = possibleJson.sort((a, b) => b.length - a.length);
    for (const jsonCandidate of sortedByLength) {
      try {
        JSON.parse(jsonCandidate); // Test parse
        console.log('Found valid JSON structure in cleaned text');
        return jsonCandidate;
      } catch (error) {
        console.log('Invalid JSON structure found:', error);
        continue;
      }
    }
  }
  
  // If we still haven't found valid JSON, throw an error with details
  console.error('Failed to extract valid JSON from response');
  throw new Error('No valid JSON found in Claude response');
}

// Helper function to save debug information
function _saveDebugInfo(jobId: string, type: string, data: any) {
  if (_isDevelopmentMode()) {
    try {
      const debugDir = path.join(process.cwd(), '.debug');
      if (!fs.existsSync(debugDir)) {
        fs.mkdirSync(debugDir, { recursive: true });
      }
      const debugFile = path.join(debugDir, `${jobId}-${type}-${Date.now()}.json`);
      fs.writeFileSync(debugFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error saving debug info:', error);
    }
  }
}

// Helper function to perform basic fallback evaluation
async function performBasicEvaluation(markdown: string): Promise<any> {
  console.log('Performing basic fallback evaluation');
  
  // Extract key information
  const staffNameMatch = markdown.match(/Staff(?:\s+Member)?(?:\s+\(\d+\))?[:\s]+([^\n]+)/i);
  const staffName = staffNameMatch && staffNameMatch[1]
    ? staffNameMatch[1].match(/(?:hi|hello|hey)[\s,]+(?:my name is|i'm|i am)\s+([^\s,\.]+)/i)?.[1] || staffNameMatch[1].trim()
    : 'Unknown Staff';
  
  const dateMatch = markdown.match(/Date:?\s+(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})/i);
  const date = dateMatch && dateMatch[1] ? dateMatch[1] : new Date().toISOString().split('T')[0];
  
  // Basic scoring (this is very simplistic)
  const criteriaScores = [
    {
      criterion: "Initial Greeting and Welcome",
      weight: 8,
      score: 3,
      weightedScore: 24,
      notes: "Basic greeting detected in conversation."
    },
    {
      criterion: "Wine Knowledge and Recommendations",
      weight: 10,
      score: 3,
      weightedScore: 30,
      notes: "Basic wine discussion detected."
    },
    {
      criterion: "Customer Engagement",
      weight: 10,
      score: 3,
      weightedScore: 30,
      notes: "Basic customer interaction detected."
    },
    {
      criterion: "Sales Techniques",
      weight: 10,
      score: 3,
      weightedScore: 30,
      notes: "Basic sales approach detected."
    },
    {
      criterion: "Upselling and Cross-selling",
      weight: 8,
      score: 3,
      weightedScore: 24,
      notes: "Basic sales suggestions detected."
    },
    {
      criterion: "Handling Customer Questions",
      weight: 8,
      score: 3,
      weightedScore: 24,
      notes: "Basic question handling detected."
    },
    {
      criterion: "Personalization",
      weight: 8,
      score: 3,
      weightedScore: 24,
      notes: "Basic personalization attempts detected."
    },
    {
      criterion: "Closing the Sale",
      weight: 8,
      score: 3,
      weightedScore: 24,
      notes: "Basic closing attempt detected."
    },
    {
      criterion: "Follow-up and Future Business",
      weight: 8,
      score: 3,
      weightedScore: 24,
      notes: "Basic follow-up discussion detected."
    },
    {
      criterion: "Closing Interaction",
      weight: 8,
      score: 3,
      weightedScore: 24,
      notes: "Standard closing detected in conversation."
    }
  ];
  
  // Calculate overall score
  const totalWeightedScore = criteriaScores.reduce((sum, c) => sum + c.weightedScore, 0);
  const totalPossibleScore = criteriaScores.reduce((sum, c) => sum + c.weight, 0);
  const overallScore = Math.round((totalWeightedScore / totalPossibleScore) * 100);
  
  // Determine performance level
  let performanceLevel = "Needs Improvement";
  if (overallScore >= 90) performanceLevel = "Exceptional";
  else if (overallScore >= 80) performanceLevel = "Strong";
  else if (overallScore >= 70) performanceLevel = "Proficient";
  else if (overallScore >= 60) performanceLevel = "Developing";
  
  return {
    staffName,
    date,
    overallScore,
    performanceLevel,
    criteriaScores,
    strengths: [
      "Evaluation performed using fallback system",
      "Basic conversation structure detected",
      "See detailed conversation for actual performance"
    ],
    areasForImprovement: [
      "AI evaluation encountered an error",
      "Consider manual review of conversation",
      "Try submitting the conversation again"
    ],
    keyRecommendations: [
      "Review conversation manually",
      "Check for technical issues with the evaluation system",
      "Try shorter conversation segments if the evaluation fails"
    ]
  };
}

// Truncate conversation if it's too long
const truncateConversation = (markdown: string, maxLength: number = 8000): string => {
  if (markdown.length <= maxLength) {
    return markdown;
  }
  
  console.log(`Background function: Truncating conversation from ${markdown.length} to ${maxLength} characters`);
  
  // Try to find the middle section of the conversation
  const startIndex = Math.floor(markdown.length / 2) - Math.floor(maxLength / 2);
  const truncated = markdown.substring(startIndex, startIndex + maxLength);
  
  // Add a note about truncation
  return `[Note: Conversation truncated for analysis. Showing middle section.]\n\n${truncated}\n\n[End of truncated conversation]`;
};

// Function to analyze conversation with Claude API
async function analyzeConversationWithClaude(
  conversation: string,
  staffName: string,
  date: string,
  rubricId?: string
): Promise<EvaluationData> {
  console.log('Starting conversation analysis with Claude');
  
  try {
    // Validate environment variables
    const envCheck = validateEnvironment();
    if (!envCheck.isValid) {
      console.error('Missing required environment variables:', envCheck.missingVars);
      throw new Error(`Missing required environment variables: ${envCheck.missingVars.join(', ')}`);
    }
    
    // Check API key
    const apiKey = getClaudeApiKey();
    if (!apiKey) {
      throw new Error('Claude API key is missing. Please set CLAUDE_API_KEY in your environment variables.');
    }
    
    // First try to load the specified rubric or fall back to default
    const rubric = await loadRubric(rubricId);
    
    if (!rubric) {
      throw new Error('No rubric found for evaluation');
    }
    
    // Prepare the prompt with the rubric
    const prompt = `You are an expert wine sales trainer evaluating a conversation between a winery staff member and a guest.

IMPORTANT INSTRUCTIONS:
1. Use the EXACT criteria and scoring guidelines from the provided rubric
2. For each criterion, provide a score (1-5) and detailed justification
3. Calculate the weighted score for each criterion using the weights specified
4. Determine the overall performance level based on the total weighted score
5. Provide specific examples from the conversation to support your evaluation
6. RESPOND ONLY WITH VALID JSON - NO OTHER TEXT

RUBRIC TO USE:
${JSON.stringify(rubric, null, 2)}

CONVERSATION TO EVALUATE:
${conversation}

STAFF MEMBER: ${staffName}
DATE: ${date}

Respond with ONLY this JSON format - no other text or explanation:
{
  "staffName": "${staffName}",
  "date": "${date}",
  "overallScore": number,
  "performanceLevel": "Exceptional" | "Strong" | "Proficient" | "Developing" | "Needs Improvement",
  "criteriaScores": [
    {
      "criterion": string,
      "score": number,
      "weight": number,
      "weightedScore": number,
      "notes": string
    }
  ],
  "strengths": string[],
  "areasForImprovement": string[],
  "keyRecommendations": string[],
  "rubricId": "${rubric.id}"
}`;

    // Enforce rate limiting before making the API call
    await enforceRateLimit();
    
    console.log('Sending request to Claude API with rubric:', rubric.id);
    const response = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 4000,
      temperature: 0,
      system: "You are a wine sales evaluation expert. ONLY respond with valid JSON - no other text or explanation.",
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });
    
    console.log('Received response from Claude API');
    const content = response.content[0];
    const result = typeof content === 'object' && 'text' in content ? content.text : String(content);
    
    // Log the raw response for debugging
    console.log('Raw Claude response:', result.substring(0, 500) + '...');
    
    // Try multiple approaches to extract and parse JSON
    let evaluation: any = null;
    let parseError: Error | null = null;
    
    try {
      // Attempt 1: Direct JSON parse
      evaluation = JSON.parse(result);
      console.log('Successfully parsed response directly as JSON');
    } catch (error1) {
      console.log('Direct JSON parse failed, trying to extract JSON from response');
      try {
        // Attempt 2: Extract JSON using processCloudeResponse
        const jsonString = processCloudeResponse(result);
        evaluation = JSON.parse(jsonString);
        console.log('Successfully parsed JSON after extraction');
      } catch (error2) {
        console.error('All JSON parsing attempts failed:', { error1, error2 });
        parseError = error2 as Error;
      }
    }
    
    if (!evaluation) {
      throw new Error(`Failed to parse Claude response: ${parseError?.message || 'Unknown parsing error'}`);
    }
    
    // Add the rubricId to the evaluation data
    evaluation.rubricId = rubric.id;
    
    // Validate the evaluation data
    const validationResult = validateEvaluationData(evaluation);
    if (!validationResult.isValid) {
      console.error('Validation issues found:', validationResult.errors);
      throw new Error('Invalid evaluation data: ' + validationResult.errors.join(', '));
    }
    
    // Log successful evaluation
    console.log('Successfully processed evaluation:', {
      staffName: evaluation.staffName,
      date: evaluation.date,
      overallScore: evaluation.overallScore,
      performanceLevel: evaluation.performanceLevel,
      criteriaCount: evaluation.criteriaScores.length
    });
    
    return evaluation as EvaluationData;
  } catch (error) {
    console.error('Error in analyzeConversationWithClaude:', error);
    
    // Enhance error details
    const enhancedError = new Error(
      error instanceof Error 
        ? `Analysis failed: ${error.message}`
        : 'Unknown error during analysis'
    );
    
    // Add specific error handling for common cases
    if (error instanceof Error) {
      if (error.message.includes('404') || error.message.includes('not_found_error')) {
        throw new Error('Claude API model not found. Please check your API key and model name.');
      } else if (error.message.includes('401') || error.message.includes('unauthorized')) {
        throw new Error('Unauthorized access to Claude API. Please check your API key.');
      } else if (error.message.includes('429') || error.message.includes('rate_limit')) {
        throw new Error('Rate limit exceeded for Claude API. Please try again later.');
      }
    }
    
    throw enhancedError;
  }
}

// Function to validate environment variables
function validateEnvironment() {
  const requiredVars = ['CLAUDE_API_KEY'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  return {
    isValid: missingVars.length === 0,
    missingVars
  };
}

// Function to get Claude API key
function getClaudeApiKey() {
  return process.env.CLAUDE_API_KEY;
}

// Function to enforce rate limiting
async function enforceRateLimit() {
  const now = Date.now();
  const timeSinceLastRequest = now - RATE_LIMIT.lastRequestTime;
  
  if (timeSinceLastRequest < RATE_LIMIT.REQUEST_WINDOW_MS / RATE_LIMIT.MAX_REQUESTS_PER_MINUTE) {
    const delayMs = (RATE_LIMIT.REQUEST_WINDOW_MS / RATE_LIMIT.MAX_REQUESTS_PER_MINUTE) - timeSinceLastRequest;
    console.log(`Rate limiting: Waiting ${delayMs}ms before next request`);
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  
  RATE_LIMIT.lastRequestTime = Date.now();
}

// Netlify function handler
export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  console.log(`[${new Date().toISOString()}] Background function: Received request`);
  
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    console.log(`[${new Date().toISOString()}] Background function: Invalid HTTP method: ${event.httpMethod}`);
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }
  
  try {
    // Parse the request body
    const { jobId, conversation, staffName, date, rubricId } = JSON.parse(event.body || '{}');
    
    // Validate required fields
    if (!jobId) {
      console.log(`[${new Date().toISOString()}] Background function: Missing jobId in request`);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing jobId in request' })
      };
    }
    
    if (!conversation) {
      console.log(`[${new Date().toISOString()}] Background function: Missing conversation in request`);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing conversation in request' })
      };
    }
    
    // Get the job from storage
    const job = await storage.getJob(jobId);
    if (!job) {
      console.log(`[${new Date().toISOString()}] Background function: Job ${jobId} not found`);
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Job not found' })
      };
    }
    
    // Update job status to processing
    job.status = 'processing';
    job.updatedAt = new Date().toISOString();
    await storage.saveJob(job);
    console.log(`[${new Date().toISOString()}] Background function: Updated job ${jobId} status to processing`);
    
    // Analyze the conversation with Claude, passing the rubricId
    const evaluationResult = await analyzeConversationWithClaude(
      conversation,
      staffName,
      date,
      rubricId || job.rubricId // Use the rubricId from the request or job
    );
    
    // Update job with the evaluation result
    job.status = 'completed';
    job.result = evaluationResult;
    job.updatedAt = new Date().toISOString();
    await storage.saveJob(job);
    console.log(`[${new Date().toISOString()}] Background function: Updated job ${jobId} status to completed`);
    
    // Return success response
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: 'Job processed successfully',
        jobId: job.id
      })
    };
  } catch (error: unknown) {
    console.error(`[${new Date().toISOString()}] Background function: Error processing request:`, error);
    
    // If we have a job ID, update the job status to failed
    try {
      const { jobId } = JSON.parse(event.body || '{}');
      if (jobId) {
        const job = await storage.getJob(jobId);
        if (job) {
          job.status = 'failed';
          job.error = error instanceof Error ? error.message : 'Unknown error';
          job.errorDetails = {
            type: error instanceof Error ? error.name : 'UnknownError',
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          };
          job.updatedAt = new Date().toISOString();
          await storage.saveJob(job);
          console.log(`[${new Date().toISOString()}] Background function: Updated job ${jobId} status to failed`);
        }
      }
    } catch (updateError) {
      console.error(`[${new Date().toISOString()}] Background function: Error updating job status:`, updateError);
    }
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
}; 