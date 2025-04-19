import { NextRequest, NextResponse } from 'next/server';
import { EdgeStorageProvider, JobStatus } from '@/app/utils/edge-storage';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Get the job ID from the request body
    const { jobId } = await request.json();
    
    if (!jobId) {
      return NextResponse.json({ 
        error: 'Job ID is required' 
      }, { status: 400 });
    }

    // Initialize storage provider
    const storage = EdgeStorageProvider.getInstance();
    
    // Get the job
    const job = await storage.getJob(jobId);
    
    if (!job) {
      return NextResponse.json({ 
        error: 'Job not found' 
      }, { status: 404 });
    }

    // Update the job status to completed
    job.status = 'completed';
    job.updatedAt = new Date().toISOString();
    
    // Save the updated job
    await storage.saveJob(job);
    
    // Return the updated job
    return NextResponse.json(job);
    
  } catch (error) {
    console.error('Error in force-complete-job route:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 