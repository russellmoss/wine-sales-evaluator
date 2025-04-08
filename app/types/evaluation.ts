// Types for evaluation criteria scores
export interface CriterionScore {
  criterion: string;
  weight: number;
  score: number;
  weightedScore: number;
  notes: string;
}

// Types for observational notes (unweighted criteria)
export interface ObservationalNote {
  score: number;
  notes: string;
}

export interface ObservationalNotes {
  productKnowledge: ObservationalNote;
  handlingObjections: ObservationalNote;
}

// Main evaluation data interface
export interface EvaluationData {
  staffName: string;
  date: string;
  overallScore: number;
  performanceLevel: PerformanceLevel;
  criteriaScores: CriterionScore[];
  observationalNotes: ObservationalNotes;
  strengths: string[];
  areasForImprovement: string[];
  keyRecommendations: string[];
}

// Performance level type
export type PerformanceLevel = 'Exceptional' | 'Strong' | 'Proficient' | 'Developing' | 'Needs Improvement';

// Criteria weights
export const CRITERIA_WEIGHTS = {
  'Initial Greeting and Welcome': 8,
  'Building Rapport': 10,
  'Winery History and Ethos': 10,
  'Storytelling and Analogies': 10,
  'Recognition of Buying Signals': 12,
  'Customer Data Capture': 8,
  'Asking for the Sale': 12,
  'Personalized Wine Recommendations': 10,
  'Wine Club Presentation': 12,
  'Closing Interaction': 8
} as const;

// Helper function to validate criteria weights total 100%
export function validateWeights(weights: typeof CRITERIA_WEIGHTS): boolean {
  const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  return total === 100;
}

// Helper function to calculate performance level from score
export function getPerformanceLevel(score: number): PerformanceLevel {
  if (score >= 90) return 'Exceptional';
  if (score >= 80) return 'Strong';
  if (score >= 70) return 'Proficient';
  if (score >= 60) return 'Developing';
  return 'Needs Improvement';
}

// Helper function to calculate weighted score for a criterion
export function calculateWeightedScore(score: number, weight: number): number {
  return score * weight;
}

// Helper function to calculate total score from criteria scores
export function calculateTotalScore(criteriaScores: CriterionScore[]): number {
  const totalWeightedScore = criteriaScores.reduce(
    (total, criterion) => total + criterion.weightedScore,
    0
  );
  
  // Maximum possible score is 500 (sum of all weights * 5)
  return Math.round((totalWeightedScore / 500) * 100);
}

// Helper function to validate evaluation data
export function validateEvaluationData(data: EvaluationData): boolean {
  try {
    // Check required fields exist
    if (!data.staffName || !data.date || data.overallScore === undefined || !data.performanceLevel) {
      return false;
    }

    // Validate criteria scores
    if (!Array.isArray(data.criteriaScores) || data.criteriaScores.length !== 10) {
      return false;
    }

    // Validate weights match defined criteria
    const hasValidWeights = data.criteriaScores.every(score => 
      CRITERIA_WEIGHTS[score.criterion as keyof typeof CRITERIA_WEIGHTS] === score.weight
    );
    if (!hasValidWeights) return false;

    // Validate scores are within range
    const hasValidScores = data.criteriaScores.every(score => 
      score.score >= 1 && score.score <= 5
    );
    if (!hasValidScores) return false;

    // Validate weighted scores are calculated correctly
    const hasValidWeightedScores = data.criteriaScores.every(score => 
      score.weightedScore === calculateWeightedScore(score.score, score.weight)
    );
    if (!hasValidWeightedScores) return false;

    // Validate arrays have required elements
    if (!data.strengths.length || !data.areasForImprovement.length || !data.keyRecommendations.length) {
      return false;
    }

    // Validate observational notes
    if (!data.observationalNotes?.productKnowledge || !data.observationalNotes?.handlingObjections) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
}

// Helper function to format date to YYYY-MM-DD
export function formatDate(date: string): string {
  try {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  } catch (error) {
    return date; // Return original if parsing fails
  }
}

// Helper function to create empty evaluation data template
export function createEmptyEvaluation(staffName: string): EvaluationData {
  return {
    staffName,
    date: formatDate(new Date().toISOString()),
    overallScore: 0,
    performanceLevel: 'Needs Improvement',
    criteriaScores: Object.entries(CRITERIA_WEIGHTS).map(([criterion, weight]) => ({
      criterion,
      weight,
      score: 1,
      weightedScore: weight,
      notes: ''
    })),
    observationalNotes: {
      productKnowledge: { score: 1, notes: '' },
      handlingObjections: { score: 1, notes: '' }
    },
    strengths: [],
    areasForImprovement: [],
    keyRecommendations: []
  };
} 