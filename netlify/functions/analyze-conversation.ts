import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { v4 as uuidv4 } from 'uuid';
import { getStorageProvider, createJob, JobStatus } from '../../app/utils/storage';

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  console.log('Main function: Handler started', {
    httpMethod: event.httpMethod,
    pathPattern: event.path,
    hasBody: !!event.body,
    contentLength: event.body?.length
  });
  
  // Get the storage provider
  const storage = getStorageProvider();
  
  // For GET requests checking job status, add detailed logging
  if (event.httpMethod === 'GET') {
    const jobId = event.queryStringParameters?.jobId;
    console.log(`Main function: Checking status for job ${jobId || 'unknown'}`);
    
    if (!jobId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No job ID provided' })
      };
    }
    
    try {
      const job = await storage.getJob(jobId);
      console.log(`Main function: Job status:`, {
        found: !!job,
        status: job?.status,
        hasError: !!job?.error,
        hasResult: !!job?.result,
        createdAt: job?.createdAt ? new Date(job.createdAt).toISOString() : null,
        elapsedTime: job ? (Date.now() - job.createdAt) : null
      });
      
      // Add additional logging for completed jobs
      if (job?.status === 'completed' && job?.result) {
        console.log('Main function: Job result structure:', {
          hasStaffName: !!job.result.staffName,
          hasDate: !!job.result.date,
          hasOverallScore: !!job.result.overallScore,
          hasTotalScore: !!job.result.totalScore,
          criteriaCount: Array.isArray(job.result.criteriaScores) ? job.result.criteriaScores.length : 0,
          strengthsCount: Array.isArray(job.result.strengths) ? job.result.strengths.length : 0
        });
      }
      
      if (!job) {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: 'Job not found' })
        };
      }
      
      return {
        statusCode: 200,
        body: JSON.stringify(job)
      };
    } catch (error) {
      console.error('Main function: Error retrieving job:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to retrieve job status' })
      };
    }
  }
  
  // For POST requests starting a new job
  if (event.httpMethod === 'POST') {
    try {
      if (!event.body) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'No request body provided' })
        };
      }
      
      const { markdown, fileName } = JSON.parse(event.body);
      
      if (!markdown) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'No markdown content provided' })
        };
      }
      
      // Create a new job
      const job = createJob();
      
      try {
        await storage.saveJob(job);
        console.log(`Main function: Created new job ${job.id} for file ${fileName || 'unnamed'}`);
      } catch (storageError) {
        console.error('Main function: Error saving job:', storageError);
        return {
          statusCode: 500,
          body: JSON.stringify({ error: 'Failed to create job' })
        };
      }
      
      // Start the background job
      try {
        const response = await fetch(`${process.env.NETLIFY_DEV_URL || ''}/.netlify/functions/analyze-conversation-background`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            jobId: job.id,
            markdown,
            fileName
          })
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Main function: Background job failed to start: ${errorText}`);
          
          job.status = 'failed';
          job.error = `Failed to start background job: ${errorText}`;
          job.updatedAt = Date.now();
          await storage.saveJob(job);
          
          return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to start background job' })
          };
        }
        
        console.log(`Main function: Background job started for ${job.id}`);
        
        return {
          statusCode: 202,
          body: JSON.stringify({ jobId: job.id })
        };
      } catch (error) {
        console.error(`Main function: Error starting background job:`, error);
        
        job.status = 'failed';
        job.error = error instanceof Error ? error.message : 'Unknown error';
        job.updatedAt = Date.now();
        await storage.saveJob(job);
        
        return {
          statusCode: 500,
          body: JSON.stringify({ error: 'Failed to start background job' })
        };
      }
    } catch (error) {
      console.error('Main function: Error processing request:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Internal server error' })
      };
    }
  }
  
  return {
    statusCode: 405,
    body: JSON.stringify({ error: 'Method not allowed' })
  };
}; 