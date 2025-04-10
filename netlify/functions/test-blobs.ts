import { Handler } from '@netlify/functions';
import { getStorageProvider, JobStatus } from '../../app/utils/storage';

export const handler: Handler = async (event, context) => {
  console.log('Testing Blobs functionality...');
  
  try {
    // Initialize storage provider
    const storage = getStorageProvider();
    console.log('Storage provider initialized successfully');

    // Create a test job
    const testJob: JobStatus = {
      id: 'test-' + Date.now(),
      status: 'pending',
      markdown: 'Test markdown content',
      fileName: 'test.md',
      createdAt: Date.now().toString(),
      updatedAt: Date.now().toString()
    };

    // Save the test job
    await storage.saveJob(testJob);
    console.log('Test job saved successfully');

    // Retrieve the test job
    const retrievedJob = await storage.getJob(testJob.id);
    console.log('Test job retrieved successfully:', retrievedJob);

    // List all jobs
    const jobs = await storage.listJobs();
    console.log('Jobs listed successfully:', jobs);

    // Delete the test job
    await storage.deleteJob(testJob.id);
    console.log('Test job deleted successfully');

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Blobs test completed successfully',
        testJob,
        retrievedJob,
        jobsCount: jobs.length
      })
    };
  } catch (error) {
    console.error('Error testing Blobs:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to test Blobs functionality',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
}; 