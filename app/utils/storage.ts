import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Define the job status interface
export interface JobStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'unknown' | 'api_error';
  result?: any;
  error?: string;
  errorDetails?: {
    type: string;
    message: string;
    timestamp: string;
    isTimeout?: boolean;
  };
  createdAt: string;
  updatedAt: string;
  expiresAt?: number; // Optional expiration timestamp
  markdown?: string; // The markdown content to analyze
  fileName?: string; // The name of the file being analyzed
}

// Storage provider interface
export interface StorageProvider {
  saveJob(job: JobStatus): Promise<void>;
  getJob(jobId: string): Promise<JobStatus | null>;
  listJobs(): Promise<JobStatus[]>;
  deleteJob(jobId: string): Promise<boolean>;
  cleanupExpiredJobs(): Promise<number>;
}

// Memory storage provider for local development
export class MemoryStorageProvider implements StorageProvider {
  private static instance: MemoryStorageProvider;
  private jobs: Map<string, JobStatus>;

  constructor() {
    this.jobs = new Map();
  }

  public static getInstance(): MemoryStorageProvider {
    if (!MemoryStorageProvider.instance) {
      MemoryStorageProvider.instance = new MemoryStorageProvider();
    }
    return MemoryStorageProvider.instance;
  }

  async saveJob(job: JobStatus): Promise<void> {
    console.log(`Memory Storage: Saving job ${job.id} with status ${job.status}`);
    this.jobs.set(job.id, job);
    console.log(`Memory Storage: Job ${job.id} saved successfully`);
  }

  async getJob(jobId: string): Promise<JobStatus | null> {
    console.log(`Memory Storage: Retrieving job ${jobId}`);
    const job = this.jobs.get(jobId);
    if (job) {
      console.log(`Memory Storage: Found job ${jobId} with status ${job.status}`);
    } else {
      console.log(`Memory Storage: Job ${jobId} not found`);
    }
    return job || null;
  }

  async listJobs(): Promise<JobStatus[]> {
    console.log('Memory Storage: Listing all jobs');
    return Array.from(this.jobs.values());
  }

  async deleteJob(jobId: string): Promise<boolean> {
    console.log(`Memory Storage: Deleting job ${jobId}`);
    const deleted = this.jobs.delete(jobId);
    console.log(`Memory Storage: Job ${jobId} ${deleted ? 'deleted successfully' : 'not found'}`);
    return deleted;
  }

  async cleanupExpiredJobs(): Promise<number> {
    console.log('Memory Storage: Cleaning up expired jobs');
    const now = Date.now();
    let count = 0;
    const entries = Array.from(this.jobs.entries());
    for (const [id, job] of entries) {
      if (job.expiresAt && job.expiresAt < now) {
        this.jobs.delete(id);
        count++;
      }
    }
    console.log(`Memory Storage: Cleaned up ${count} expired jobs`);
    return count;
  }
}

// File-based storage provider for local development
export class FileStorageProvider implements StorageProvider {
  private jobsDir: string;
  private maxAge: number;
  private retryAttempts: number;
  private retryDelay: number;

  constructor(jobsDir: string, maxAge: number) {
    this.jobsDir = jobsDir;
    this.maxAge = maxAge;
    this.retryAttempts = 3;
    this.retryDelay = 1000; // 1 second
    console.log(`FileStorageProvider: Initializing with jobsDir=${jobsDir}, maxAge=${maxAge}`);
    this.ensureJobsDir();
  }

  private ensureJobsDir(): void {
    try {
      console.log(`FileStorageProvider: Checking if jobs directory exists: ${this.jobsDir}`);
      if (!fs.existsSync(this.jobsDir)) {
        console.log(`FileStorageProvider: Creating jobs directory: ${this.jobsDir}`);
        fs.mkdirSync(this.jobsDir, { recursive: true });
        console.log(`FileStorageProvider: Jobs directory created successfully`);
      } else {
        console.log(`FileStorageProvider: Jobs directory already exists`);
        // Log directory contents for debugging
        const files = fs.readdirSync(this.jobsDir);
        console.log(`FileStorageProvider: Directory contains ${files.length} files:`, files);
      }
    } catch (error) {
      console.error(`FileStorageProvider: Error creating jobs directory: ${this.jobsDir}`, error);
      throw new Error(`Failed to create jobs directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Debug method to manually inspect job file content
   * @param jobId The ID of the job to inspect
   * @returns The raw file content and parsed job data, or null if not found
   */
  async debugJobFile(jobId: string): Promise<{ rawContent: string; parsedJob: JobStatus | null; filePath: string; fileStats: fs.Stats | null } | null> {
    this.ensureJobsDir();
    const jobPath = path.join(this.jobsDir, `${jobId}.json`);
    
    try {
      if (!fs.existsSync(jobPath)) {
        console.log(`FileStorageProvider: Debug - Job file not found: ${jobPath}`);
        return null;
      }
      
      console.log(`FileStorageProvider: Debug - Reading job file: ${jobPath}`);
      const fileStats = fs.statSync(jobPath);
      const rawContent = await fs.promises.readFile(jobPath, 'utf8');
      
      let parsedJob: JobStatus | null = null;
      try {
        parsedJob = JSON.parse(rawContent) as JobStatus;
      } catch (parseError) {
        console.error(`FileStorageProvider: Debug - Error parsing job JSON:`, parseError);
      }
      
      return {
        rawContent,
        parsedJob,
        filePath: jobPath,
        fileStats
      };
    } catch (error) {
      console.error(`FileStorageProvider: Debug - Error reading job file:`, error);
      return null;
    }
  }

  /**
   * Helper method to retry an operation with exponential backoff
   * @param operation The async operation to retry
   * @param operationName Name of the operation for logging
   * @returns The result of the operation
   */
  private async retryOperation<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`FileStorageProvider: ${operationName} failed (attempt ${attempt}/${this.retryAttempts}):`, lastError);
        
        if (attempt < this.retryAttempts) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
          console.log(`FileStorageProvider: Retrying ${operationName} in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError || new Error(`Failed to ${operationName} after ${this.retryAttempts} attempts`);
  }

  async saveJob(job: JobStatus): Promise<void> {
    this.ensureJobsDir();
    
    // Set expiration time if not already set
    if (!job.expiresAt) {
      job.expiresAt = Date.now() + this.maxAge;
    }
    
    const jobPath = path.join(this.jobsDir, `${job.id}.json`);
    
    try {
      console.log(`FileStorageProvider: Saving job ${job.id} to ${jobPath}`);
      console.log(`FileStorageProvider: Job data:`, JSON.stringify(job, null, 2));
      
      // Use retry mechanism for saving
      await this.retryOperation(
        async () => {
          await fs.promises.writeFile(jobPath, JSON.stringify(job, null, 2));
          
          // Verify the file was written
          if (!fs.existsSync(jobPath)) {
            throw new Error(`Job file was not created at ${jobPath}`);
          }
          
          const fileStats = fs.statSync(jobPath);
          if (fileStats.size === 0) {
            throw new Error(`Job file was created but is empty`);
          }
          
          console.log(`FileStorageProvider: Job file verification:`, {
            exists: true,
            size: fileStats.size,
            created: fileStats.birthtime,
            modified: fileStats.mtime
          });
        },
        `save job ${job.id}`
      );
      
      console.log(`FileStorageProvider: Job ${job.id} saved successfully`);
    } catch (error) {
      console.error(`FileStorageProvider: Error saving job ${job.id}:`, error);
      throw new Error(`Failed to save job: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getJob(jobId: string): Promise<JobStatus | null> {
    this.ensureJobsDir();
    const jobPath = path.join(this.jobsDir, `${jobId}.json`);
    
    try {
      if (!fs.existsSync(jobPath)) {
        console.log(`File Storage: Job file not found: ${jobPath}`);
        return null;
      }
      
      console.log(`File Storage: Reading job file: ${jobPath}`);
      
      // Use retry mechanism for reading
      const jobData = await this.retryOperation(
        async () => {
          const data = await fs.promises.readFile(jobPath, 'utf8');
          if (!data || data.trim() === '') {
            throw new Error(`Job file is empty or contains only whitespace`);
          }
          return data;
        },
        `read job ${jobId}`
      );
      
      let job: JobStatus;
      try {
        job = JSON.parse(jobData) as JobStatus;
      } catch (parseError) {
        console.error(`File Storage: Error parsing job JSON for ${jobId}:`, parseError);
        // Try to recover by reading the raw file for debugging
        const debugInfo = await this.debugJobFile(jobId);
        console.error(`File Storage: Debug info for corrupted job file:`, debugInfo);
        return null;
      }
      
      // Validate job structure
      if (!job.id || !job.status) {
        console.error(`File Storage: Job ${jobId} has invalid structure:`, job);
        return null;
      }
      
      // Check if job has expired
      if (job.expiresAt && job.expiresAt < Date.now()) {
        console.log(`File Storage: Job ${jobId} has expired at ${new Date(job.expiresAt).toISOString()}`);
        await this.deleteJob(jobId);
        return null;
      }
      
      console.log(`File Storage: Successfully retrieved job ${jobId} with status: ${job.status}`);
      return job;
    } catch (error) {
      console.error(`File Storage: Error reading job ${jobId}:`, error);
      return null;
    }
  }

  async listJobs(): Promise<JobStatus[]> {
    this.ensureJobsDir();
    
    try {
      console.log(`File Storage: Listing all jobs in ${this.jobsDir}`);
      const files = await fs.promises.readdir(this.jobsDir);
      const jobs: JobStatus[] = [];
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const jobId = file.replace('.json', '');
          try {
            const job = await this.getJob(jobId);
            if (job) {
              jobs.push(job);
            }
          } catch (error) {
            console.error(`File Storage: Error processing job file ${file}:`, error);
            // Continue with other files even if one fails
          }
        }
      }
      
      console.log(`File Storage: Found ${jobs.length} jobs`);
      return jobs;
    } catch (error) {
      console.error('File Storage: Error listing jobs:', error);
      return [];
    }
  }

  async deleteJob(jobId: string): Promise<boolean> {
    this.ensureJobsDir();
    const jobPath = path.join(this.jobsDir, `${jobId}.json`);
    
    try {
      if (!fs.existsSync(jobPath)) {
        console.log(`File Storage: Job file not found for deletion: ${jobPath}`);
        return false;
      }
      
      console.log(`File Storage: Deleting job file: ${jobPath}`);
      
      // Use retry mechanism for deletion
      await this.retryOperation(
        async () => {
          await fs.promises.unlink(jobPath);
          
          // Verify the file was deleted
          if (fs.existsSync(jobPath)) {
            throw new Error(`Job file still exists after deletion attempt`);
          }
        },
        `delete job ${jobId}`
      );
      
      console.log(`File Storage: Job ${jobId} deleted successfully`);
      return true;
    } catch (error) {
      console.error(`File Storage: Error deleting job ${jobId}:`, error);
      return false;
    }
  }

  async cleanupExpiredJobs(): Promise<number> {
    this.ensureJobsDir();
    
    try {
      console.log(`File Storage: Cleaning up expired jobs in ${this.jobsDir}`);
      const files = await fs.promises.readdir(this.jobsDir);
      let deletedCount = 0;
      let errorCount = 0;
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const jobId = file.replace('.json', '');
          const jobPath = path.join(this.jobsDir, file);
          
          try {
            const jobData = await fs.promises.readFile(jobPath, 'utf8');
            let job: JobStatus;
            
            try {
              job = JSON.parse(jobData) as JobStatus;
            } catch (parseError) {
              console.error(`File Storage: Error parsing job file ${file} during cleanup:`, parseError);
              errorCount++;
              continue;
            }
            
            if (job.expiresAt && job.expiresAt < Date.now()) {
              try {
                await fs.promises.unlink(jobPath);
                deletedCount++;
                console.log(`File Storage: Deleted expired job ${jobId}`);
              } catch (deleteError) {
                console.error(`File Storage: Error deleting expired job ${jobId}:`, deleteError);
                errorCount++;
              }
            }
          } catch (error) {
            console.error(`File Storage: Error processing job file ${file} during cleanup:`, error);
            errorCount++;
          }
        }
      }
      
      console.log(`File Storage: Cleaned up ${deletedCount} expired jobs (${errorCount} errors encountered)`);
      return deletedCount;
    } catch (error) {
      console.error('File Storage: Error cleaning up expired jobs:', error);
      return 0;
    }
  }
}

// Factory function to get the appropriate storage provider
export function getStorageProvider(): StorageProvider {
  const storageType = process.env.JOB_STORAGE_TYPE || 'file';
  const maxAge = parseInt(process.env.JOB_MAX_AGE || '86400000', 10);
  const isDev = process.env.NODE_ENV === 'development';

  console.log(`Initializing storage provider: type=${storageType}, isDev=${isDev}`);

  // Use file storage for both production and development
  const storageDir = process.env.NODE_ENV === 'production' 
    ? '/var/lib/app/jobs' 
    : path.join(process.cwd(), '.netlify', 'jobs');

  console.log(`Using file storage provider with directory: ${storageDir}`);
  return new FileStorageProvider(storageDir, maxAge);
}

// Helper function to create a new job
export function createJob(markdown?: string, fileName?: string): JobStatus {
  return {
    id: uuidv4(),
    status: 'pending',
    markdown,
    fileName,
    createdAt: Date.now().toString(),
    updatedAt: Date.now().toString()
  };
} 