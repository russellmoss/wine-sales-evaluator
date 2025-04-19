/**
 * Types for job management
 */

import { EvaluationData } from './evaluation';

// Job result type
export type JobResult = {
  evaluation: EvaluationData;
  summary?: string;
  metadata?: {
    processingTime?: number;
    modelVersion?: string;
    confidence?: number;
    isFallback?: boolean;  // Indicates if this result was produced by fallback processing
  };
};

// Job error details type
export type JobErrorDetails = {
  type: string;
  message: string;
  timestamp: string;
  isTimeout?: boolean;
  stackTrace?: string;
  code?: string;
  originalError?: string;  // Stores the original error message when fallback fails
};

// Job status type
export type JobStatus = {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'unknown' | 'api_error';
  markdown: string;
  fileName: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: number;
  rubricId?: string;
  result?: JobResult;
  error?: string;
  errorDetails?: JobErrorDetails;
  priority?: number;
  retryCount?: number;
  lastProcessedAt?: string;
}; 