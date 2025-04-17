import { createDefaultWineSalesRubric, validateRubric } from '../app/types/rubric';

// Test function
function testRubricModel() {
  console.log('Testing rubric model...');
  
  // Create default rubric and validate
  const defaultRubric = createDefaultWineSalesRubric();
  const validationResult = validateRubric(defaultRubric);
  
  console.log('Default rubric valid:', validationResult.isValid);
  if (!validationResult.isValid) {
    console.error('Validation errors:', validationResult.errors);
  }
  
  // Test with invalid rubric (modified weights)
  const invalidRubric = {
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
  console.log('Invalid rubric test result:');
  console.log('- Valid:', invalidResult.isValid);
  console.log('- Errors:', invalidResult.errors);
  
  return {
    defaultRubric,
    validationResult,
    invalidRubric,
    invalidResult
  };
}

// Run the test
testRubricModel(); 