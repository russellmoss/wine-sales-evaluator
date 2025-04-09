import { Handler, HandlerEvent } from '@netlify/functions';
import { getStorageProvider, JobStatus } from '../../app/utils/storage';

export const handler: Handler = async (event: HandlerEvent) => {
  console.log('Check job status function: Handler started', {
    httpMethod: event.httpMethod,
    pathPattern: event.path,
    hasBody: !!event.body,
    contentLength: event.body?.length,
    queryParams: event.queryStringParameters
  });
  
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }
  
  const jobId = event.queryStringParameters?.jobId;
  
  if (!jobId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'No job ID provided' })
    };
  }
  
  console.log(`Checking status for job ID: ${jobId}`);
  
  // Get the KV storage provider
  const storage = getStorageProvider();
  
  try {
    const job = await storage.getJob(jobId);
    
    if (!job) {
      console.log(`Job not found with ID: ${jobId}`);
      return {
        statusCode: 404,
        body: JSON.stringify({ 
          error: 'Job not found',
          status: 'unknown',
          jobId: jobId
        })
      };
    }
    
    console.log(`Job found with status: ${job.status}`);
    return {
      statusCode: 200,
      body: JSON.stringify(job)
    };
  } catch (error) {
    console.error('Check job status function: Error retrieving job:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to retrieve job status',
        details: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        jobId: jobId
      })
    };
  }
}; 