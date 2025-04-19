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
    const { conversation, staffName, date, rubricId, model } = body;
    
    console.log(`API: Analyzing conversation with model: ${model || 'claude'}`);
    console.log(`API: Conversation length: ${conversation.length} characters`);
    
    if (!conversation) {
      console.error('API: Missing conversation in request body');
      return NextResponse.json(
        { error: 'Missing conversation in request body' },
        { status: 400 }
      );
    }
    
    if (!staffName) {
      console.error('API: Missing staffName in request body');
      return NextResponse.json(
        { error: 'Missing staffName in request body' },
        { status: 400 }
      );
    }
    
    if (!date) {
      console.error('API: Missing date in request body');
      return NextResponse.json(
        { error: 'Missing date in request body' },
        { status: 400 }
      );
    }
    
    // Check if we have the required API keys
    if (model === 'gemini' && !process.env.GEMINI_API_KEY) {
      console.error('API: GEMINI_API_KEY environment variable is not set');
      return NextResponse.json(
        { error: 'GEMINI_API_KEY environment variable is not set' },
        { status: 500 }
      );
    }
    
    if ((!model || model === 'claude') && !process.env.CLAUDE_API_KEY) {
      console.error('API: CLAUDE_API_KEY environment variable is not set');
      return NextResponse.json(
        { error: 'CLAUDE_API_KEY environment variable is not set' },
        { status: 500 }
      );
    }
    
    let evaluation;
    
    if (model === 'gemini') {
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
        evaluation = await evaluateConversationInChunks(conversation, staffName, date, rubricId);
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
    return NextResponse.json(evaluation);
  } catch (error) {
    console.error('API: Unexpected error in analyze-conversation route:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 }
    );
  }
} 