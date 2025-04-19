import { GoogleGenerativeAI } from '@google/generative-ai';
import { EvaluationData, validateEvaluationData } from '../types/evaluation';
import { RubricApi } from './rubric-api';

// Initialize with API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Function to list available models
async function listAvailableModels() {
  try {
    console.log('Listing available models...');
    // Use the fetch API to directly call the models endpoint with proper authentication
    const response = await fetch('https://generativelanguage.googleapis.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${process.env.GEMINI_API_KEY}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to list models: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Available models:', JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error('Error listing models:', error);
    throw error;
  }
}

// Call the function to list models when the module is loaded
listAvailableModels().catch(error => {
  console.error('Failed to list models:', error);
});

export async function evaluateWithGemini(
  conversation: string,
  rubricId?: string
): Promise<EvaluationData> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }

  // Load the rubric
  let rubric = null;
  if (rubricId) {
    rubric = await RubricApi.getRubric(rubricId);
  }
  
  if (!rubric) {
    // Fall back to default rubric
    const rubrics = await RubricApi.listRubrics();
    rubric = rubrics.find(r => r.isDefault) || rubrics[0];
    
    if (!rubric) {
      throw new Error('No rubric found for evaluation');
    }
  }

  // Use the correct model name and configuration
  const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-pro",
    generationConfig: {
      temperature: 0.2, // Lower temperature for more consistent evaluations
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 4096, // Increased token limit for more detailed responses
    }
  });

  const prompt = `You are a General Manager of a prestigious winery with over 15 years of experience in wine sales and hospitality. You are evaluating a sales conversation between one of your staff members and a customer. Your goal is to provide detailed, constructive feedback to help your staff member improve their wine sales skills.

Please carefully evaluate this conversation using the following rubric:
${JSON.stringify(rubric, null, 2)}

Conversation to evaluate:
${conversation}

As a winery manager, take your time to thoroughly analyze this conversation. Consider:
1. How well did the staff member identify the customer's needs and preferences?
2. Did they make appropriate wine recommendations based on the customer's taste profile?
3. How effectively did they handle any objections or questions?
4. Did they use proper wine terminology and demonstrate product knowledge?
5. How well did they close the sale or guide the customer toward a purchase decision?

For each criterion in your evaluation, provide SPECIFIC EXAMPLES from the conversation. Quote or reference specific lines or exchanges that demonstrate strengths or areas for improvement. For example, say things like "When the customer mentioned liking bold reds (line 12), you correctly recommended our Cabernet Sauvignon" or "You could have better explained the tasting notes when describing the Chardonnay (line 15)."

IMPORTANT: Be fair and balanced in your evaluation. Don't automatically give low scores. Recognize genuine strengths and provide constructive feedback for areas of improvement. Consider the context of the conversation and what the staff member might have been trying to accomplish.

Provide your evaluation in the following JSON format:
{
  "staffName": "Staff Member",
  "date": "${new Date().toISOString().split('T')[0]}",
  "overallScore": number (0-100),
  "performanceLevel": "Exceptional" | "Strong" | "Proficient" | "Developing" | "Needs Improvement",
  "criteriaScores": [
    {
      "criterion": string,
      "score": number (1-5),
      "weight": number,
      "weightedScore": number,
      "notes": string (include specific examples and line references)
    }
  ],
  "observationalNotes": {
    "productKnowledge": {
      "score": number (1-5),
      "notes": string (include specific examples and line references)
    },
    "handlingObjections": {
      "score": number (1-5),
      "notes": string (include specific examples and line references)
    }
  },
  "strengths": [string, string, string],
  "areasForImprovement": [string, string, string],
  "keyRecommendations": [string, string, string],
  "rubricId": "${rubric.id}"
}

IMPORTANT REQUIREMENTS:
1. You must provide exactly 10 criteria scores
2. You must provide exactly 3 strengths
3. You must provide exactly 3 areas for improvement
4. You must provide exactly 3 key recommendations
5. All scores must be numbers between 1 and 5
6. The overall score must be between 0 and 100
7. The performance level must be one of: "Exceptional", "Strong", "Proficient", "Developing", "Needs Improvement"
8. All fields are required
9. Respond with ONLY the JSON - no other text
10. The strengths array MUST contain exactly 3 items
11. The areasForImprovement array MUST contain exactly 3 items
12. The keyRecommendations array MUST contain exactly 3 items
13. Be specific and detailed in your evaluation notes
14. Provide actionable feedback that would help the staff member improve
15. For each criterion, include specific examples and references to parts of the conversation`;

  try {
    console.log('Sending request to Gemini API...');
    const result = await model.generateContent(prompt);
    console.log('Received response from Gemini API');
    const response = await result.response;
    const text = response.text();
    
    console.log('Raw Gemini response:', text);
    
    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in Gemini response');
    }

    const jsonStr = jsonMatch[0];
    console.log('Extracted JSON:', jsonStr);
    
    const evaluation = JSON.parse(jsonStr) as EvaluationData;
    
    // Log the strengths array to debug
    console.log('Strengths array:', evaluation.strengths);
    console.log('Strengths array length:', evaluation.strengths.length);
    
    const validationResult = validateEvaluationData(evaluation);
    
    if (!validationResult.isValid) {
      console.warn('Validation errors in Gemini response:', validationResult.errors);
      
      // Try to fix the validation errors
      if (validationResult.errors.some(e => e.field === 'strengths' && e.message.includes('exactly 3'))) {
        console.log('Attempting to fix strengths array...');
        if (evaluation.strengths.length < 3) {
          // Add placeholder strengths if needed
          while (evaluation.strengths.length < 3) {
            evaluation.strengths.push('Strength ' + (evaluation.strengths.length + 1));
          }
        } else if (evaluation.strengths.length > 3) {
          // Trim to exactly 3
          evaluation.strengths = evaluation.strengths.slice(0, 3);
        }
      }
      
      if (validationResult.errors.some(e => e.field === 'areasForImprovement' && e.message.includes('exactly 3'))) {
        console.log('Attempting to fix areasForImprovement array...');
        if (evaluation.areasForImprovement.length < 3) {
          // Add placeholder areas if needed
          while (evaluation.areasForImprovement.length < 3) {
            evaluation.areasForImprovement.push('Area for improvement ' + (evaluation.areasForImprovement.length + 1));
          }
        } else if (evaluation.areasForImprovement.length > 3) {
          // Trim to exactly 3
          evaluation.areasForImprovement = evaluation.areasForImprovement.slice(0, 3);
        }
      }
      
      if (validationResult.errors.some(e => e.field === 'keyRecommendations' && e.message.includes('exactly 3'))) {
        console.log('Attempting to fix keyRecommendations array...');
        if (evaluation.keyRecommendations.length < 3) {
          // Add placeholder recommendations if needed
          while (evaluation.keyRecommendations.length < 3) {
            evaluation.keyRecommendations.push('Recommendation ' + (evaluation.keyRecommendations.length + 1));
          }
        } else if (evaluation.keyRecommendations.length > 3) {
          // Trim to exactly 3
          evaluation.keyRecommendations = evaluation.keyRecommendations.slice(0, 3);
        }
      }
      
      // Validate again after fixes
      const fixedValidationResult = validateEvaluationData(evaluation);
      if (!fixedValidationResult.isValid) {
        console.warn('Validation still failed after fixes:', fixedValidationResult.errors);
        throw new Error('Invalid evaluation data from Gemini');
      }
      
      console.log('Successfully fixed validation errors');
    }

    return evaluation;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('authentication')) {
        console.error('Authentication error with Gemini API:', error);
        throw new Error('Authentication failed with Gemini API. Please check your GEMINI_API_KEY.');
      }
      if (error.message.includes('rate limit')) {
        console.error('Rate limit error with Gemini API:', error);
        throw new Error('Rate limit exceeded with Gemini API. Please try again later.');
      }
      console.error('Error analyzing with Gemini:', error);
      throw new Error(`Error analyzing with Gemini: ${error.message}`);
    }
    console.error('Unknown error analyzing with Gemini:', error);
    throw new Error('Unknown error analyzing with Gemini');
  }
} 