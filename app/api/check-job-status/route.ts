import { NextRequest, NextResponse } from 'next/server';
import { getStorageProvider } from '../../../app/utils/storage';

export async function GET(request: NextRequest) {
  try {
    // Get the jobId query parameter
    const jobId = request.nextUrl.searchParams.get('jobId');
    
    if (!jobId) {
      return NextResponse.json({ error: 'No job ID provided' }, { status: 400 });
    }
    
    // Initialize storage provider
    const storage = getStorageProvider();
    
    // Get the job from storage
    const job = await storage.getJob(jobId);
    
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    
    // Return the job status
    return NextResponse.json(job);
    
  } catch (error) {
    console.error('Error in check-job-status route:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 