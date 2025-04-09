import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { Anthropic } from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getStorageProvider, JobStatus } from '../../app/utils/storage';

// Add diagnostic logging
console.log('Background function: Starting with environment:', {
  NODE_ENV: process.env.NODE_ENV,
  NETLIFY: process.env.NETLIFY,
  PWD: process.cwd(),
  dirContents: fs.existsSync('/var/task') ? fs.readdirSync('/var/task') : 'Directory not found'
});

// Cache for rubric and example evaluation
let cachedRubric: string | null = null;
let cachedEvaluationExample: string | null = null;

// Define the path to the jobs directory
const JOBS_DIR = '/tmp/jobs';

// Ensure the jobs directory exists
const ensureJobsDir = () => {
  try {
    if (!fs.existsSync(JOBS_DIR)) {
      console.log('Background function: Creating jobs directory:', JOBS_DIR);
      fs.mkdirSync(JOBS_DIR, { recursive: true });
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
    const jobPath = path.join(JOBS_DIR, `${job.id}.json`);
    console.log('Background function: Saving job to:', jobPath);
    fs.writeFileSync(jobPath, JSON.stringify(job, null, 2));
  } catch (error) {
    console.error('Background function: Error saving job:', error);
    throw new Error(`Failed to save job: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Get a job by ID
const getJob = (jobId: string): JobStatus | null => {
  try {
    ensureJobsDir();
    const jobPath = path.join(JOBS_DIR, `${jobId}.json`);
    console.log('Background function: Reading job from:', jobPath);
    
    if (!fs.existsSync(jobPath)) {
      console.log('Background function: Job file not found:', jobPath);
      return null;
    }
    
    const jobData = fs.readFileSync(jobPath, 'utf8');
    return JSON.parse(jobData) as JobStatus;
  } catch (error) {
    console.error(`Background function: Error reading job ${jobId}:`, error);
    return null;
  }
};

// Initialize the Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

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

// Load the rubric with caching
const loadRubric = () => {
  console.log('Background function: Loading rubric, cached:', !!cachedRubric);
  
  if (cachedRubric) {
    console.log('Background function: Using cached rubric');
    return cachedRubric;
  }
  
  console.log('Background function: Using embedded rubric');
  cachedRubric = EMBEDDED_RUBRIC;
  return cachedRubric;
};

// Load the example evaluation with caching
const loadEvaluationExample = () => {
  console.log('Background function: Loading evaluation example, cached:', !!cachedEvaluationExample);
  
  if (cachedEvaluationExample) {
    console.log('Background function: Using cached evaluation example');
    return cachedEvaluationExample;
  }
  
  console.log('Background function: Using embedded evaluation example');
  cachedEvaluationExample = JSON.stringify(EMBEDDED_EVALUATION_EXAMPLE, null, 2);
  return cachedEvaluationExample;
};

interface CriteriaScore {
  criterion: string;
  weight: number;
  score: number;
  weightedScore: number;
  notes: string;
}

interface EvaluationData {
  staffName: string;
  date: string;
  overallScore: number;
  totalScore?: number; // Optional field that might be used instead of overallScore
  performanceLevel: string;
  criteriaScores: CriteriaScore[];
  strengths: string[];
  areasForImprovement: string[];
  keyRecommendations: string[];
}

// Helper function to process Claude's response and extract JSON
function processCloudeResponse(responseText: string): string {
  console.log('Processing Claude response to extract JSON');
  
  // Try different patterns to extract JSON with detailed logging
  const patterns = [
    // Pattern 1: JSON code block with or without language specifier
    { pattern: /```(?:json)?\s*([\s\S]*?)\s*```/, name: 'JSON code block' },
    // Pattern 2: JSON object with curly braces
    { pattern: /(\{[\s\S]*\})/, name: 'JSON object' },
    // Pattern 3: JSON array with square brackets
    { pattern: /(\[[\s\S]*\])/, name: 'JSON array' }
  ];
  
  for (const { pattern, name } of patterns) {
    const match = responseText.match(pattern);
    if (match && match[1]) {
      console.log(`Found JSON using pattern: ${name}`);
      return match[1].trim();
    }
  }
  
  // If no patterns match, try to find the first occurrence of a valid JSON structure
  console.log('No pattern matched, trying to find valid JSON structure');
  const possibleJson = responseText.match(/\{[^{}]*\}|\[[\[\]]*\]/);
  if (possibleJson) {
    console.log('Found potential JSON structure');
    return possibleJson[0].trim();
  }
  
  console.log('No JSON found in response, returning original text');
  return responseText.trim();
}

// Helper function to fix or create a valid evaluation data structure
function validateAndRepairEvaluationData(data: any, markdown: string): EvaluationData {
  console.log('Validating and repairing evaluation data');
  
  // Create a fallback object
  const fallbackData: EvaluationData = {
    staffName: "Unknown Staff",
    date: new Date().toISOString().split('T')[0],
    overallScore: 0,
    performanceLevel: "Needs Improvement",
    criteriaScores: [],
    strengths: [
      "Not available due to processing error",
      "Please try again with the conversation",
      "Consider reviewing the conversation manually"
    ],
    areasForImprovement: [
      "Not available due to processing error",
      "Please try again with the conversation",
      "Consider reviewing the conversation manually"
    ],
    keyRecommendations: [
      "Not available due to processing error",
      "Please try again with the conversation",
      "Consider reviewing the conversation manually"
    ]
  };
  
  // Try to extract staff name from the markdown if missing
  if (!data?.staffName) {
    console.log('Staff name missing, attempting to extract from markdown');
    const staffNameMatch = markdown.match(/Staff(?:\s+Member)?(?:\s+\(\d+\))?[:\s]+([^\n]+)/i);
    if (staffNameMatch && staffNameMatch[1]) {
      const nameMatch = staffNameMatch[1].match(/(?:hi|hello|hey)[\s,]+(?:my name is|i'm|i am)\s+([^\s,\.]+)/i);
      fallbackData.staffName = nameMatch && nameMatch[1] ? nameMatch[1].trim() : staffNameMatch[1].trim();
      console.log(`Extracted staff name: ${fallbackData.staffName}`);
    }
  } else {
    fallbackData.staffName = data.staffName;
    console.log(`Using provided staff name: ${fallbackData.staffName}`);
  }
  
  // Try to extract date from the markdown if missing
  if (!data?.date) {
    console.log('Date missing, attempting to extract from markdown');
    const dateMatch = markdown.match(/Date:?\s+(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})/i);
    if (dateMatch && dateMatch[1]) {
      fallbackData.date = dateMatch[1];
      console.log(`Extracted date: ${fallbackData.date}`);
    }
  } else {
    fallbackData.date = data.date;
    console.log(`Using provided date: ${fallbackData.date}`);
  }
  
  // Try to use whatever data is available
  if (data) {
    console.log('Processing available data fields');
    
    // Handle score fields
    if (data.overallScore !== undefined) {
      console.log(`Using overallScore: ${data.overallScore}`);
      fallbackData.overallScore = typeof data.overallScore === 'string' ? 
        parseFloat(data.overallScore) : data.overallScore;
    } else if (data.totalScore !== undefined) {
      console.log(`Using totalScore as overallScore: ${data.totalScore}`);
      fallbackData.overallScore = typeof data.totalScore === 'string' ? 
        parseFloat(data.totalScore) : data.totalScore;
    }
    
    // Handle performance level
    if (data.performanceLevel) {
      console.log(`Using performanceLevel: ${data.performanceLevel}`);
      fallbackData.performanceLevel = data.performanceLevel;
    }
    
    // Handle criteria scores
    if (Array.isArray(data.criteriaScores)) {
      console.log(`Using criteriaScores array with ${data.criteriaScores.length} items`);
      
      // Ensure we have at least some criteria scores
      if (data.criteriaScores.length > 0) {
        // Process each criteria score to ensure it has the required fields
        fallbackData.criteriaScores = data.criteriaScores.map((score: any, index: number) => {
          // Create a valid criteria score object
          const validScore: CriteriaScore = {
            criterion: score.criterion || `Criterion ${index + 1}`,
            weight: typeof score.weight === 'number' ? score.weight : 
                   typeof score.weight === 'string' ? parseFloat(score.weight) : 8,
            score: typeof score.score === 'number' ? score.score : 
                  typeof score.score === 'string' ? parseFloat(score.score) : 3,
            weightedScore: typeof score.weightedScore === 'number' ? score.weightedScore : 
                          typeof score.weightedScore === 'string' ? parseFloat(score.weightedScore) : 24,
            notes: score.notes || 'No notes provided'
          };
          
          // Calculate weighted score if not provided
          if (isNaN(validScore.weightedScore)) {
            validScore.weightedScore = validScore.score * validScore.weight;
          }
          
          return validScore;
        });
      }
    }
    
    // Handle arrays with more flexible validation
    ['strengths', 'areasForImprovement', 'keyRecommendations'].forEach(field => {
      const arrayField = field as keyof Pick<EvaluationData, 'strengths' | 'areasForImprovement' | 'keyRecommendations'>;
      if (Array.isArray(data[arrayField]) && data[arrayField].length > 0) {
        console.log(`Using ${field} array with ${data[arrayField].length} items`);
        fallbackData[arrayField] = data[arrayField];
      }
    });
  }
  
  // Ensure we have at least 10 criteria scores
  if (fallbackData.criteriaScores.length < 10) {
    console.log(`Adding ${10 - fallbackData.criteriaScores.length} default criteria scores`);
    
    // Default criteria if we don't have enough
    const defaultCriteria = [
      { criterion: "Initial Greeting and Welcome", weight: 8 },
      { criterion: "Wine Knowledge and Recommendations", weight: 10 },
      { criterion: "Customer Engagement", weight: 10 },
      { criterion: "Sales Techniques", weight: 10 },
      { criterion: "Upselling and Cross-selling", weight: 8 },
      { criterion: "Handling Customer Questions", weight: 8 },
      { criterion: "Personalization", weight: 8 },
      { criterion: "Closing the Sale", weight: 8 },
      { criterion: "Follow-up and Future Business", weight: 8 },
      { criterion: "Closing Interaction", weight: 8 }
    ];
    
    // Add missing criteria
    for (let i = fallbackData.criteriaScores.length; i < 10; i++) {
      const defaultCriterion = defaultCriteria[i - fallbackData.criteriaScores.length];
      fallbackData.criteriaScores.push({
        criterion: defaultCriterion.criterion,
        weight: defaultCriterion.weight,
        score: 3,
        weightedScore: defaultCriterion.weight * 3,
        notes: "Default criteria added due to missing data"
      });
    }
  }
  
  // Calculate overall score if not set
  if (fallbackData.overallScore === 0 && fallbackData.criteriaScores.length > 0) {
    console.log('Calculating overall score from criteria scores');
    const totalWeightedScore = fallbackData.criteriaScores.reduce((sum, criterion) => {
      return sum + criterion.weightedScore;
    }, 0);
    fallbackData.overallScore = Math.round((totalWeightedScore / 500) * 100);
    console.log(`Calculated overall score: ${fallbackData.overallScore}`);
  }
  
  // Set performance level based on overall score
  if (fallbackData.overallScore >= 90) fallbackData.performanceLevel = "Exceptional";
  else if (fallbackData.overallScore >= 80) fallbackData.performanceLevel = "Strong";
  else if (fallbackData.overallScore >= 70) fallbackData.performanceLevel = "Proficient";
  else if (fallbackData.overallScore >= 60) fallbackData.performanceLevel = "Developing";
  else fallbackData.performanceLevel = "Needs Improvement";
  
  console.log(`Final performance level: ${fallbackData.performanceLevel}`);
  return fallbackData;
}

// Helper function to save debug information
function saveDebugInfo(jobId: string, type: string, data: any) {
  try {
    ensureJobsDir();
    const debugPath = path.join(JOBS_DIR, `${jobId}-${type}-${Date.now()}.json`);
    fs.writeFileSync(debugPath, JSON.stringify(data, null, 2));
    console.log(`Saved debug info to ${debugPath}`);
  } catch (error) {
    console.error('Error saving debug info:', error);
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
  const overallScore = Math.round((totalWeightedScore / 500) * 100);
  
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

// Process a job
const processJob = async (jobId: string, markdown: string, fileName: string) => {
  console.log(`Background function: Processing job ${jobId}`);
  
  // Get the storage provider
  const storage = getStorageProvider();
  
  // Get the job with retries
  let job = null;
  let retryCount = 0;
  const maxRetries = 3;
  
  while (!job && retryCount < maxRetries) {
    job = await storage.getJob(jobId);
    if (!job) {
      console.log(`Background function: Job ${jobId} not found, retry ${retryCount + 1}/${maxRetries}`);
      retryCount++;
      if (retryCount < maxRetries) {
        // Wait for 1 second before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
  
  if (!job) {
    throw new Error(`Job ${jobId} not found after ${maxRetries} retries`);
  }
  
  console.log(`Background function: Retrieved job ${jobId} with status ${job.status}`);
  
  // Update job status to processing
  job.status = 'processing';
  job.updatedAt = Date.now();
  await storage.saveJob(job);
  
  try {
    // Load the rubric and example eval using the cached versions
    const WINES_SALES_RUBRIC = loadRubric();
    const EVALUATION_EXAMPLE = loadEvaluationExample();
    
    // Truncate conversation if needed
    const truncatedMarkdown = truncateConversation(markdown);
    
    // Prepare the system prompt for Claude - updated to be more explicit about JSON output and detailed feedback
    const systemPrompt = `You are a wine sales performance evaluator. Your task is to analyze the conversation and output ONLY a valid JSON object with no additional text or explanations. 
    
IMPORTANT INSTRUCTIONS:
1. Output ONLY valid JSON that can be directly parsed by JSON.parse()
2. Do not include any markdown formatting, text before or after the JSON
3. Do not include any explanations or comments outside the JSON
4. Follow the exact structure in the example provided
5. Ensure all required fields are present and correctly formatted

For each criterion, you MUST:
1. Quote specific examples from the conversation that demonstrate performance
2. Explain what was done well and why it was effective, with concrete examples
3. Identify specific areas for improvement with actionable suggestions
4. Provide a fair score (1-5) based on the evidence
5. Include detailed notes that explain your scoring rationale

For each criterion, your notes should:
- Start with "Strengths:" followed by specific examples and why they were effective
- Then "Areas for Improvement:" with concrete suggestions
- End with "Score Rationale:" explaining why you gave that score

Be thorough but concise in your analysis. Focus on actionable feedback that will help the staff member improve.`;

    // Prepare the user prompt with a more structured JSON schema and detailed feedback requirements
    const userPrompt = `Evaluate this wine tasting conversation against the provided rubric. Return ONLY a JSON object with the following structure:

{
  "staffName": "string", // Extract from conversation
  "date": "YYYY-MM-DD", // From conversation, in this format
  "overallScore": number, // Calculate as a percentage (0-100)
  "performanceLevel": "string", // Based on the score ranges
  "criteriaScores": [
    {
      "criterion": "string", // Exactly as in the rubric
      "weight": number, // As per the rubric
      "score": number, // Your rating (1-5)
      "weightedScore": number, // score × weight
      "notes": "string" // Your detailed analysis including specific examples, strengths, and areas for improvement
    },
    // Exactly 10 criteria as in the rubric
  ],
  "strengths": ["string", "string", "string"], // Exactly 3 strengths
  "areasForImprovement": ["string", "string", "string"], // Exactly 3 areas
  "keyRecommendations": ["string", "string", "string"] // Exactly 3 recommendations
}

Rubric:
${WINES_SALES_RUBRIC}

Example format:
${EVALUATION_EXAMPLE}

Instructions:
1. Score each criterion 1-5 based on rubric
2. Calculate weighted scores (score × weight)
3. Calculate overall score (sum of weighted scores ÷ 5)
4. Determine performance level:
   - Exceptional: 90-100%
   - Strong: 80-89%
   - Proficient: 70-79%
   - Developing: 60-69%
   - Needs Improvement: <60%
5. Include 3 strengths, 3 areas for improvement, 3 recommendations
6. Write detailed notes for each criterion that include:
   - Specific examples from the conversation
   - What was done well and why it was effective
   - What could be improved with concrete suggestions
   - A fair score based on the evidence

Conversation to evaluate:
${truncatedMarkdown}

Return ONLY THE JSON with no additional text. The JSON must match the example format exactly.`;
    
    // Save debug info before calling Claude
    saveDebugInfo(jobId, 'request', {
      model: "claude-3-7-sonnet-20250219",
      system: systemPrompt,
      userPrompt: userPrompt.substring(0, 1000) + '...' // Truncate for logs
    });
    
    console.log('Background function: Calling Claude API');
    
    // Call Claude API with Claude 3 Sonnet
    const anthropic = new Anthropic({
      apiKey: process.env.CLAUDE_API_KEY || '',
    });
    
    const response = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 4000,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: userPrompt
        }
      ],
      temperature: 0.1
    });
    
    console.log('Background function: Claude API response received');
    
    // Get the response text
    const responseText = response.content[0].text;
    
    if (!responseText) {
      throw new Error('Empty response from Claude API');
    }
    
    // Save debug info after getting Claude's response
    saveDebugInfo(jobId, 'response', {
      responseText: responseText.substring(0, 5000) + '...' // Truncate for logs
    });
    
    console.log('Background function: Extracting JSON from Claude response');
    // Extract JSON from Claude's response
    let evaluationData: EvaluationData;
    try {
      // Process the response to extract JSON
      const processedText = processCloudeResponse(responseText);
      console.log('Background function: Processed Claude response');
      
      // Try to parse the JSON
      try {
        evaluationData = JSON.parse(processedText) as EvaluationData;
        console.log('Background function: Successfully parsed JSON');
      } catch (parseError) {
        console.error('Background function: Error parsing JSON:', parseError);
        
        // Try to clean the text and parse again
        const cleanedText = processedText
          .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
          .replace(/\\n/g, ' ') // Replace escaped newlines with spaces
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim();
        
        console.log('Background function: Trying to parse cleaned text');
        evaluationData = JSON.parse(cleanedText) as EvaluationData;
      }
      
      // Save debug info after processing the response
      saveDebugInfo(jobId, 'processed', {
        evaluationData: evaluationData
      });
      
      // Log the structure to see what fields are present/missing
      console.log('Background function: Parsed evaluation data structure:', Object.keys(evaluationData));
     
      // Validate the evaluation data structure
      if (!evaluationData || typeof evaluationData !== 'object') {
        console.error('Background function: Invalid evaluation data structure:', evaluationData);
        job.status = 'failed';
        job.error = 'Invalid evaluation data structure returned from Claude';
        job.updatedAt = Date.now();
        await storage.saveJob(job);
        return;
      }

      // Ensure the evaluation data has the required fields
      const requiredFields = ['staffName', 'date', 'overallScore', 'totalScore', 'criteriaScores', 'strengths', 'areasForImprovement'];
      const missingFields = requiredFields.filter(field => !(field in evaluationData));
      
      if (missingFields.length > 0) {
        console.error('Background function: Missing required fields in evaluation data:', missingFields);
        
        // Try to repair the data structure if possible
        const repairedData = {
          staffName: evaluationData.staffName || 'Unknown Staff',
          date: evaluationData.date || new Date().toISOString().split('T')[0],
          overallScore: evaluationData.overallScore || 0,
          totalScore: evaluationData.totalScore || 0,
          criteriaScores: Array.isArray(evaluationData.criteriaScores) ? evaluationData.criteriaScores : [],
          strengths: Array.isArray(evaluationData.strengths) ? evaluationData.strengths : [],
          areasForImprovement: Array.isArray(evaluationData.areasForImprovement) ? evaluationData.areasForImprovement : [],
          performanceLevel: evaluationData.performanceLevel || 'Needs Improvement',
          keyRecommendations: Array.isArray(evaluationData.keyRecommendations) ? evaluationData.keyRecommendations : []
        };
        
        // Check if we have at least some valid data
        const hasValidData = repairedData.criteriaScores.length > 0 || 
                            repairedData.strengths.length > 0 || 
                            repairedData.areasForImprovement.length > 0;
        
        if (hasValidData) {
          console.log('Background function: Using repaired evaluation data structure');
          evaluationData = repairedData;
        } else {
          job.status = 'failed';
          job.error = `Missing required fields in evaluation data: ${missingFields.join(', ')}`;
          job.updatedAt = Date.now();
          await storage.saveJob(job);
          return;
        }
      }

      // Ensure criteriaScores is an array
      if (!Array.isArray(evaluationData.criteriaScores)) {
        console.error('Background function: criteriaScores is not an array:', evaluationData.criteriaScores);
        evaluationData.criteriaScores = [];
      }

      // Ensure strengths and areasForImprovement are arrays
      if (!Array.isArray(evaluationData.strengths)) {
        console.error('Background function: strengths is not an array:', evaluationData.strengths);
        evaluationData.strengths = [];
      }

      if (!Array.isArray(evaluationData.areasForImprovement)) {
        console.error('Background function: areasForImprovement is not an array:', evaluationData.areasForImprovement);
        evaluationData.areasForImprovement = [];
      }

      // Calculate overall score if not provided
      if (typeof evaluationData.overallScore !== 'number' || isNaN(evaluationData.overallScore)) {
        console.log('Background function: Calculating overall score from criteria scores');
        if (evaluationData.criteriaScores.length > 0) {
          const totalScore = evaluationData.criteriaScores.reduce((sum, criteria) => {
            return sum + (typeof criteria.score === 'number' ? criteria.score : 0);
          }, 0);
          evaluationData.overallScore = Math.round(totalScore / evaluationData.criteriaScores.length);
          evaluationData.totalScore = totalScore;
        } else {
          evaluationData.overallScore = 0;
          evaluationData.totalScore = 0;
        }
      }

      // Save the job with the evaluation data
      job.status = 'completed';
      job.result = evaluationData;
      job.updatedAt = Date.now();
      await storage.saveJob(job);
      console.log(`Background function: Job ${jobId} completed successfully`);
    } catch (error) {
      console.error(`Background function: Error processing job ${jobId}:`, error);
      
      // Update job with the error
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.updatedAt = Date.now();
      await storage.saveJob(job);
      
      throw error;
    }
  } catch (error) {
    console.error(`Background function: Error processing job ${jobId}:`, error);
    throw error;
  }
};

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  console.log('Background function: Handler started', {
    httpMethod: event.httpMethod,
    pathPattern: event.path,
    hasBody: !!event.body,
    contentLength: event.body?.length
  });
  
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }
  
  try {
    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No request body provided' })
      };
    }
    
    const { jobId, markdown, fileName } = JSON.parse(event.body);
    
    if (!jobId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No job ID provided' })
      };
    }
    
    if (!markdown) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No markdown content provided' })
      };
    }
    
    // Process the job asynchronously
    processJob(jobId, markdown, fileName).catch(error => {
      console.error(`Background function: Unhandled error in processJob:`, error);
    });
    
    return {
      statusCode: 202,
      body: JSON.stringify({ message: 'Job processing started' })
    };
  } catch (error) {
    console.error('Background function: Error processing request:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
}; 