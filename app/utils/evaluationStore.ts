import { EvaluationData } from '../types/evaluation';
import { RubricTemplate } from '../types/rubricGenerator';
import { convertRubricToEvaluationData } from './rubricConverter';

/**
 * Loads the current evaluation rubric from localStorage
 * @returns The evaluation data for the current rubric or null if not found
 */
export function loadCurrentRubric(): EvaluationData | null {
  try {
    // Check if we have a rubric in localStorage
    const storedRubric = localStorage.getItem('wineEvaluationRubric');
    
    if (storedRubric) {
      // Parse the stored rubric
      const rubricTemplate = JSON.parse(storedRubric) as RubricTemplate;
      
      // Convert it to evaluation data
      return convertRubricToEvaluationData(rubricTemplate);
    }
    
    // If no rubric is found, return null
    return null;
  } catch (error) {
    console.error('Error loading current rubric:', error);
    return null;
  }
}

/**
 * Sets the current evaluation rubric in localStorage
 * @param rubric The rubric template to use
 * @returns The converted evaluation data
 */
export function setCurrentRubric(rubric: RubricTemplate): EvaluationData {
  try {
    // Store the rubric in localStorage
    localStorage.setItem('wineEvaluationRubric', JSON.stringify(rubric));
    
    // Convert and return the evaluation data
    return convertRubricToEvaluationData(rubric);
  } catch (error) {
    console.error('Error setting current rubric:', error);
    throw error;
  }
}

/**
 * Clears the current rubric from localStorage
 */
export function clearCurrentRubric(): void {
  try {
    localStorage.removeItem('wineEvaluationRubric');
  } catch (error) {
    console.error('Error clearing current rubric:', error);
  }
}

/**
 * Checks if a rubric exists in localStorage
 * @returns True if a rubric exists, false otherwise
 */
export function hasCurrentRubric(): boolean {
  try {
    return localStorage.getItem('wineEvaluationRubric') !== null;
  } catch (error) {
    console.error('Error checking for current rubric:', error);
    return false;
  }
} 