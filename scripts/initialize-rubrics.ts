const { initializeRubricSystem } = require('../app/utils/storage');
const rubricDotenv = require('dotenv');

// Load environment variables
rubricDotenv.config({ path: '.env.local' });

async function initializeRubrics() {
  try {
    console.log('Initializing rubric system...');
    await initializeRubricSystem();
    console.log('Rubric system initialized successfully');
  } catch (error) {
    console.error('Error initializing rubric system:', error);
    process.exit(1);
  }
}

// Run the initialization
initializeRubrics(); 