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
    const body = await request.json();
    console.log('API: Request body:', JSON.stringify(body, null, 2));
    
    // Check if we have a markdown field (for backward compatibility)
    if (body.markdown) {
      console.log('API: Using markdown field for conversation');
      body.conversation = body.markdown;
    }
    
    const { conversation, staffName, date, rubricId, model } = body;
    
    console.log(`API: Analyzing conversation with model: ${model || 'claude'}`);
    
    if (!conversation) {
      console.error('API: Missing conversation in request body');
      return NextResponse.json(
        { error: 'Missing conversation in request body' },
        { status: 400 }
      );
    }
    
    console.log(`API: Conversation length: ${conversation.length} characters`);
    
    // Set default values for optional parameters
    const staffNameToUse = staffName || 'Staff Member';
    const dateToUse = date || new Date().toISOString().split('T')[0];
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
    }
    
    if (modelToUse === 'claude' && !process.env.CLAUDE_API_KEY) {
      console.error('API: CLAUDE_API_KEY environment variable is not set');
      return NextResponse.json(
        { error: 'CLAUDE_API_KEY environment variable is not set' },
        { status: 500 }
      );
    }
    
    let evaluation;
    
    if (modelToUse === 'gemini') {
      console.log('API: Using Gemini model for evaluation');
      try {
        evaluation = await evaluateWithGemini(conversation, rubricId);
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
        evaluation = await evaluateConversationInChunks(conversation, staffNameToUse, dateToUse, rubricId);
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
      result: evaluation,
      message: 'Evaluation completed successfully'
    });
  } catch (error) {
    console.error('API: Unexpected error in analyze-conversation route:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 }
    );
  }
} 