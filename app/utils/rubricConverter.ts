import { RubricTemplate } from '../types/rubricGenerator';
import { CriterionScore, EvaluationData, PerformanceLevel as EvalPerformanceLevel } from '../types/evaluation';
import { Rubric, Criterion, ScoringLevel, PerformanceLevel } from '../types/rubric';

/**
 * Converts a RubricTemplate to the EvaluationData format used by the evaluation system
 * @param rubric The rubric template to convert
 * @param staffName Optional staff name to include in the evaluation data
 * @returns The converted evaluation data
 */
export function convertRubricToEvaluationData(
  rubric: RubricTemplate,
  staffName: string = 'Staff Member'
): EvaluationData {
  // Create array of criterion scores
  const criteriaScores: CriterionScore[] = Object.entries(rubric.criteriaWeights).map(([criterion, weight]) => {
    return {
      criterion,
      weight,
      score: 1, // Default score
      weightedScore: weight, // Initial weighted score (score * weight)
      notes: rubric.criteriaDescriptions[criterion] || ''
    };
  });

  // Calculate total possible score (based on 5 points per criterion)
  const totalPossibleScore = Object.values(rubric.criteriaWeights).reduce((sum, weight) => sum + (weight * 5), 0);
  
  // Calculate default overall score (20% of total)
  const defaultOverallScore = Math.round((totalPossibleScore * 0.2) / 5);

  // Default performance level based on the default overall score
  const defaultPerformanceLevel = getPerformanceLevelFromScore(defaultOverallScore);

  // Create the evaluation data
  const evaluationData: EvaluationData = {
    staffName,
    date: new Date().toISOString().split('T')[0], // Current date in YYYY-MM-DD format
    overallScore: defaultOverallScore,
    performanceLevel: defaultPerformanceLevel,
    criteriaScores,
    observationalNotes: {
      productKnowledge: { score: 1, notes: 'Not evaluated yet' },
      handlingObjections: { score: 1, notes: 'Not evaluated yet' },
      customerEngagement: { score: 1, notes: 'Not evaluated yet' },
      salesTechniques: { score: 1, notes: 'Not evaluated yet' }
    },
    strengths: [
      'To be determined after evaluation',
      'To be determined after evaluation',
      'To be determined after evaluation'
    ],
    areasForImprovement: [
      'To be determined after evaluation',
      'To be determined after evaluation',
      'To be determined after evaluation'
    ],
    keyRecommendations: [
      'To be determined after evaluation',
      'To be determined after evaluation',
      'To be determined after evaluation'
    ],
    rubricId: '',
    conversationSummary: '',
    criteria: Object.fromEntries(
      Object.entries(rubric.criteriaWeights).map(([criterion, weight]) => [
        criterion,
        {
          score: 1,
          feedback: rubric.criteriaDescriptions[criterion] || 'Not evaluated yet'
        }
      ])
    )
  };

  return evaluationData;
}

/**
 * Determines the performance level based on score
 * @param score The score to evaluate
 * @returns The corresponding performance level
 */
function getPerformanceLevelFromScore(score: number): EvalPerformanceLevel {
  if (score >= 90) return 'Exceptional';
  if (score >= 80) return 'Strong';
  if (score >= 70) return 'Proficient';
  if (score >= 60) return 'Developing';
  return 'Needs Improvement';
}

/**
 * Converts an AI-generated rubric template to the required Rubric format
 * @param template The AI-generated rubric template
 * @returns The converted Rubric object
 */
export function convertTemplateToRubric(template: RubricTemplate): Omit<Rubric, 'id' | 'createdAt' | 'updatedAt'> {
  // Convert criteria
  const criteria: Criterion[] = Object.entries(template.criteriaWeights).map(([name, weight], index) => {
    // Convert scoring levels
    const scoringLevels: ScoringLevel[] = Object.entries(template.scoringLevels).map(([score, description]) => {
      const scoreNum = parseInt(score);
      let level: string;
      if (scoreNum === 1) level = 'Needs Improvement';
      else if (scoreNum === 2) level = 'Developing';
      else if (scoreNum === 3) level = 'Proficient';
      else if (scoreNum === 4) level = 'Strong';
      else level = 'Exceptional';

      return {
        score: scoreNum,
        description,
        level
      };
    });

    return {
      id: `criterion-${index + 1}`,
      name,
      description: template.criteriaDescriptions[name],
      weight,
      scoringLevels
    };
  });

  // Convert performance levels with proper score ranges
  const performanceLevels: PerformanceLevel[] = [
    {
      name: 'Needs Improvement',
      minScore: 0,
      maxScore: 60,
      description: template.performanceLevels['Needs Improvement']?.description || 'Performance requiring significant improvement'
    },
    {
      name: 'Developing',
      minScore: 60,
      maxScore: 70,
      description: template.performanceLevels['Developing']?.description || 'Basic skills present but needs development'
    },
    {
      name: 'Proficient',
      minScore: 70,
      maxScore: 80,
      description: template.performanceLevels['Proficient']?.description || 'Competent performance meeting expectations'
    },
    {
      name: 'Strong',
      minScore: 80,
      maxScore: 90,
      description: template.performanceLevels['Strong']?.description || 'Strong performance exceeding expectations'
    },
    {
      name: 'Exceptional',
      minScore: 90,
      maxScore: 100,
      description: template.performanceLevels['Exceptional']?.description || 'Exceptional performance consistently exceeding expectations'
    }
  ];

  return {
    name: template.title,
    description: template.description,
    isDefault: false,
    criteria,
    performanceLevels
  };
} 