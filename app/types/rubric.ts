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
  scoringLevels: ScoringLevel[];
}

// Scoring level definition
export interface ScoringLevel {
  score: number;              // Score value (1-5)
  description: string;        // What this score represents
  level: string;             // Level name (e.g., "Needs Improvement", "Meets Expectations", etc.)
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
  return {
    id: 'default-wine-sales',
    name: 'Wine Sales Performance',
    description: 'Evaluates staff performance in wine sales and customer engagement',
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    criteria: [
      {
        id: 'greeting',
        name: 'Initial Greeting',
        description: 'How effectively does the staff member welcome guests and set a positive tone?',
        weight: 8,
        scoringLevels: [
          { score: 1, description: 'No greeting or unwelcoming approach', level: 'Needs Improvement' },
          { score: 2, description: 'Basic greeting but minimal warmth', level: 'Developing' },
          { score: 3, description: 'Friendly greeting with basic engagement', level: 'Meets Expectations' },
          { score: 4, description: 'Warm, personalized greeting with good eye contact', level: 'Exceeds Expectations' },
          { score: 5, description: 'Exceptional greeting with immediate rapport building', level: 'Exceptional' }
        ]
      },
      {
        id: 'personal-connection',
        name: 'Personal Connection',
        description: 'How well does the staff member connect personally with the guests?',
        weight: 10,
        scoringLevels: [
          { score: 1, description: 'No attempt to connect personally with guests', level: 'Needs Improvement' },
          { score: 2, description: 'Minimal small talk, mostly transactional', level: 'Developing' },
          { score: 3, description: 'Basic personal connection with some engagement', level: 'Meets Expectations' },
          { score: 4, description: 'Strong personal connection with good conversation flow', level: 'Exceeds Expectations' },
          { score: 5, description: 'Exceptional personal connection with memorable interaction', level: 'Exceptional' }
        ]
      },
      {
        id: 'winery-story',
        name: 'Winery Story',
        description: 'How effectively does the staff member communicate the winery\'s story and values?',
        weight: 10,
        scoringLevels: [
          { score: 1, description: 'No mention of winery history or values', level: 'Needs Improvement' },
          { score: 2, description: 'Brief, factual mention of winery background', level: 'Developing' },
          { score: 3, description: 'Basic winery story with some enthusiasm', level: 'Meets Expectations' },
          { score: 4, description: 'Engaging winery story with personal connection', level: 'Exceeds Expectations' },
          { score: 5, description: 'Compelling winery story with emotional impact', level: 'Exceptional' }
        ]
      },
      {
        id: 'storytelling',
        name: 'Storytelling',
        description: 'How well does the staff member use storytelling and analogies to describe wines?',
        weight: 10,
        scoringLevels: [
          { score: 1, description: 'Technical descriptions only, no storytelling or analogies', level: 'Needs Improvement' },
          { score: 2, description: 'Minimal storytelling, mostly factual information', level: 'Developing' },
          { score: 3, description: 'Basic storytelling with some analogies', level: 'Meets Expectations' },
          { score: 4, description: 'Engaging storytelling with effective analogies', level: 'Exceeds Expectations' },
          { score: 5, description: 'Exceptional storytelling with memorable analogies', level: 'Exceptional' }
        ]
      },
      {
        id: 'buying-signals',
        name: 'Buying Signals',
        description: 'How well does the staff member notice and respond to buying signals?',
        weight: 12,
        scoringLevels: [
          { score: 1, description: 'Misses obvious buying signals completely', level: 'Needs Improvement' },
          { score: 2, description: 'Notices some signals but response is delayed or inappropriate', level: 'Developing' },
          { score: 3, description: 'Recognizes and responds to most buying signals', level: 'Meets Expectations' },
          { score: 4, description: 'Proactively identifies and capitalizes on buying signals', level: 'Exceeds Expectations' },
          { score: 5, description: 'Exceptional at reading and responding to buying signals', level: 'Exceptional' }
        ]
      },
      {
        id: 'data-collection',
        name: 'Data Collection',
        description: 'How effectively does the staff member attempt to collect customer information?',
        weight: 8,
        scoringLevels: [
          { score: 1, description: 'No attempt to capture customer data', level: 'Needs Improvement' },
          { score: 2, description: 'Single basic attempt at data collection', level: 'Developing' },
          { score: 3, description: 'Multiple attempts to collect basic information', level: 'Meets Expectations' },
          { score: 4, description: 'Effective data collection with good follow-up', level: 'Exceeds Expectations' },
          { score: 5, description: 'Exceptional data collection with detailed information', level: 'Exceptional' }
        ]
      },
      {
        id: 'asking-for-sale',
        name: 'Asking for Sale',
        description: 'How effectively does the staff member ask for wine purchases?',
        weight: 12,
        scoringLevels: [
          { score: 1, description: 'Never asks for sale or suggests purchase', level: 'Needs Improvement' },
          { score: 2, description: 'Vague suggestion about purchasing without direct ask', level: 'Developing' },
          { score: 3, description: 'Direct ask for purchase with basic closing', level: 'Meets Expectations' },
          { score: 4, description: 'Effective closing with multiple attempts', level: 'Exceeds Expectations' },
          { score: 5, description: 'Exceptional closing with personalized approach', level: 'Exceptional' }
        ]
      },
      {
        id: 'customization',
        name: 'Customization',
        description: 'How well does the staff member customize wine recommendations based on guest preferences?',
        weight: 10,
        scoringLevels: [
          { score: 1, description: 'Generic recommendations unrelated to expressed interests', level: 'Needs Improvement' },
          { score: 2, description: 'Basic recommendations with minimal personalization', level: 'Developing' },
          { score: 3, description: 'Personalized recommendations based on preferences', level: 'Meets Expectations' },
          { score: 4, description: 'Highly customized recommendations with good reasoning', level: 'Exceeds Expectations' },
          { score: 5, description: 'Exceptional customization with perfect wine matches', level: 'Exceptional' }
        ]
      },
      {
        id: 'wine-club',
        name: 'Wine Club',
        description: 'How effectively does the staff member present and invite guests to join the wine club?',
        weight: 12,
        scoringLevels: [
          { score: 1, description: 'No mention of wine club or inadequate response when asked', level: 'Needs Improvement' },
          { score: 2, description: 'Basic wine club information without personalization', level: 'Developing' },
          { score: 3, description: 'Clear wine club presentation with basic benefits', level: 'Meets Expectations' },
          { score: 4, description: 'Compelling wine club presentation with personalized benefits', level: 'Exceeds Expectations' },
          { score: 5, description: 'Exceptional wine club presentation with immediate sign-up', level: 'Exceptional' }
        ]
      },
      {
        id: 'conclusion',
        name: 'Conclusion',
        description: 'How well does the staff member conclude the interaction and encourage future visits?',
        weight: 8,
        scoringLevels: [
          { score: 1, description: 'Abrupt ending with no thanks or future invitation', level: 'Needs Improvement' },
          { score: 2, description: 'Basic thank you but no encouragement to return', level: 'Developing' },
          { score: 3, description: 'Polite conclusion with invitation to return', level: 'Meets Expectations' },
          { score: 4, description: 'Warm conclusion with specific invitation to return', level: 'Exceeds Expectations' },
          { score: 5, description: 'Exceptional conclusion with memorable send-off', level: 'Exceptional' }
        ]
      }
    ],
    performanceLevels: [
      { name: 'Needs Improvement', minScore: 0, maxScore: 59, description: 'Significant improvement needed in sales approach' },
      { name: 'Developing', minScore: 60, maxScore: 69, description: 'Basic skills present but needs refinement' },
      { name: 'Meets Expectations', minScore: 70, maxScore: 84, description: 'Solid performance meeting basic requirements' },
      { name: 'Exceeds Expectations', minScore: 85, maxScore: 94, description: 'Strong performance exceeding requirements' },
      { name: 'Exceptional', minScore: 95, maxScore: 100, description: 'Outstanding performance in all areas' }
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