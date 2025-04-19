// Types for evaluation criteria scores
export interface CriterionScore {
  criterion: string;  // Name of the criterion being evaluated
  weight: number;     // Weight of the criterion (1-10)
  score: number;      // Score given (1-5)
  weightedScore: number; // Calculated as score * weight
  notes: string;      // Detailed notes about the score
}

// Types for observational notes (unweighted criteria)
export interface ObservationalNote {
  score: number;      // Score given (1-5)
  notes: string;      // Detailed notes about the observation
}

export interface ObservationalNotes {
  productKnowledge: ObservationalNote;    // Evaluation of product knowledge
  handlingObjections: ObservationalNote;   // Evaluation of objection handling
}

// Performance level type - must be one of these exact values
export type PerformanceLevel = 'Exceptional' | 'Strong' | 'Proficient' | 'Developing' | 'Needs Improvement';

// Main evaluation data interface
export interface EvaluationData {
  // Required fields
  staffName: string;                // Name of the staff member being evaluated
  date: string;                     // Date of the evaluation (YYYY-MM-DD format)
  overallScore: number;             // Overall score as a percentage (0-100)
  performanceLevel: PerformanceLevel; // Performance level based on overall score
  criteriaScores: CriterionScore[]; // Array of exactly 10 criterion scores
  observationalNotes: ObservationalNotes; // Observational notes for unweighted criteria
  strengths: string[];              // Array of exactly 3 strengths
  areasForImprovement: string[];    // Array of exactly 3 areas for improvement
  keyRecommendations: string[];     // Array of exactly 3 key recommendations
  rubricId: string;
  
  // Optional fields
  totalScore?: number;              // Alternative field for overallScore (will be converted)
  criteria: {
    [key: string]: {
      score: number;
      feedback: string;
    };
  };
  metadata?: {
    chunkCount?: number;
    processingTime?: number;
    chunkSizes?: number[];
  };
}

// Validation error interface
export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Criteria weights - must total 100
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
export function validateEvaluationData(data: EvaluationData): ValidationResult {
  const errors: ValidationError[] = [];
  
  try {
    console.log('Starting validation of evaluation data:', {
      hasStaffName: Boolean(data.staffName),
      hasDate: Boolean(data.date),
      hasOverallScore: Boolean(data.overallScore),
      hasPerformanceLevel: Boolean(data.performanceLevel),
      criteriaScoresLength: data.criteriaScores?.length,
      hasStrengths: Boolean(data.strengths),
      hasAreasForImprovement: Boolean(data.areasForImprovement),
      hasKeyRecommendations: Boolean(data.keyRecommendations)
    });
    
    // Allow for either overallScore or totalScore
    if (data.totalScore !== undefined && data.overallScore === undefined) {
      console.log('Converting totalScore to overallScore:', data.totalScore);
      data.overallScore = data.totalScore;
      delete data.totalScore; // Clean up to avoid confusion
    }
    
    // Convert string scores to numbers if needed
    if (typeof data.overallScore === 'string') {
      console.log('Converting string overallScore to number:', data.overallScore);
      data.overallScore = parseFloat(data.overallScore);
    }
    
    // Ensure score is in percentage form (0-100)
    if (data.overallScore > 100) {
      console.log('Normalizing overallScore from raw score to percentage:', data.overallScore);
      data.overallScore = Math.round((data.overallScore / 500) * 100);
    }
    
    // Validate required fields
    if (!data.staffName) {
      console.log('Missing staffName');
      errors.push({ field: 'staffName', message: 'Staff name is required' });
    }
    if (!data.date) {
      console.log('Missing date');
      errors.push({ field: 'date', message: 'Date is required' });
    }
    if (typeof data.overallScore !== 'number' || isNaN(data.overallScore)) {
      console.log('Invalid overallScore:', data.overallScore);
      errors.push({ field: 'overallScore', message: 'Overall score must be a valid number' });
    }
    if (!data.performanceLevel) {
      console.log('Missing performanceLevel');
      errors.push({ field: 'performanceLevel', message: 'Performance level is required' });
    }
    
    // Validate criteria scores
    if (!Array.isArray(data.criteriaScores) || data.criteriaScores.length !== 10) {
      console.log('Invalid criteriaScores:', {
        isArray: Array.isArray(data.criteriaScores),
        length: data.criteriaScores?.length
      });
      errors.push({ field: 'criteriaScores', message: 'Must have exactly 10 criteria scores' });
    }
    
    // Validate each criteria score
    if (Array.isArray(data.criteriaScores)) {
      data.criteriaScores.forEach((score, index) => {
        if (!score.criterion) {
          console.log(`Missing criterion name at index ${index}`);
          errors.push({ field: `criteriaScores[${index}].criterion`, message: 'Criterion name is required' });
        }
        if (typeof score.weight !== 'number' || isNaN(score.weight)) {
          console.log(`Invalid weight at index ${index}:`, score.weight);
          errors.push({ field: `criteriaScores[${index}].weight`, message: 'Weight must be a valid number' });
        }
        if (typeof score.score !== 'number' || isNaN(score.score)) {
          console.log(`Invalid score at index ${index}:`, score.score);
          errors.push({ field: `criteriaScores[${index}].score`, message: 'Score must be a valid number' });
        }
        if (typeof score.weightedScore !== 'number' || isNaN(score.weightedScore)) {
          console.log(`Invalid weightedScore at index ${index}:`, score.weightedScore);
          errors.push({ field: `criteriaScores[${index}].weightedScore`, message: 'Weighted score must be a valid number' });
        }
        if (!score.notes) {
          console.log(`Missing notes at index ${index}`);
          errors.push({ field: `criteriaScores[${index}].notes`, message: 'Notes are required' });
        }
      });
    }
    
    // Validate observational notes
    if (!data.observationalNotes) {
      console.log('Missing observationalNotes');
      errors.push({ field: 'observationalNotes', message: 'Observational notes are required' });
    } else {
      if (!data.observationalNotes.productKnowledge) {
        console.log('Missing productKnowledge');
        errors.push({ field: 'observationalNotes.productKnowledge', message: 'Product knowledge notes are required' });
      }
      if (!data.observationalNotes.handlingObjections) {
        console.log('Missing handlingObjections');
        errors.push({ field: 'observationalNotes.handlingObjections', message: 'Objection handling notes are required' });
      }
    }
    
    // Validate arrays
    if (!Array.isArray(data.strengths) || data.strengths.length !== 3) {
      console.log('Invalid strengths array:', {
        isArray: Array.isArray(data.strengths),
        length: data.strengths?.length
      });
      errors.push({ field: 'strengths', message: 'Must have exactly 3 strengths' });
    }
    if (!Array.isArray(data.areasForImprovement) || data.areasForImprovement.length !== 3) {
      console.log('Invalid areasForImprovement array:', {
        isArray: Array.isArray(data.areasForImprovement),
        length: data.areasForImprovement?.length
      });
      errors.push({ field: 'areasForImprovement', message: 'Must have exactly 3 areas for improvement' });
    }
    if (!Array.isArray(data.keyRecommendations) || data.keyRecommendations.length !== 3) {
      console.log('Invalid keyRecommendations array:', {
        isArray: Array.isArray(data.keyRecommendations),
        length: data.keyRecommendations?.length
      });
      errors.push({ field: 'keyRecommendations', message: 'Must have exactly 3 key recommendations' });
    }
    
    console.log('Validation complete. Errors:', errors.length);
    return {
      isValid: errors.length === 0,
      errors
    };
  } catch (error) {
    console.error('Error validating evaluation data:', error);
    return {
      isValid: false,
      errors: [{ field: 'validation', message: 'An error occurred during validation' }]
    };
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
    keyRecommendations: [],
    rubricId: '',
    criteria: {},
    metadata: {}
  };
} 