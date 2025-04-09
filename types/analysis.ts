import type { WineEvaluation } from './evaluation';

export interface AnalysisState {
  isAnalyzing: boolean;
  error: string | null;
  evaluationData: WineEvaluation | null;
}

export interface AnalysisResult {
  success: boolean;
  data?: WineEvaluation;
  error?: string;
} 