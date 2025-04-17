import { NextRequest, NextResponse } from 'next/server';
import { Anthropic } from '@anthropic-ai/sdk';
import { v4 as uuidv4 } from 'uuid';
import { getStorageProvider } from '../../utils/storage';
import { validateEvaluationData } from '../../utils/validation';
import { RubricApi } from '../../utils/rubric-api';
import { JobStatus, JobResult } from '../../types/job';
import { EvaluationData } from '../../types/evaluation';

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

// Helper function to create a new job
function createJob(markdown: string, fileName: string): JobStatus {
  const jobId = uuidv4();
  const now = new Date().toISOString();
  const expiresAt = Date.now() + (parseInt(process.env.JOB_MAX_AGE || '86400000'));
  
  return {
    id: jobId,
    status: 'pending',
    markdown,
    fileName,
    createdAt: now,
    updatedAt: now,
    expiresAt,
    rubricId: undefined,
    result: undefined,
    error: undefined,
    errorDetails: undefined
  };
}

export async function POST(request: NextRequest) {
  console.log('API Route: POST request received');
  
  const requestId = uuidv4();
  console.log(`API Route: Request ID: ${requestId}`);
  
  try {
    // Parse the request body
    const body = await request.json();
    console.log('API Route: Request body parsed', { 
      hasMarkdown: !!body.markdown, 
      markdownLength: body.markdown?.length,
      fileName: body.fileName,
      rubricId: body.rubricId,
      requestId
    });
    
    const { markdown, fileName, directEvaluation, rubricId } = body;
    
    // Add input validation
    if (!markdown || markdown.trim().length < 100) { // Require at least 100 characters of content
      console.log('API Route: Markdown content too short or empty');
      return NextResponse.json(
        { 
          error: 'Invalid conversation content', 
          details: 'The conversation content is too short or empty. Please provide a complete conversation to analyze.' 
        },
        { status: 400 }
      );
    }
    
    // Check if the conversation section exists
    if (!markdown.includes('## Conversation') || !markdown.split('## Conversation')[1].trim()) {
      console.log('API Route: No conversation content found after ## Conversation marker');
      return NextResponse.json(
        { 
          error: 'Invalid conversation format', 
          details: 'No conversation content found. Please ensure the markdown includes a conversation section after the ## Conversation marker.' 
        },
        { status: 400 }
      );
    }
    
    // Create a new job
    const job = createJob(markdown, fileName);
    job.rubricId = rubricId;
    
    // Get the storage provider
    const storage = getStorageProvider();
    
    // Save the initial job
    await storage.saveJob(job);
    console.log(`API Route: Job ${job.id} created (Request ID: ${requestId})`);
    
    // If direct evaluation is requested, process immediately
    if (directEvaluation) {
      console.log(`API Route: Direct evaluation requested (Request ID: ${requestId}, Job ID: ${job.id})`);
      
      // Load the selected rubric
      let rubric;
      try {
        if (rubricId) {
          console.log(`API Route: Loading rubric ${rubricId}`);
          rubric = await RubricApi.getRubric(rubricId);
          if (!rubric) {
            console.log(`API Route: Rubric ${rubricId} not found, falling back to default`);
          }
        }
        
        if (!rubric) {
          console.log('API Route: Loading default rubric');
          const rubrics = await RubricApi.listRubrics();
          rubric = rubrics.find(r => r.isDefault) || rubrics[0];
          if (!rubric) {
            throw new Error('No rubrics found in the system');
          }
        }
      } catch (error) {
        console.error('API Route: Error loading rubric:', error);
        return NextResponse.json(
          { error: 'Failed to load evaluation rubric' },
          { status: 500 }
        );
      }
      
      // Process the conversation
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
              content: `I need you to evaluate the wine tasting conversation below using the provided rubric. Format your evaluation in JSON structure. Please follow these instructions:

1. Use ONLY the criteria and scoring guidelines from the provided rubric
2. Score each criterion on a scale of 1-5 based on the detailed descriptions in the rubric
3. Calculate the weighted score for each criterion (criterion score × weight)
4. Calculate the overall percentage score (sum of weighted scores ÷ total possible score × 100)
5. Determine the performance level based on the score ranges in the rubric
6. Include 3 specific strengths demonstrated in the conversation
7. Include 3 specific areas for improvement
8. Provide 3 actionable recommendations
9. Write detailed notes for each criterion explaining the score with specific examples

RUBRIC TO USE:
${JSON.stringify(rubric, null, 2)}

CONVERSATION TO EVALUATE:
${markdown.substring(0, 30000)}${markdown.length > 30000 ? '...(truncated)' : ''}

Return ONLY the valid JSON with the following structure:
{
  "staffName": "string (extracted from conversation)",
  "date": "string (YYYY-MM-DD format)",
  "overallScore": "number (0-100)",
  "performanceLevel": "string (based on rubric levels)",
  "criteriaScores": [
    {
      "criterion": "string (exact name from rubric)",
      "weight": "number (from rubric)",
      "score": "number (1-5)",
      "weightedScore": "number",
      "notes": "string (detailed justification)"
    }
  ],
  "strengths": ["string", "string", "string"],
  "areasForImprovement": ["string", "string", "string"],
  "keyRecommendations": ["string", "string", "string"],
  "rubricId": "${rubric.id}"
}`
            }
          ],
          temperature: 0.1
        });
        
        console.log(`API Route: Claude API response received (Request ID: ${requestId}, Job ID: ${job.id})`);
        
        // Parse the response
        let evaluationData: EvaluationData;
        try {
          // Get the text content from the response
          const content = response.content[0];
          const responseText = typeof content === 'object' && 'text' in content ? content.text : String(content);
          
          console.log('API Route: Raw response:', responseText.substring(0, 500) + '...');
          
          // Try to parse the response as JSON
          try {
            evaluationData = JSON.parse(responseText);
          } catch (parseError) {
            // If direct parsing fails, try to extract JSON from the response
            console.log('API Route: Direct JSON parse failed, trying to extract JSON');
            const jsonMatch = responseText.match(/(\{[\s\S]*\})/);
            if (!jsonMatch) {
              throw new Error('No valid JSON found in response');
            }
            evaluationData = JSON.parse(jsonMatch[1]);
          }
          
          console.log('API Route: Successfully parsed response into JSON');
        } catch (error) {
          console.error('API Route: Error parsing response:', error);
          throw new Error(`Failed to parse API response: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        
        // Validate the evaluation data
        const validationResult = validateEvaluationData(evaluationData);
        if (!validationResult.isValid) {
          console.warn('API Route: Validation issues found:', validationResult.errors);
          throw new Error(`Invalid evaluation data: ${validationResult.errors.join(', ')}`);
        }
        
        // Create the job result
        const jobResult: JobResult = {
          evaluation: validationResult.data,
          metadata: {
            processingTime: Date.now() - new Date(job.createdAt).getTime(),
            modelVersion: 'claude-3-7-sonnet-20250219'
          }
        };
        
        // Update job with the result
        job.status = 'completed';
        job.result = jobResult;
        job.updatedAt = new Date().toISOString();
        await storage.saveJob(job);
        
        console.log(`API Route: Job ${job.id} completed successfully`);
        
        // Return both the evaluation data and the full job result
        return NextResponse.json({ 
          result: validationResult.data,
          jobResult: jobResult
        });
        
      } catch (error) {
        console.error('API Route: Error processing request:', error);
        
        // Update job with error details
        job.status = 'failed';
        job.error = error instanceof Error ? error.message : 'Unknown error';
        job.errorDetails = {
          type: error instanceof Error ? error.constructor.name : 'UnknownError',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        };
        job.updatedAt = new Date().toISOString();
        
        await storage.saveJob(job);
        
        return NextResponse.json(
          { error: job.error, errorDetails: job.errorDetails },
          { status: 500 }
        );
      }
    }
    
    // For background processing, return the job ID
    return NextResponse.json({
      message: 'Job created successfully',
      jobId: job.id
    });
    
  } catch (error) {
    console.error(`API Route: Error handling request (Request ID: ${requestId}):`, error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 