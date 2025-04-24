import { EvaluationData } from '@/app/types/evaluation';

export async function saveEvaluation(conversationId: string, evaluationData: EvaluationData) {
  try {
    const response = await fetch(`/api/evaluations/${conversationId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(evaluationData),
    });

    if (!response.ok) {
      throw new Error('Failed to save evaluation');
    }

    return await response.json();
  } catch (error) {
    console.error('Error saving evaluation:', error);
    throw error;
  }
} 