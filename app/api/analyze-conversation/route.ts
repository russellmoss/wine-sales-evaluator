import { NextRequest, NextResponse } from 'next/server';
import { evaluateConversationInChunks } from '../../utils/conversation-chunker';
import { evaluateWithGemini } from '../../utils/gemini-evaluator';
import { ModelType } from '../../components/ModelSelector';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { markdown, fileName, directEvaluation, rubricId, model = 'claude' } = body;

    if (!markdown) {
      return NextResponse.json({ error: 'No markdown content provided' }, { status: 400 });
    }

    if (directEvaluation) {
      console.log('Using direct evaluation with model:', model);
      
      let result;
      if (model === 'gemini') {
        result = await evaluateWithGemini(markdown, rubricId);
      } else {
        result = await evaluateConversationInChunks(markdown, 'Staff Member', new Date().toISOString(), rubricId);
      }

      return NextResponse.json({ result });
    }

    // Parse request body
    const { conversation, staffName, date } = body;

    // Validate input
    if (!conversation || typeof conversation !== 'string') {
      return NextResponse.json(
        { error: 'Invalid conversation format' },
        { status: 400 }
      );
    }

    if (!staffName || typeof staffName !== 'string') {
      return NextResponse.json(
        { error: 'Invalid staff name' },
        { status: 400 }
      );
    }

    if (!date || typeof date !== 'string') {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    // Process the conversation using chunked evaluation
    const evaluation = await evaluateConversationInChunks(
      conversation,
      staffName,
      date,
      rubricId
    );

    // Return the evaluation result
    return NextResponse.json(evaluation);
  } catch (error) {
    console.error('Error in analyze-conversation route:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: 500 }
    );
  }
} 