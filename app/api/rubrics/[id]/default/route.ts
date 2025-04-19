import { NextRequest, NextResponse } from 'next/server';
import { getStorageProvider } from '@/app/utils/storage';

// Specify Node.js runtime
export const runtime = 'nodejs';

// PUT /api/rubrics/:id/default - Set a rubric as default
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const rubricId = params.id;
    console.log(`API: PUT /api/rubrics/${rubricId}/default - Setting as default rubric`);
    
    // Initialize storage provider
    const storage = getStorageProvider();
    
    // Set the rubric as default
    const success = await storage.setDefaultRubric(rubricId);
    
    if (!success) {
      console.log(`API: Failed to set rubric ${rubricId} as default (not found)`);
      return NextResponse.json(
        { error: 'Rubric not found or could not be set as default' },
        { status: 404 }
      );
    }
    
    // Get the updated rubric to return
    const rubric = await storage.getRubric(rubricId);
    
    console.log(`API: Rubric ${rubricId} set as default successfully`);
    return NextResponse.json({ success: true, rubric });
  } catch (error) {
    console.error(`API: Error setting default rubric:`, error);
    return NextResponse.json(
      { error: 'Failed to set default rubric', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 