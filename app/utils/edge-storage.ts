import { v4 as uuidv4 } from 'uuid';
import { Rubric } from '../types/rubric';
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
  rubricId?: string; // Field to track which rubric was used for evaluation
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

// Memory storage provider for Edge runtime
export class EdgeStorageProvider implements StorageProvider {
  private static instance: EdgeStorageProvider;
  private jobs: Map<string, JobStatus>;
  private rubrics: Map<string, Rubric>;
  private defaultRubricId?: string;

  constructor() {
    this.jobs = new Map();
    this.rubrics = new Map();
  }

  public static getInstance(): EdgeStorageProvider {
    if (!EdgeStorageProvider.instance) {
      EdgeStorageProvider.instance = new EdgeStorageProvider();
    }
    return EdgeStorageProvider.instance;
  }

  async saveJob(job: JobStatus): Promise<void> {
    console.log(`Edge Storage: Saving job ${job.id} with status ${job.status}`);
    this.jobs.set(job.id, job);
    console.log(`Edge Storage: Job ${job.id} saved successfully`);
  }

  async getJob(jobId: string): Promise<JobStatus | null> {
    console.log(`Edge Storage: Retrieving job ${jobId}`);
    const job = this.jobs.get(jobId);
    if (job) {
      console.log(`Edge Storage: Found job ${jobId} with status ${job.status}`);
    } else {
      console.log(`Edge Storage: Job ${jobId} not found`);
    }
    return job || null;
  }

  async listJobs(): Promise<JobStatus[]> {
    console.log('Edge Storage: Listing all jobs');
    return Array.from(this.jobs.values());
  }

  async deleteJob(jobId: string): Promise<boolean> {
    console.log(`Edge Storage: Deleting job ${jobId}`);
    const deleted = this.jobs.delete(jobId);
    console.log(`Edge Storage: Job ${jobId} ${deleted ? 'deleted successfully' : 'not found'}`);
    return deleted;
  }

  async cleanupExpiredJobs(): Promise<number> {
    console.log('Edge Storage: Cleaning up expired jobs');
    const now = Date.now();
    let count = 0;
    const entries = Array.from(this.jobs.entries());
    for (const [id, job] of entries) {
      if (job.expiresAt && job.expiresAt < now) {
        this.jobs.delete(id);
        count++;
      }
    }
    console.log(`Edge Storage: Cleaned up ${count} expired jobs`);
    return count;
  }

  // Rubric management methods
  async saveRubric(rubric: Rubric): Promise<void> {
    console.log(`Edge Storage: Saving rubric ${rubric.id}`);
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
    
    console.log(`Edge Storage: Rubric ${rubric.id} saved successfully`);
  }

  async getRubric(rubricId: string): Promise<Rubric | null> {
    console.log(`Edge Storage: Retrieving rubric ${rubricId}`);
    const rubric = this.rubrics.get(rubricId);
    
    if (rubric) {
      console.log(`Edge Storage: Found rubric ${rubricId}`);
    } else {
      console.log(`Edge Storage: Rubric ${rubricId} not found`);
    }
    
    return rubric || null;
  }

  async listRubrics(): Promise<Rubric[]> {
    console.log('Edge Storage: Listing all rubrics');
    return Array.from(this.rubrics.values());
  }

  async deleteRubric(rubricId: string): Promise<boolean> {
    console.log(`Edge Storage: Deleting rubric ${rubricId}`);
    
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
    console.log(`Edge Storage: Rubric ${rubricId} ${deleted ? 'deleted successfully' : 'not found'}`);
    return deleted;
  }

  async getDefaultRubric(): Promise<Rubric | null> {
    console.log('Edge Storage: Retrieving default rubric');
    
    if (!this.defaultRubricId) {
      console.log('Edge Storage: No default rubric set');
      return null;
    }
    
    const defaultRubric = this.rubrics.get(this.defaultRubricId);
    
    if (defaultRubric) {
      console.log(`Edge Storage: Found default rubric ${this.defaultRubricId}`);
    } else {
      console.log(`Edge Storage: Default rubric ${this.defaultRubricId} not found`);
    }
    
    return defaultRubric || null;
  }

  async setDefaultRubric(rubricId: string): Promise<boolean> {
    console.log(`Edge Storage: Setting default rubric to ${rubricId}`);
    
    const rubric = this.rubrics.get(rubricId);
    if (!rubric) {
      console.log(`Edge Storage: Rubric ${rubricId} not found, cannot set as default`);
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
    console.log(`Edge Storage: Rubric ${rubricId} set as default successfully`);
    return true;
  }
}

// Helper function to create a new job
export function createJob(markdown?: string, fileName?: string): JobStatus {
  return {
    id: uuidv4(),
    status: 'pending',
    markdown,
    fileName,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
} 