import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import fs from 'fs';
import path from 'path';

// Define the job status interface
interface JobStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: any;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

// Define the path to the jobs directory
const JOBS_DIR = path.join(process.cwd(), 'tmp', 'jobs');

// Ensure the jobs directory exists
const ensureJobsDir = () => {
  if (!fs.existsSync(JOBS_DIR)) {
    fs.mkdirSync(JOBS_DIR, { recursive: true });
  }
};

// Get a job by ID
const getJob = (jobId: string): JobStatus | null => {
  ensureJobsDir();
  const jobPath = path.join(JOBS_DIR, `${jobId}.json`);
  
  if (!fs.existsSync(jobPath)) {
    return null;
  }
  
  try {
    const jobData = fs.readFileSync(jobPath, 'utf8');
    return JSON.parse(jobData) as JobStatus;
  } catch (error) {
    console.error(`Error reading job ${jobId}:`, error);
    return null;
  }
};

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  console.log('Check job status function: Handler started');
  
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }
  
  try {
    // Get the job ID from the query parameters
    const jobId = event.queryStringParameters?.jobId;
    
    if (!jobId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No job ID provided' })
      };
    }
    
    console.log(`Check job status function: Checking status for job ${jobId}`);
    
    // Get the job status
    const job = getJob(jobId);
    
    if (!job) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Job not found' })
      };
    }
    
    // Return the job status
    return {
      statusCode: 200,
      body: JSON.stringify({
        id: job.id,
        status: job.status,
        result: job.result,
        error: job.error,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt
      })
    };
  } catch (error) {
    console.error('Check job status function: Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
}; 