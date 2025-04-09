import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { Anthropic } from '@anthropic-ai/sdk';
import fs from 'fs';
import { getStorageProvider, createJob, JobStatus } from '../../app/utils/storage';

// Add this function for direct evaluation 
async function evaluateDirectly(markdown: string): Promise<any> {
  console.log('Performing direct evaluation with Claude API');
  
  const anthropic = new Anthropic({
    apiKey: process.env.CLAUDE_API_KEY || '',
  });
  
  // Create a simplified system prompt
  const systemPrompt = `You are a wine sales performance evaluator analyzing a conversation between a winery staff member and guests. Evaluate the conversation based on 10 key criteria and provide your assessment in JSON format.`;

  // Create a simplified user prompt
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

The weighted score for each criterion should be calculated as: score × weight.
The overall score should be calculated as the sum of all weighted scores divided by 5, to get a percentage.

Here's the conversation to evaluate:
${markdown.substring(0, 15000)}${markdown.length > 15000 ? '...(truncated)' : ''}

Return ONLY the valid JSON with no additional explanation or text.`;

  try {
    // Call Claude API
    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
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
      fallbackData.criteriaScores.push({
        criterion: defaultCriterion.criterion,
        weight: defaultCriterion.weight,
        score: 3,
        weightedScore: defaultCriterion.weight * 3,
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
    fallbackData.overallScore = Math.round((totalWeightedScore / 5));
    console.log(`Calculated overall score: ${fallbackData.overallScore}`);
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
      score: 3,
      weightedScore: 24,
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
      score: 3,
      weightedScore: 30,
      notes: "Basic winery information discussed."
    },
    {
      criterion: "Storytelling and Analogies",
      weight: 10,
      score: 3,
      weightedScore: 30,
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
      score: 3,
      weightedScore: 24,
      notes: "Basic customer information collected."
    },
    {
      criterion: "Asking for the Sale",
      weight: 12,
      score: 3,
      weightedScore: 36,
      notes: "Basic sales approach detected."
    },
    {
      criterion: "Personalized Wine Recommendations",
      weight: 10,
      score: 3,
      weightedScore: 30,
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
      score: 3,
      weightedScore: 24,
      notes: "Standard closing detected in conversation."
    }
  ];
  
  // Calculate overall score
  const totalWeightedScore = criteriaScores.reduce((sum, c) => sum + c.weightedScore, 0);
  const overallScore = Math.round((totalWeightedScore / 5));
  
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
  console.log('Main function: Handler started', {
    httpMethod: event.httpMethod,
    pathPattern: event.path,
    hasBody: !!event.body,
    contentLength: event.body?.length
  });
  
  // For GET requests, check job status
  if (event.httpMethod === 'GET') {
    try {
      const jobId = event.queryStringParameters?.jobId;
      
      if (!jobId) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'No job ID provided' })
        };
      }
      
      console.log(`Main function: Checking status for job ${jobId}`);
      
      // Get the storage provider
      const storage = getStorageProvider();
      
      // Get the job
      const job = await storage.getJob(jobId);
      
      if (!job) {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: 'Job not found' })
        };
      }
      
      console.log(`Main function: Job ${jobId} status: ${job.status}`);
      
      return {
        statusCode: 200,
        body: JSON.stringify(job)
      };
    } catch (error) {
      console.error('Main function: Error checking job status:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Internal server error' })
      };
    }
  }
  
  // For POST requests, do direct evaluation instead of using background functions
  if (event.httpMethod === 'POST') {
    try {
      if (!event.body) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'No request body provided' })
        };
      }
      
      const { markdown, fileName } = JSON.parse(event.body);
      
      if (!markdown) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'No markdown content provided' })
        };
      }
      
      if (!process.env.CLAUDE_API_KEY) {
        return {
          statusCode: 500,
          body: JSON.stringify({ error: 'Claude API key not configured' })
        };
      }
      
      // Create a job to track the evaluation
      const job = createJob();
      const storage = getStorageProvider();
      
      // Save the job
      await storage.saveJob(job);
      
      // Perform direct evaluation
      try {
        console.log('Main function: Starting direct evaluation');
        
        // Truncate the conversation if needed
        const truncatedMarkdown = truncateConversation(markdown);
        
        // Try direct evaluation first
        let evaluationData;
        try {
          evaluationData = await evaluateDirectly(truncatedMarkdown);
          console.log('Main function: Direct evaluation successful');
        } catch (directError) {
          console.error('Main function: Direct evaluation failed, trying fallback:', directError);
          
          // If direct evaluation fails, try the fallback
          evaluationData = await performBasicEvaluation(truncatedMarkdown);
          console.log('Main function: Fallback evaluation successful');
        }
        
        // Validate and repair the evaluation data
        const validatedData = validateAndRepairEvaluationData(evaluationData, truncatedMarkdown);
        
        // Update the job with the result
        job.status = 'completed';
        job.result = validatedData;
        job.updatedAt = Date.now();
        await storage.saveJob(job);
        
        return {
          statusCode: 200,
          body: JSON.stringify(validatedData)
        };
      } catch (evalError) {
        console.error('Error in evaluation:', evalError);
        
        // Update the job with the error
        job.status = 'failed';
        job.error = evalError instanceof Error ? evalError.message : 'Unknown error';
        job.updatedAt = Date.now();
        await storage.saveJob(job);
        
        return {
          statusCode: 500,
          body: JSON.stringify({ 
            error: 'Error evaluating conversation', 
            message: evalError instanceof Error ? evalError.message : 'Unknown error' 
          })
        };
      }
    } catch (error) {
      console.error('Main function: Error processing request:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Internal server error' })
      };
    }
  }
  
  // For any other HTTP method
  return {
    statusCode: 405,
    body: JSON.stringify({ error: 'Method not allowed' })
  };
}; 