import { RubricTemplate, RubricGenerationResponse } from '../types/rubricGenerator';

const API_BASE_URL = '/api';

/**
 * Generates a rubric based on scenario data and requirements
 * @param scenarioData The scenario JSON object
 * @param requirements Natural language requirements for the rubric
 * @returns A promise that resolves to the generated rubric
 */
export const generateRubric = async (
  scenarioData: any,
  requirements: string
): Promise<RubricTemplate> => {
  try {
    // Validate inputs
    if (!scenarioData) {
      throw new Error('Scenario data is required');
    }
    
    if (!requirements || typeof requirements !== 'string' || requirements.trim().length === 0) {
      throw new Error('Requirements must be a non-empty string');
    }
    
    // Make API request to backend
    const response = await fetch(`${API_BASE_URL}/rubric/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        scenario: scenarioData,
        requirements: requirements
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
    }
    
    const data: RubricGenerationResponse = await response.json();
    
    if (!data.success || !data.rubric) {
      throw new Error(data.error || 'Failed to generate rubric');
    }
    
    return data.rubric;
  } catch (error) {
    console.error('Error in generateRubric:', error);
    throw error;
  }
};

/**
 * Saves a generated rubric to be used in the application
 * @param rubric The rubric template to save
 * @returns A promise that resolves when the rubric is saved
 */
export const saveRubric = async (rubric: RubricTemplate): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/rubric/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(rubric),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error in saveRubric:', error);
    throw error;
  }
}; 