import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { Anthropic } from '@anthropic-ai/sdk';
import fs from 'fs';
import { getStorageProvider, createJob, JobStatus } from '../../app/utils/storage';

// Add rate limiting constants
const RATE_LIMIT = {
  MAX_REQUESTS_PER_MINUTE: 10,
  REQUEST_WINDOW_MS: 60000, // 1 minute
  lastRequestTime: 0
};

// Function to enforce rate limiting
async function enforceRateLimit() {
  const now = Date.now();
  const timeSinceLastRequest = now - RATE_LIMIT.lastRequestTime;
  
  if (timeSinceLastRequest < RATE_LIMIT.REQUEST_WINDOW_MS / RATE_LIMIT.MAX_REQUESTS_PER_MINUTE) {
    const delayMs = (RATE_LIMIT.REQUEST_WINDOW_MS / RATE_LIMIT.MAX_REQUESTS_PER_MINUTE) - timeSinceLastRequest;
    console.log(`Rate limiting: Waiting ${delayMs}ms before next request`);
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  
  RATE_LIMIT.lastRequestTime = Date.now();
}

// Add this function for direct evaluation 
async function evaluateDirectly(markdown: string, fileName: string): Promise<any> {
  console.log('Performing direct evaluation with Claude API');
  
  const anthropic = new Anthropic({
    apiKey: process.env.CLAUDE_API_KEY || '',
  });
  
  // Create a more detailed system prompt
  const systemPrompt = `You are a winery general manager with tasting room and sales expertise analyzing a conversation between a winery staff member and guests. 
  
Your task is to provide a detailed, objective evaluation based on the conversation. For each criterion, you MUST:

1. Quote specific examples from the conversation that demonstrate performance
2. Explain what was done well and why it was effective, with concrete examples
3. Identify specific areas for improvement with actionable suggestions
4. Provide a fair score (1-5) based on the evidence
5. Include detailed notes that explain your scoring rationale

For each criterion, your notes should:
- Start with "Strengths:" followed by specific examples and why they were effective
- Then "Areas for Improvement:" with concrete suggestions
- End with "Score Rationale:" explaining why you gave that score

Be thorough but concise in your analysis. Focus on actionable feedback that will help the staff member improve.

As a winery general manager, provide positive but constructive feedback that helps the associate improve their sales skills.`;

  // Create a more detailed user prompt
  const userPrompt = `Evaluate this wine tasting conversation and return a JSON with these fields:
- staffName (extract from conversation)
- date (extract from conversation, format as YYYY-MM-DD)
- overallScore (number from 0-100)
- performanceLevel (based on score: Exceptional (90-100), Strong (80-89), Proficient (70-79), Developing (60-69), Needs Improvement (<60))
- criteriaScores (array of 10 objects with criterion, weight, score(1-5), weightedScore, and notes)
- strengths (array of 3 strengths)
- areasForImprovement (array of 3 areas)
- keyRecommendations (array of 3 recommendations)

The 10 criteria to evaluate (with weights) are:
1. Initial Greeting and Welcome (8%)
2. Building Rapport (10%)
3. Winery History and Ethos (10%)
4. Storytelling and Analogies (10%) 
5. Recognition of Buying Signals (12%)
6. Customer Data Capture (8%)
7. Asking for the Sale (12%)
8. Personalized Wine Recommendations (10%)
9. Wine Club Presentation (12%)
10. Closing Interaction (8%)

For each criterion, provide detailed notes that include:
1. Specific examples from the conversation that demonstrate performance
2. What was done well and why it was effective
3. What could be improved with concrete suggestions
4. A fair score based on the evidence

The weighted score for each criterion should be calculated as: score × weight.
The overall score should be calculated as the sum of all weighted scores divided by the sum of all weights, to get a percentage.

Here's the conversation to evaluate:
${markdown.substring(0, 15000)}${markdown.length > 15000 ? '...(truncated)' : ''}

Return ONLY the valid JSON with no additional explanation or text.`;

  try {
    // Enforce rate limiting before making the API call
    await enforceRateLimit();
    
    // Call Claude API with Claude 3 Sonnet
    const response = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 4000,
      system: systemPrompt,
      messages: [
        { role: "user", content: userPrompt }
      ],
      temperature: 0.1
    });
    
    const responseText = response.content[0].text;
    
    // Extract JSON from the response
    const jsonMatch = responseText.match(/(\{[\s\S]*\})/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in the response');
    }
    
    const jsonString = jsonMatch[0];
    const evaluationData = JSON.parse(jsonString);
    
    return evaluationData;
  } catch (error) {
    console.error('Error in direct evaluation:', error);
    throw error;
  }
}

// Helper function to process Claude's response and extract JSON
function processCloudeResponse(responseText: string): string {
  console.log('Processing Claude response to extract JSON');
  
  // Try different patterns to extract JSON with detailed logging
  const patterns = [
    // Pattern 1: JSON code block with or without language specifier
    { pattern: /```(?:json)?\s*([\s\S]*?)\s*```/, name: 'JSON code block' },
    // Pattern 2: JSON object with curly braces
    { pattern: /(\{[\s\S]*\})/, name: 'JSON object' },
    // Pattern 3: JSON array with square brackets
    { pattern: /(\[[\s\S]*\])/, name: 'JSON array' }
  ];
  
  for (const { pattern, name } of patterns) {
    const match = responseText.match(pattern);
    if (match && match[1]) {
      console.log(`Found JSON using pattern: ${name}`);
      return match[1].trim();
    }
  }
  
  // If no patterns match, try to find the first occurrence of a valid JSON structure
  console.log('No pattern matched, trying to find valid JSON structure');
  const possibleJson = responseText.match(/\{[^{}]*\}|\[[\[\]]*\]/);
  if (possibleJson) {
    console.log('Found potential JSON structure');
    return possibleJson[0].trim();
  }
  
  console.log('No JSON found in response, returning original text');
  return responseText.trim();
}

// Helper function to fix or create a valid evaluation data structure
function validateAndRepairEvaluationData(data: any, markdown: string): any {
  console.log('Validating and repairing evaluation data');
  
  // Create a fallback object
  const fallbackData: {
    staffName: string;
    date: string;
    overallScore: number;
    performanceLevel: string;
    criteriaScores: Array<{
      criterion: string;
      weight: number;
      score: number;
      weightedScore: number;
      notes: string;
    }>;
    strengths: string[];
    areasForImprovement: string[];
    keyRecommendations: string[];
    [key: string]: any; // Allow indexing with string
  } = {
    staffName: "Unknown Staff",
    date: new Date().toISOString().split('T')[0],
    overallScore: 0,
    performanceLevel: "Needs Improvement",
    criteriaScores: [],
    strengths: [
      "Not available due to processing error",
      "Please try again with the conversation",
      "Consider reviewing the conversation manually"
    ],
    areasForImprovement: [
      "Not available due to processing error",
      "Please try again with the conversation",
      "Consider reviewing the conversation manually"
    ],
    keyRecommendations: [
      "Not available due to processing error",
      "Please try again with the conversation",
      "Consider reviewing the conversation manually"
    ]
  };
  
  // Try to extract staff name from the markdown if missing
  if (!data?.staffName) {
    console.log('Staff name missing, attempting to extract from markdown');
    const staffNameMatch = markdown.match(/Staff(?:\s+Member)?(?:\s+\(\d+\))?[:\s]+([^\n]+)/i);
    if (staffNameMatch && staffNameMatch[1]) {
      const nameMatch = staffNameMatch[1].match(/(?:hi|hello|hey)[\s,]+(?:my name is|i'm|i am)\s+([^\s,\.]+)/i);
      fallbackData.staffName = nameMatch && nameMatch[1] ? nameMatch[1].trim() : staffNameMatch[1].trim();
      console.log(`Extracted staff name: ${fallbackData.staffName}`);
    }
  } else {
    fallbackData.staffName = data.staffName;
    console.log(`Using provided staff name: ${fallbackData.staffName}`);
  }
  
  // Try to extract date from the markdown if missing
  if (!data?.date) {
    console.log('Date missing, attempting to extract from markdown');
    const dateMatch = markdown.match(/Date:?\s+(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})/i);
    if (dateMatch && dateMatch[1]) {
      fallbackData.date = dateMatch[1];
      console.log(`Extracted date: ${fallbackData.date}`);
    }
  } else {
    fallbackData.date = data.date;
    console.log(`Using provided date: ${fallbackData.date}`);
  }
  
  // Try to use whatever data is available
  if (data) {
    console.log('Processing available data fields');
    
    // Handle score fields
    if (data.overallScore !== undefined) {
      console.log(`Using overallScore: ${data.overallScore}`);
      fallbackData.overallScore = typeof data.overallScore === 'string' ? 
        parseFloat(data.overallScore) : data.overallScore;
    } else if (data.totalScore !== undefined) {
      console.log(`Using totalScore as overallScore: ${data.totalScore}`);
      fallbackData.overallScore = typeof data.totalScore === 'string' ? 
        parseFloat(data.totalScore) : data.totalScore;
    }
    
    // Handle performance level
    if (data.performanceLevel) {
      console.log(`Using performanceLevel: ${data.performanceLevel}`);
      fallbackData.performanceLevel = data.performanceLevel;
    }
    
    // Handle criteria scores
    if (Array.isArray(data.criteriaScores)) {
      console.log(`Using criteriaScores array with ${data.criteriaScores.length} items`);
      
      // Ensure we have at least some criteria scores
      if (data.criteriaScores.length > 0) {
        // Process each criteria score to ensure it has the required fields
        fallbackData.criteriaScores = data.criteriaScores.map((score: any, index: number) => {
          // Create a valid criteria score object
          const validScore = {
            criterion: score.criterion || `Criterion ${index + 1}`,
            weight: typeof score.weight === 'number' ? score.weight : 
                   typeof score.weight === 'string' ? parseFloat(score.weight) : 8,
            score: typeof score.score === 'number' ? score.score : 
                  typeof score.score === 'string' ? parseFloat(score.score) : 3,
            weightedScore: typeof score.weightedScore === 'number' ? score.weightedScore : 
                          typeof score.weightedScore === 'string' ? parseFloat(score.weightedScore) : 24,
            notes: score.notes || 'No notes provided'
          };
          
          // Calculate weighted score if not provided
          if (isNaN(validScore.weightedScore)) {
            validScore.weightedScore = validScore.score * validScore.weight;
          }
          
          return validScore;
        });
      }
    }
    
    // Handle arrays with more flexible validation
    ['strengths', 'areasForImprovement', 'keyRecommendations'].forEach(field => {
      if (Array.isArray(data[field]) && data[field].length > 0) {
        console.log(`Using ${field} array with ${data[field].length} items`);
        fallbackData[field] = data[field];
      }
    });
  }
  
  // Ensure we have at least 10 criteria scores
  if (fallbackData.criteriaScores.length < 10) {
    console.log(`Adding ${10 - fallbackData.criteriaScores.length} default criteria scores`);
    
    // Default criteria if we don't have enough
    const defaultCriteria = [
      { criterion: "Initial Greeting and Welcome", weight: 8 },
      { criterion: "Building Rapport", weight: 10 },
      { criterion: "Winery History and Ethos", weight: 10 },
      { criterion: "Storytelling and Analogies", weight: 10 },
      { criterion: "Recognition of Buying Signals", weight: 12 },
      { criterion: "Customer Data Capture", weight: 8 },
      { criterion: "Asking for the Sale", weight: 12 },
      { criterion: "Personalized Wine Recommendations", weight: 10 },
      { criterion: "Wine Club Presentation", weight: 12 },
      { criterion: "Closing Interaction", weight: 8 }
    ];
    
    // Add missing criteria
    for (let i = fallbackData.criteriaScores.length; i < 10; i++) {
      const defaultCriterion = defaultCriteria[i - fallbackData.criteriaScores.length];
      // Use a more varied score based on the criterion index
      const defaultScore = 2 + (i % 3); // This will cycle through 2, 3, 4
      fallbackData.criteriaScores.push({
        criterion: defaultCriterion.criterion,
        weight: defaultCriterion.weight,
        score: defaultScore,
        weightedScore: defaultCriterion.weight * defaultScore,
        notes: "Default criteria added due to missing data"
      });
    }
  }
  
  // Calculate overall score if not set
  if (fallbackData.overallScore === 0 && fallbackData.criteriaScores.length > 0) {
    console.log('Calculating overall score from criteria scores');
    const totalWeightedScore = fallbackData.criteriaScores.reduce((sum, criterion) => {
      return sum + criterion.weightedScore;
    }, 0);
    
    // Calculate the total possible score (sum of all weights)
    const totalPossibleScore = fallbackData.criteriaScores.reduce((sum, criterion) => {
      return sum + criterion.weight;
    }, 0);
    
    // Calculate the overall score as a percentage
    fallbackData.overallScore = Math.round((totalWeightedScore / totalPossibleScore) * 100);
    console.log(`Calculated overall score: ${fallbackData.overallScore}% (${totalWeightedScore}/${totalPossibleScore})`);
  }
  
  // Set performance level based on overall score
  if (fallbackData.overallScore >= 90) fallbackData.performanceLevel = "Exceptional";
  else if (fallbackData.overallScore >= 80) fallbackData.performanceLevel = "Strong";
  else if (fallbackData.overallScore >= 70) fallbackData.performanceLevel = "Proficient";
  else if (fallbackData.overallScore >= 60) fallbackData.performanceLevel = "Developing";
  else fallbackData.performanceLevel = "Needs Improvement";
  
  console.log(`Final performance level: ${fallbackData.performanceLevel}`);
  return fallbackData;
}

// Helper function to save debug information
function saveDebugInfo(jobId: string, type: string, data: any) {
  try {
    const storage = getStorageProvider();
    const debugPath = `/tmp/jobs/${jobId}-${type}-${Date.now()}.json`;
    fs.writeFileSync(debugPath, JSON.stringify(data, null, 2));
    console.log(`Saved debug info to ${debugPath}`);
  } catch (error) {
    console.error('Error saving debug info:', error);
  }
}

// Helper function to perform basic fallback evaluation
async function performBasicEvaluation(markdown: string): Promise<any> {
  console.log('Performing basic fallback evaluation');
  
  // Extract key information
  const staffNameMatch = markdown.match(/Staff(?:\s+Member)?(?:\s+\(\d+\))?[:\s]+([^\n]+)/i);
  const staffName = staffNameMatch && staffNameMatch[1]
    ? staffNameMatch[1].match(/(?:hi|hello|hey)[\s,]+(?:my name is|i'm|i am)\s+([^\s,\.]+)/i)?.[1] || staffNameMatch[1].trim()
    : 'Unknown Staff';
  
  const dateMatch = markdown.match(/Date:?\s+(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})/i);
  const date = dateMatch && dateMatch[1] ? dateMatch[1] : new Date().toISOString().split('T')[0];
  
  // Basic scoring (this is very simplistic)
  const criteriaScores = [
    {
      criterion: "Initial Greeting and Welcome",
      weight: 8,
      score: 4,
      weightedScore: 32,
      notes: "Basic greeting detected in conversation."
    },
    {
      criterion: "Building Rapport",
      weight: 10,
      score: 3,
      weightedScore: 30,
      notes: "Basic rapport building detected."
    },
    {
      criterion: "Winery History and Ethos",
      weight: 10,
      score: 5,
      weightedScore: 50,
      notes: "Basic winery information discussed."
    },
    {
      criterion: "Storytelling and Analogies",
      weight: 10,
      score: 2,
      weightedScore: 20,
      notes: "Basic storytelling detected."
    },
    {
      criterion: "Recognition of Buying Signals",
      weight: 12,
      score: 3,
      weightedScore: 36,
      notes: "Basic buying signals detected."
    },
    {
      criterion: "Customer Data Capture",
      weight: 8,
      score: 4,
      weightedScore: 32,
      notes: "Basic customer information collected."
    },
    {
      criterion: "Asking for the Sale",
      weight: 12,
      score: 2,
      weightedScore: 24,
      notes: "Basic sales approach detected."
    },
    {
      criterion: "Personalized Wine Recommendations",
      weight: 10,
      score: 5,
      weightedScore: 50,
      notes: "Basic wine recommendations made."
    },
    {
      criterion: "Wine Club Presentation",
      weight: 12,
      score: 3,
      weightedScore: 36,
      notes: "Basic club information provided."
    },
    {
      criterion: "Closing Interaction",
      weight: 8,
      score: 4,
      weightedScore: 32,
      notes: "Standard closing detected in conversation."
    }
  ];
  
  // Calculate overall score
  const totalWeightedScore = criteriaScores.reduce((sum, c) => sum + c.weightedScore, 0);
  
  // Calculate the total possible score (sum of all weights)
  const totalPossibleScore = criteriaScores.reduce((sum, c) => sum + c.weight, 0);
  
  // Calculate the overall score as a percentage
  const overallScore = Math.round((totalWeightedScore / totalPossibleScore) * 100);
  console.log(`Calculated basic evaluation overall score: ${overallScore}% (${totalWeightedScore}/${totalPossibleScore})`);
  
  // Determine performance level
  let performanceLevel = "Needs Improvement";
  if (overallScore >= 90) performanceLevel = "Exceptional";
  else if (overallScore >= 80) performanceLevel = "Strong";
  else if (overallScore >= 70) performanceLevel = "Proficient";
  else if (overallScore >= 60) performanceLevel = "Developing";
  
  return {
    staffName,
    date,
    overallScore,
    performanceLevel,
    criteriaScores,
    strengths: [
      "Evaluation performed using fallback system",
      "Basic conversation structure detected",
      "See detailed conversation for actual performance"
    ],
    areasForImprovement: [
      "AI evaluation encountered an error",
      "Consider manual review of conversation",
      "Try submitting the conversation again"
    ],
    keyRecommendations: [
      "Review conversation manually",
      "Check for technical issues with the evaluation system",
      "Try shorter conversation segments if the evaluation fails"
    ]
  };
}

// Truncate conversation if it's too long
const truncateConversation = (markdown: string, maxLength: number = 8000): string => {
  if (markdown.length <= maxLength) {
    return markdown;
  }
  
  console.log(`Main function: Truncating conversation from ${markdown.length} to ${maxLength} characters`);
  
  // Try to find the middle section of the conversation
  const startIndex = Math.floor(markdown.length / 2) - Math.floor(maxLength / 2);
  const truncated = markdown.substring(startIndex, startIndex + maxLength);
  
  // Add a note about truncation
  return `[Note: Conversation truncated for analysis. Showing middle section.]\n\n${truncated}\n\n[End of truncated conversation]`;
};

// Update the handler function to use direct evaluation
export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  console.log('Handler started');
  
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method not allowed' }),
    };
  }

  try {
    // Parse the request body
    const { markdown, fileName, directEvaluation } = JSON.parse(event.body || '{}');
    
    if (!markdown) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Markdown content is required' }),
      };
    }

    // If direct evaluation is requested, evaluate directly and return the result
    if (directEvaluation) {
      console.log('Performing direct evaluation as requested');
      const result = await evaluateDirectly(markdown, fileName);
      
      return {
        statusCode: 200,
        body: JSON.stringify({ result }),
      };
    }

    // Initialize storage provider
    const storageProvider = getStorageProvider();
    
    // Create a new job
    const job = createJob(markdown, fileName);
    
    // Save the job to the KV store
    try {
      await storageProvider.saveJob(job);
      console.log(`Job created with ID: ${job.id}`);
    } catch (error) {
      console.error('Error saving job to storage:', error);
      // Fall back to direct evaluation if storage operations fail
      console.log('Falling back to direct evaluation due to storage error');
      const result = await evaluateDirectly(markdown, fileName);
      
      return {
        statusCode: 200,
        body: JSON.stringify({ result }),
      };
    }

    // Call the background function to process the job
    try {
      const response = await fetch(`${process.env.URL}/.netlify/functions/analyze-conversation-background`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          jobId: job.id,
          conversation: markdown,
          staffName: fileName,
          date: new Date().toISOString().split('T')[0]
        }),
      });

      if (!response.ok) {
        throw new Error(`Background function returned ${response.status}`);
      }

      console.log('Background function called successfully');
      
      return {
        statusCode: 202,
        body: JSON.stringify({
          jobId: job.id,
          message: 'Analysis job created successfully',
        }),
      };
    } catch (error) {
      console.error('Error calling background function:', error);
      // Fall back to direct evaluation if background function call fails
      console.log('Falling back to direct evaluation due to background function error');
      const result = await evaluateDirectly(markdown, fileName);
      
      return {
        statusCode: 200,
        body: JSON.stringify({ result }),
      };
    }
  } catch (error) {
    console.error('Error in handler:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
        suggestion: 'Please try again or contact support if the issue persists.',
      }),
    };
  }
}; 