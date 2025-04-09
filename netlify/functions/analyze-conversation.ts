import { Handler } from '@netlify/functions';
import { Anthropic } from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';

console.log('Netlify function: Initializing');

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

console.log('Netlify function: Anthropic client initialized');

// Load the rubric file
console.log('Netlify function: Loading rubric file');
const rubricPath = path.join(process.cwd(), 'public', 'data', 'wines_sales_rubric.md');
console.log(`Netlify function: Rubric path: ${rubricPath}`);
let WINES_SALES_RUBRIC = '';
try {
  WINES_SALES_RUBRIC = fs.readFileSync(rubricPath, 'utf8');
  console.log('Netlify function: Rubric file loaded successfully');
} catch (error) {
  console.error('Netlify function: Error loading rubric file:', error);
  // Try alternative path
  const altRubricPath = path.join(__dirname, '..', '..', 'public', 'data', 'wines_sales_rubric.md');
  console.log(`Netlify function: Trying alternative rubric path: ${altRubricPath}`);
  try {
    WINES_SALES_RUBRIC = fs.readFileSync(altRubricPath, 'utf8');
    console.log('Netlify function: Rubric file loaded successfully from alternative path');
  } catch (altError) {
    console.error('Netlify function: Error loading rubric file from alternative path:', altError);
  }
}

// Load the example evaluation JSON for structure reference
console.log('Netlify function: Loading example evaluation JSON');
const evaluationExamplePath = path.join(process.cwd(), 'public', 'data', 'evaluation_new.json');
console.log(`Netlify function: Example evaluation path: ${evaluationExamplePath}`);
let EVALUATION_EXAMPLE = '';
try {
  EVALUATION_EXAMPLE = fs.readFileSync(evaluationExamplePath, 'utf8');
  console.log('Netlify function: Example evaluation JSON loaded successfully');
} catch (error) {
  console.error('Netlify function: Error loading example evaluation JSON:', error);
  // Try alternative path
  const altEvalPath = path.join(__dirname, '..', '..', 'public', 'data', 'evaluation_new.json');
  console.log(`Netlify function: Trying alternative example evaluation path: ${altEvalPath}`);
  try {
    EVALUATION_EXAMPLE = fs.readFileSync(altEvalPath, 'utf8');
    console.log('Netlify function: Example evaluation JSON loaded successfully from alternative path');
  } catch (altError) {
    console.error('Netlify function: Error loading example evaluation JSON from alternative path:', altError);
  }
}

export const handler: Handler = async (event: any) => {
  console.log('Netlify function: Handler started');
  console.log(`Netlify function: HTTP method: ${event.httpMethod}`);
  
  if (event.httpMethod !== 'POST') {
    console.log('Netlify function: Method not allowed');
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    console.log('Netlify function: Parsing request body');
    const { markdown, fileName } = JSON.parse(event.body || '{}');
    console.log(`Netlify function: Request parsed, fileName: ${fileName}`);
    
    if (!markdown) {
      console.log('Netlify function: No markdown content provided');
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No markdown content provided' }),
      };
    }

    console.log('Netlify function: Preparing Claude API request');
    // Prepare the system prompt for Claude - optimized for brevity
    const systemPrompt = `You are a wine sales performance evaluator. Analyze the conversation and score it according to the rubric. Provide objective assessments based solely on the evidence.`;

    // Prepare the user prompt with optimized instructions
    const userPrompt = `Evaluate this wine tasting conversation against the rubric. Format as JSON with these fields:
- staffName (from conversation)
- date (YYYY-MM-DD)
- overallScore (number)
- performanceLevel (string)
- criteriaScores (array of 10 items with criterion, weight, score, weightedScore, notes)
- strengths (3 strings)
- areasForImprovement (3 strings)
- keyRecommendations (3 strings)

Rubric:
${WINES_SALES_RUBRIC}

Example format:
${EVALUATION_EXAMPLE}

Instructions:
1. Score each criterion 1-5 based on rubric
2. Calculate weighted scores (score × weight)
3. Calculate overall score (sum of weighted scores ÷ 5)
4. Determine performance level:
   - Exceptional: 90-100%
   - Strong: 80-89%
   - Proficient: 70-79%
   - Developing: 60-69%
   - Needs Improvement: <60%
5. Include 3 strengths, 3 areas for improvement, 3 recommendations
6. Write notes for each criterion

Conversation to evaluate:
${markdown}

Return ONLY THE JSON with no additional text.`;

    console.log('Netlify function: Calling Claude API');
    // Call Claude API with optimized parameters
    const message = await anthropic.messages.create({
      model: "claude-3-opus-20240229",
      max_tokens: 3000, // Reduced from 4000
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: userPrompt
        }
      ],
      temperature: 0.2 // Added for more consistent output
    });
    console.log('Netlify function: Claude API response received');

    if (!message.content || !message.content[0]) {
      console.error('Netlify function: Invalid response from Claude API');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Invalid response from Claude API' }),
      };
    }

    // Get the text content from the message
    const responseText = message.content[0].type === 'text' 
      ? message.content[0].text 
      : JSON.stringify(message.content[0]);

    console.log('Netlify function: Extracting JSON from Claude response');
    // Extract JSON from Claude's response
    let evaluationData;
    try {
      // First try to extract JSON if it's wrapped in markdown code blocks
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        console.log('Netlify function: Found JSON in markdown code block');
        evaluationData = JSON.parse(jsonMatch[1].trim());
      } else {
        console.log('Netlify function: Parsing entire response as JSON');
        evaluationData = JSON.parse(responseText.trim());
      }

      console.log('Netlify function: Validating JSON structure');
      // Validate the structure of the received JSON
      const requiredFields = ['staffName', 'date', 'overallScore', 'performanceLevel', 
                             'criteriaScores', 'strengths', 'areasForImprovement', 'keyRecommendations'];
      
      for (const field of requiredFields) {
        if (!evaluationData[field]) {
          console.error(`Netlify function: Missing required field: ${field}`);
          throw new Error(`Missing required field: ${field}`);
        }
      }

      // Ensure criteriaScores is properly formatted
      if (!Array.isArray(evaluationData.criteriaScores) || evaluationData.criteriaScores.length !== 10) {
        console.error('Netlify function: criteriaScores must be an array with 10 items');
        throw new Error('criteriaScores must be an array with 10 items');
      }

      // Convert overallScore to a number if it's a string
      if (typeof evaluationData.overallScore === 'string') {
        console.log('Netlify function: Converting overallScore from string to number');
        evaluationData.overallScore = parseInt(evaluationData.overallScore, 10);
      }

      console.log('Netlify function: JSON validation successful');

    } catch (error) {
      console.error('Netlify function: Error parsing or validating JSON from Claude response:', error);
      console.error('Netlify function: Claude response text:', responseText);
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: 'Failed to parse evaluation data', 
          message: error instanceof Error ? error.message : 'Unknown parsing error'
        }),
      };
    }

    console.log('Netlify function: Returning successful response');
    return {
      statusCode: 200,
      body: JSON.stringify(evaluationData),
    };

  } catch (error) {
    console.error('Netlify function: Function error:', error);
    // Log more details about the error
    if (error instanceof Error) {
      console.error('Netlify function: Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
    };
  }
}; 