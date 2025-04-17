import { getStorageProvider, initializeRubricSystem } from '../app/utils/storage';
import { createDefaultWineSalesRubric } from '../app/types/rubric';

async function testRubricStorage() {
  console.log('Testing rubric storage...');
  
  // Initialize the storage provider
  const storage = getStorageProvider();
  
  // Initialize the rubric system
  await initializeRubricSystem();
  
  // List all rubrics
  const initialRubrics = await storage.listRubrics();
  console.log(`Initial rubrics: ${initialRubrics.length}`);
  initialRubrics.forEach(r => console.log(`- ${r.id}: ${r.name} (default: ${r.isDefault})`));
  
  // Get the default rubric
  const defaultRubric = await storage.getDefaultRubric();
  console.log('Default rubric:', defaultRubric?.name);
  
  // Create a second test rubric
  const testRubric = {
    ...createDefaultWineSalesRubric(),
    id: 'test-rubric',
    name: 'Test Rubric',
    description: 'A test rubric for development',
    isDefault: false
  };
  
  // Save the test rubric
  await storage.saveRubric(testRubric);
  console.log('Test rubric saved');
  
  // List rubrics again
  const updatedRubrics = await storage.listRubrics();
  console.log(`Updated rubrics: ${updatedRubrics.length}`);
  updatedRubrics.forEach(r => console.log(`- ${r.id}: ${r.name} (default: ${r.isDefault})`));
  
  // Try setting the test rubric as default
  await storage.setDefaultRubric('test-rubric');
  
  // Check if default rubric changed
  const newDefaultRubric = await storage.getDefaultRubric();
  console.log('New default rubric:', newDefaultRubric?.name);
  
  // Delete the test rubric
  await storage.deleteRubric('test-rubric');
  console.log('Test rubric deleted');
  
  // List rubrics again
  const finalRubrics = await storage.listRubrics();
  console.log(`Final rubrics: ${finalRubrics.length}`);
  finalRubrics.forEach(r => console.log(`- ${r.id}: ${r.name} (default: ${r.isDefault})`));
  
  // Check final default rubric
  const finalDefaultRubric = await storage.getDefaultRubric();
  console.log('Final default rubric:', finalDefaultRubric?.name);
  
  console.log('Test completed successfully!');
}

// Make sure the local development server is running
console.log('Make sure your Next.js development server is running on http://localhost:3000');
console.log('Press any key to start the test...');
process.stdin.once('data', () => {
  testRubricStorage().catch(console.error);
}); 