import { NextRequest, NextResponse } from 'next/server';
import { getStorageProvider } from '@/app/utils/storage';
import { validateRubric } from '@/app/types/rubric';
import { v4 as uuidv4 } from 'uuid';

// GET /api/rubrics - List all rubrics
export async function GET(request: NextRequest) {
  try {
    console.log('API: GET /api/rubrics - Listing all rubrics');
    
    const storage = getStorageProvider();
    const rubrics = await storage.listRubrics();
    
    console.log(`API: Found ${rubrics.length} rubrics`);
    return NextResponse.json(rubrics);
  } catch (error) {
    console.error('API: Error listing rubrics:', error);
    return NextResponse.json(
      { error: 'Failed to list rubrics', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST /api/rubrics - Create a new rubric
export async function POST(request: NextRequest) {
  try {
    console.log('API: POST /api/rubrics - Creating new rubric');
    
    // Parse the request body
    const rubricData = await request.json();
    console.log('API: Received rubric data:', rubricData);
    
    // Set required fields if not provided
    const now = new Date().toISOString();
    const rubric = {
      ...rubricData,
      id: rubricData.id || uuidv4(),
      createdAt: rubricData.createdAt || now,
      updatedAt: now
    };
    
    // Validate the rubric
    const validation = validateRubric(rubric);
    if (!validation.isValid) {
      console.error('API: Invalid rubric data:', validation.errors);
      return NextResponse.json(
        { error: 'Invalid rubric data', validationErrors: validation.errors },
        { status: 400 }
      );
    }
    
    // Save the rubric
    const storage = getStorageProvider();
    await storage.saveRubric(rubric);
    console.log(`API: Rubric ${rubric.id} created successfully`);
    
    return NextResponse.json(rubric, { status: 201 });
  } catch (error) {
    console.error('API: Error creating rubric:', error);
    return NextResponse.json(
      { error: 'Failed to create rubric', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 