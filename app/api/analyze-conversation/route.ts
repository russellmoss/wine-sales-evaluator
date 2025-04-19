import { NextRequest, NextResponse } from 'next/server';
import { evaluateConversationInChunks } from '../../utils/conversation-chunker';
import { evaluateWithGemini } from '@/app/utils/gemini-evaluator';
import { RubricApi } from '@/app/utils/rubric-api';
import { EdgeStorageProvider, JobStatus, createJob } from '@/app/utils/edge-storage';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes

export async function POST(request: NextRequest) {
  console.log('API: analyze-conversation route called');
  
  try {
    // Log request headers
    console.log('API: Request headers:', JSON.stringify(Object.fromEntries(request.headers.entries()), null, 2));
    
    // Parse request body
    let body;
    try {
      body = await request.json();
      console.log('API: Request body parsed successfully');
    } catch (error) {
      console.error('API: Error parsing request body:', error);
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }
    
    // Log request body keys and content length
    console.log('API: Request body keys:', Object.keys(body));
    console.log('API: Request body markdown length:', body.markdown ? body.markdown.length : 0);
    console.log('API: Request body fileName:', body.fileName);
    console.log('API: Request body rubricId:', body.rubricId);
    console.log('API: Request body model:', body.model);
    console.log('API: Request body directEvaluation:', body.directEvaluation);
    
    const { markdown, conversation, fileName, rubricId, model = 'claude', directEvaluation } = body;
    
    // Use either markdown or conversation field
    const contentToAnalyze = markdown || conversation;
    
    console.log(`API: Analyzing conversation with model: ${model}`);
    console.log(`API: Content length: ${contentToAnalyze ? contentToAnalyze.length : 0}`);
    console.log(`API: File name: ${fileName}`);
    console.log(`API: Rubric ID: ${rubricId}`);
    console.log(`API: Direct evaluation: ${directEvaluation}`);
    
    if (!contentToAnalyze) {
      console.error('API: No content provided in request');
      return NextResponse.json({ error: 'No markdown content provided' }, { status: 400 });
    }
    
    // Generate a default file name if none is provided
    const fileNameToUse = fileName || `conversation-${Date.now()}.md`;
    console.log(`API: Using file name: ${fileNameToUse}`);
    
    // Determine if we should use direct evaluation
    const shouldUseDirectEvaluation = directEvaluation || 
                                    model === 'claude' || 
                                    (contentToAnalyze.length <= 50000);

    console.log(`API: Using ${shouldUseDirectEvaluation ? 'direct' : 'job-based'} evaluation`);

    // If direct evaluation is determined, evaluate directly without storing in file system
    if (shouldUseDirectEvaluation) {
      console.log('API: Performing direct evaluation...');
      
      if (model === 'gemini') {
        if (!process.env.GEMINI_API_KEY) {
          console.error('API: GEMINI_API_KEY environment variable is not set');
          return NextResponse.json({ error: 'GEMINI_API_KEY environment variable is not set' }, { status: 500 });
        }
        
        console.log('API: Using Gemini model for evaluation');
        try {
          const result = await evaluateWithGemini(contentToAnalyze, rubricId);
          console.log('API: Gemini evaluation completed successfully');
          console.log('API: Gemini result structure:', Object.keys(result));
          
          // Return the result directly without storing as a job
          const response = {
            result,
            model: 'gemini',
            direct: true // Add flag to indicate this is a direct evaluation
          };
          
          console.log('API: Returning direct Gemini response with keys:', Object.keys(response));
          return NextResponse.json(response);
        } catch (error) {
          console.error('API: Error evaluating with Gemini:', error);
          return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Error evaluating with Gemini' },
            { status: 500 }
          );
        }
      } else {
        // Handle Claude evaluation here
        console.log('API: Using Claude model for evaluation');
        try {
          const result = await evaluateConversationInChunks(contentToAnalyze, rubricId);
          console.log('API: Claude evaluation completed successfully');
          console.log('API: Claude result structure:', Object.keys(result));
          
          // Return the result directly without storing as a job
          const response = {
            result,
            model: 'claude',
            direct: true, // Add flag to indicate this is a direct evaluation
            message: 'Evaluation completed successfully using Claude'
          };
          
          console.log('API: Returning direct Claude response with keys:', Object.keys(response));
          return NextResponse.json(response);
        } catch (error) {
          console.error('API: Error evaluating with Claude:', error);
          return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Error evaluating with Claude' },
            { status: 500 }
          );
        }
      }
    }
    
    // For non-direct evaluation (job-based), create a job and store it
    console.log('API: Creating job for evaluation...');

    // Create a conversation object from the content
    const conversationObj = { 
      conversation: contentToAnalyze, 
      staffName: 'Staff Member', 
      date: new Date().toISOString().split('T')[0] 
    };
    
    if (!conversationObj.conversation) {
      console.error('API: Missing conversation in request body');
      return NextResponse.json(
        { error: 'Missing conversation in request body' },
        { status: 400 }
      );
    }
    
    // Set default values for optional parameters
    const staffNameToUse = conversationObj.staffName || 'Staff Member';
    const dateToUse = conversationObj.date || new Date().toISOString().split('T')[0];
    const modelToUse = model?.toLowerCase() || 'claude';
    
    // Create and store the job using EdgeStorageProvider
    const storage = EdgeStorageProvider.getInstance();
    const jobId = body.jobId || `job_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const job: JobStatus = {
      id: jobId,
      status: 'pending' as const,
      markdown: contentToAnalyze,
      fileName: fileNameToUse,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      rubricId,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24 hours from now
    };

    try {
      await storage.saveJob(job);
      console.log('API: Job created successfully:', jobId);
      
      return NextResponse.json({
        jobId,
        status: 'pending',
        message: `Job created successfully. Model: ${modelToUse}`
      });
    } catch (error) {
      console.error('API: Error creating job:', error);
      return NextResponse.json(
        { error: 'Failed to create job' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('API: Unexpected error in analyze-conversation route:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 }
    );
  }
} 