import { NextRequest, NextResponse } from 'next/server';
import { Anthropic } from '@anthropic-ai/sdk';
import { RubricGeneratorRequest, RubricTemplate } from '@/app/types/rubricGenerator';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

export async function POST(request: NextRequest) {
  console.log('Rubric generation request received');
  
  try {
    // Parse request body
    const body = await request.json() as RubricGeneratorRequest;
    
    if (!body.scenario) {
      return NextResponse.json({ 
        success: false, 
        error: 'Scenario data is required' 
      }, { status: 400 });
    }
    
    if (!body.requirements || body.requirements.trim().length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Requirements must be a non-empty string' 
      }, { status: 400 });
    }
    
    console.log('Generating rubric using Claude API');
    
    // Generate the rubric using Claude
    const rubric = await generateRubricWithClaude(body.scenario, body.requirements);
    
    // Return the generated rubric
    return NextResponse.json({ 
      success: true, 
      rubric 
    });
    
  } catch (error) {
    console.error('Error generating rubric:', error);
    
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

/**
 * Generates a rubric using the Claude API
 * @param scenario The scenario JSON object
 * @param requirements Natural language requirements for the rubric
 * @returns The generated rubric template
 */
async function generateRubricWithClaude(
  scenario: any,
  requirements: string
): Promise<RubricTemplate> {
  // Create the system prompt for Claude
  const systemPrompt = `You are an expert wine sales coach who creates detailed evaluation rubrics for winery staff. 
Your task is to create a comprehensive evaluation rubric based on the provided scenario information and specific requirements.

IMPORTANT: This rubric must ONLY evaluate aspects of the interaction that can be assessed through text analysis. Focus on:
1. Verbal communication and language used
2. Sales techniques and approaches
3. Product knowledge and storytelling
4. Customer engagement and rapport building
5. Handling objections and questions
6. Wine club presentation and benefits communication
7. Data capture and follow-up strategies

DO NOT include criteria that require visual or physical assessment, such as:
- Body language
- Physical appearance
- Pouring techniques
- Glass handling
- Room setup
- Physical gestures
- Facial expressions
- Physical proximity
- Tasting room cleanliness
- Wine presentation

The scenario JSON describes a specific winery sales situation. 
The requirements describe what areas the rubric should focus on evaluating.

Creating an effective wine sales evaluation rubric involves:
1. Analyzing what verbal skills and communication techniques are most important in this specific scenario
2. Creating criteria that align with both the scenario context and the stated requirements
3. Ensuring criteria have clear descriptions that can be consistently evaluated through text analysis
4. Creating meaningful scoring descriptions for each level (1-5)
5. Assigning appropriate weights to each criterion based on importance

OUTPUT REQUIREMENTS:
- Create a rubric with EXACTLY 10 criteria
- Weights MUST add up to exactly 100%
- Each criterion must have a descriptive name and detailed description
- Include scoring levels 1-5 for each criterion with clear descriptions
- Format as a valid JSON object that strictly follows the schema below

OUTPUT FORMAT:
{
  "title": "Title of the rubric",
  "description": "Overall description of the rubric",
  "criteriaWeights": {
    "Criterion 1 Name": 15,
    "Criterion 2 Name": 10,
    // All 10 criteria with weights that sum to exactly 100
  },
  "criteriaDescriptions": {
    "Criterion 1 Name": "Detailed description of criterion 1",
    "Criterion 2 Name": "Detailed description of criterion 2",
    // Descriptions for all 10 criteria
  },
  "scoringLevels": {
    "1": "Needs Improvement: description...",
    "2": "Developing: description...",
    "3": "Proficient: description...",
    "4": "Strong: description...",
    "5": "Exceptional: description..."
  },
  "performanceLevels": {
    "Exceptional": {
      "minScore": 90,
      "maxScore": 100,
      "description": "Description of exceptional performance"
    },
    "Strong": {
      "minScore": 80,
      "maxScore": 89,
      "description": "Description of strong performance"
    },
    "Proficient": {
      "minScore": 70,
      "maxScore": 79,
      "description": "Description of proficient performance"
    },
    "Developing": {
      "minScore": 60,
      "maxScore": 69,
      "description": "Description of developing performance"
    },
    "Needs Improvement": {
      "minScore": 0,
      "maxScore": 59,
      "description": "Description of performance needing improvement"
    }
  }
}

IMPORTANT RULES:
1. EXACTLY 10 criteria total - no more, no less
2. Weights MUST sum to exactly 100%
3. Focus on criteria mentioned in the requirements
4. Make the rubric specific to the winery scenario
5. Ensure all JSON is valid with no syntax errors
6. Provide rich, detailed descriptions for each scoring level
7. Respond ONLY with the JSON object, no explanations before or after
8. ONLY include criteria that can be evaluated through text analysis`;

  try {
    // Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 4000,
      temperature: 0.2,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `SCENARIO INFO: ${JSON.stringify(scenario)}

RUBRIC REQUIREMENTS: ${requirements}

Based on this scenario and these requirements, create a detailed wine sales evaluation rubric with 10 criteria and appropriate weights. Focus ONLY on aspects that can be evaluated through text analysis.`
        }
      ],
    });

    // Extract and parse the response
    const responseText = response.content[0].text;
    
    // Try to extract JSON from the response (it might be wrapped in code blocks)
    let rubricTemplate: RubricTemplate;
    
    try {
      // Try different patterns to extract JSON
      const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || 
                        responseText.match(/```\n([\s\S]*?)\n```/) ||
                        responseText.match(/({[\s\S]*})/);
      
      if (jsonMatch && jsonMatch[1]) {
        rubricTemplate = JSON.parse(jsonMatch[1]) as RubricTemplate;
      } else {
        rubricTemplate = JSON.parse(responseText) as RubricTemplate;
      }
    } catch (parseError) {
      console.error('Error parsing Claude response:', parseError);
      throw new Error('Failed to parse rubric JSON from Claude response');
    }
    
    // Validate the rubric template
    validateRubricTemplate(rubricTemplate);
    
    return rubricTemplate;
  } catch (error) {
    console.error('Error calling Claude API:', error);
    throw error;
  }
}

/**
 * Validates the rubric template structure and constraints
 * @param rubric The rubric template to validate
 * @throws Error if validation fails
 */
function validateRubricTemplate(rubric: RubricTemplate): void {
  // Check if all required properties exist
  if (!rubric.title || !rubric.description || !rubric.criteriaWeights || 
      !rubric.criteriaDescriptions || !rubric.scoringLevels || !rubric.performanceLevels) {
    throw new Error('Rubric is missing required properties');
  }
  
  // Check if there are exactly 10 criteria
  const criteriaCount = Object.keys(rubric.criteriaWeights).length;
  if (criteriaCount !== 10) {
    throw new Error(`Rubric must have exactly 10 criteria, but found ${criteriaCount}`);
  }
  
  // Check if weights sum to 100%
  const totalWeight = Object.values(rubric.criteriaWeights).reduce((sum, weight) => sum + weight, 0);
  if (Math.abs(totalWeight - 100) > 0.1) {
    throw new Error(`Criteria weights must sum to 100%, but found ${totalWeight}%`);
  }
  
  // Check if all criteria have descriptions
  for (const criterion of Object.keys(rubric.criteriaWeights)) {
    if (!rubric.criteriaDescriptions[criterion]) {
      throw new Error(`Missing description for criterion: ${criterion}`);
    }
  }
  
  // Check if all scoring levels (1-5) are defined
  for (let i = 1; i <= 5; i++) {
    if (!rubric.scoringLevels[i]) {
      throw new Error(`Missing description for scoring level ${i}`);
    }
  }
  
  // Check if all performance levels are defined
  const requiredLevels = ['Exceptional', 'Strong', 'Proficient', 'Developing', 'Needs Improvement'];
  for (const level of requiredLevels) {
    if (!rubric.performanceLevels[level as keyof typeof rubric.performanceLevels]) {
      throw new Error(`Missing definition for performance level: ${level}`);
    }
  }
} 