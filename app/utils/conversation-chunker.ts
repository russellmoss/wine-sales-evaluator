import { Anthropic } from '@anthropic-ai/sdk';
import { Rubric } from '../types/rubric';
import { EvaluationData, PerformanceLevel, validateEvaluationData, getPerformanceLevel, ValidationResult } from '../types/evaluation';
import { RubricApi } from './rubric-api';

// Configuration for chunking
const CHUNK_CONFIG = {
  MAX_CHUNK_SIZE: parseInt(process.env.CHUNK_MAX_SIZE || '4000', 10),
  OVERLAP_SIZE: parseInt(process.env.CHUNK_OVERLAP_SIZE || '500', 10),
  MAX_CHUNKS: 12,
  CHUNK_TIMEOUT: 60000,
  RETRY_DELAY: 5000,
  MAX_RETRIES: 3
};

// Log the configuration when the module is loaded
console.log('Loaded chunk configuration:', CHUNK_CONFIG);

/**
 * Splits a conversation into chunks of approximately equal size
 * while preserving message boundaries
 * @param conversation The full conversation text
 * @param maxChunkSize Maximum size of each chunk in characters
 * @param overlapSize Number of characters to overlap between chunks
 * @returns Array of conversation chunks
 */
export function chunkConversation(
  conversation: string,
  maxChunkSize: number = CHUNK_CONFIG.MAX_CHUNK_SIZE,
  overlapSize: number = CHUNK_CONFIG.OVERLAP_SIZE
): string[] {
  console.log(`Chunking conversation with max size: ${maxChunkSize}, overlap: ${overlapSize}`);
  console.log(`Environment variables - CHUNK_MAX_SIZE: ${process.env.CHUNK_MAX_SIZE}, CHUNK_OVERLAP_SIZE: ${process.env.CHUNK_OVERLAP_SIZE}`);
  
  // If conversation is already small enough, return it as a single chunk
  if (conversation.length <= maxChunkSize) {
    console.log('Conversation is small enough, returning as single chunk');
    return [conversation];
  }
  
  const chunks: string[] = [];
  
  // Split by message boundaries (assuming markdown format with ## Conversation)
  const sections = conversation.split(/(?=## Conversation)/);
  
  // If we have multiple sections, try to keep them together
  if (sections.length > 1) {
    let currentChunk = '';
    let previousContext = '';
    
    for (const section of sections) {
      // If adding this section would exceed the chunk size, start a new chunk
      if (currentChunk.length + section.length > maxChunkSize && currentChunk.length > 0) {
        // Add the chunk with its context
        chunks.push(previousContext + currentChunk);
        // Keep the last part of the current chunk as context for the next chunk
        previousContext = currentChunk.slice(-overlapSize);
        currentChunk = '';
      }
      
      // If a single section is larger than maxChunkSize, split it further
      if (section.length > maxChunkSize) {
        // Split by paragraphs
        const paragraphs = section.split(/\n\n/);
        for (const paragraph of paragraphs) {
          if (currentChunk.length + paragraph.length > maxChunkSize && currentChunk.length > 0) {
            // Add the chunk with its context
            chunks.push(previousContext + currentChunk);
            // Keep the last part of the current chunk as context for the next chunk
            previousContext = currentChunk.slice(-overlapSize);
            currentChunk = '';
          }
          currentChunk += paragraph + '\n\n';
        }
      } else {
        currentChunk += section;
      }
    }
    
    // Add the last chunk if it's not empty
    if (currentChunk.length > 0) {
      chunks.push(previousContext + currentChunk);
    }
  } else {
    // If we only have one section, split by paragraphs
    const paragraphs = conversation.split(/\n\n/);
    let currentChunk = '';
    let previousContext = '';
    
    for (const paragraph of paragraphs) {
      if (currentChunk.length + paragraph.length > maxChunkSize && currentChunk.length > 0) {
        // Add the chunk with its context
        chunks.push(previousContext + currentChunk);
        // Keep the last part of the current chunk as context for the next chunk
        previousContext = currentChunk.slice(-overlapSize);
        currentChunk = '';
      }
      currentChunk += paragraph + '\n\n';
    }
    
    // Add the last chunk if it's not empty
    if (currentChunk.length > 0) {
      chunks.push(previousContext + currentChunk);
    }
  }
  
  // Limit the number of chunks
  if (chunks.length > CHUNK_CONFIG.MAX_CHUNKS) {
    console.log(`Conversation has ${chunks.length} chunks, limiting to ${CHUNK_CONFIG.MAX_CHUNKS}`);
    return chunks.slice(0, CHUNK_CONFIG.MAX_CHUNKS);
  }
  
  return chunks;
}

/**
 * Wraps a promise with a timeout
 * @param promise The promise to wrap
 * @param timeoutMs Timeout in milliseconds
 * @param operationName Name of the operation for logging
 * @returns The result of the promise
 * @throws Error if the operation times out
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operationName: string,
  retryCount = 0
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`${operationName} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } catch (error) {
    // Check if this is a timeout error and we haven't exceeded max retries
    if (error instanceof Error && 
        error.message.includes('timed out') && 
        retryCount < CHUNK_CONFIG.MAX_RETRIES) {
      
      console.log(`${operationName} timed out, retrying (${retryCount + 1}/${CHUNK_CONFIG.MAX_RETRIES})`);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, CHUNK_CONFIG.RETRY_DELAY));
      
      // Retry the operation
      return withTimeout(promise, timeoutMs, operationName, retryCount + 1);
    }
    
    // If we've exceeded retries or it's not a timeout error, rethrow
    throw error;
  }
}

/**
 * Analyzes a conversation chunk with Claude
 * @param chunk The conversation chunk to analyze
 * @param rubric The rubric to use for evaluation
 * @param staffName Name of the staff member
 * @param date Date of the conversation
 * @returns Evaluation data for the chunk
 */
async function analyzeChunkWithClaude(
  chunk: string,
  rubric: Rubric,
  staffName: string,
  date: string
): Promise<EvaluationData> {
  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    throw new Error('CLAUDE_API_KEY environment variable is not set');
  }

  const anthropic = new Anthropic({
    apiKey,
  });

  const prompt = `You are evaluating a wine sales conversation between a staff member and a customer.

Staff Member: ${staffName}
Date: ${date}

Conversation:
${chunk}

Please evaluate this conversation using the following rubric:
${JSON.stringify(rubric, null, 2)}

For each criterion in your evaluation, provide SPECIFIC EXAMPLES from the conversation. Quote or reference specific lines or exchanges that demonstrate strengths or areas for improvement. For example, say things like "When the customer mentioned liking bold reds (line 12), you correctly recommended our Cabernet Sauvignon" or "You could have better explained the tasting notes when describing the Chardonnay (line 15)."

Provide your evaluation in the following JSON format:
{
  "staffName": "${staffName}",
  "date": "${date}",
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
  "rubricId": "${rubric.id}",
  "criteria": {
    "criterionName": {
      "score": number (1-5),
      "feedback": string (include specific examples and line references)
    }
  }
}

IMPORTANT:
1. You must provide exactly 10 criteria scores
2. You must provide exactly 3 strengths
3. You must provide exactly 3 areas for improvement
4. You must provide exactly 3 key recommendations
5. All scores must be numbers between 1 and 5
6. The overall score must be between 0 and 100
7. The performance level must be one of: "Exceptional", "Strong", "Proficient", "Developing", "Needs Improvement"
8. All fields are required
9. Respond with ONLY the JSON - no other text
10. For each criterion, include specific examples and references to parts of the conversation`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 4000,
      temperature: 0,
      system: "You are a wine sales evaluation expert. Analyze the conversation and provide detailed feedback based on the rubric. Always respond with valid JSON.",
      messages: [{ role: 'user', content: prompt }]
    });

    const content = response.content[0].text;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('No valid JSON found in Claude response');
    }

    const evaluation = JSON.parse(jsonMatch[0]) as EvaluationData;
    const validationResult = validateEvaluationData(evaluation);
    
    if (!validationResult.isValid) {
      console.warn('Validation errors in Claude response:', validationResult.errors);
      throw new Error('Invalid evaluation data from Claude');
    }

    return evaluation;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('authentication')) {
        throw new Error('Authentication failed with Claude API. Please check your CLAUDE_API_KEY.');
      }
      if (error.message.includes('rate limit')) {
        throw new Error('Rate limit exceeded with Claude API. Please try again later.');
      }
    }
    console.error('Error analyzing chunk with Claude:', error);
    throw error;
  }
}

/**
 * Combines multiple chunk evaluations into a single evaluation
 * @param evaluations Array of chunk evaluations
 * @param staffName Name of the staff member
 * @param date Date of the conversation
 * @param rubricId Optional rubric ID
 * @returns Combined evaluation
 */
function combineEvaluations(evaluations: EvaluationData[]): EvaluationData {
  if (evaluations.length === 0) {
    throw new Error('No evaluations to combine');
  }

  if (evaluations.length === 1) {
    return evaluations[0];
  }

  // Calculate average scores
  const totalScore = evaluations.reduce((sum, evaluation) => sum + evaluation.overallScore, 0);
  const averageScore = Math.round(totalScore / evaluations.length);

  // Determine performance level based on average score
  const performanceLevel = getPerformanceLevel(averageScore);

  // Combine criteria scores
  const combinedCriteria: { [key: string]: { score: number; feedback: string } } = {};
  
  // Get all unique criteria keys
  const allCriteriaKeys = new Set<string>();
  evaluations.forEach(evaluation => {
    Object.keys(evaluation.criteria || {}).forEach(key => allCriteriaKeys.add(key));
  });

  // Calculate average scores for each criterion
  allCriteriaKeys.forEach(key => {
    const scores = evaluations
      .map(evaluation => evaluation.criteria?.[key]?.score)
      .filter((score): score is number => score !== undefined);
    
    const feedbacks = evaluations
      .map(evaluation => evaluation.criteria?.[key]?.feedback)
      .filter((feedback): feedback is string => feedback !== undefined);

    if (scores.length > 0) {
      const avgScore = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
      // Combine feedbacks with context about which part of the conversation they refer to
      const combinedFeedback = feedbacks.map((feedback, index) => 
        `[Part ${index + 1}/${evaluations.length}]: ${feedback}`
      ).join('\n');
      
      combinedCriteria[key] = {
        score: avgScore,
        feedback: combinedFeedback
      };
    }
  });

  // Create the combined evaluation
  return {
    staffName: evaluations[0].staffName,
    date: evaluations[0].date,
    overallScore: averageScore,
    performanceLevel,
    criteriaScores: evaluations[0].criteriaScores, // Keep the structure from first evaluation
    observationalNotes: evaluations[0].observationalNotes, // Keep the structure from first evaluation
    strengths: evaluations[0].strengths,
    areasForImprovement: evaluations[0].areasForImprovement,
    keyRecommendations: evaluations[0].keyRecommendations,
    rubricId: evaluations[0].rubricId,
    criteria: combinedCriteria,
    metadata: {
      chunkCount: evaluations.length,
      processingTime: evaluations.reduce((sum, evaluation) => sum + (evaluation.metadata?.processingTime || 0), 0),
      chunkSizes: evaluations.map(evaluation => evaluation.metadata?.chunkSizes || []).flat()
    }
  };
}

/**
 * Evaluates a conversation by splitting it into chunks and processing each chunk
 * @param conversation The full conversation text
 * @param staffName Name of the staff member
 * @param date Date of the conversation
 * @param rubricId Optional rubric ID
 * @returns Combined evaluation result
 */
export async function evaluateConversationInChunks(
  conversation: string,
  staffName: string,
  date: string,
  rubricId?: string,
  maxChunkSize: number = CHUNK_CONFIG.MAX_CHUNK_SIZE,
  overlapSize: number = CHUNK_CONFIG.OVERLAP_SIZE
): Promise<EvaluationData> {
  console.log(`Evaluating conversation of length ${conversation.length} characters`);
  
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

  // Check if the conversation is small enough for direct evaluation
  // Claude can handle up to 100K tokens, but we'll set a conservative limit
  const MAX_DIRECT_EVALUATION_SIZE = 50000; // ~50K characters is a safe limit
  const isSmallEnoughForDirectEvaluation = conversation.length <= MAX_DIRECT_EVALUATION_SIZE;
  
  if (isSmallEnoughForDirectEvaluation) {
    console.log('Using direct evaluation for better context understanding');
    try {
      return await analyzeChunkWithClaude(conversation, rubric, staffName, date);
    } catch (error) {
      console.error('Direct evaluation failed, falling back to chunking:', error);
      // Continue to chunking if direct evaluation fails
    }
  }
  
  // For extremely large conversations, use chunking as a last resort
  console.log(`Conversation too large for direct evaluation (${conversation.length} chars), using chunking as fallback`);
  console.log(`Chunking conversation with max size: ${maxChunkSize}, overlap: ${overlapSize}`);
  
  const chunks = chunkConversation(conversation, maxChunkSize, overlapSize);
  console.log(`Split conversation into ${chunks.length} chunks`);

  // If we only have one chunk, process it directly
  if (chunks.length === 1) {
    console.log('Processing single chunk');
    return analyzeChunkWithClaude(chunks[0], rubric, staffName, date);
  }

  // Process each chunk
  const chunkEvaluations: EvaluationData[] = [];
  for (let i = 0; i < chunks.length; i++) {
    console.log(`Processing chunk ${i + 1}/${chunks.length}`);
    try {
      const chunkResult = await analyzeChunkWithClaude(chunks[i], rubric, staffName, date);
      chunkEvaluations.push(chunkResult);
    } catch (error) {
      console.error(`Error processing chunk ${i + 1}:`, error);
      throw error;
    }
  }

  // Combine the evaluations
  return combineEvaluations(chunkEvaluations);
} 