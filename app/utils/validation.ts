import { EvaluationData, CriterionScore, ObservationalNotes, PerformanceLevel } from '../types/evaluation';

// Validation error interface
export interface ValidationError {
  field: string;
  message: string;
}

// Validation result interface
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  data: EvaluationData;
}

// Default criteria for fallback
export const DEFAULT_CRITERIA = [
  { criterion: "Initial Greeting and Welcome", weight: 8 },
  { criterion: "Wine Knowledge and Recommendations", weight: 10 },
  { criterion: "Customer Engagement", weight: 10 },
  { criterion: "Sales Techniques", weight: 10 },
  { criterion: "Upselling and Cross-selling", weight: 8 },
  { criterion: "Handling Customer Questions", weight: 8 },
  { criterion: "Personalization", weight: 8 },
  { criterion: "Closing the Sale", weight: 8 },
  { criterion: "Follow-up and Future Business", weight: 8 },
  { criterion: "Closing Interaction", weight: 8 }
];

// Default observational notes
export const DEFAULT_OBSERVATIONAL_NOTES: ObservationalNotes = {
  productKnowledge: { score: 3, notes: "Default product knowledge notes" },
  handlingObjections: { score: 3, notes: "Default handling objections notes" }
};

// Default array values
export const DEFAULT_ARRAY_VALUES = {
  strengths: [
    "Not available due to processing error",
    "Please try again with the conversation",
    "Consider reviewing the conversation manually"
  ],
  areasForImprovement: [
    "Not available due to processing error",
    "Please try again with the conversation",
    "Consider reviewing the conversation manually"
  ],
  keyRecommendations: [
    "Not available due to processing error",
    "Please try again with the conversation",
    "Consider reviewing the conversation manually"
  ]
};

// Helper function to extract staff name from markdown
export function extractStaffNameFromMarkdown(markdown: string): string {
  const staffNameMatch = markdown.match(/Staff(?:\s+Member)?(?:\s+\(\d+\))?[:\s]+([^\n]+)/i);
  if (staffNameMatch && staffNameMatch[1]) {
    const nameMatch = staffNameMatch[1].match(/(?:hi|hello|hey)[\s,]+(?:my name is|i'm|i am)\s+([^\s,\.]+)/i);
    return nameMatch && nameMatch[1] ? nameMatch[1].trim() : staffNameMatch[1].trim();
  }
  return "Unknown Staff";
}

// Helper function to extract date from markdown
export function extractDateFromMarkdown(markdown: string): string {
  const dateMatch = markdown.match(/Date:?\s+(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})/i);
  if (dateMatch && dateMatch[1]) {
    return dateMatch[1];
  }
  return new Date().toISOString().split('T')[0];
}

// Helper function to extract staff name from filename
export function extractStaffNameFromFilename(fileName: string): string {
  const staffMatch = fileName.match(/conversation-with-([^\.]+)/i);
  return staffMatch ? staffMatch[1] : 'Unknown Staff';
}

// Helper function to get performance level from score
export function getPerformanceLevelFromScore(score: number): PerformanceLevel {
  if (score >= 90) return 'Exceptional';
  if (score >= 80) return 'Strong';
  if (score >= 70) return 'Proficient';
  if (score >= 60) return 'Developing';
  return 'Needs Improvement';
}

// Helper function to calculate weighted score
export function calculateWeightedScore(score: number, weight: number): number {
  return score * weight;
}

// Helper function to calculate total score from criteria scores
export function calculateTotalScoreFromCriteriaScores(criteriaScores: CriterionScore[]): number {
  const totalWeightedScore = criteriaScores.reduce(
    (total, criterion) => total + criterion.weightedScore,
    0
  );
  
  // Maximum possible score is 500 (sum of all weights * 5)
  return Math.round((totalWeightedScore / 500) * 100);
}

// Helper function to normalize score to percentage (0-100)
export function normalizeScoreToPercentage(score: number): number {
  if (score > 100) {
    return Math.round((score / 500) * 100);
  }
  return score;
}

// Helper function to convert string to number
export function convertToNumber(value: any): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return parseFloat(value);
  return 0;
}

// Helper function to validate and repair criteria score
export function validateAndRepairCriteriaScore(score: any, index: number): CriterionScore {
  return {
    criterion: score.criterion || `Criterion ${index + 1}`,
    weight: convertToNumber(score.weight) || 8,
    score: convertToNumber(score.score) || 3,
    weightedScore: convertToNumber(score.weightedScore) || (convertToNumber(score.score) || 3) * (convertToNumber(score.weight) || 8),
    notes: score.notes || 'No notes provided'
  };
}

// Main validation function
export function validateEvaluationData(data: any): ValidationResult {
  const errors: ValidationError[] = [];
  const result: EvaluationData = {
    staffName: "Unknown Staff",
    date: new Date().toISOString().split('T')[0],
    overallScore: 0,
    performanceLevel: "Needs Improvement",
    criteriaScores: [],
    observationalNotes: DEFAULT_OBSERVATIONAL_NOTES,
    strengths: [...DEFAULT_ARRAY_VALUES.strengths],
    areasForImprovement: [...DEFAULT_ARRAY_VALUES.areasForImprovement],
    keyRecommendations: [...DEFAULT_ARRAY_VALUES.keyRecommendations]
  };

  // Check required fields
  const requiredFields = [
    'staffName',
    'date',
    'overallScore',
    'performanceLevel',
    'criteriaScores',
    'strengths',
    'areasForImprovement',
    'keyRecommendations'
  ];

  for (const field of requiredFields) {
    if (!(field in data)) {
      errors.push({ field, message: `Missing required field: ${field}` });
    }
  }

  // Validate criteriaScores array
  if (Array.isArray(data.criteriaScores)) {
    if (data.criteriaScores.length !== 10) {
      errors.push({ field: 'criteriaScores', message: 'criteriaScores must contain exactly 10 criteria' });
    }

    // Validate each criteria score
    data.criteriaScores.forEach((score: any, index: number) => {
      const requiredScoreFields = ['criterion', 'weight', 'score', 'weightedScore', 'notes'];
      for (const field of requiredScoreFields) {
        if (!(field in score)) {
          errors.push({ field: `criteriaScores.${index + 1}`, message: `Missing ${field} in criteria score ${index + 1}` });
        }
      }

      // Validate score range
      if (score.score < 1 || score.score > 5) {
        errors.push({ field: `criteriaScores.${index + 1}.score`, message: `Score for ${score.criterion} must be between 1 and 5` });
      }
    });
  } else {
    errors.push({ field: 'criteriaScores', message: 'criteriaScores must be an array' });
  }

  // Validate arrays have correct length
  if (!Array.isArray(data.strengths) || data.strengths.length !== 3) {
    errors.push({ field: 'strengths', message: 'strengths must be an array with exactly 3 items' });
  }

  if (!Array.isArray(data.areasForImprovement) || data.areasForImprovement.length !== 3) {
    errors.push({ field: 'areasForImprovement', message: 'areasForImprovement must be an array with exactly 3 items' });
  }

  if (!Array.isArray(data.keyRecommendations) || data.keyRecommendations.length !== 3) {
    errors.push({ field: 'keyRecommendations', message: 'keyRecommendations must be an array with exactly 3 items' });
  }

  // Validate score ranges
  if (typeof data.overallScore !== 'number' || data.overallScore < 0 || data.overallScore > 100) {
    errors.push({ field: 'overallScore', message: 'overallScore must be a number between 0 and 100' });
  }

  // Validate performance level
  const validPerformanceLevels = ['Exceptional', 'Strong', 'Proficient', 'Developing', 'Needs Improvement'];
  if (!validPerformanceLevels.includes(data.performanceLevel)) {
    errors.push({ field: 'performanceLevel', message: `performanceLevel must be one of: ${validPerformanceLevels.join(', ')}` });
  }

  // Try to extract staff name from markdown or filename if missing
  if (!data?.staffName) {
    if (data?.markdown) {
      result.staffName = extractStaffNameFromMarkdown(data.markdown);
    } else if (data?.fileName) {
      result.staffName = extractStaffNameFromFilename(data.fileName);
    }
    errors.push({ field: 'staffName', message: 'Staff name was missing and had to be extracted' });
  } else {
    result.staffName = data.staffName;
  }

  // Try to extract date from markdown if missing
  if (!data?.date) {
    if (data?.markdown) {
      result.date = extractDateFromMarkdown(data.markdown);
    }
    errors.push({ field: 'date', message: 'Date was missing and had to be extracted' });
  } else {
    result.date = data.date;
  }

  // Handle score fields
  if (data?.overallScore !== undefined) {
    result.overallScore = convertToNumber(data.overallScore);
  } else if (data?.totalScore !== undefined) {
    result.overallScore = convertToNumber(data.totalScore);
  }

  // Normalize score to percentage
  result.overallScore = normalizeScoreToPercentage(result.overallScore);

  // Set performance level based on score
  result.performanceLevel = getPerformanceLevelFromScore(result.overallScore);

  // Handle criteria scores
  if (Array.isArray(data?.criteriaScores) && data.criteriaScores.length > 0) {
    result.criteriaScores = data.criteriaScores.map((score: any, index: number) => 
      validateAndRepairCriteriaScore(score, index)
    );
  }

  // Ensure we have at least 10 criteria scores
  if (result.criteriaScores.length < 10) {
    const missingCount = 10 - result.criteriaScores.length;
    errors.push({ 
      field: 'criteriaScores', 
      message: `Missing ${missingCount} criteria scores, adding default values` 
    });

    // Add missing criteria
    for (let i = result.criteriaScores.length; i < 10; i++) {
      const defaultCriterion = DEFAULT_CRITERIA[i - result.criteriaScores.length];
      result.criteriaScores.push({
        criterion: defaultCriterion.criterion,
        weight: defaultCriterion.weight,
        score: 3,
        weightedScore: defaultCriterion.weight * 3,
        notes: "Default criteria added due to missing data"
      });
    }
  } else if (result.criteriaScores.length > 10) {
    errors.push({ 
      field: 'criteriaScores', 
      message: `Too many criteria scores (${result.criteriaScores.length}), truncating to 10` 
    });
    result.criteriaScores = result.criteriaScores.slice(0, 10);
  }

  // Calculate overall score if not set
  if (result.overallScore === 0 && result.criteriaScores.length > 0) {
    result.overallScore = calculateTotalScoreFromCriteriaScores(result.criteriaScores);
    result.performanceLevel = getPerformanceLevelFromScore(result.overallScore);
    errors.push({ 
      field: 'overallScore', 
      message: 'Overall score was missing and had to be calculated from criteria scores' 
    });
  }

  // Handle observational notes
  if (data?.observationalNotes) {
    result.observationalNotes = {
      productKnowledge: {
        score: convertToNumber(data.observationalNotes.productKnowledge?.score) || 3,
        notes: data.observationalNotes.productKnowledge?.notes || "No notes provided"
      },
      handlingObjections: {
        score: convertToNumber(data.observationalNotes.handlingObjections?.score) || 3,
        notes: data.observationalNotes.handlingObjections?.notes || "No notes provided"
      }
    };
  }

  // Handle arrays
  ['strengths', 'areasForImprovement', 'keyRecommendations'].forEach(field => {
    const arrayField = field as keyof Pick<EvaluationData, 'strengths' | 'areasForImprovement' | 'keyRecommendations'>;
    if (Array.isArray(data?.[arrayField]) && data[arrayField].length > 0) {
      result[arrayField] = data[arrayField];
      
      // Ensure exactly 3 items
      if (result[arrayField].length !== 3) {
        if (result[arrayField].length < 3) {
          errors.push({ 
            field, 
            message: `Missing ${3 - result[arrayField].length} items, adding default values` 
          });
          
          // Add missing items
          for (let i = result[arrayField].length; i < 3; i++) {
            result[arrayField].push(DEFAULT_ARRAY_VALUES[arrayField][i - result[arrayField].length]);
          }
        } else {
          errors.push({ 
            field, 
            message: `Too many items (${result[arrayField].length}), truncating to 3` 
          });
          result[arrayField] = result[arrayField].slice(0, 3);
        }
      }
    } else {
      errors.push({ 
        field, 
        message: `${field} was missing or empty, using default values` 
      });
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    data: result
  };
} 