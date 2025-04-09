import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { Anthropic } from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Define the job status interface
interface JobStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: any;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

// Define the path to the jobs directory
const JOBS_DIR = path.join(process.cwd(), 'tmp', 'jobs');

// Cache for rubric and example evaluation
let cachedRubric: string | null = null;
let cachedEvaluationExample: string | null = null;

// Ensure the jobs directory exists
const ensureJobsDir = () => {
  if (!fs.existsSync(JOBS_DIR)) {
    fs.mkdirSync(JOBS_DIR, { recursive: true });
  }
};

// Save a job to the filesystem
const saveJob = (job: JobStatus) => {
  ensureJobsDir();
  const jobPath = path.join(JOBS_DIR, `${job.id}.json`);
  fs.writeFileSync(jobPath, JSON.stringify(job, null, 2));
};

// Get a job by ID
const getJob = (jobId: string): JobStatus | null => {
  ensureJobsDir();
  const jobPath = path.join(JOBS_DIR, `${jobId}.json`);
  
  if (!fs.existsSync(jobPath)) {
    return null;
  }
  
  try {
    const jobData = fs.readFileSync(jobPath, 'utf8');
    return JSON.parse(jobData) as JobStatus;
  } catch (error) {
    console.error(`Error reading job ${jobId}:`, error);
    return null;
  }
};

// Initialize the Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

// Extract essential parts from the rubric
const extractEssentialRubric = (fullRubric: string): string => {
  // Extract only the criteria sections and scoring guide
  const criteriaMatch = fullRubric.match(/## Evaluation Criteria([\s\S]*?)## Additional Evaluation Factors/);
  const scoringMatch = fullRubric.match(/## Scoring Guide([\s\S]*?)## Feedback Template/);
  
  let essentialRubric = '';
  
  if (criteriaMatch && criteriaMatch[1]) {
    essentialRubric += criteriaMatch[1].trim() + '\n\n';
  }
  
  if (scoringMatch && scoringMatch[1]) {
    essentialRubric += scoringMatch[1].trim();
  }
  
  return essentialRubric || fullRubric; // Fallback to full rubric if extraction fails
};

// Simplify the example evaluation JSON
const simplifyEvaluationExample = (fullExample: string): string => {
  try {
    const example = JSON.parse(fullExample);
    
    // Create a simplified version with just the structure
    const simplified = {
      staffName: example.staffName,
      date: example.date,
      overallScore: example.totalScore || example.overallScore,
      performanceLevel: example.performanceLevel,
      criteriaScores: example.criteriaScores.map((c: any) => ({
        criterion: c.criterion,
        weight: c.weight,
        score: c.score,
        weightedScore: c.weightedScore,
        notes: c.notes.substring(0, 100) + '...' // Truncate notes
      })),
      strengths: example.strengths,
      areasForImprovement: example.areasForImprovement,
      keyRecommendations: example.keyRecommendations
    };
    
    return JSON.stringify(simplified, null, 2);
  } catch (error) {
    console.error('Error simplifying evaluation example:', error);
    return fullExample; // Fallback to full example if simplification fails
  }
};

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

// Load the rubric file with caching
const loadRubric = () => {
  if (cachedRubric) {
    console.log('Background function: Using cached rubric');
    return cachedRubric;
  }
  
  console.log('Background function: Loading rubric file');
  const rubricPath = path.join(process.cwd(), 'public', 'data', 'wines_sales_rubric.md');
  console.log(`Background function: Rubric path: ${rubricPath}`);
  let WINES_SALES_RUBRIC = '';
  try {
    WINES_SALES_RUBRIC = fs.readFileSync(rubricPath, 'utf8');
    console.log('Background function: Rubric file loaded successfully');
    
    // Extract essential parts and cache
    cachedRubric = extractEssentialRubric(WINES_SALES_RUBRIC);
    console.log(`Background function: Extracted essential rubric (${cachedRubric.length} chars)`);
  } catch (error) {
    console.error('Background function: Error loading rubric file:', error);
    // Try alternative path
    const altRubricPath = path.join(__dirname, '..', '..', 'public', 'data', 'wines_sales_rubric.md');
    console.log(`Background function: Trying alternative rubric path: ${altRubricPath}`);
    try {
      WINES_SALES_RUBRIC = fs.readFileSync(altRubricPath, 'utf8');
      console.log('Background function: Rubric file loaded successfully from alternative path');
      
      // Extract essential parts and cache
      cachedRubric = extractEssentialRubric(WINES_SALES_RUBRIC);
      console.log(`Background function: Extracted essential rubric (${cachedRubric.length} chars)`);
    } catch (altError) {
      console.error('Background function: Error loading rubric file from alternative path:', altError);
      throw new Error('Failed to load rubric file');
    }
  }
  return cachedRubric;
};

// Load the example evaluation JSON with caching
const loadEvaluationExample = () => {
  if (cachedEvaluationExample) {
    console.log('Background function: Using cached evaluation example');
    return cachedEvaluationExample;
  }
  
  console.log('Background function: Loading example evaluation JSON');
  const evaluationExamplePath = path.join(process.cwd(), 'public', 'data', 'evaluation_new.json');
  console.log(`Background function: Example evaluation path: ${evaluationExamplePath}`);
  let EVALUATION_EXAMPLE = '';
  try {
    EVALUATION_EXAMPLE = fs.readFileSync(evaluationExamplePath, 'utf8');
    console.log('Background function: Example evaluation JSON loaded successfully');
    
    // Simplify and cache
    cachedEvaluationExample = simplifyEvaluationExample(EVALUATION_EXAMPLE);
    console.log(`Background function: Simplified evaluation example (${cachedEvaluationExample.length} chars)`);
  } catch (error) {
    console.error('Background function: Error loading example evaluation JSON:', error);
    // Try alternative path
    const altEvalPath = path.join(__dirname, '..', '..', 'public', 'data', 'evaluation_new.json');
    console.log(`Background function: Trying alternative example evaluation path: ${altEvalPath}`);
    try {
      EVALUATION_EXAMPLE = fs.readFileSync(altEvalPath, 'utf8');
      console.log('Background function: Example evaluation JSON loaded successfully from alternative path');
      
      // Simplify and cache
      cachedEvaluationExample = simplifyEvaluationExample(EVALUATION_EXAMPLE);
      console.log(`Background function: Simplified evaluation example (${cachedEvaluationExample.length} chars)`);
    } catch (altError) {
      console.error('Background function: Error loading example evaluation JSON from alternative path:', altError);
      throw new Error('Failed to load example evaluation JSON');
    }
  }
  return cachedEvaluationExample;
};

// Process a job
const processJob = async (jobId: string, markdown: string, fileName: string) => {
  console.log(`Background function: Processing job ${jobId}`);
  
  // Update job status to processing
  const job = getJob(jobId);
  if (!job) {
    throw new Error(`Job ${jobId} not found`);
  }
  
  job.status = 'processing';
  job.updatedAt = Date.now();
  saveJob(job);
  
  try {
    // Load the rubric and example evaluation
    const WINES_SALES_RUBRIC = loadRubric();
    const EVALUATION_EXAMPLE = loadEvaluationExample();
    
    // Truncate conversation if needed
    const truncatedMarkdown = truncateConversation(markdown);
    
    // Prepare the system prompt for Claude
    const systemPrompt = `You are a wine sales performance evaluator. Analyze the conversation and score it according to the rubric. Provide objective assessments based solely on the evidence.`;
    
    // Prepare the user prompt
    const userPrompt = `Evaluate this wine tasting conversation against the rubric. Format as JSON with these fields:
- staffName (from conversation)
- date (YYYY-MM-DD)
- overallScore (number)
- performanceLevel (string)
- criteriaScores (array of 10 items with criterion, weight, score, weightedScore, notes)
- strengths (3 strings)
- areasForImprovement (3 strings)
- keyRecommendations (3 strings)

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
6. Write notes for each criterion

Conversation to evaluate:
${truncatedMarkdown}

Return ONLY THE JSON with no additional text.`;
    
    console.log('Background function: Calling Claude API');
    console.log(`Background function: Prompt size: ${userPrompt.length} characters`);
    
    // Call Claude API with streaming
    const stream = await anthropic.messages.create({
      model: "claude-3-haiku-20240307", // Using Haiku instead of Opus for faster processing
      max_tokens: 2000, // Reduced from 3000
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: userPrompt
        }
      ],
      temperature: 0.2,
      stream: true // Enable streaming
    });
    
    console.log('Background function: Claude API stream created');
    
    // Process the stream
    let responseText = '';
    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        responseText += chunk.delta.text;
        
        // Update job with progress
        job.status = 'processing';
        job.updatedAt = Date.now();
        saveJob(job);
      }
    }
    
    console.log('Background function: Claude API response stream completed');
    
    if (!responseText) {
      throw new Error('Empty response from Claude API');
    }
    
    console.log('Background function: Extracting JSON from Claude response');
    // Extract JSON from Claude's response
    let evaluationData;
    try {
      // First try to extract JSON if it's wrapped in markdown code blocks
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        console.log('Background function: Found JSON in markdown code block');
        evaluationData = JSON.parse(jsonMatch[1].trim());
      } else {
        console.log('Background function: Parsing entire response as JSON');
        evaluationData = JSON.parse(responseText.trim());
      }
      
      console.log('Background function: Validating JSON structure');
      // Validate the structure of the received JSON
      const requiredFields = ['staffName', 'date', 'overallScore', 'performanceLevel', 
                             'criteriaScores', 'strengths', 'areasForImprovement', 'keyRecommendations'];
      
      for (const field of requiredFields) {
        if (!evaluationData[field]) {
          throw new Error(`Missing required field: ${field}`);
        }
      }
      
      // Ensure criteriaScores is properly formatted
      if (!Array.isArray(evaluationData.criteriaScores) || evaluationData.criteriaScores.length !== 10) {
        throw new Error('criteriaScores must be an array with 10 items');
      }
      
      // Convert overallScore to a number if it's a string
      if (typeof evaluationData.overallScore === 'string') {
        console.log('Background function: Converting overallScore from string to number');
        evaluationData.overallScore = parseInt(evaluationData.overallScore, 10);
      }
      
      console.log('Background function: JSON validation successful');
      
    } catch (error) {
      console.error('Background function: Error parsing or validating JSON from Claude response:', error);
      console.error('Background function: Claude response text:', responseText);
      throw new Error(`Failed to parse evaluation data: ${error instanceof Error ? error.message : 'Unknown parsing error'}`);
    }
    
    // Update job status to completed
    job.status = 'completed';
    job.result = evaluationData;
    job.updatedAt = Date.now();
    saveJob(job);
    
    console.log(`Background function: Job ${jobId} completed successfully`);
    return evaluationData;
  } catch (error) {
    console.error(`Background function: Error processing job ${jobId}:`, error);
    
    // Update job status to failed
    job.status = 'failed';
    job.error = error instanceof Error ? error.message : 'Unknown error';
    job.updatedAt = Date.now();
    saveJob(job);
    
    throw error;
  }
};

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  console.log('Background function: Handler started');
  
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
    
    // Process the job
    await processJob(jobId, markdown, fileName);
    
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Job processed successfully' })
    };
  } catch (error) {
    console.error('Background function: Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
}; 