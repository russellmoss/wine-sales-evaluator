import { Handler } from '@netlify/functions';
import { getStorageProvider, createJob } from '../../app/utils/storage';

/**
 * Force complete a pending job for debugging purposes
 * This endpoint allows manually setting a job to completed status
 * 
 * @param event The Netlify function event
 * @returns Response with the updated job status
 */
const handler: Handler = async (event) => {
  console.log(`[${new Date().toISOString()}] Force complete job request received`);

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { jobId } = JSON.parse(event.body || '{}');

    if (!jobId) {
      console.error(`[${new Date().toISOString()}] No jobId provided in request`);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'jobId is required' })
      };
    }

    const storage = getStorageProvider();
    const job = await storage.getJob(jobId);

    if (!job) {
      console.error(`[${new Date().toISOString()}] Job ${jobId} not found`);
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Job not found' })
      };
    }

    if (job.status !== 'pending') {
      console.error(`[${new Date().toISOString()}] Job ${jobId} is not in pending state (current state: ${job.status})`);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Job is not in pending state' })
      };
    }

    // Create a mock evaluation result
    const mockEvaluation = {
      staffName: 'Test Staff',
      date: new Date().toISOString(),
      overallScore: 85,
      criteriaScores: {
        greeting: { score: 90, notes: 'Excellent greeting' },
        needsAssessment: { score: 85, notes: 'Good needs assessment' },
        productKnowledge: { score: 80, notes: 'Solid product knowledge' },
        closing: { score: 85, notes: 'Effective closing' }
      },
      strengths: ['Professional demeanor', 'Good product knowledge'],
      areasForImprovement: ['Could ask more follow-up questions'],
      keyRecommendations: ['Practice more follow-up questions']
    };

    // Update the job with the mock evaluation
    const updatedJob = {
      ...job,
      status: 'completed' as const,
      result: mockEvaluation,
      updatedAt: Date.now().toString()
    };

    await storage.saveJob(updatedJob);

    console.log(`[${new Date().toISOString()}] Successfully force completed job ${jobId}`);
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Job force completed successfully', job: updatedJob })
    };

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error force completing job:`, error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

export { handler }; 