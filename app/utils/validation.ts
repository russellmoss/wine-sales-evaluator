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
  
  // Create a default valid structure to fall back on
  const validData: EvaluationData = {
    staffName: data?.staffName || "Unknown Staff",
    date: data?.date || new Date().toISOString().split('T')[0],
    overallScore: 0,
    performanceLevel: "Needs Improvement",
    criteriaScores: [],
    observationalNotes: DEFAULT_OBSERVATIONAL_NOTES,
    strengths: [...DEFAULT_ARRAY_VALUES.strengths],
    areasForImprovement: [...DEFAULT_ARRAY_VALUES.areasForImprovement],
    keyRecommendations: [...DEFAULT_ARRAY_VALUES.keyRecommendations]
  };
  
  // Check for required fields
  if (!data) {
    errors.push({ field: "data", message: "No evaluation data provided" });
    return { isValid: false, errors, data: validData };
  }
  
  // Validate and copy fields
  if (data.staffName) {
    validData.staffName = data.staffName;
  } else {
    errors.push({ field: "staffName", message: "Missing staffName" });
  }
  
  if (data.date) {
    validData.date = data.date;
  } else {
    errors.push({ field: "date", message: "Missing date" });
  }
  
  // Handle both overallScore and totalScore
  if (data.overallScore !== undefined) {
    validData.overallScore = Number(data.overallScore);
  } else if (data.totalScore !== undefined) {
    validData.overallScore = Number(data.totalScore);
  } else {
    errors.push({ field: "overallScore", message: "Missing overallScore" });
  }
  
  if (data.performanceLevel) {
    validData.performanceLevel = data.performanceLevel;
  } else {
    errors.push({ field: "performanceLevel", message: "Missing performanceLevel" });
  }
  
  // Validate criteriaScores
  if (Array.isArray(data.criteriaScores)) {
    validData.criteriaScores = data.criteriaScores.map((item: any, index: number) => ({
      criterion: item.criterion || `Criterion ${index + 1}`,
      weight: Number(item.weight) || 10,
      score: Number(item.score) || 3,
      weightedScore: Number(item.weightedScore) || (Number(item.score) * Number(item.weight)),
      notes: item.notes || "No notes provided"
    }));
  } else {
    errors.push({ field: "criteriaScores", message: "Missing or invalid criteriaScores" });
  }
  
  // Validate strengths
  if (Array.isArray(data.strengths)) {
    validData.strengths = data.strengths;
  } else {
    errors.push({ field: "strengths", message: "Missing or invalid strengths" });
  }
  
  // Validate areasForImprovement
  if (Array.isArray(data.areasForImprovement)) {
    validData.areasForImprovement = data.areasForImprovement;
  } else {
    errors.push({ field: "areasForImprovement", message: "Missing or invalid areasForImprovement" });
  }
  
  // Validate keyRecommendations
  if (Array.isArray(data.keyRecommendations)) {
    validData.keyRecommendations = data.keyRecommendations;
  } else {
    errors.push({ field: "keyRecommendations", message: "Missing or invalid keyRecommendations" });
  }
  
  // Try to extract staff name from markdown or filename if missing
  if (!validData.staffName || validData.staffName === "Unknown Staff") {
    if (data?.markdown) {
      validData.staffName = extractStaffNameFromMarkdown(data.markdown);
    } else if (data?.fileName) {
      validData.staffName = extractStaffNameFromFilename(data.fileName);
    }
  }
  
  // Try to extract date from markdown if missing
  if (!validData.date) {
    if (data?.markdown) {
      validData.date = extractDateFromMarkdown(data.markdown);
    }
  }
  
  // Normalize score to percentage
  validData.overallScore = normalizeScoreToPercentage(validData.overallScore);
  
  // Set performance level based on score if not already set
  if (!validData.performanceLevel || validData.performanceLevel === "Needs Improvement") {
    validData.performanceLevel = getPerformanceLevelFromScore(validData.overallScore);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    data: validData
  };
} 