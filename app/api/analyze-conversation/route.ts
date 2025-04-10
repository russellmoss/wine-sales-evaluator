import { NextRequest, NextResponse } from 'next/server';
import { Anthropic } from '@anthropic-ai/sdk';
import { getStorageProvider, createJob } from '../../../app/utils/storage';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Add detailed logging
console.log('API Route: analyze-conversation loaded');
console.log('Environment variables:', {
  NODE_ENV: process.env.NODE_ENV,
  CLAUDE_API_KEY: process.env.CLAUDE_API_KEY ? 'Set (not shown for security)' : 'Not set',
  JOB_STORAGE_TYPE: process.env.JOB_STORAGE_TYPE,
  JOB_MAX_AGE: process.env.JOB_MAX_AGE,
  NEXT_PUBLIC_USE_DIRECT_EVALUATION: process.env.NEXT_PUBLIC_USE_DIRECT_EVALUATION
});

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY || '',
});

// Load the evaluation rubric
const loadRubric = () => {
  try {
    const rubricPath = path.join(process.cwd(), 'public', 'data', 'wines_sales_rubric.md');
    console.log('API Route: Loading rubric from', rubricPath);
    const rubric = fs.readFileSync(rubricPath, 'utf8');
    console.log('API Route: Rubric loaded successfully');
    return rubric;
  } catch (error) {
    console.error('API Route: Error loading rubric:', error);
    return null;
  }
};

export async function POST(request: NextRequest) {
  console.log('API Route: POST request received');
  const requestId = crypto.randomUUID();
  console.log(`API Route: Request ID: ${requestId}`);
  
  try {
    // Parse the request body
    const body = await request.json();
    console.log('API Route: Request body parsed', { 
      hasMarkdown: !!body.markdown, 
      markdownLength: body.markdown?.length,
      fileName: body.fileName,
      requestId
    });
    
    const { markdown, fileName } = body;
    
    if (!markdown) {
      console.log(`API Route: Error - Markdown content is missing (Request ID: ${requestId})`);
      return NextResponse.json({ 
        error: 'Markdown content is required',
        requestId
      }, { status: 400 });
    }

    // Initialize storage provider
    console.log(`API Route: Initializing storage provider (Request ID: ${requestId})`);
    const storageProvider = getStorageProvider();
    
    // Create a new job
    console.log(`API Route: Creating new job (Request ID: ${requestId})`);
    const job = createJob(markdown, fileName);
    console.log(`API Route: Job created (Request ID: ${requestId}, Job ID: ${job.id})`);
    
    // Save the job
    console.log(`API Route: Saving job to storage (Request ID: ${requestId}, Job ID: ${job.id})`);
    await storageProvider.saveJob(job);
    console.log(`API Route: Job saved successfully (Request ID: ${requestId}, Job ID: ${job.id})`);
    
    // Load the evaluation rubric
    const rubric = loadRubric();
    
    // Process the conversation (simplified version of analyze-conversation-background)
    try {
      console.log(`API Route: Calling Claude API (Request ID: ${requestId}, Job ID: ${job.id})`);
      // Call Claude API
      const response = await anthropic.messages.create({
        model: "claude-3-7-sonnet-20250219",
        max_tokens: 8000,
        system: "You are a wine sales trainer evaluating a conversation between a winery staff member and guests. Your evaluation should be thorough, fair, and actionable. Provide detailed rationale for each criterion score with specific examples from the conversation.",
        messages: [
          { 
            role: "user", 
            content: `I need you to evaluate the wine tasting conversation below against the criteria in the evaluation rubric. Format your evaluation in JSON structure. Please follow these instructions:

1. Carefully analyze the conversation for evidence of each of the 10 weighted criteria in the rubric
2. Score each criterion on a scale of 1-5 based on the detailed descriptions in the rubric
3. Calculate the weighted score for each criterion (criterion score × weight)
4. Calculate the overall percentage score (sum of weighted scores ÷ 500 × 100)
5. Determine the performance level based on the score ranges in the rubric
6. Include 3 specific strengths demonstrated in the conversation
7. Include 3 specific areas for improvement
8. Provide 3 actionable recommendations
9. Write detailed notes for each criterion explaining the score with specific examples from the conversation

Output your evaluation in JSON format with the following fields:
* staffName (extracted from the conversation)
* date (from the conversation, format as YYYY-MM-DD)
* overallScore (as a number from 0-100)
* performanceLevel (based on score: Exceptional (90-100), Strong (80-89), Proficient (70-79), Developing (60-69), Needs Improvement (<60))
* criteriaScores (array of 10 objects with criterion, weight, score(1-5), weightedScore, and notes)
* strengths (array of 3 strengths)
* areasForImprovement (array of 3 areas)
* keyRecommendations (array of 3 recommendations)

For each criterion, provide detailed notes that include:
1. Specific examples from the conversation that demonstrate performance
2. What was done well and why it was effective
3. What could be improved with concrete suggestions
4. A fair score based on the evidence

The weighted score for each criterion should be calculated as: score × weight.
The overall score should be calculated as the sum of all weighted scores divided by the sum of all weights, to get a percentage.

Here's the evaluation rubric:

${rubric || `# Winery Sales Simulation Evaluation Rubric

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
| 5 | Memorable farewell that reinforces relationship and ensures future visits |`}

Here's the conversation to evaluate:
${markdown.substring(0, 30000)}${markdown.length > 30000 ? '...(truncated)' : ''}

Return ONLY the valid JSON with no additional explanation or text.`
          }
        ],
        temperature: 0.1
      });
      
      console.log(`API Route: Claude API response received (Request ID: ${requestId}, Job ID: ${job.id})`);
      
      // Extract result from Claude response
      const result = response.content[0].text;
      console.log(`API Route: Claude response text length: ${result.length} (Request ID: ${requestId}, Job ID: ${job.id})`);
      
      let evaluationData;
      
      try {
        console.log(`API Route: Attempting to parse Claude response as JSON (Request ID: ${requestId}, Job ID: ${job.id})`);
        evaluationData = JSON.parse(result);
        console.log(`API Route: Successfully parsed Claude response as JSON (Request ID: ${requestId}, Job ID: ${job.id})`);
      } catch (parseError) {
        console.log(`API Route: Failed to parse Claude response as JSON, attempting to extract JSON from text (Request ID: ${requestId}, Job ID: ${job.id})`);
        // Try to extract JSON from text if direct parsing fails
        const jsonMatch = result.match(/(\{[\s\S]*\})/);
        if (jsonMatch) {
          console.log(`API Route: Found JSON match in text, attempting to parse (Request ID: ${requestId}, Job ID: ${job.id})`);
          evaluationData = JSON.parse(jsonMatch[0]);
          console.log(`API Route: Successfully parsed extracted JSON (Request ID: ${requestId}, Job ID: ${job.id})`);
        } else {
          console.error(`API Route: Failed to extract JSON from Claude response (Request ID: ${requestId}, Job ID: ${job.id})`);
          throw new Error('Failed to parse evaluation result');
        }
      }
      
      // Update job with the result
      console.log(`API Route: Updating job with result (Request ID: ${requestId}, Job ID: ${job.id})`);
      job.status = 'completed';
      job.result = evaluationData;
      job.updatedAt = new Date().toISOString();
      await storageProvider.saveJob(job);
      console.log(`API Route: Job updated with result (Request ID: ${requestId}, Job ID: ${job.id})`);
      
      // Return the job ID to the client
      console.log(`API Route: Returning success response (Request ID: ${requestId}, Job ID: ${job.id})`);
      return NextResponse.json({ 
        jobId: job.id,
        message: 'Analysis job completed successfully',
        result: evaluationData,  // Include result directly for simplicity
        requestId
      });
      
    } catch (error) {
      console.error(`API Route: Error processing conversation (Request ID: ${requestId}, Job ID: ${job.id}):`, error);
      
      // Detailed error logging
      console.error({
        errorType: error instanceof Error ? error.constructor.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
        requestId,
        jobId: job.id
      });
      
      // Update job status to failed
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.updatedAt = new Date().toISOString();
      await storageProvider.saveJob(job);
      
      // Determine error message based on the type of error
      let errorMessage = 'Failed to process conversation';
      let statusCode = 500;
      
      if (error instanceof Error) {
        if (error.message.includes('Claude API') || error.message.includes('anthropic')) {
          errorMessage = 'Error communicating with Claude API. Please try again later.';
        } else if (error.message.includes('storage') || error.message.includes('file')) {
          errorMessage = 'Error saving analysis results. Please try again later.';
        } else if (error.message.includes('timeout') || error.message.includes('timed out')) {
          errorMessage = 'Analysis operation timed out. Please try again with a shorter conversation.';
          statusCode = 408; // Request Timeout
        }
      }
      
      return NextResponse.json({ 
        error: errorMessage,
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId,
        jobId: job.id
      }, { status: statusCode });
    }
    
  } catch (error) {
    console.error(`API Route: Error in analyze-conversation route (Request ID: ${requestId}):`, error);
    
    // Detailed error logging
    console.error({
      errorType: error instanceof Error ? error.constructor.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      requestId
    });
    
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      requestId
    }, { status: 500 });
  }
} 