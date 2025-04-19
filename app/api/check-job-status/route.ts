import { NextRequest, NextResponse } from 'next/server';
import { getStorageProvider } from '@/app/utils/storage';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const jobId = searchParams.get('jobId');

  if (!jobId) {
    return NextResponse.json({ error: 'No job ID provided' }, { status: 400 });
  }

  console.log(`Checking status for job: ${jobId}`);
  console.log('Environment:', process.env.NODE_ENV);
  console.log('Render environment:', process.env.RENDER === 'true' ? 'yes' : 'no');

  try {
    const storage = getStorageProvider();
    const jobData = await storage.getJob(jobId);
    
    if (!jobData) {
      console.log(`Job not found for ID: ${jobId}`);
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    console.log('Job data found:', {
      status: jobData.status,
      hasResult: !!jobData.result,
      error: jobData.error
    });

    return NextResponse.json(jobData);
  } catch (error) {
    console.error('Error checking job status:', error);
    return NextResponse.json(
      { error: 'Failed to check job status' },
      { status: 500 }
    );
  }
} 