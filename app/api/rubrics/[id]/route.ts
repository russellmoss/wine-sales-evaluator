import { NextRequest, NextResponse } from 'next/server';
import { getStorageProvider } from '@/app/utils/storage';
import { validateRubric } from '@/app/types/rubric';

export const runtime = 'nodejs';

// GET /api/rubrics/:id - Get a specific rubric
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const rubricId = params.id;
    console.log(`API: GET /api/rubrics/${rubricId} - Retrieving rubric`);
    
    const storage = getStorageProvider();
    const rubric = await storage.getRubric(rubricId);
    
    if (!rubric) {
      console.log(`API: Rubric ${rubricId} not found`);
      return NextResponse.json(
        { error: 'Rubric not found' },
        { status: 404 }
      );
    }
    
    console.log(`API: Rubric ${rubricId} found`);
    return NextResponse.json(rubric);
  } catch (error) {
    console.error(`API: Error retrieving rubric:`, error);
    return NextResponse.json(
      { error: 'Failed to retrieve rubric', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// PUT /api/rubrics/:id - Update an existing rubric
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const rubricId = params.id;
    console.log(`API: PUT /api/rubrics/${rubricId} - Updating rubric`);
    
    const storage = getStorageProvider();
    
    // Check if the rubric exists
    const existingRubric = await storage.getRubric(rubricId);
    if (!existingRubric) {
      console.log(`API: Rubric ${rubricId} not found for update`);
      return NextResponse.json(
        { error: 'Rubric not found' },
        { status: 404 }
      );
    }
    
    // Parse the request body
    const updates = await request.json();
    
    // Merge updates with existing rubric
    const updatedRubric = {
      ...existingRubric,
      ...updates,
      id: rubricId, // Ensure ID doesn't change
      createdAt: existingRubric.createdAt, // Preserve creation date
      updatedAt: new Date().toISOString() // Update the timestamp
    };
    
    // Validate the updated rubric
    const validation = validateRubric(updatedRubric);
    if (!validation.isValid) {
      console.error('API: Invalid rubric data for update:', validation.errors);
      return NextResponse.json(
        { error: 'Invalid rubric data', validationErrors: validation.errors },
        { status: 400 }
      );
    }
    
    // Save the updated rubric
    await storage.saveRubric(updatedRubric);
    console.log(`API: Rubric ${rubricId} updated successfully`);
    
    return NextResponse.json(updatedRubric);
  } catch (error) {
    console.error(`API: Error updating rubric:`, error);
    return NextResponse.json(
      { error: 'Failed to update rubric', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE /api/rubrics/:id - Delete a rubric
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const rubricId = params.id;
    console.log(`API: DELETE /api/rubrics/${rubricId} - Deleting rubric`);
    
    const storage = getStorageProvider();
    
    // Try to delete the rubric
    const deleted = await storage.deleteRubric(rubricId);
    
    if (!deleted) {
      console.log(`API: Rubric ${rubricId} not found for deletion`);
      return NextResponse.json(
        { error: 'Rubric not found or could not be deleted' },
        { status: 404 }
      );
    }
    
    console.log(`API: Rubric ${rubricId} deleted successfully`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`API: Error deleting rubric:`, error);
    return NextResponse.json(
      { error: 'Failed to delete rubric', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 