import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

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

// Save a job to the filesystem
const saveJob = (job: JobStatus) => {
  ensureJobsDir();
  const jobPath = path.join(JOBS_DIR, `${job.id}.json`);
  fs.writeFileSync(jobPath, JSON.stringify(job, null, 2));
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
  console.log('Main function: Handler started');
  
  // Handle GET requests for checking job status
  if (event.httpMethod === 'GET') {
    const jobId = event.queryStringParameters?.jobId;
    
    if (!jobId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No job ID provided' })
      };
    }
    
    console.log(`Main function: Checking status for job ${jobId}`);
    const job = getJob(jobId);
    
    if (!job) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Job not found' })
      };
    }
    
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
  }
  
  // Handle POST requests for creating new jobs
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }
  
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
    const job: JobStatus = {
      id: uuidv4(),
      status: 'pending' as const,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    saveJob(job);
    console.log(`Main function: Created new job ${job.id}`);
    
    // Trigger the background processing
    try {
      // Use the Netlify function URL for the background processing
      const netlifyUrl = process.env.URL || 'http://localhost:8888';
      const backgroundFunctionUrl = `${netlifyUrl}/.netlify/functions/analyze-conversation-background`;
      
      console.log(`Main function: Calling background function at ${backgroundFunctionUrl}`);
      
      const response = await fetch(backgroundFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId: job.id,
          markdown,
          fileName
        })
      });
      
      if (!response.ok) {
        throw new Error(`Background function returned ${response.status}`);
      }
      
      console.log(`Main function: Background processing started for job ${job.id}`);
      
      // Return the job ID to the client
      return {
        statusCode: 202,
        body: JSON.stringify({
          message: 'Job created successfully',
          jobId: job.id
        })
      };
    } catch (error) {
      console.error('Main function: Error starting background processing:', error);
      
      // Update job status to failed
      job.status = 'failed' as const;
      job.error = error instanceof Error ? error.message : 'Failed to start background processing';
      job.updatedAt = Date.now();
      saveJob(job);
      
      throw error;
    }
  } catch (error) {
    console.error('Main function: Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
}; 