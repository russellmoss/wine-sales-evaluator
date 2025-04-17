import fetch from 'node-fetch';
import { createDefaultWineSalesRubric, Rubric } from '../app/types/rubric';

interface ApiResponse<T> {
  success?: boolean;
  error?: string;
  data?: T;
}

const BASE_URL = 'http://localhost:3000/api';

async function testRubricAPI() {
  console.log('Starting rubric API integration test...\n');
  
  try {
    // Step 1: List rubrics (initially empty or containing default)
    console.log('Step 1: Getting initial list of rubrics');
    const listResponse = await fetch(`${BASE_URL}/rubrics`);
    if (!listResponse.ok) {
      throw new Error(`Failed to list rubrics: ${listResponse.status} ${listResponse.statusText}`);
    }
    const initialRubrics = (await listResponse.json()) as Rubric[];
    console.log(`Initial rubrics count: ${initialRubrics.length}`);
    console.log('✓ GET /api/rubrics - Success\n');
    
    // Step 2: Create a test rubric
    console.log('Step 2: Creating a test rubric');
    const testRubric = {
      ...createDefaultWineSalesRubric(),
      id: `test-rubric-${Date.now()}`,
      name: 'Test Rubric API',
      description: 'A test rubric for API testing',
      isDefault: false
    };
    
    const createResponse = await fetch(`${BASE_URL}/rubrics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testRubric)
    });
    
    if (!createResponse.ok) {
      throw new Error(`Failed to create rubric: ${createResponse.status} ${createResponse.statusText}`);
    }
    
    const createdRubric = (await createResponse.json()) as Rubric;
    console.log(`Created rubric: ${createdRubric.id}`);
    console.log('✓ POST /api/rubrics - Success\n');
    
    // Step 3: Get the created rubric
    console.log('Step 3: Getting the created rubric');
    const getResponse = await fetch(`${BASE_URL}/rubrics/${createdRubric.id}`);
    
    if (!getResponse.ok) {
      throw new Error(`Failed to get rubric: ${getResponse.status} ${getResponse.statusText}`);
    }
    
    const retrievedRubric = (await getResponse.json()) as Rubric;
    console.log(`Retrieved rubric: ${retrievedRubric.name}`);
    console.log('✓ GET /api/rubrics/:id - Success\n');
    
    // Step 4: Update the rubric
    console.log('Step 4: Updating the rubric');
    const updatedData = {
      ...retrievedRubric,
      name: `${retrievedRubric.name} - Updated`,
      description: `${retrievedRubric.description} - Updated`
    };
    
    const updateResponse = await fetch(`${BASE_URL}/rubrics/${createdRubric.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatedData)
    });
    
    if (!updateResponse.ok) {
      throw new Error(`Failed to update rubric: ${updateResponse.status} ${updateResponse.statusText}`);
    }
    
    const updatedRubric = (await updateResponse.json()) as Rubric;
    console.log(`Updated rubric name: ${updatedRubric.name}`);
    console.log('✓ PUT /api/rubrics/:id - Success\n');
    
    // Step 5: Set as default
    console.log('Step 5: Setting rubric as default');
    const defaultResponse = await fetch(`${BASE_URL}/rubrics/${createdRubric.id}/default`, {
      method: 'PUT'
    });
    
    if (!defaultResponse.ok) {
      throw new Error(`Failed to set rubric as default: ${defaultResponse.status} ${defaultResponse.statusText}`);
    }
    
    const defaultResult = (await defaultResponse.json()) as ApiResponse<Rubric>;
    console.log(`Set as default success: ${defaultResult.success}`);
    console.log('✓ PUT /api/rubrics/:id/default - Success\n');
    
    // Step 6: Verify it's marked as default
    console.log('Step 6: Verifying default status');
    const verifyResponse = await fetch(`${BASE_URL}/rubrics/${createdRubric.id}`);
    
    if (!verifyResponse.ok) {
      throw new Error(`Failed to verify default status: ${verifyResponse.status} ${verifyResponse.statusText}`);
    }
    
    const verifiedRubric = (await verifyResponse.json()) as Rubric;
    if (!verifiedRubric.isDefault) {
      throw new Error('Rubric was not properly set as default');
    }
    console.log('✓ Default status verified\n');
    
    // Step 7: Delete the rubric
    console.log('Step 7: Deleting the test rubric');
    const deleteResponse = await fetch(`${BASE_URL}/rubrics/${createdRubric.id}`, {
      method: 'DELETE'
    });
    
    if (!deleteResponse.ok) {
      throw new Error(`Failed to delete rubric: ${deleteResponse.status} ${deleteResponse.statusText}`);
    }
    
    const deleteResult = (await deleteResponse.json()) as ApiResponse<void>;
    console.log(`Delete success: ${deleteResult.success}`);
    console.log('✓ DELETE /api/rubrics/:id - Success\n');
    
    // Step 8: Verify deletion
    console.log('Step 8: Verifying deletion');
    const finalGetResponse = await fetch(`${BASE_URL}/rubrics/${createdRubric.id}`);
    if (finalGetResponse.status !== 404) {
      throw new Error(`Expected 404 after deletion, got ${finalGetResponse.status}`);
    }
    console.log('✓ Deletion verified\n');
    
    // Step 9: Get final list of rubrics
    console.log('Step 9: Getting final list of rubrics');
    const finalListResponse = await fetch(`${BASE_URL}/rubrics`);
    
    if (!finalListResponse.ok) {
      throw new Error(`Failed to get final list: ${finalListResponse.status} ${finalListResponse.statusText}`);
    }
    
    const finalRubrics = (await finalListResponse.json()) as Rubric[];
    console.log(`Final rubrics count: ${finalRubrics.length}`);
    console.log('✓ Final list verified\n');
    
    console.log('All tests completed successfully! ✨\n');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Make sure the development server is running
console.log('Make sure your Next.js development server is running on http://localhost:3000');
console.log('Press any key to start the tests...');

process.stdin.once('data', () => {
  testRubricAPI().catch(console.error);
}); 