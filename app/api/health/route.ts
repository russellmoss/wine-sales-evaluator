import { NextResponse } from 'next/server';
import { getStorageProvider } from '../../../app/utils/storage';
import { Anthropic } from '@anthropic-ai/sdk';

export async function GET() {
  console.log('Health check: API route called');
  
  try {
    // Check environment variables
    const envVars = {
      NODE_ENV: process.env.NODE_ENV,
      CLAUDE_API_KEY: process.env.CLAUDE_API_KEY ? 'Set (not shown for security)' : 'Not set',
      JOB_STORAGE_TYPE: process.env.JOB_STORAGE_TYPE,
      JOB_MAX_AGE: process.env.JOB_MAX_AGE,
      RENDER: process.env.RENDER,
      RENDER_STORAGE_DIR: process.env.RENDER_STORAGE_DIR
    };
    
    console.log('Health check: Environment variables', envVars);
    
    // Check storage provider
    console.log('Health check: Initializing storage provider');
    const storage = getStorageProvider();
    let storageStatus = 'ok';
    let jobCount = 0;
    
    try {
      // Test storage by listing jobs
      console.log('Health check: Testing storage by listing jobs');
      const jobs = await storage.listJobs();
      jobCount = jobs.length;
      console.log('Health check: Storage test successful, found', jobCount, 'jobs');
    } catch (storageError) {
      console.error('Health check: Storage test failed', storageError);
      storageStatus = 'error';
    }
    
    // Check Claude API connectivity
    let claudeApiStatus = 'unknown';
    
    if (process.env.CLAUDE_API_KEY) {
      try {
        console.log('Health check: Testing Claude API connectivity');
        const anthropic = new Anthropic({
          apiKey: process.env.CLAUDE_API_KEY,
        });
        
        // Simple API check with minimal tokens
        const response = await Promise.race([
          anthropic.messages.create({
            model: "claude-3-7-sonnet-20250219",
            max_tokens: 10,
            messages: [{ role: "user", content: "Hello" }],
            temperature: 0,
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Claude API timeout')), 5000)
          )
        ]);
        
        claudeApiStatus = 'ok';
        console.log('Health check: Claude API connectivity successful');
      } catch (claudeError) {
        console.error('Health check: Claude API test failed', claudeError);
        claudeApiStatus = 'error';
      }
    } else {
      console.log('Health check: Claude API key not set, skipping connectivity test');
    }
    
    // Return comprehensive health status
    return NextResponse.json({
      status: storageStatus === 'ok' && (claudeApiStatus === 'ok' || claudeApiStatus === 'unknown') ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      render: process.env.RENDER === 'true',
      components: {
        storage: {
          status: storageStatus,
          type: process.env.JOB_STORAGE_TYPE || 'file',
          jobCount: jobCount
        },
        claudeApi: {
          status: claudeApiStatus
        }
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