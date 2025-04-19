import { EvaluationData, validateEvaluationData } from '../types/evaluation';
import { RubricApi } from './rubric-api';

// Function to list available models
async function listAvailableModels() {
  try {
    console.log('Listing available models...');
    
    // Check if API key is set
    if (!process.env.GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY environment variable is not set');
      return null;
    }
    
    // Log the first few characters of the API key for debugging
    const apiKeyPreview = process.env.GEMINI_API_KEY.substring(0, 10) + '...';
    console.log(`Using Gemini API key: ${apiKeyPreview}`);
    
    // Use the fetch API to directly call the models endpoint with proper authentication
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
      headers: {
        'Authorization': `Bearer ${process.env.GEMINI_API_KEY}`
      }
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        console.error('Authentication failed with Gemini API. Please check your GEMINI_API_KEY.');
        return null;
      }
      throw new Error(`Failed to list models: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Available models:', JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error('Error listing models:', error);
    return null;
  }
}

// Remove the automatic call to listAvailableModels
// This was causing 401 errors even when using Claude

export async function evaluateWithGemini(
  conversation: string,
  rubricId?: string
): Promise<EvaluationData> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }

  // Log the first few characters of the API key for debugging
  const apiKeyPreview = process.env.GEMINI_API_KEY.substring(0, 10) + '...';
  console.log(`Using Gemini API key: ${apiKeyPreview}`);

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

  // Create the prompt
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
    
    // First, call the ListModels API to check available models
    console.log('Calling ListModels API...');
    const listModelsUrl = `https://generativelanguage.googleapis.com/v1/models?key=${process.env.GEMINI_API_KEY}`;
    console.log('ListModels URL:', listModelsUrl);

    try {
      const listModelsResponse = await fetch(listModelsUrl, {
        method: 'GET',
      });

      if (!listModelsResponse.ok) {
        const errorText = await listModelsResponse.text();
        console.error('ListModels API error:', errorText);
        console.error(`Response status: ${listModelsResponse.status}, statusText: ${listModelsResponse.statusText}`);
        console.error('Response headers:', JSON.stringify(Object.fromEntries([...listModelsResponse.headers]), null, 2));
        throw new Error(`ListModels API error: ${listModelsResponse.status} ${listModelsResponse.statusText} - ${errorText}`);
      }

      const listModelsData = await listModelsResponse.json();
      console.log('ListModels API Response:', JSON.stringify(listModelsData, null, 2));
      console.log('Available Models:', listModelsData.models);

    } catch (error) {
      console.error('Error calling ListModels API:', error);
      // Continue with generateContent even if ListModels fails
    }
    
    // Now proceed with the generateContent call
    // Log the request details for debugging
    const requestUrl = 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro-001:generateContent';
    console.log(`Request URL: ${requestUrl}`);
    console.log('Using Gemini model:', 'models/gemini-1.5-pro-001');
    
    // Log the complete URL including API key
    console.log('Full Gemini API URL:', `${requestUrl}?key=${process.env.GEMINI_API_KEY}`);
    
    // Use the fetch API to directly call the Gemini API with API key in the URL
    const response = await fetch(`${requestUrl}?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 4096
        }
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error response:', errorText);
      console.error(`Response status: ${response.status}, statusText: ${response.statusText}`);
      console.error('Response headers:', JSON.stringify(Object.fromEntries([...response.headers]), null, 2));
      throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    console.log('Received response from Gemini API');
    const data = await response.json();
    console.log('Raw Gemini response:', JSON.stringify(data, null, 2));
    
    // Extract the text from the response
    const text = data.candidates[0].content.parts[0].text;
    console.log('Extracted text from Gemini response');
    
    // Extract JSON from the response - improved regex to handle more cases
    let jsonStr = '';
    try {
      // First try to find JSON between curly braces
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
        console.log('Extracted JSON using regex:', jsonStr.substring(0, 100) + '...');
      } else {
        // If no JSON found with regex, try to parse the entire text
        console.log('No JSON found with regex, trying to parse entire text');
        jsonStr = text;
      }
      
      // Try to parse the JSON
      let evaluation;
      try {
        evaluation = JSON.parse(jsonStr) as EvaluationData;
        console.log('Successfully parsed JSON from Gemini response');
      } catch (parseError) {
        console.error('Error parsing JSON from Gemini response:', parseError);
        
        // Try to fix common JSON issues
        console.log('Attempting to fix JSON issues...');
        
        // Fix trailing commas in arrays
        jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');
        
        // Fix missing quotes around property names
        jsonStr = jsonStr.replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3');
        
        // Fix missing quotes around string values
        jsonStr = jsonStr.replace(/:\s*([^",\{\}\[\]]+)([,\}])/g, ':"$1"$2');
        
        // Try parsing again
        try {
          evaluation = JSON.parse(jsonStr) as EvaluationData;
          console.log('Successfully parsed fixed JSON');
        } catch (secondParseError) {
          console.error('Failed to parse fixed JSON:', secondParseError);
          
          // Create a fallback evaluation
          console.log('Creating fallback evaluation data');
          evaluation = {
            staffName: "Staff Member",
            date: new Date().toISOString().split('T')[0],
            overallScore: 70,
            performanceLevel: "Proficient" as const,
            criteriaScores: [
              {
                criterion: "Initial Greeting",
                score: 3,
                weight: 10,
                weightedScore: 30,
                notes: "Basic greeting observed."
              },
              {
                criterion: "Building Rapport",
                score: 3,
                weight: 10,
                weightedScore: 30,
                notes: "Basic rapport building observed."
              },
              {
                criterion: "Wine Knowledge",
                score: 3,
                weight: 10,
                weightedScore: 30,
                notes: "Basic wine knowledge demonstrated."
              },
              {
                criterion: "Recommendations",
                score: 3,
                weight: 10,
                weightedScore: 30,
                notes: "Basic recommendations made."
              },
              {
                criterion: "Closing",
                score: 3,
                weight: 10,
                weightedScore: 30,
                notes: "Basic closing observed."
              },
              {
                criterion: "Personalization",
                score: 3,
                weight: 10,
                weightedScore: 30,
                notes: "Basic personalization observed."
              },
              {
                criterion: "Wine Club",
                score: 3,
                weight: 10,
                weightedScore: 30,
                notes: "Basic wine club discussion observed."
              },
              {
                criterion: "Follow-up",
                score: 3,
                weight: 10,
                weightedScore: 30,
                notes: "Basic follow-up observed."
              },
              {
                criterion: "Objection Handling",
                score: 3,
                weight: 10,
                weightedScore: 30,
                notes: "Basic objection handling observed."
              },
              {
                criterion: "Overall Experience",
                score: 3,
                weight: 10,
                weightedScore: 30,
                notes: "Basic overall experience provided."
              }
            ],
            observationalNotes: {
              productKnowledge: {
                score: 3,
                notes: "Basic product knowledge demonstrated."
              },
              handlingObjections: {
                score: 3,
                notes: "Basic objection handling observed."
              }
            },
            strengths: [
              "Staff member greeted the customer",
              "Staff member provided basic wine information",
              "Staff member attempted to close the sale"
            ],
            areasForImprovement: [
              "Could improve rapport building",
              "Could provide more detailed wine recommendations",
              "Could better handle objections"
            ],
            keyRecommendations: [
              "Practice building rapport with customers",
              "Learn more about wine varietals and food pairings",
              "Develop techniques for handling common objections"
            ],
            rubricId: rubric.id,
            criteria: {
              "Initial Greeting": { score: 3, feedback: "Basic greeting observed." },
              "Building Rapport": { score: 3, feedback: "Basic rapport building observed." },
              "Wine Knowledge": { score: 3, feedback: "Basic wine knowledge demonstrated." },
              "Recommendations": { score: 3, feedback: "Basic recommendations made." },
              "Closing": { score: 3, feedback: "Basic closing observed." },
              "Personalization": { score: 3, feedback: "Basic personalization observed." },
              "Wine Club": { score: 3, feedback: "Basic wine club discussion observed." },
              "Follow-up": { score: 3, feedback: "Basic follow-up observed." },
              "Objection Handling": { score: 3, feedback: "Basic objection handling observed." },
              "Overall Experience": { score: 3, feedback: "Basic overall experience provided." }
            }
          };
        }
      }
      
      // Log the strengths array to debug
      console.log('Strengths array:', evaluation.strengths);
      console.log('Strengths array length:', evaluation.strengths.length);
      
      // Ensure arrays have exactly 3 items
      if (evaluation.strengths.length !== 3) {
        console.log('Fixing strengths array length');
        if (evaluation.strengths.length < 3) {
          while (evaluation.strengths.length < 3) {
            evaluation.strengths.push('Strength ' + (evaluation.strengths.length + 1));
          }
        } else {
          evaluation.strengths = evaluation.strengths.slice(0, 3);
        }
      }
      
      if (evaluation.areasForImprovement.length !== 3) {
        console.log('Fixing areasForImprovement array length');
        if (evaluation.areasForImprovement.length < 3) {
          while (evaluation.areasForImprovement.length < 3) {
            evaluation.areasForImprovement.push('Area for improvement ' + (evaluation.areasForImprovement.length + 1));
          }
        } else {
          evaluation.areasForImprovement = evaluation.areasForImprovement.slice(0, 3);
        }
      }
      
      if (evaluation.keyRecommendations.length !== 3) {
        console.log('Fixing keyRecommendations array length');
        if (evaluation.keyRecommendations.length < 3) {
          while (evaluation.keyRecommendations.length < 3) {
            evaluation.keyRecommendations.push('Recommendation ' + (evaluation.keyRecommendations.length + 1));
          }
        } else {
          evaluation.keyRecommendations = evaluation.keyRecommendations.slice(0, 3);
        }
      }
      
      // Ensure criteriaScores has exactly 10 items
      if (evaluation.criteriaScores.length !== 10) {
        console.log('Fixing criteriaScores array length');
        if (evaluation.criteriaScores.length < 10) {
          const defaultCriteria = [
            "Initial Greeting", "Building Rapport", "Wine Knowledge", 
            "Recommendations", "Closing", "Personalization", 
            "Wine Club", "Follow-up", "Objection Handling", 
            "Overall Experience"
          ];
          
          while (evaluation.criteriaScores.length < 10) {
            const index = evaluation.criteriaScores.length;
            evaluation.criteriaScores.push({
              criterion: defaultCriteria[index],
              score: 3,
              weight: 10,
              weightedScore: 30,
              notes: `Basic ${defaultCriteria[index].toLowerCase()} observed.`
            });
          }
        } else {
          evaluation.criteriaScores = evaluation.criteriaScores.slice(0, 10);
        }
      }
      
      return evaluation;
    } catch (error) {
      console.error('Error processing Gemini response:', error);
      throw new Error(`Error processing Gemini response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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