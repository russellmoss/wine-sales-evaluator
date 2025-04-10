import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { getStorageProvider, JobStatus } from '../../app/utils/storage';
import path from 'path';
import fs from 'fs';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getJobWithRetry(storage: any, jobId: string, retryCount = 0): Promise<JobStatus | null> {
  try {
    return await storage.getJob(jobId);
  } catch (error) {
    if (retryCount < MAX_RETRIES && error instanceof Error && 
        (error.message.includes('timeout') || error.message.includes('network'))) {
      console.log(`Retry ${retryCount + 1}/${MAX_RETRIES} for job ${jobId} due to: ${error.message}`);
      await sleep(RETRY_DELAY_MS * (retryCount + 1));
      return getJobWithRetry(storage, jobId, retryCount + 1);
    }
    throw error;
  }
}

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  console.log('Check job status function: Handler started', {
    httpMethod: event.httpMethod,
    pathPattern: event.path,
    hasBody: !!event.body,
    contentLength: event.body ? event.body.length : undefined,
    queryParams: event.queryStringParameters
  });

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Get job ID from query parameters
    const jobId = event.queryStringParameters?.jobId;
    
    if (!jobId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing jobId parameter' })
      };
    }

    console.log(`Checking status for job ID: ${jobId}`);
    
    // Initialize storage provider
    const storage = getStorageProvider();
    
    // Try to get the job from storage
    let job = await storage.getJob(jobId);
    
    // If job not found in storage, check local files (for development)
    if (!job) {
      console.log(`Job not found in storage, checking local files for job ID: ${jobId}`);
      
      // Check if we're in development mode
      const isDev = process.env.NODE_ENV === 'development';
      if (isDev) {
        const jobsDir = path.join(process.cwd(), '.netlify', 'jobs');
        const jobFile = path.join(jobsDir, `${jobId}.json`);
        
        console.log(`Checking for local job file at: ${jobFile}`);
        
        if (fs.existsSync(jobFile)) {
          try {
            const jobData = JSON.parse(fs.readFileSync(jobFile, 'utf8'));
            job = jobData;
            console.log(`Found job in local file with status: ${job?.status || 'unknown'}`);
          } catch (error) {
            console.error(`Error reading local job file: ${error}`);
          }
        }
      }
    }
    
    if (job) {
      // Add 'api_error' to the valid status types
      const validStatuses = ['pending', 'processing', 'completed', 'failed', 'api_error'];
      
      if (!validStatuses.includes(job.status)) {
        console.warn(`Invalid job status '${job.status}' for job ${job.id}`);
        // Preserve the original status in the error field for debugging
        job.error = `Invalid status: ${job.status}`;
        job.status = 'failed';
        
        // Try to save the updated job status
        try {
          await storage.saveJob(job);
        } catch (saveError) {
          console.error(`Error saving updated job status: ${saveError}`);
        }
      }
      
      return {
        statusCode: 200,
        body: JSON.stringify(job)
      };
    } else {
      console.log(`Job not found with ID: ${jobId}`);
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Job not found' })
      };
    }
  } catch (error) {
    console.error('Error checking job status:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
}; 