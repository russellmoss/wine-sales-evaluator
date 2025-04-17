/**
 * Types for the flexible rubric management system
 */

// Core rubric structure
export interface Rubric {
  id: string;                 // Unique identifier
  name: string;               // Display name
  description: string;        // Purpose and guidance
  isDefault: boolean;         // Whether this is the default rubric
  createdAt: string;          // Creation timestamp
  updatedAt: string;          // Last update timestamp
  criteria: Criterion[];      // List of evaluation criteria
  performanceLevels: PerformanceLevel[]; // Performance classification thresholds
}

// Individual criterion definition
export interface Criterion {
  id: string;                 // Unique identifier
  name: string;               // Display name
  description: string;        // What this evaluates
  weight: number;             // Weight as percentage (0-100)
  scoringLevels: ScoringLevel[]; // Descriptions for each score
}

// Scoring level definition
export interface ScoringLevel {
  score: number;              // Score value (1-5)
  description: string;        // What this score represents
}

// Performance level thresholds
export interface PerformanceLevel {
  name: string;               // Level name (e.g., "Exceptional", "Strong", etc.)
  minScore: number;           // Minimum score for this level (0-100)
  maxScore: number;           // Maximum score for this level (0-100)
  description: string;        // Description of this performance level
}

// Helper function to validate a rubric
export function validateRubric(rubric: Rubric): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Basic validation
  if (!rubric.id) errors.push('Rubric ID is required');
  if (!rubric.name) errors.push('Rubric name is required');
  
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
    // Check coverage of 0-100 range
    const levels = [...rubric.performanceLevels].sort((a, b) => a.minScore - b.minScore);
    
    // Check for gaps or overlaps
    for (let i = 0; i < levels.length - 1; i++) {
      if (levels[i].maxScore !== levels[i + 1].minScore) {
        errors.push(`Gap or overlap between performance levels "${levels[i].name}" and "${levels[i + 1].name}"`);
      }
    }
    
    // Check full range coverage
    if (levels[0].minScore !== 0) {
      errors.push('Performance levels must start at 0%');
    }
    
    if (levels[levels.length - 1].maxScore !== 100) {
      errors.push('Performance levels must end at 100%');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Helper function to create a default wine sales rubric
export function createDefaultWineSalesRubric(): Rubric {
  const now = new Date().toISOString();
  const rubricId = 'wine-sales-default';
  
  return {
    id: rubricId,
    name: 'Wine Sales Evaluation',
    description: 'Standard rubric for evaluating wine tasting room sales interactions',
    isDefault: true,
    createdAt: now,
    updatedAt: now,
    criteria: [
      {
        id: `${rubricId}-criterion-1`,
        name: 'Initial Greeting and Welcome',
        description: 'How effectively does the staff member welcome guests and set a positive tone?',
        weight: 8,
        scoringLevels: [
          { score: 1, description: 'No greeting or unwelcoming approach' },
          { score: 2, description: 'Basic greeting but minimal warmth' },
          { score: 3, description: 'Friendly greeting but lacks personalization' },
          { score: 4, description: 'Warm, friendly greeting with good eye contact' },
          { score: 5, description: 'Exceptional welcome that makes guests feel valued and excited' }
        ]
      },
      {
        id: `${rubricId}-criterion-2`,
        name: 'Building Rapport',
        description: 'How well does the staff member connect personally with the guests?',
        weight: 10,
        scoringLevels: [
          { score: 1, description: 'No attempt to connect personally with guests' },
          { score: 2, description: 'Minimal small talk, mostly transactional' },
          { score: 3, description: 'Some rapport-building questions but limited follow-up' },
          { score: 4, description: 'Good personal connection through meaningful conversation' },
          { score: 5, description: 'Excellent rapport building, including origin questions, future plans, and genuine interest' }
        ]
      },
      {
        id: `${rubricId}-criterion-3`,
        name: 'Winery History and Ethos',
        description: 'How effectively does the staff member communicate the winery\'s story and values?',
        weight: 10,
        scoringLevels: [
          { score: 1, description: 'No mention of winery history or values' },
          { score: 2, description: 'Brief, factual mention of winery background' },
          { score: 3, description: 'Adequate explanation of winery history and values' },
          { score: 4, description: 'Compelling storytelling about winery history, connecting to wines' },
          { score: 5, description: 'Passionate, engaging narrative that brings the winery ethos to life' }
        ]
      },
      {
        id: `${rubricId}-criterion-4`,
        name: 'Storytelling and Analogies',
        description: 'How well does the staff member use storytelling and analogies to describe wines?',
        weight: 10,
        scoringLevels: [
          { score: 1, description: 'Technical descriptions only, no storytelling or analogies' },
          { score: 2, description: 'Minimal storytelling, mostly factual information' },
          { score: 3, description: 'Some storytelling elements but lacking rich analogies' },
          { score: 4, description: 'Good use of stories and analogies that help guests understand wines' },
          { score: 5, description: 'Exceptional storytelling that creates memorable experiences and makes wine accessible' }
        ]
      },
      {
        id: `${rubricId}-criterion-5`,
        name: 'Recognition of Buying Signals',
        description: 'How well does the staff member notice and respond to buying signals?',
        weight: 12,
        scoringLevels: [
          { score: 1, description: 'Misses obvious buying signals completely' },
          { score: 2, description: 'Notices some signals but response is delayed or inappropriate' },
          { score: 3, description: 'Recognizes main buying signals with adequate response' },
          { score: 4, description: 'Quickly identifies buying signals and responds effectively' },
          { score: 5, description: 'Expertly recognizes subtle cues and capitalizes on buying moments' }
        ]
      },
      {
        id: `${rubricId}-criterion-6`,
        name: 'Customer Data Capture',
        description: 'How effectively does the staff member attempt to collect customer information?',
        weight: 8,
        scoringLevels: [
          { score: 1, description: 'No attempt to capture customer data' },
          { score: 2, description: 'Single basic attempt at data collection' },
          { score: 3, description: 'Multiple attempts but without explaining benefits' },
          { score: 4, description: 'Good data capture attempts with clear value proposition' },
          { score: 5, description: 'Natural, non-intrusive data collection that feels beneficial to guest' }
        ]
      },
      {
        id: `${rubricId}-criterion-7`,
        name: 'Asking for the Sale',
        description: 'How effectively does the staff member ask for wine purchases?',
        weight: 12,
        scoringLevels: [
          { score: 1, description: 'Never asks for sale or suggests purchase' },
          { score: 2, description: 'Vague suggestion about purchasing without direct ask' },
          { score: 3, description: 'Basic closing attempt but lacks confidence' },
          { score: 4, description: 'Clear, confident ask for purchase at appropriate time' },
          { score: 5, description: 'Multiple strategic closing attempts that feel natural and appropriate' }
        ]
      },
      {
        id: `${rubricId}-criterion-8`,
        name: 'Personalized Wine Recommendations',
        description: 'How well does the staff member customize wine recommendations based on guest preferences?',
        weight: 10,
        scoringLevels: [
          { score: 1, description: 'Generic recommendations unrelated to expressed interests' },
          { score: 2, description: 'Basic recommendations with minimal personalization' },
          { score: 3, description: 'Adequate recommendations based on general preferences' },
          { score: 4, description: 'Well-tailored recommendations based on specific guest feedback' },
          { score: 5, description: 'Expertly customized selections that perfectly match expressed interests' }
        ]
      },
      {
        id: `${rubricId}-criterion-9`,
        name: 'Wine Club Presentation',
        description: 'How effectively does the staff member present and invite guests to join the wine club?',
        weight: 12,
        scoringLevels: [
          { score: 1, description: 'No mention of wine club or inadequate response when asked' },
          { score: 2, description: 'Basic wine club information without personalization' },
          { score: 3, description: 'Adequate explanation of benefits but minimal customization' },
          { score: 4, description: 'Good presentation of wine club with benefits tailored to guest interests' },
          { score: 5, description: 'Compelling, personalized wine club presentation with clear invitation to join' }
        ]
      },
      {
        id: `${rubricId}-criterion-10`,
        name: 'Closing Interaction',
        description: 'How well does the staff member conclude the interaction and encourage future visits?',
        weight: 8,
        scoringLevels: [
          { score: 1, description: 'Abrupt ending with no thanks or future invitation' },
          { score: 2, description: 'Basic thank you but no encouragement to return' },
          { score: 3, description: 'Polite conclusion with general invitation to return' },
          { score: 4, description: 'Warm thank you with specific suggestion for future visit' },
          { score: 5, description: 'Memorable farewell that reinforces relationship and ensures future visits' }
        ]
      }
    ],
    performanceLevels: [
      { name: 'Exceptional', minScore: 90, maxScore: 100, description: 'Outstanding performance that exceeds expectations in all areas' },
      { name: 'Strong', minScore: 80, maxScore: 90, description: 'Very good performance with minor areas for improvement' },
      { name: 'Proficient', minScore: 70, maxScore: 80, description: 'Solid performance that meets expectations' },
      { name: 'Developing', minScore: 60, maxScore: 70, description: 'Basic performance with significant areas for improvement' },
      { name: 'Needs Improvement', minScore: 0, maxScore: 60, description: 'Performance requiring substantial training and development' }
    ]
  };
}

// Add this test function at the end of the file for manual testing
export function testRubricModel() {
  // Create default rubric and validate
  const defaultRubric = createDefaultWineSalesRubric();
  const validationResult = validateRubric(defaultRubric);
  
  console.log('Default rubric valid:', validationResult.isValid);
  if (!validationResult.isValid) {
    console.error('Validation errors:', validationResult.errors);
  }
  
  // Test with invalid rubric
  const invalidRubric: Rubric = {
    ...defaultRubric,
    criteria: [
      ...defaultRubric.criteria.slice(0, 2),
      {
        ...defaultRubric.criteria[2],
        weight: 20 // Changed weight to make sum > 100
      },
      ...defaultRubric.criteria.slice(3)
    ]
  };
  
  const invalidResult = validateRubric(invalidRubric);
  console.log('Invalid rubric test result:', invalidResult);
  
  return {
    defaultRubric,
    validationResult,
    invalidRubric,
    invalidResult
  };
} 