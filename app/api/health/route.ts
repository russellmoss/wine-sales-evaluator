import { NextResponse } from 'next/server';
import { getStorageProvider } from '../../../app/utils/storage';

export async function GET() {
  console.log('Health check: API route called');
  
  try {
    // Check environment variables
    const envVars = {
      NODE_ENV: process.env.NODE_ENV,
      CLAUDE_API_KEY: process.env.CLAUDE_API_KEY ? 'Set (not shown for security)' : 'Not set',
      JOB_STORAGE_TYPE: process.env.JOB_STORAGE_TYPE,
      JOB_MAX_AGE: process.env.JOB_MAX_AGE,
      NEXT_PUBLIC_USE_DIRECT_EVALUATION: process.env.NEXT_PUBLIC_USE_DIRECT_EVALUATION,
      NETLIFY: process.env.NETLIFY,
      RENDER: process.env.RENDER
    };
    
    console.log('Health check: Environment variables', envVars);
    
    // Check storage provider
    console.log('Health check: Initializing storage provider');
    const storageProvider = getStorageProvider();
    
    // List jobs to check if storage is working
    console.log('Health check: Listing jobs');
    const jobs = await storageProvider.listJobs();
    console.log('Health check: Jobs listed', { count: jobs.length });
    
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      storage: {
        type: process.env.JOB_STORAGE_TYPE || 'file',
        jobCount: jobs.length
      },
      envVars: {
        ...envVars,
        // Add more environment variables as needed
      }
    });
  } catch (error) {
    console.error('Health check: Error', error);
    
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 