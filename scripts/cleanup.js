const { getStorageProvider } = require('../app/utils/storage');
const path = require('path');
const fs = require('fs').promises;

// Configuration
const MAX_AGE = parseInt(process.env.JOB_MAX_AGE || '86400000', 10); // Default 24 hours
const STORAGE_DIR = process.env.RENDER_STORAGE_DIR || '/var/data/storage';

async function cleanup() {
  console.log('Starting cleanup process...');
  console.log(`Storage directory: ${STORAGE_DIR}`);
  console.log(`Max age: ${MAX_AGE}ms (${MAX_AGE / (1000 * 60 * 60)} hours)`);
  
  try {
    // Initialize storage provider
    const storage = getStorageProvider();
    
    // Clean up expired jobs
    console.log('Cleaning up expired jobs...');
    const deletedJobs = await storage.cleanupExpiredJobs();
    console.log(`Deleted ${deletedJobs} expired jobs`);
    
    // Clean up orphaned files
    console.log('Checking for orphaned files...');
    const jobsDir = path.join(STORAGE_DIR, 'jobs');
    const rubricsDir = path.join(STORAGE_DIR, 'rubrics');
    
    // Get list of all jobs
    const jobs = await storage.listJobs();
    const jobIds = new Set(jobs.map(job => job.id));
    
    // Check jobs directory
    try {
      const files = await fs.readdir(jobsDir);
      let orphanedFiles = 0;
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const jobId = file.replace('.json', '');
          if (!jobIds.has(jobId)) {
            try {
              await fs.unlink(path.join(jobsDir, file));
              orphanedFiles++;
              console.log(`Deleted orphaned job file: ${file}`);
            } catch (error) {
              console.error(`Error deleting orphaned file ${file}:`, error);
            }
          }
        }
      }
      
      console.log(`Deleted ${orphanedFiles} orphaned job files`);
    } catch (error) {
      console.error('Error cleaning up jobs directory:', error);
    }
    
    // Clean up temporary files
    console.log('Cleaning up temporary files...');
    const tempFiles = [
      path.join(STORAGE_DIR, '.write-test'),
      path.join(STORAGE_DIR, 'temp'),
      path.join(STORAGE_DIR, 'tmp')
    ];
    
    for (const tempFile of tempFiles) {
      try {
        await fs.unlink(tempFile);
        console.log(`Deleted temporary file: ${tempFile}`);
      } catch (error) {
        // Ignore errors for non-existent files
        if (error.code !== 'ENOENT') {
          console.error(`Error deleting temporary file ${tempFile}:`, error);
        }
      }
    }
    
    // Verify storage directories
    console.log('Verifying storage directories...');
    const directories = [STORAGE_DIR, jobsDir, rubricsDir];
    
    for (const dir of directories) {
      try {
        await fs.access(dir);
        console.log(`Directory exists: ${dir}`);
        
        // Check permissions
        const stats = await fs.stat(dir);
        const mode = stats.mode & 0o777; // Get only permission bits
        if (mode !== 0o755) {
          console.log(`Fixing permissions for ${dir}`);
          await fs.chmod(dir, 0o755);
        }
      } catch (error) {
        if (error.code === 'ENOENT') {
          console.log(`Creating missing directory: ${dir}`);
          await fs.mkdir(dir, { recursive: true, mode: 0o755 });
        } else {
          console.error(`Error verifying directory ${dir}:`, error);
        }
      }
    }
    
    // Log storage usage
    console.log('Calculating storage usage...');
    let totalSize = 0;
    
    async function getDirectorySize(dir) {
      let size = 0;
      const files = await fs.readdir(dir);
      
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stats = await fs.stat(filePath);
        if (stats.isDirectory()) {
          size += await getDirectorySize(filePath);
        } else {
          size += stats.size;
        }
      }
      
      return size;
    }
    
    try {
      totalSize = await getDirectorySize(STORAGE_DIR);
      console.log(`Total storage usage: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    } catch (error) {
      console.error('Error calculating storage usage:', error);
    }
    
    console.log('Cleanup completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  }
}

// Run the cleanup
cleanup().catch(error => {
  console.error('Fatal error during cleanup:', error);
  process.exit(1);
}); 