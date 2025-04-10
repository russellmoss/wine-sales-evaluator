export interface CriterionScore {
  criterion: string;
  weight: number;
  score: number;
  weightedScore: number;
  notes: string;
}

// WineEvaluation is now an alias for EvaluationData for backward compatibility
export type WineEvaluation = EvaluationData;

export interface ObservationalNote {
  score: number;
  notes: string;
}

export interface ObservationalNotes {
  productKnowledge: ObservationalNote;
  handlingObjections: ObservationalNote;
}

export interface EvaluationData {
  staffName: string;
  date: string;
  overallScore: number;
  performanceLevel: string;
  criteriaScores: CriterionScore[];
  strengths: string[];
  areasForImprovement: string[];
  keyRecommendations: string[];
  observationalNotes: ObservationalNotes;
}

export type PerformanceLevel = 'Exceptional' | 'Strong' | 'Proficient' | 'Developing' | 'Needs Improvement';

// Constants
export const CRITERIA_WEIGHTS = {
  'Wine Knowledge': 15,
  'Communication Skills': 15,
  'Customer Engagement': 15,
  'Sales Techniques': 15,
  'Service Excellence': 10,
  'Product Recommendations': 10,
  'Wine Club Promotion': 5,
  'Food Pairing Suggestions': 5,
  'Brand Storytelling': 5,
  'Follow-up Opportunities': 5
};

// Helper function to validate weights
export function validateWeights(): boolean {
  const totalWeight = Object.values(CRITERIA_WEIGHTS).reduce((sum, weight) => sum + weight, 0);
  return Math.abs(totalWeight - 100) < 0.01; // Allow for small floating point errors
}

// Helper function to calculate performance level from score
export function getPerformanceLevel(score: number): PerformanceLevel {
  if (score >= 90) return 'Exceptional';
  if (score >= 80) return 'Strong';
  if (score >= 70) return 'Proficient';
  if (score >= 60) return 'Developing';
  return 'Needs Improvement';
}

// Helper function to calculate weighted score
export function calculateWeightedScore(score: number, weight: number): number {
  return (score / 5) * weight;
}

// Helper function to calculate total score from criteria scores
export function calculateTotalScore(criteriaScores: CriterionScore[]): number {
  return criteriaScores.reduce((total, criterion) => total + criterion.weightedScore, 0);
}

// Helper function to validate evaluation data
export function validateEvaluationData(data: EvaluationData): boolean {
  if (!data.staffName || !data.date || !data.criteriaScores) {
    return false;
  }
  
  if (data.criteriaScores.length !== Object.keys(CRITERIA_WEIGHTS).length) {
    return false;
  }
  
  for (const criterion of data.criteriaScores) {
    if (criterion.score < 1 || criterion.score > 5) {
      return false;
    }
  }
  
  return true;
}

// Helper function to format date
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Helper function to create an empty evaluation
export function createEmptyEvaluation(): EvaluationData {
  const criteriaScores: CriterionScore[] = Object.entries(CRITERIA_WEIGHTS).map(([criterion, weight]) => ({
    criterion,
    weight,
    score: 0,
    weightedScore: 0,
    notes: ''
  }));
  
  return {
    staffName: '',
    date: formatDate(new Date()),
    overallScore: 0,
    performanceLevel: 'Needs Improvement',
    criteriaScores,
    strengths: [],
    areasForImprovement: [],
    keyRecommendations: [],
    observationalNotes: {
      productKnowledge: { score: 0, notes: '' },
      handlingObjections: { score: 0, notes: '' }
    }
  };
} 