import { CriterionScore, PerformanceLevel } from './evaluation';

export interface RubricGeneratorRequest {
  scenario: any; // The uploaded scenario JSON
  requirements: string; // Natural language requirements
}

export interface RubricTemplate {
  title: string;
  description: string;
  criteriaWeights: {
    [key: string]: number; // Each criterion name and its weight (must sum to 100)
  };
  criteriaDescriptions: {
    [key: string]: string; // Each criterion name and its description
  };
  scoringLevels: {
    [key: number]: string; // Each score (1-5) and its description
  };
  performanceLevels: {
    [key in PerformanceLevel]: {
      minScore: number;
      maxScore: number;
      description: string;
    };
  };
}

export interface RubricGenerationResponse {
  success: boolean;
  rubric?: RubricTemplate;
  error?: string;
} 