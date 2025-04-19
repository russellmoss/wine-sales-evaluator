import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Rubric, createDefaultWineSalesRubric } from '../types/rubric';
import { EvaluationData } from '../types/evaluation';
import { JobResult } from '../types/job';

// Define the job status interface
export interface JobStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'unknown' | 'api_error';
  result?: JobResult;
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
  rubricId?: string; // New field to track which rubric was used for evaluation
}

// Storage provider interface
export interface StorageProvider {
  // Job management methods
  saveJob(job: JobStatus): Promise<void>;
  getJob(jobId: string): Promise<JobStatus | null>;
  listJobs(): Promise<JobStatus[]>;
  deleteJob(jobId: string): Promise<boolean>;
  cleanupExpiredJobs(): Promise<number>;
  
  // Rubric management methods
  saveRubric(rubric: Rubric): Promise<void>;
  getRubric(rubricId: string): Promise<Rubric | null>;
  listRubrics(): Promise<Rubric[]>;
  deleteRubric(rubricId: string): Promise<boolean>;
  getDefaultRubric(): Promise<Rubric | null>;
  setDefaultRubric(rubricId: string): Promise<boolean>;
}

// Memory storage provider for local development
export class MemoryStorageProvider implements StorageProvider {
  private static instance: MemoryStorageProvider;
  private jobs: Map<string, JobStatus>;
  private rubrics: Map<string, Rubric>;
  private defaultRubricId?: string;

  constructor() {
    this.jobs = new Map();
    this.rubrics = new Map();
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

  // New rubric management methods
  async saveRubric(rubric: Rubric): Promise<void> {
    console.log(`Memory Storage: Saving rubric ${rubric.id}`);
    this.rubrics.set(rubric.id, rubric);
    
    // Handle default rubric logic
    if (rubric.isDefault || !this.defaultRubricId) {
      this.defaultRubricId = rubric.id;
      
      // Ensure only one rubric is marked as default
      if (rubric.isDefault) {
        for (const [id, otherRubric] of this.rubrics.entries()) {
          if (id !== rubric.id && otherRubric.isDefault) {
            otherRubric.isDefault = false;
            this.rubrics.set(id, otherRubric);
          }
        }
      }
    }
    
    console.log(`Memory Storage: Rubric ${rubric.id} saved successfully`);
  }

  async getRubric(rubricId: string): Promise<Rubric | null> {
    console.log(`Memory Storage: Retrieving rubric ${rubricId}`);
    const rubric = this.rubrics.get(rubricId);
    
    if (rubric) {
      console.log(`Memory Storage: Found rubric ${rubricId}`);
    } else {
      console.log(`Memory Storage: Rubric ${rubricId} not found`);
    }
    
    return rubric || null;
  }

  async listRubrics(): Promise<Rubric[]> {
    console.log('Memory Storage: Listing all rubrics');
    return Array.from(this.rubrics.values());
  }

  async deleteRubric(rubricId: string): Promise<boolean> {
    console.log(`Memory Storage: Deleting rubric ${rubricId}`);
    
    // Check if this is the default rubric
    if (this.defaultRubricId === rubricId) {
      // Find another rubric to set as default
      const otherRubrics = Array.from(this.rubrics.values())
        .filter(r => r.id !== rubricId);
        
      if (otherRubrics.length > 0) {
        // Set the first available rubric as default
        this.defaultRubricId = otherRubrics[0].id;
        otherRubrics[0].isDefault = true;
        this.rubrics.set(otherRubrics[0].id, otherRubrics[0]);
      } else {
        // No other rubrics, clear default
        this.defaultRubricId = undefined;
      }
    }
    
    const deleted = this.rubrics.delete(rubricId);
    console.log(`Memory Storage: Rubric ${rubricId} ${deleted ? 'deleted successfully' : 'not found'}`);
    return deleted;
  }

  async getDefaultRubric(): Promise<Rubric | null> {
    console.log('Memory Storage: Retrieving default rubric');
    
    if (!this.defaultRubricId) {
      console.log('Memory Storage: No default rubric set');
      return null;
    }
    
    const defaultRubric = this.rubrics.get(this.defaultRubricId);
    
    if (defaultRubric) {
      console.log(`Memory Storage: Found default rubric ${this.defaultRubricId}`);
    } else {
      console.log(`Memory Storage: Default rubric ${this.defaultRubricId} not found`);
    }
    
    return defaultRubric || null;
  }

  async setDefaultRubric(rubricId: string): Promise<boolean> {
    console.log(`Memory Storage: Setting default rubric to ${rubricId}`);
    
    const rubric = this.rubrics.get(rubricId);
    if (!rubric) {
      console.log(`Memory Storage: Rubric ${rubricId} not found, cannot set as default`);
      return false;
    }
    
    // Update all rubrics to ensure only one is marked as default
    for (const [id, otherRubric] of this.rubrics.entries()) {
      if (id === rubricId) {
        otherRubric.isDefault = true;
      } else {
        otherRubric.isDefault = false;
      }
      this.rubrics.set(id, otherRubric);
    }
    
    this.defaultRubricId = rubricId;
    console.log(`Memory Storage: Rubric ${rubricId} set as default successfully`);
    return true;
  }
}

// File-based storage provider for local development
export class FileStorageProvider implements StorageProvider {
  private jobsDir: string;
  private rubricsDir: string;
  private maxAge: number;
  private retryAttempts: number;
  private retryDelay: number;

  constructor(jobsDir: string, maxAge: number) {
    this.jobsDir = path.join(jobsDir, 'jobs');
    this.rubricsDir = path.join(jobsDir, 'rubrics');
    this.maxAge = maxAge;
    this.retryAttempts = 3;
    this.retryDelay = 1000;
    console.log(`FileStorageProvider: Initializing with jobsDir=${this.jobsDir}, rubricsDir=${this.rubricsDir}, maxAge=${maxAge}`);
    this.ensureJobsDir();
    this.ensureRubricsDir();
  }

  private ensureJobsDir(): void {
    try {
      // Check if directory exists
      if (!fs.existsSync(this.jobsDir)) {
        console.log(`File Storage: Creating jobs directory at ${this.jobsDir}`);
        fs.mkdirSync(this.jobsDir, { recursive: true, mode: 0o755 });
      }

      // Verify directory permissions
      const stats = fs.statSync(this.jobsDir);
      const canWrite = stats.mode & fs.constants.W_OK;
      if (!canWrite) {
        console.error(`File Storage: No write permission for jobs directory ${this.jobsDir}`);
        throw new Error(`No write permission for jobs directory ${this.jobsDir}`);
      }

      // Test write access with a temporary file
      const testFile = path.join(this.jobsDir, '.write-test');
      fs.writeFileSync(testFile, 'test', { mode: 0o644 });
      fs.unlinkSync(testFile);

      console.log(`File Storage: Jobs directory ${this.jobsDir} is ready`);
    } catch (error) {
      console.error(`File Storage: Failed to ensure jobs directory ${this.jobsDir}:`, error);
      throw new Error(`Failed to ensure jobs directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private ensureRubricsDir(): void {
    try {
      // Check if directory exists
      if (!fs.existsSync(this.rubricsDir)) {
        console.log(`File Storage: Creating rubrics directory at ${this.rubricsDir}`);
        fs.mkdirSync(this.rubricsDir, { recursive: true, mode: 0o755 });
      }

      // Verify directory permissions
      const stats = fs.statSync(this.rubricsDir);
      const canWrite = stats.mode & fs.constants.W_OK;
      if (!canWrite) {
        console.error(`File Storage: No write permission for rubrics directory ${this.rubricsDir}`);
        throw new Error(`No write permission for rubrics directory ${this.rubricsDir}`);
      }

      // Test write access with a temporary file
      const testFile = path.join(this.rubricsDir, '.write-test');
      fs.writeFileSync(testFile, 'test', { mode: 0o644 });
      fs.unlinkSync(testFile);

      console.log(`File Storage: Rubrics directory ${this.rubricsDir} is ready`);
    } catch (error) {
      console.error(`File Storage: Failed to ensure rubrics directory ${this.rubricsDir}:`, error);
      throw new Error(`Failed to ensure rubrics directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

  private sanitizeJobId(jobId: string): string {
    // Remove any potentially unsafe characters from the job ID
    return jobId.replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  private getJobPath(jobId: string): string {
    const safeJobId = this.sanitizeJobId(jobId);
    return path.join(this.jobsDir, `${safeJobId}.json`);
  }

  private async atomicWrite(filePath: string, data: string): Promise<void> {
    const tempPath = `${filePath}.tmp`;
    try {
      // Write to temporary file first
      await fs.promises.writeFile(tempPath, data, { mode: 0o644 });
      
      // Rename is atomic on most filesystems
      await fs.promises.rename(tempPath, filePath);
    } catch (error) {
      // Clean up temp file if it exists
      try {
        if (fs.existsSync(tempPath)) {
          await fs.promises.unlink(tempPath);
        }
      } catch (cleanupError) {
        console.error(`File Storage: Error cleaning up temp file ${tempPath}:`, cleanupError);
      }
      throw error;
    }
  }

  async saveJob(job: JobStatus): Promise<void> {
    this.ensureJobsDir();
    
    // Set expiration time if not already set
    if (!job.expiresAt) {
      job.expiresAt = Date.now() + this.maxAge;
    }
    
    // Use sanitized job ID for the file path
    const jobPath = this.getJobPath(job.id);
    
    try {
      console.log(`File Storage: Saving job ${job.id} to ${jobPath}`);
      console.log(`File Storage: Job data:`, JSON.stringify(job, null, 2));
      
      // Use retry mechanism for saving with atomic write
      await this.retryOperation(
        async () => {
          await this.atomicWrite(jobPath, JSON.stringify(job, null, 2));
          
          // Verify the file was written
          if (!fs.existsSync(jobPath)) {
            throw new Error(`Job file was not created at ${jobPath}`);
          }
          
          const fileStats = fs.statSync(jobPath);
          if (fileStats.size === 0) {
            throw new Error(`Job file was created but is empty`);
          }
          
          console.log(`File Storage: Job file verification:`, {
            exists: true,
            size: fileStats.size,
            created: fileStats.birthtime,
            modified: fileStats.mtime
          });
        },
        `save job ${job.id}`
      );
      
      console.log(`File Storage: Job ${job.id} saved successfully`);
    } catch (error) {
      console.error(`File Storage: Error saving job ${job.id}:`, error);
      throw new Error(`Failed to save job: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getJob(jobId: string): Promise<JobStatus | null> {
    this.ensureJobsDir();
    
    // Use sanitized job ID for the file path
    const jobPath = this.getJobPath(jobId);
    
    try {
      if (!fs.existsSync(jobPath)) {
        console.log(`File Storage: Job file not found: ${jobPath}`);
        
        // If the job ID contains a timestamp, try to find it by listing all files
        if (jobId.includes('_')) {
          console.log(`File Storage: Job ID contains timestamp, searching all files for match`);
          const files = await fs.promises.readdir(this.jobsDir);
          
          for (const file of files) {
            if (file.endsWith('.json')) {
              const fileJobId = file.replace('.json', '');
              if (fileJobId === jobId) {
                console.log(`File Storage: Found matching job file: ${file}`);
                const jobData = await fs.promises.readFile(path.join(this.jobsDir, file), 'utf8');
                return JSON.parse(jobData) as JobStatus;
              }
            }
          }
        }
        
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

  // Rubric management methods
  async saveRubric(rubric: Rubric): Promise<void> {
    this.ensureRubricsDir();
    
    const rubricPath = path.join(this.rubricsDir, `${rubric.id}.json`);
    
    try {
      console.log(`FileStorageProvider: Saving rubric ${rubric.id} to ${rubricPath}`);
      
      // Handle default rubric logic
      if (rubric.isDefault) {
        // If this rubric is being set as default, ensure no other rubric is marked as default
        const existingRubrics = await this.listRubrics();
        for (const existingRubric of existingRubrics) {
          if (existingRubric.id !== rubric.id && existingRubric.isDefault) {
            existingRubric.isDefault = false;
            await this.saveRubric(existingRubric);
          }
        }
      }
      
      // Use retry mechanism for saving
      await this.retryOperation(
        async () => {
          await fs.promises.writeFile(rubricPath, JSON.stringify(rubric, null, 2));
          
          // Verify the file was written
          if (!fs.existsSync(rubricPath)) {
            throw new Error(`Rubric file was not created at ${rubricPath}`);
          }
          
          const fileStats = fs.statSync(rubricPath);
          if (fileStats.size === 0) {
            throw new Error(`Rubric file was created but is empty`);
          }
        },
        `save rubric ${rubric.id}`
      );
      
      console.log(`FileStorageProvider: Rubric ${rubric.id} saved successfully`);
    } catch (error) {
      console.error(`FileStorageProvider: Error saving rubric ${rubric.id}:`, error);
      throw new Error(`Failed to save rubric: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getRubric(rubricId: string): Promise<Rubric | null> {
    this.ensureRubricsDir();
    const rubricPath = path.join(this.rubricsDir, `${rubricId}.json`);
    
    try {
      if (!fs.existsSync(rubricPath)) {
        console.log(`File Storage: Rubric file not found: ${rubricPath}`);
        return null;
      }
      
      console.log(`File Storage: Reading rubric file: ${rubricPath}`);
      
      // Use retry mechanism for reading
      const rubricData = await this.retryOperation(
        async () => {
          const data = await fs.promises.readFile(rubricPath, 'utf8');
          if (!data || data.trim() === '') {
            throw new Error(`Rubric file is empty or contains only whitespace`);
          }
          return data;
        },
        `read rubric ${rubricId}`
      );
      
      let rubric: Rubric;
      try {
        rubric = JSON.parse(rubricData) as Rubric;
      } catch (parseError) {
        console.error(`File Storage: Error parsing rubric JSON for ${rubricId}:`, parseError);
        return null;
      }
      
      console.log(`File Storage: Successfully retrieved rubric ${rubricId}`);
      return rubric;
    } catch (error) {
      console.error(`File Storage: Error reading rubric ${rubricId}:`, error);
      return null;
    }
  }

  async listRubrics(): Promise<Rubric[]> {
    this.ensureRubricsDir();
    
    try {
      console.log(`File Storage: Listing all rubrics in ${this.rubricsDir}`);
      const files = await fs.promises.readdir(this.rubricsDir);
      const rubrics: Rubric[] = [];
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const rubricId = file.replace('.json', '');
          try {
            const rubric = await this.getRubric(rubricId);
            if (rubric) {
              rubrics.push(rubric);
            }
          } catch (error) {
            console.error(`File Storage: Error processing rubric file ${file}:`, error);
            // Continue with other files even if one fails
          }
        }
      }
      
      console.log(`File Storage: Found ${rubrics.length} rubrics`);
      return rubrics;
    } catch (error) {
      console.error('File Storage: Error listing rubrics:', error);
      return [];
    }
  }

  async deleteRubric(rubricId: string): Promise<boolean> {
    this.ensureRubricsDir();
    const rubricPath = path.join(this.rubricsDir, `${rubricId}.json`);
    
    try {
      // First check if this rubric exists and if it's the default
      const rubric = await this.getRubric(rubricId);
      if (!rubric) {
        console.log(`File Storage: Rubric ${rubricId} not found for deletion`);
        return false;
      }
      
      // Handle default rubric deletion
      if (rubric.isDefault) {
        // Find another rubric to set as default
        const allRubrics = await this.listRubrics();
        const otherRubrics = allRubrics.filter(r => r.id !== rubricId);
        
        if (otherRubrics.length > 0) {
          // Set the first one as default
          otherRubrics[0].isDefault = true;
          await this.saveRubric(otherRubrics[0]);
        }
      }
      
      // Now delete the rubric
      if (!fs.existsSync(rubricPath)) {
        console.log(`File Storage: Rubric file not found for deletion: ${rubricPath}`);
        return false;
      }
      
      console.log(`File Storage: Deleting rubric file: ${rubricPath}`);
      
      // Use retry mechanism for deletion
      await this.retryOperation(
        async () => {
          await fs.promises.unlink(rubricPath);
          
          // Verify the file was deleted
          if (fs.existsSync(rubricPath)) {
            throw new Error(`Rubric file still exists after deletion attempt`);
          }
        },
        `delete rubric ${rubricId}`
      );
      
      console.log(`File Storage: Rubric ${rubricId} deleted successfully`);
      return true;
    } catch (error) {
      console.error(`File Storage: Error deleting rubric ${rubricId}:`, error);
      return false;
    }
  }

  async getDefaultRubric(): Promise<Rubric | null> {
    console.log('File Storage: Retrieving default rubric');
    
    try {
      const rubrics = await this.listRubrics();
      const defaultRubric = rubrics.find(r => r.isDefault);
      
      if (defaultRubric) {
        console.log(`File Storage: Found default rubric ${defaultRubric.id}`);
        return defaultRubric;
      } else if (rubrics.length > 0) {
        // If no rubric is marked as default but there are rubrics, set the first one as default
        console.log(`File Storage: No default rubric found, setting ${rubrics[0].id} as default`);
        rubrics[0].isDefault = true;
        await this.saveRubric(rubrics[0]);
        return rubrics[0];
      } else {
        console.log('File Storage: No rubrics found');
        return null;
      }
    } catch (error) {
      console.error('File Storage: Error getting default rubric:', error);
      return null;
    }
  }

  async setDefaultRubric(rubricId: string): Promise<boolean> {
    console.log(`File Storage: Setting default rubric to ${rubricId}`);
    
    try {
      // Check if the rubric exists
      const rubric = await this.getRubric(rubricId);
      if (!rubric) {
        console.log(`File Storage: Rubric ${rubricId} not found, cannot set as default`);
        return false;
      }
      
      // Get all rubrics and update their isDefault flag
      const rubrics = await this.listRubrics();
      for (const r of rubrics) {
        if (r.id === rubricId) {
          if (!r.isDefault) {
            r.isDefault = true;
            await this.saveRubric(r);
          }
        } else if (r.isDefault) {
          r.isDefault = false;
          await this.saveRubric(r);
        }
      }
      
      console.log(`File Storage: Rubric ${rubricId} set as default successfully`);
      return true;
    } catch (error) {
      console.error(`File Storage: Error setting default rubric ${rubricId}:`, error);
      return false;
    }
  }
}

// Factory function to get the appropriate storage provider
export function getStorageProvider(): StorageProvider {
  const storageType = process.env.JOB_STORAGE_TYPE || 'file';
  const maxAge = parseInt(process.env.JOB_MAX_AGE || '86400000', 10);
  const isDev = process.env.NODE_ENV === 'development';
  const isRender = process.env.RENDER === 'true';

  console.log(`Storage Provider: Initializing with type=${storageType}, isDev=${isDev}, isRender=${isRender}`);
  console.log(`Storage Provider: Environment variables:`, {
    NODE_ENV: process.env.NODE_ENV,
    RENDER: process.env.RENDER,
    JOB_STORAGE_TYPE: process.env.JOB_STORAGE_TYPE,
    JOB_MAX_AGE: process.env.JOB_MAX_AGE,
    RENDER_STORAGE_DIR: process.env.RENDER_STORAGE_DIR || 'Not set'
  });

  // Determine appropriate storage directory
  let storageDir;
  if (isRender) {
    // For Render production, use the persistent disk mount path
    storageDir = process.env.RENDER_STORAGE_DIR || '/opt/render/project/src/.render/jobs';
    console.log(`Storage Provider: Using Render persistent storage at ${storageDir}`);
  } else if (process.env.NODE_ENV === 'production') {
    // For other production environments (not Render)
    storageDir = '/tmp/jobs';
    console.log(`Storage Provider: Using production temporary storage at ${storageDir}`);
  } else {
    // For local development
    storageDir = path.join(process.cwd(), '.render', 'jobs');
    console.log(`Storage Provider: Using local development storage at ${storageDir}`);
  }

  // Try different fallback directories if needed
  const fallbackDirs = [
    storageDir,
    '/tmp/jobs',
    path.join(process.cwd(), 'jobs'),
    path.join(process.cwd(), '.jobs'),
    path.join(process.cwd(), '.render', 'jobs')
  ];
  
  let selectedDir = null;
  
  // Find the first directory we can write to
  for (const dir of fallbackDirs) {
    try {
      console.log(`Storage Provider: Trying directory ${dir}`);
      
      // Try to create the directory if it doesn't exist
      if (!fs.existsSync(dir)) {
        console.log(`Storage Provider: Creating directory ${dir}`);
        fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
      }
      
      // Check if we can write to the directory
      const testFile = path.join(dir, '.write-test');
      fs.writeFileSync(testFile, 'test', { mode: 0o644 });
      fs.unlinkSync(testFile);
      
      console.log(`Storage Provider: Successfully using directory ${dir}`);
      selectedDir = dir;
      break;
    } catch (error) {
      console.error(`Storage Provider: Cannot use directory ${dir}:`, error);
    }
  }
  
  if (!selectedDir) {
    console.error(`Storage Provider: Failed to find a writable directory, using memory storage`);
    return MemoryStorageProvider.getInstance();
  }
  
  console.log(`Storage Provider: Using directory ${selectedDir}`);
  return new FileStorageProvider(selectedDir, maxAge);
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

// Add this function to initialize the rubric system
export async function initializeRubricSystem(): Promise<void> {
  try {
    console.log('Storage Provider: Initializing rubric system');
    const storage = getStorageProvider();
    
    // Check if any rubrics exist
    const rubrics = await storage.listRubrics();
    
    if (rubrics.length === 0) {
      console.log('Storage Provider: No rubrics found, creating default wine sales rubric');
      
      // Create and save default rubric
      const defaultRubric = createDefaultWineSalesRubric();
      await storage.saveRubric(defaultRubric);
      
      console.log('Storage Provider: Default wine sales rubric created successfully');
    } else {
      console.log(`Storage Provider: Found ${rubrics.length} existing rubrics`);
      
      // Ensure there's a default rubric
      const defaultRubric = rubrics.find(r => r.isDefault);
      if (!defaultRubric) {
        console.log('Storage Provider: No default rubric set, setting the first one as default');
        await storage.setDefaultRubric(rubrics[0].id);
      }
    }
  } catch (error) {
    console.error('Storage Provider: Error initializing rubric system:', error);
    throw new Error(`Failed to initialize rubric system: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
} 