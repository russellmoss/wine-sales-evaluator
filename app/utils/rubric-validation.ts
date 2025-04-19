import type { Rubric, Criterion, PerformanceLevel } from '@/app/types/rubric';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateRubric(rubric: Rubric): ValidationResult {
  const errors: string[] = [];

  // Basic validation
  if (!rubric.id) errors.push('Rubric ID is required');
  if (!rubric.name) errors.push('Rubric name is required');
  if (!rubric.description) errors.push('Rubric description is required');

  // Criteria validation
  if (!Array.isArray(rubric.criteria) || rubric.criteria.length === 0) {
    errors.push('Rubric must have at least one criterion');
  } else {
    // Check if weights sum to 100%
    const totalWeight = rubric.criteria.reduce((sum, criterion) => sum + criterion.weight, 0);
    if (Math.abs(totalWeight - 100) > 0.01) {
      errors.push(`Criteria weights must sum to 100% (current sum: ${totalWeight}%)`);
    }

    // Check each criterion
    rubric.criteria.forEach((criterion, index) => {
      if (!criterion.id) errors.push(`Criterion ${index + 1} is missing an ID`);
      if (!criterion.name) errors.push(`Criterion ${index + 1} is missing a name`);
      if (criterion.weight <= 0) errors.push(`Criterion ${criterion.name || index + 1} has invalid weight`);

      // Check scoring levels
      if (!Array.isArray(criterion.scoringLevels) || criterion.scoringLevels.length === 0) {
        errors.push(`Criterion ${criterion.name || index + 1} must have at least one scoring level`);
      } else {
        // Ensure scoring levels are complete (1-5)
        const scores = criterion.scoringLevels.map(level => level.score).sort((a, b) => a - b);
        const expectedScores = [1, 2, 3, 4, 5];
        const missingScores = expectedScores.filter(score => !scores.includes(score));

        if (missingScores.length > 0) {
          errors.push(`Criterion ${criterion.name || index + 1} is missing scoring levels: ${missingScores.join(', ')}`);
        }
      }
    });
  }

  // Performance levels validation
  if (!Array.isArray(rubric.performanceLevels) || rubric.performanceLevels.length === 0) {
    errors.push('Rubric must have at least one performance level');
  } else {
    // Check each performance level
    rubric.performanceLevels.forEach((level, index) => {
      if (!level.name) errors.push(`Performance level ${index + 1} is missing a name`);
      if (level.minScore < 0 || level.minScore > 100) {
        errors.push(`Performance level ${level.name || index + 1} has invalid minimum score`);
      }
      if (level.maxScore < 0 || level.maxScore > 100) {
        errors.push(`Performance level ${level.name || index + 1} has invalid maximum score`);
      }
      if (level.minScore > level.maxScore) {
        errors.push(`Performance level ${level.name || index + 1} has minimum score greater than maximum score`);
      }
    });

    // Check for overlapping score ranges
    const sortedLevels = [...rubric.performanceLevels].sort((a, b) => a.minScore - b.minScore);
    for (let i = 0; i < sortedLevels.length - 1; i++) {
      if (sortedLevels[i].maxScore !== sortedLevels[i + 1].minScore) {
        errors.push(`Performance levels have overlapping or gap in score ranges`);
        break;
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
} 