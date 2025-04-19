import { NextRequest, NextResponse } from 'next/server';
import { evaluateConversationInChunks } from '../../utils/conversation-chunker';
import { evaluateWithGemini } from '@/app/utils/gemini-evaluator';
import { RubricApi } from '@/app/utils/rubric-api';

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
    
    if (!fileName) {
      console.error('API: No file name provided in request');
      return NextResponse.json({ error: 'No file name provided' }, { status: 400 });
    }
    
    // If direct evaluation is requested, evaluate directly without storing in file system
    if (directEvaluation) {
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
            direct: true // Add flag to indicate this is a direct evaluation
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
    
    // Check if we have a markdown field (for backward compatibility)
    if (markdown) {
      console.log('API: Using markdown field for conversation');
    }
    
    // Create a conversation object from the content
    const conversationObj = { 
      conversation: contentToAnalyze, 
      staffName: 'Staff Member', 
      date: new Date().toISOString().split('T')[0] 
    };
    
    console.log(`API: Analyzing conversation with model: ${model || 'claude'}`);
    
    if (!conversationObj.conversation) {
      console.error('API: Missing conversation in request body');
      return NextResponse.json(
        { error: 'Missing conversation in request body' },
        { status: 400 }
      );
    }
    
    console.log(`API: Conversation length: ${conversationObj.conversation.length} characters`);
    
    // Set default values for optional parameters
    const staffNameToUse = conversationObj.staffName || 'Staff Member';
    const dateToUse = conversationObj.date || new Date().toISOString().split('T')[0];
    const modelToUse = model?.toLowerCase() || 'claude';
    
    console.log(`API: Using staffName: ${staffNameToUse}`);
    console.log(`API: Using date: ${dateToUse}`);
    console.log(`API: Using model: ${modelToUse}`);
    
    // Check if we have the required API keys
    if (modelToUse === 'gemini') {
      if (!process.env.GEMINI_API_KEY) {
        console.error('API: GEMINI_API_KEY environment variable is not set');
        return NextResponse.json(
          { error: 'GEMINI_API_KEY environment variable is not set' },
          { status: 500 }
        );
      }
      
      // Skip the validation step and just log that we're using the API key
      console.log('API: Using Gemini API key for evaluation');
    } else if (modelToUse === 'claude') {
      if (!process.env.CLAUDE_API_KEY) {
        console.error('API: CLAUDE_API_KEY environment variable is not set');
        return NextResponse.json(
          { error: 'CLAUDE_API_KEY environment variable is not set' },
          { status: 500 }
        );
      }
    } else {
      console.error('API: Invalid model selected:', modelToUse);
      return NextResponse.json(
        { error: 'Invalid model selected. Must be either "claude" or "gemini".' },
        { status: 400 }
      );
    }
    
    let evaluation;
    
    if (modelToUse === 'gemini') {
      console.log('API: Using Gemini model for evaluation');
      try {
        evaluation = await evaluateWithGemini(conversationObj.conversation, rubricId);
        console.log('API: Gemini evaluation completed successfully');
      } catch (error) {
        console.error('API: Error evaluating with Gemini:', error);
        return NextResponse.json(
          { error: error instanceof Error ? error.message : 'Error evaluating with Gemini' },
          { status: 500 }
        );
      }
    } else {
      console.log('API: Using Claude model for evaluation');
      try {
        evaluation = await evaluateConversationInChunks(conversationObj.conversation, staffNameToUse, dateToUse, rubricId);
        console.log('API: Claude evaluation completed successfully');
      } catch (error) {
        console.error('API: Error evaluating with Claude:', error);
        return NextResponse.json(
          { error: error instanceof Error ? error.message : 'Error evaluating with Claude' },
          { status: 500 }
        );
      }
    }
    
    console.log('API: Returning evaluation result');
    // Always return a consistent response format
    return NextResponse.json({
      jobId: 'direct-' + Date.now(), // Generate a unique ID for direct evaluation
      result: {
        ...evaluation,
        model: modelToUse // Include the model used in the response
      },
      message: `Evaluation completed successfully using ${modelToUse}`
    });
  } catch (error) {
    console.error('API: Unexpected error in analyze-conversation route:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 }
    );
  }
} 