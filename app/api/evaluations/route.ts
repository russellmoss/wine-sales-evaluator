import { NextResponse } from 'next/server';
import { getStorageProvider } from '@/app/utils/storage';
import { RubricEvaluation } from '@/app/utils/rubric-api';
import { Evaluation, EvaluationData, PerformanceLevel, getPerformanceLevel } from '@/app/types/evaluation';
import { v4 as uuidv4 } from 'uuid';

const storage = getStorageProvider();

// Helper function to convert rubric score to evaluation score
function convertRubricScoreToEvaluationScore(level: string): number {
  switch (level) {
    case 'Exceptional':
      return 5;
    case 'Strong':
      return 4;
    case 'Proficient':
      return 3;
    case 'Developing':
      return 2;
    case 'Needs Improvement':
      return 1;
    default:
      return 3; // Default to Proficient if unknown
  }
}

export async function POST(request: Request) {
  try {
    const rubricEvaluation: RubricEvaluation = await request.json();
    
    // Validate the evaluation
    if (!rubricEvaluation.rubricId || !rubricEvaluation.conversation || !rubricEvaluation.scores || !rubricEvaluation.overallScore) {
      return NextResponse.json(
        { error: 'Invalid evaluation data' },
        { status: 400 }
      );
    }

    // Convert RubricEvaluation to Evaluation
    const evaluation: Evaluation = {
      id: uuidv4(),
      data: {
        staffName: 'Manual Evaluation',
        date: new Date().toISOString().split('T')[0],
        overallScore: rubricEvaluation.overallScore,
        performanceLevel: getPerformanceLevel(rubricEvaluation.overallScore),
        criteriaScores: Object.entries(rubricEvaluation.scores).map(([criterion, level]) => ({
          criterion,
          weight: 10, // Default weight, should be fetched from rubric
          score: convertRubricScoreToEvaluationScore(level as unknown as string),
          weightedScore: 0, // Will be calculated
          notes: rubricEvaluation.notes[criterion] || ''
        })),
        observationalNotes: {
          productKnowledge: { score: 3, notes: '' },
          handlingObjections: { score: 3, notes: '' }
        },
        strengths: [],
        areasForImprovement: [],
        keyRecommendations: [],
        rubricId: rubricEvaluation.rubricId,
        criteria: Object.entries(rubricEvaluation.scores).reduce((acc, [criterion, level]) => {
          acc[criterion] = {
            score: convertRubricScoreToEvaluationScore(level as unknown as string),
            feedback: rubricEvaluation.notes[criterion] || ''
          };
          return acc;
        }, {} as Record<string, { score: number; feedback: string; }>)
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {
        model: 'manual',
        direct: true
      }
    };

    // Save the evaluation
    await storage.saveEvaluation(evaluation);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving evaluation:', error);
    return NextResponse.json(
      { error: 'Failed to save evaluation' },
      { status: 500 }
    );
  }
} 