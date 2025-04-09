import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Define the job status interface
export interface JobStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: any;
  error?: string;
  createdAt: number;
  updatedAt: number;
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

// File-based storage provider
export class FileStorageProvider implements StorageProvider {
  private jobsDir: string;
  private maxAge: number; // Maximum age of jobs in milliseconds

  constructor(jobsDir: string, maxAge: number) {
    this.jobsDir = jobsDir;
    this.maxAge = maxAge;
    this.ensureJobsDir();
  }

  private ensureJobsDir(): void {
    // Always use /tmp in Netlify environment
    if (process.env.NETLIFY === 'true') {
      this.jobsDir = '/tmp/jobs';
    }
    
    try {
      if (!fs.existsSync(this.jobsDir)) {
        console.log(`Creating jobs directory: ${this.jobsDir}`);
        fs.mkdirSync(this.jobsDir, { recursive: true });
      }
    } catch (error) {
      console.error(`Error creating jobs directory: ${this.jobsDir}`, error);
      
      // If original directory creation failed, always try /tmp/jobs as fallback
      if (this.jobsDir !== '/tmp/jobs') {
        console.log('Falling back to /tmp/jobs directory');
        this.jobsDir = '/tmp/jobs';
        this.ensureJobsDir(); // Call recursively with new path
      } else {
        throw new Error(`Failed to create jobs directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  async saveJob(job: JobStatus): Promise<void> {
    this.ensureJobsDir();
    
    // Set expiration time if not already set
    if (!job.expiresAt) {
      job.expiresAt = Date.now() + this.maxAge;
    }
    
    const jobPath = path.join(this.jobsDir, `${job.id}.json`);
    
    try {
      await fs.promises.writeFile(jobPath, JSON.stringify(job, null, 2));
    } catch (error) {
      console.error(`Error saving job ${job.id}:`, error);
      throw new Error(`Failed to save job: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getJob(jobId: string): Promise<JobStatus | null> {
    this.ensureJobsDir();
    const jobPath = path.join(this.jobsDir, `${jobId}.json`);
    
    // Add debug logging
    console.log(`Storage: Checking for job file at: ${jobPath}`);
    console.log(`Storage: File exists: ${fs.existsSync(jobPath)}`);
    
    try {
      if (!fs.existsSync(jobPath)) {
        console.log(`Storage: Job file not found: ${jobPath}`);
        // List all files in the directory for debugging
        console.log(`Storage: Files in directory: ${fs.readdirSync(this.jobsDir)}`);
        return null;
      }
      
      const jobData = await fs.promises.readFile(jobPath, 'utf8');
      console.log(`Storage: Job data read, length: ${jobData.length}`);
      const job = JSON.parse(jobData) as JobStatus;
      
      // Check if job has expired
      if (job.expiresAt && job.expiresAt < Date.now()) {
        console.log(`Storage: Job ${jobId} has expired at ${new Date(job.expiresAt).toISOString()}`);
        return null;
      }
      
      console.log(`Storage: Successfully retrieved job ${jobId} with status: ${job.status}`);
      return job;
    } catch (error) {
      console.error(`Storage: Error reading job ${jobId}:`, error);
      return null;
    }
  }

  async listJobs(): Promise<JobStatus[]> {
    this.ensureJobsDir();
    
    try {
      const files = await fs.promises.readdir(this.jobsDir);
      const jobs: JobStatus[] = [];
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const jobId = file.replace('.json', '');
          const job = await this.getJob(jobId);
          if (job) {
            jobs.push(job);
          }
        }
      }
      
      return jobs;
    } catch (error) {
      console.error('Error listing jobs:', error);
      return [];
    }
  }

  async deleteJob(jobId: string): Promise<boolean> {
    this.ensureJobsDir();
    const jobPath = path.join(this.jobsDir, `${jobId}.json`);
    
    try {
      if (fs.existsSync(jobPath)) {
        await fs.promises.unlink(jobPath);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Error deleting job ${jobId}:`, error);
      return false;
    }
  }

  async cleanupExpiredJobs(): Promise<number> {
    this.ensureJobsDir();
    
    try {
      const files = await fs.promises.readdir(this.jobsDir);
      let deletedCount = 0;
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const jobId = file.replace('.json', '');
          const jobPath = path.join(this.jobsDir, file);
          
          try {
            const jobData = await fs.promises.readFile(jobPath, 'utf8');
            const job = JSON.parse(jobData) as JobStatus;
            
            if (job.expiresAt && job.expiresAt < Date.now()) {
              await fs.promises.unlink(jobPath);
              deletedCount++;
            }
          } catch (error) {
            console.error(`Error processing job file ${file}:`, error);
          }
        }
      }
      
      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up expired jobs:', error);
      return 0;
    }
  }
}

// Memory-based storage provider (for testing or development)
export class MemoryStorageProvider implements StorageProvider {
  private jobs: Map<string, JobStatus> = new Map();
  private maxAge: number;

  constructor(maxAge: number = 24 * 60 * 60 * 1000) { // Default: 24 hours
    this.maxAge = maxAge;
  }

  async saveJob(job: JobStatus): Promise<void> {
    // Set expiration time if not already set
    if (!job.expiresAt) {
      job.expiresAt = Date.now() + this.maxAge;
    }
    
    this.jobs.set(job.id, job);
  }

  async getJob(jobId: string): Promise<JobStatus | null> {
    const job = this.jobs.get(jobId);
    
    if (!job) {
      return null;
    }
    
    // Check if job has expired
    if (job.expiresAt && job.expiresAt < Date.now()) {
      this.jobs.delete(jobId);
      return null;
    }
    
    return job;
  }

  async listJobs(): Promise<JobStatus[]> {
    const now = Date.now();
    const jobs: JobStatus[] = [];
    
    // Convert Map entries to array before iterating
    const entries = Array.from(this.jobs.entries());
    for (const [id, job] of entries) {
      if (!job.expiresAt || job.expiresAt >= now) {
        jobs.push(job);
      } else {
        // Remove expired job
        this.jobs.delete(id);
      }
    }
    
    return jobs;
  }

  async deleteJob(jobId: string): Promise<boolean> {
    return this.jobs.delete(jobId);
  }

  async cleanupExpiredJobs(): Promise<number> {
    const now = Date.now();
    let deletedCount = 0;
    
    // Convert Map entries to array before iterating
    const entries = Array.from(this.jobs.entries());
    for (const [id, job] of entries) {
      if (job.expiresAt && job.expiresAt < now) {
        this.jobs.delete(id);
        deletedCount++;
      }
    }
    
    return deletedCount;
  }
}

// Factory function to create the appropriate storage provider
export function createStorageProvider(): StorageProvider {
  // Get storage configuration from environment variables
  const storageType = process.env.JOB_STORAGE_TYPE || 'file';
  
  // Always use /tmp for Netlify functions since it's the only writable directory
  const jobsDir = '/tmp/jobs';
  
  const maxAge = parseInt(process.env.JOB_MAX_AGE || '86400000', 10); // Default: 24 hours in milliseconds
  
  console.log(`Initializing ${storageType} storage provider with directory: ${jobsDir}`);
  
  switch (storageType.toLowerCase()) {
    case 'memory':
      return new MemoryStorageProvider(maxAge);
    case 'file':
    default:
      return new FileStorageProvider(jobsDir, maxAge);
  }
}

// Singleton instance of the storage provider
let storageProvider: StorageProvider | null = null;

// Get the storage provider instance
export function getStorageProvider(): StorageProvider {
  if (!storageProvider) {
    storageProvider = createStorageProvider();
  }
  return storageProvider;
}

// Helper function to create a new job
export function createJob(): JobStatus {
  return {
    id: uuidv4(),
    status: 'pending',
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
} 