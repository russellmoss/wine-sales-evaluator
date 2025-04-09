const fs = require('fs');
const path = require('path');

const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

// Load the rubric file
const rubricPath = path.join(process.cwd(), 'public', 'data', 'wines_sales_rubric.md');
const WINES_SALES_RUBRIC = fs.readFileSync(rubricPath, 'utf8');

// Load the example evaluation JSON for structure reference
const evaluationExamplePath = path.join(process.cwd(), 'public', 'data', 'evaluation_new.json');
const EVALUATION_EXAMPLE = fs.readFileSync(evaluationExamplePath, 'utf8');

// Add timeout to fetch requests
const fetchWithTimeout = async (url, options, timeout = 30000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

exports.handler = async function(event, context) {
  // Enable background function execution
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    const { markdown, fileName } = JSON.parse(event.body);
    
    if (!markdown) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No markdown content provided' })
      };
    }
    
    if (!CLAUDE_API_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Claude API key not configured' })
      };
    }
    
    // Prepare the system prompt for Claude
    const systemPrompt = `You are a wine sales performance evaluator. You will analyze a wine tasting conversation and score it according to a rubric. You'll provide objective, fair assessments based solely on the evidence in the conversation.`;

    // Prepare the user prompt with detailed instructions
    const userPrompt = `I need you to evaluate the wine tasting conversation below against the criteria in the wine sales rubric. Format your evaluation in the same JSON structure as shown in the evaluation example.

Here is the rubric to use for evaluation:

${WINES_SALES_RUBRIC}

Here is an example of the expected JSON output format:

${EVALUATION_EXAMPLE}

Please follow these instructions:

1. Carefully analyze the conversation for evidence of each of the 10 weighted criteria in the rubric
2. Score each criterion on a scale of 1-5 based on the detailed descriptions in the rubric
3. Calculate the weighted score for each criterion (criterion score × weight)
4. Calculate the overall score as a whole number (sum of weighted scores ÷ 5)
5. Determine the performance level based on the score ranges in the rubric:
   - Exceptional: 90-100%
   - Strong: 80-89% 
   - Proficient: 70-79%
   - Developing: 60-69%
   - Needs Improvement: Below 60%
6. Include 3 specific strengths demonstrated in the conversation
7. Include 3 specific areas for improvement 
8. Provide 3 actionable recommendations
9. Write detailed notes for each criterion explaining the score

Output your evaluation in exactly the same JSON format as in the example, with the same field names and structure, including:
* staffName (extracted from the conversation)
* date (from the conversation, in YYYY-MM-DD format)
* totalScore (as a number)
* performanceLevel (as a string)
* criteriaScores (array with criterion, weight, score, weightedScore, and notes for each criterion)
* strengths (array of 3 strings)
* areasForImprovement (array of 3 strings) 
* keyRecommendations (array of 3 strings)

Here is the conversation to evaluate:

${markdown}

Return ONLY THE JSON with no additional text or explanation.`;

    // Call Claude API with timeout
    const response = await fetchWithTimeout(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: "claude-3-sonnet-20240229",
        max_tokens: 2000,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: userPrompt
          }
        ]
      })
    }, 30000);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error response:', errorText);
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: 'Error communicating with Claude API', 
          message: `Status: ${response.status}, Details: ${errorText.substring(0, 200)}...` 
        })
      };
    }
    
    const claudeResponse = await response.json();
    
    if (!claudeResponse.content || !claudeResponse.content[0] || !claudeResponse.content[0].text) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Invalid response from Claude API' })
      };
    }
    
    // Extract JSON from Claude's response
    let evaluationData;
    try {
      // First try to extract JSON if it's wrapped in markdown code blocks
      const jsonMatch = claudeResponse.content[0].text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        evaluationData = JSON.parse(jsonMatch[1].trim());
      } else {
        // Otherwise try to parse the entire response as JSON
        evaluationData = JSON.parse(claudeResponse.content[0].text.trim());
      }
      
      // Normalize field names - handle both totalScore and overallScore
      if (evaluationData.overallScore !== undefined && evaluationData.totalScore === undefined) {
        evaluationData.totalScore = evaluationData.overallScore;
        delete evaluationData.overallScore;
      }
      
      // Validate the structure of the received JSON
      const requiredFields = ['staffName', 'date', 'totalScore', 'performanceLevel', 
                             'criteriaScores', 'strengths', 'areasForImprovement', 'keyRecommendations'];
      
      for (const field of requiredFields) {
        if (evaluationData[field] === undefined) {
          throw new Error(`Missing required field: ${field}`);
        }
      }
      
      // Ensure criteriaScores is properly formatted
      if (!Array.isArray(evaluationData.criteriaScores) || evaluationData.criteriaScores.length !== 10) {
        throw new Error('criteriaScores must be an array with 10 items');
      }
      
      // Convert totalScore to a number if it's a string
      if (typeof evaluationData.totalScore === 'string') {
        evaluationData.totalScore = parseFloat(evaluationData.totalScore);
      }
      
      // Calculate totalScore from criteriaScores if it's missing or invalid
      if (isNaN(evaluationData.totalScore) || evaluationData.totalScore <= 0) {
        const totalWeightedScore = evaluationData.criteriaScores.reduce((sum, criterion) => {
          return sum + (criterion.weightedScore || 0);
        }, 0);
        evaluationData.totalScore = Math.round(totalWeightedScore);
      }
      
      // Ensure the totalScore is a percentage (0-100)
      if (evaluationData.totalScore > 100) {
        evaluationData.totalScore = Math.round((evaluationData.totalScore / 500) * 100);
      }
      
      return {
        statusCode: 200,
        body: JSON.stringify(evaluationData)
      };
      
    } catch (error) {
      console.error('Error parsing or validating JSON from Claude response:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: 'Failed to parse evaluation data', 
          message: error instanceof Error ? error.message : 'Unknown parsing error'
        })
      };
    }
    
  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred' 
      })
    };
  }
}; 