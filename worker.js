const { getStorageProvider } = require('./app/utils/storage');
const { analyzeConversationWithClaude } = require('./app/utils/claude');

// Configuration
const POLLING_INTERVAL = process.env.WORKER_POLLING_INTERVAL || 5000; // 5 seconds
const MAX_CONCURRENT_JOBS = process.env.MAX_CONCURRENT_JOBS || 3;
const MAX_RETRIES = process.env.MAX_RETRIES || 3;

// Track active jobs
let activeJobs = new Set();

// Initialize storage
const storage = getStorageProvider();

async function processJob(job) {
  console.log(`Processing job ${job.id}`);
  
  try {
    // Update job status to processing
    job.status = 'processing';
    job.updatedAt = new Date().toISOString();
    await storage.saveJob(job);
    
    // Extract necessary information
    const { markdown, fileName, rubricId } = job;
    
    // Default values for staff name and date
    const staffName = fileName?.split('-')[0] || 'Unknown Staff';
    const date = new Date().toISOString().split('T')[0];
    
    // Analyze the conversation
    const result = await analyzeConversationWithClaude(
      markdown,
      staffName,
      date,
      rubricId
    );
    
    // Update job with success
    job.status = 'completed';
    job.result = result;
    job.updatedAt = new Date().toISOString();
    await storage.saveJob(job);
    
    console.log(`Job ${job.id} completed successfully`);
  } catch (error) {
    console.error(`Error processing job ${job.id}:`, error);
    
    // Increment retry count
    job.retryCount = (job.retryCount || 0) + 1;
    
    // Check if we should retry
    if (job.retryCount < MAX_RETRIES) {
      job.status = 'pending';
      job.error = error.message;
      job.errorDetails = {
        type: error.name,
        message: error.message,
        timestamp: new Date().toISOString()
      };
    } else {
      job.status = 'failed';
      job.error = 'Max retries exceeded';
      job.errorDetails = {
        type: 'MaxRetriesExceeded',
        message: `Failed after ${MAX_RETRIES} attempts. Last error: ${error.message}`,
        timestamp: new Date().toISOString()
      };
    }
    
    job.updatedAt = new Date().toISOString();
    await storage.saveJob(job);
  } finally {
    // Remove from active jobs
    activeJobs.delete(job.id);
  }
}

async function pollForJobs() {
  try {
    // Get all jobs
    const jobs = await storage.listJobs();
    
    // Filter for pending jobs that aren't already being processed
    const pendingJobs = jobs.filter(job => 
      job.status === 'pending' && 
      !activeJobs.has(job.id) &&
      (!job.retryCount || job.retryCount < MAX_RETRIES)
    );
    
    // Process up to MAX_CONCURRENT_JOBS
    const availableSlots = MAX_CONCURRENT_JOBS - activeJobs.size;
    const jobsToProcess = pendingJobs.slice(0, availableSlots);
    
    // Start processing jobs
    for (const job of jobsToProcess) {
      activeJobs.add(job.id);
      processJob(job).catch(console.error);
    }
  } catch (error) {
    console.error('Error polling for jobs:', error);
  }
}

// Start the polling loop
function startWorker() {
  console.log('Starting worker process...');
  console.log(`Polling interval: ${POLLING_INTERVAL}ms`);
  console.log(`Max concurrent jobs: ${MAX_CONCURRENT_JOBS}`);
  console.log(`Max retries: ${MAX_RETRIES}`);
  
  // Poll immediately
  pollForJobs();
  
  // Then set up regular polling
  setInterval(pollForJobs, POLLING_INTERVAL);
}

// Handle shutdown gracefully
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM. Shutting down gracefully...');
  
  // Wait for active jobs to complete (up to 30 seconds)
  const shutdownTimeout = setTimeout(() => {
    console.log('Shutdown timeout reached. Exiting forcefully.');
    process.exit(1);
  }, 30000);
  
  while (activeJobs.size > 0) {
    console.log(`Waiting for ${activeJobs.size} active jobs to complete...`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  clearTimeout(shutdownTimeout);
  console.log('All jobs completed. Shutting down.');
  process.exit(0);
});

// Start the worker
startWorker(); 