import { NextRequest, NextResponse } from 'next/server';
import { RubricTemplate } from '@/app/types/rubricGenerator';
import fs from 'fs';
import path from 'path';

// Define a unique ID generator
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
};

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const rubric = await request.json() as RubricTemplate;
    
    // Validate the rubric
    if (!rubric.title || !rubric.criteriaWeights || Object.keys(rubric.criteriaWeights).length !== 10) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid rubric format' 
      }, { status: 400 });
    }
    
    // Save the rubric
    const rubricId = await saveRubricToFile(rubric);
    
    // Return success with the ID
    return NextResponse.json({ 
      success: true, 
      id: rubricId
    });
    
  } catch (error) {
    console.error('Error saving rubric:', error);
    
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

/**
 * Saves a rubric to a file in the public directory
 * @param rubric The rubric template to save
 * @returns The generated ID for the saved rubric
 */
async function saveRubricToFile(rubric: RubricTemplate): Promise<string> {
  try {
    // Generate a unique ID for the rubric
    const rubricId = generateId();
    
    // Define the directory and file path
    const dirPath = path.join(process.cwd(), 'public', 'rubrics');
    const filePath = path.join(dirPath, `${rubricId}.json`);
    
    // Create the directory if it doesn't exist
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    
    // Save the rubric to a file
    fs.writeFileSync(filePath, JSON.stringify(rubric, null, 2));
    
    console.log(`Rubric saved to ${filePath}`);
    
    return rubricId;
  } catch (error) {
    console.error('Error saving rubric to file:', error);
    throw new Error('Failed to save rubric');
  }
} 