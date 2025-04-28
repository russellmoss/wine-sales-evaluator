# AI-Powered Rubric Generator for Wine Sales Evaluator

This guide will walk you through implementing an AI-powered rubric generator for your wine-sales-evaluator application. This feature will allow users to upload a scenario JSON and provide natural language requirements to create a customized evaluation rubric using Claude.

## 1. Define the Rubric JSON Structure

First, let's create a TypeScript interface that defines the structure for our evaluation rubric.

### Cursor.ai Prompt
```
Create a TypeScript interface for our rubric structure. The rubric should have 10 criteria, each with a name, weight (percentage), scoring scale (1-5), and detailed notes. The weights must add up to 100%. Also include properties for strengths, areas for improvement, and key recommendations arrays.
```

```typescript
// app/types/rubricGenerator.ts
import { CriterionScore, PerformanceLevel } from './evaluation';

export interface RubricGeneratorRequest {
  scenario: any; // The uploaded scenario JSON
  requirements: string; // Natural language requirements
}

export interface RubricTemplate {
  title: string;
  description: string;
  criteriaWeights: {
    [key: string]: number; // Each criterion name and its weight (must sum to 100)
  };
  criteriaDescriptions: {
    [key: string]: string; // Each criterion name and its description
  };
  scoringLevels: {
    [key: number]: string; // Each score (1-5) and its description
  };
  performanceLevels: {
    [key in PerformanceLevel]: {
      minScore: number;
      maxScore: number;
      description: string;
    };
  };
}

export interface RubricGenerationResponse {
  success: boolean;
  rubric?: RubricTemplate;
  error?: string;
}
```

## 2. Create Frontend Component for Rubric Generation

Next, create the frontend component that allows users to upload a scenario JSON and input their requirements.

### Cursor.ai Prompt
```
Create a React component for the rubric generator form that allows users to upload a scenario JSON file and enter natural language requirements. Include state management, form submission, and basic styling with Tailwind CSS.
```

```tsx
// components/RubricGenerator.tsx
"use client";

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { generateRubric } from '../app/utils/rubricService';
import { RubricTemplate } from '../app/types/rubricGenerator';
import LoadingIndicator from './LoadingIndicator';

interface RubricGeneratorProps {
  onRubricGenerated: (rubric: RubricTemplate) => void;
}

const RubricGenerator: React.FC<RubricGeneratorProps> = ({ onRubricGenerated }) => {
  const [scenarioFile, setScenarioFile] = useState<File | null>(null);
  const [scenarioData, setScenarioData] = useState<any | null>(null);
  const [requirements, setRequirements] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setScenarioFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        setScenarioData(data);
        setError(null);
      } catch (err) {
        setError('Invalid JSON file. Please upload a valid scenario file.');
        toast.error('Invalid JSON file');
      }
    };
    reader.readAsText(file);
  };

  const handleGenerateRubric = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!scenarioData) {
      toast.error('Please upload a scenario file');
      return;
    }
    
    if (!requirements.trim()) {
      toast.error('Please enter requirements for the rubric');
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    
    try {
      const rubric = await generateRubric(scenarioData, requirements);
      onRubricGenerated(rubric);
      toast.success('Rubric generated successfully!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate rubric';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Generate Custom Rubric</h2>
      
      <form onSubmit={handleGenerateRubric} className="space-y-6">
        {/* Step 1: Upload Scenario */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Step 1: Upload Scenario JSON
          </label>
          <input
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-purple-50 file:text-purple-700
              hover:file:bg-purple-100"
            disabled={isGenerating}
          />
          {scenarioData && (
            <div className="mt-2 text-sm text-green-600">
              ✓ Scenario loaded: {scenarioData.title || 'Untitled Scenario'}
            </div>
          )}
        </div>
        
        {/* Step 2: Enter Requirements */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Step 2: Enter Rubric Requirements
          </label>
          <textarea
            value={requirements}
            onChange={(e) => setRequirements(e.target.value)}
            placeholder="Describe what the rubric should focus on (e.g., hospitality, personalization, overcoming objections, asking for the sale, wine club pitching, data capture)"
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
            rows={5}
            disabled={isGenerating}
          />
          <p className="mt-1 text-sm text-gray-500">
            Be specific about what areas you want to evaluate and their relative importance.
          </p>
        </div>
        
        {/* Submit Button */}
        <button
          type="submit"
          disabled={isGenerating || !scenarioData || !requirements.trim()}
          className={`w-full py-2 px-4 rounded-md text-white font-medium
            ${!scenarioData || !requirements.trim() || isGenerating
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-purple-600 hover:bg-purple-700'
            }`}
        >
          {isGenerating ? (
            <div className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating Rubric...
            </div>
          ) : (
            'Generate Rubric'
          )}
        </button>
      </form>
      
      {error && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}
    </div>
  );
};

export default RubricGenerator;
```

## 3. Create Rubric Service for API Calls

Implement a service for making API calls to the backend.

### Cursor.ai Prompt
```
Create a TypeScript service file that will handle the API calls to the backend for rubric generation. Include error handling and type safety.
```

```typescript
// app/utils/rubricService.ts
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
```

## 4. Create API Route for Rubric Generation

Next, implement the API route to handle the rubric generation request.

### Cursor.ai Prompt
```
Create a Next.js API route that will handle the rubric generation request. This should use the App Router pattern with Next.js 14+.
```

```typescript
// app/api/rubric/generate/route.ts
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

The scenario JSON describes a specific winery sales situation. 
The requirements describe what areas the rubric should focus on evaluating.

Creating an effective wine sales evaluation rubric involves:
1. Analyzing what skills and behaviors are most important in this specific scenario
2. Creating criteria that align with both the scenario context and the stated requirements
3. Ensuring criteria have clear descriptions that can be consistently evaluated
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
7. Respond ONLY with the JSON object, no explanations before or after`;

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

Based on this scenario and these requirements, create a detailed wine sales evaluation rubric with 10 criteria and appropriate weights.`
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
```

## 5. Create API Route for Saving Rubrics

Add an API route to save generated rubrics for use in the application.

### Cursor.ai Prompt
```
Create a Next.js API route that will handle saving a generated rubric to LocalStorage or any other storage mechanism you're using in your application.
```

```typescript
// app/api/rubric/save/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { RubricTemplate } from '@/app/types/rubricGenerator';
import fs from 'fs';
import path from 'path';

// Define a unique ID generator
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
};

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const rubric = await request.json() as RubricTemplate;
    
    // Validate the rubric
    if (!rubric.title || !rubric.criteriaWeights || Object.keys(rubric.criteriaWeights).length !== 10) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid rubric format' 
      }, { status: 400 });
    }
    
    // Save the rubric
    const rubricId = await saveRubricToFile(rubric);
    
    // Return success with the ID
    return NextResponse.json({ 
      success: true, 
      id: rubricId
    });
    
  } catch (error) {
    console.error('Error saving rubric:', error);
    
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

/**
 * Saves a rubric to a file in the public directory
 * @param rubric The rubric template to save
 * @returns The generated ID for the saved rubric
 */
async function saveRubricToFile(rubric: RubricTemplate): Promise<string> {
  try {
    // Generate a unique ID for the rubric
    const rubricId = generateId();
    
    // Define the directory and file path
    const dirPath = path.join(process.cwd(), 'public', 'rubrics');
    const filePath = path.join(dirPath, `${rubricId}.json`);
    
    // Create the directory if it doesn't exist
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    
    // Save the rubric to a file
    fs.writeFileSync(filePath, JSON.stringify(rubric, null, 2));
    
    console.log(`Rubric saved to ${filePath}`);
    
    return rubricId;
  } catch (error) {
    console.error('Error saving rubric to file:', error);
    throw new Error('Failed to save rubric');
  }
}
```

## 6. Integrate Rubric Generator into the Dashboard

Now integrate the rubric generator into your existing dashboard or create a new page for it.

### Cursor.ai Prompt
```
Create a React component or page that integrates the RubricGenerator component with the rest of the application. This should handle the generated rubric and either save it to the application state or redirect to another page.
```

```tsx
// app/rubric-generator/page.tsx
"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Toaster, toast } from 'react-hot-toast';
import RubricGenerator from '@/components/RubricGenerator';
import { RubricTemplate } from '@/app/types/rubricGenerator';
import { saveRubric } from '@/app/utils/rubricService';
import BackButton from '@/components/BackButton';

export default function RubricGeneratorPage() {
  const router = useRouter();
  const [generatedRubric, setGeneratedRubric] = useState<RubricTemplate | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const handleRubricGenerated = (rubric: RubricTemplate) => {
    setGeneratedRubric(rubric);
    
    // Store in localStorage for immediate use
    localStorage.setItem('wineEvaluationRubric', JSON.stringify(rubric));
  };

  const handleSaveRubric = async () => {
    if (!generatedRubric) {
      toast.error('No rubric to save');
      return;
    }
    
    setIsSaving(true);
    
    try {
      await saveRubric(generatedRubric);
      toast.success('Rubric saved successfully!');
      
      // Redirect to the dashboard after a short delay
      setTimeout(() => {
        router.push('/');
      }, 1500);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save rubric';
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUseRubric = () => {
    // Redirect to the main dashboard with the rubric
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Toaster position="top-right" />
      
      <div className="max-w-4xl mx-auto">
        <BackButton />
        
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Wine Sales Rubric Generator
          </h1>
          <p className="text-xl text-gray-600">
            Create a customized evaluation rubric based on your specific scenario and requirements
          </p>
        </div>
        
        {!generatedRubric ? (
          <RubricGenerator onRubricGenerated={handleRubricGenerated} />
        ) : (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{generatedRubric.title}</h2>
            <p className="text-gray-700 mb-6">{generatedRubric.description}</p>
            
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">Evaluation Criteria</h3>
              <div className="space-y-4">
                {Object.entries(generatedRubric.criteriaWeights).map(([criterion, weight]) => (
                  <div key={criterion} className="flex justify-between items-center border-b pb-3">
                    <div>
                      <h4 className="font-medium">{criterion}</h4>
                      <p className="text-sm text-gray-600">{generatedRubric.criteriaDescriptions[criterion]}</p>
                    </div>
                    <span className="font-medium text-purple-700">{weight}%</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 mt-8">
              <button
                onClick={handleUseRubric}
                className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 transition-colors"
              >
                Use This Rubric
              </button>
              
              <button
                onClick={handleSaveRubric}
                disabled={isSaving}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors flex justify-center items-center"
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving Rubric...
                  </>
                ) : (
                  'Save Rubric'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

## 7. Update Navigation to Include Rubric Generator

Add a link to the rubric generator in your navigation menu.

### Cursor.ai Prompt
```
Add a navigation link to the rubric generator page from the main dashboard or navigation menu. Use appropriate styling that matches your existing UI.
```

```tsx
// components/NavigationMenu.tsx (or your existing navigation component)
// Add this to your existing navigation component

// ... existing imports

const NavigationMenu = () => {
  // ... existing component logic
  
  return (
    <nav className="bg-purple-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="font-bold text-xl">Wine Sales Evaluator</span>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                
                  href="/"
                  className="px-3 py-2 rounded-md text-sm font-medium hover:bg-purple-800"
                >
                  Dashboard
                </a>
                {/* Add the new link here */}
                
                  href="/rubric-generator"
                  className="px-3 py-2 rounded-md text-sm font-medium hover:bg-purple-800"
                >
                  Rubric Generator
                </a>
                {/* Other existing navigation links */}
              </div>
            </div>
          </div>
          
          {/* Mobile menu button and dropdown */}
          {/* ... */}
        </div>
      </div>
    </nav>
  );
};

export default NavigationMenu;
```

## 8. Add Utility for Converting Rubric Template to Evaluation Data

Create a utility function to convert the generated rubric template to the format expected by your evaluation system.

### Cursor.ai Prompt
```
Create a utility function that converts the generated RubricTemplate to the EvaluationData format used by the rest of your application. Make sure it properly maps all fields and maintains type safety.
```

```typescript
// app/utils/rubricConverter.ts
import { RubricTemplate } from '../types/rubricGenerator';
import { CriterionScore, EvaluationData, PerformanceLevel } from '../types/evaluation';

/**
 * Converts a RubricTemplate to the EvaluationData format used by the evaluation system
 * @param rubric The rubric template to convert
 * @param staffName Optional staff name to include in the evaluation data
 * @returns The converted evaluation data
 */
export function convertRubricToEvaluationData(
  rubric: RubricTemplate,
  staffName: string = 'Staff Member'
): EvaluationData {
  // Create array of criterion scores
  const criteriaScores: CriterionScore[] = Object.entries(rubric.criteriaWeights).map(([criterion, weight]) => {
    return {
      criterion,
      weight,
      score: 1, // Default score
      weightedScore: weight, // Initial weighted score (score * weight)
      notes: rubric.criteriaDescriptions[criterion] || ''
    };
  });

  // Calculate total possible score (based on 5 points per criterion)
  const totalPossibleScore = Object.values(rubric.criteriaWeights).reduce((sum, weight) => sum + (weight * 5), 0);
  
  // Calculate default overall score (20% of total)
  const defaultOverallScore = Math.round((totalPossibleScore * 0.2) / 5);

  // Default performance level based on the default overall score
  const defaultPerformanceLevel = getPerformanceLevelFromScore(defaultOverallScore);

  // Create the evaluation data
  const evaluationData: EvaluationData = {
    staffName,
    date: new Date().toISOString().split('T')[0], // Current date in YYYY-MM-DD format
    overallScore: defaultOverallScore,
    performanceLevel: defaultPerformanceLevel,
    criteriaScores,
    observationalNotes: {
      productKnowledge: { score: 1, notes: 'Not evaluated yet' },
      handlingObjections: { score: 1, notes: 'Not evaluated yet' }
    },
    strengths: [
      'To be determined after evaluation',
      'To be determined after evaluation',
      'To be determined after evaluation'
    ],
    areasForImprovement: [
      'To be determined after evaluation',
      'To be determined after evaluation',
      'To be determined after evaluation'
    ],
    keyRecommendations: [
      'To be determined after evaluation',
      'To be determined after evaluation',
      'To be determined after evaluation'
    ]
  };

  return evaluationData;
}

/**
 * Determines the performance level based on score
 * @param score The score to evaluate
 * @returns The corresponding performance level
 */
function getPerformanceLevelFromScore(score: number): PerformanceLevel {
  if (score >= 90) return 'Exceptional';
  if (score >= 80) return 'Strong';
  if (score >= 70) return 'Proficient';
  if (score >= 60) return 'Developing';
  return 'Needs Improvement';
}
```

## 9. Update the Application State to Handle Rubric Data

Finally, update your application's state management to use the generated rubric.

### Cursor.ai Prompt
```
Update the application's state management to handle loading the generated rubric from localStorage or the API. This should integrate with your existing state management approach.
```

```typescript
// app/utils/evaluationStore.ts (or your existing state management file)
import { EvaluationData } from '../types/evaluation';
import { RubricTemplate } from '../types/rubricGenerator';
import { convertRubricToEvaluationData } from './rubricConverter';

/**
 * Loads the current evaluation rubric
 * @returns The evaluation data for the current rubric
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
 * Sets the current evaluation rubric
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
```

## 10. Add Rubric Loading Logic to WineEvaluationDashboard

Update your main dashboard to load the custom rubric if available.

### Cursor.ai Prompt
```
Update the WineEvaluationDashboard component to check for and load a custom rubric from localStorage or the API.
```

```tsx
// app/components/WineEvaluationDashboard.tsx
// Add this to your existing WineEvaluationDashboard component

// ... existing imports
import { useEffect } from 'react';
import { loadCurrentRubric } from '../utils/evaluationStore';
import { useRouter } from 'next/navigation';

const WineEvaluationDashboard: React.FC = () => {
  // ... existing state
  const router = useRouter();
  
  // Add this useEffect to check for a custom rubric on load
  useEffect(() => {
    try {
      // Check if we have a custom rubric
      const customRubric = loadCurrentRubric();
      
      if (customRubric) {
        // Update your state with the custom rubric
        // This will depend on your existing state management
        // For example:
        setEvaluationData(prev => ({
          ...prev,
          criteriaScores: customRubric.criteriaScores
        }));
        
        // Show a toast notification
        toast.success('Custom rubric loaded');
      }
    } catch (error) {
      console.error('Error loading custom rubric:', error);
      toast.error('Failed to load custom rubric');
    }
  }, []);
  
  // Add a button or link to navigate to the rubric generator
  const navigateToRubricGenerator = () => {
    router.push('/rubric-generator');
  };
  
  // Add this to your existing UI, perhaps in the controls area
  const renderRubricControls = () => (
    <div className="flex items-center space-x-2">
      <button
        onClick={navigateToRubricGenerator}
        className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors flex items-center"
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        Create Custom Rubric
      </button>
    </div>
  );
  
  // Include the renderRubricControls in your existing return JSX
  // ...
};

export default WineEvaluationDashboard;
```

## 11. Test and Finalize Integration

### Cursor.ai Prompt
```
Write a testing checklist for verifying the entire rubric generation flow and integration with the rest of the application.
```

# Testing Checklist for Rubric Generator

- [ ] **Frontend Component Testing**
  - [ ] RubricGenerator component renders correctly
  - [ ] File upload accepts only JSON files
  - [ ] Requirements text area properly captures input
  - [ ] Generate button is disabled until both file and requirements are provided
  - [ ] Loading state displays correctly during generation
  - [ ] Error messages display correctly when issues occur

- [ ] **API Route Testing**
  - [ ] `/api/rubric/generate` route properly handles valid requests
  - [ ] `/api/rubric/generate` route properly handles invalid requests
  - [ ] `/api/rubric/save` route correctly saves rubrics
  - [ ] Error handling works correctly for all routes

- [ ] **Claude Integration Testing**
  - [ ] System prompt produces consistent results
  - [ ] JSON parsing handles all response formats
  - [ ] Validation catches and corrects issues with Claude responses
  - [ ] Rate limiting and error handling work correctly

- [ ] **Rubric Conversion Testing**
  - [ ] RubricTemplate correctly converts to EvaluationData
  - [ ] All fields map correctly between the two formats
  - [ ] Default values are sensible

- [ ] **State Management Testing**
  - [ ] Generated rubric correctly stores in localStorage
  - [ ] Application correctly loads stored rubric on startup
  - [ ] State updates trigger appropriate UI changes

- [ ] **Integration Testing**
  - [ ] Full flow from scenario upload to rubric generation works
  - [ ] Rubric generator page navigates correctly
  - [ ] Generated rubric correctly influences evaluation
  - [ ] Navigation between components works as expected

- [ ] **Edge Case Testing**
  - [ ] Large scenario JSON files handle correctly
  - [ ] Very detailed requirements process correctly
  - [ ] Application gracefully handles API errors
  - [ ] Application works correctly when localStorage is unavailable

## Conclusion

This implementation allows users to create custom evaluation rubrics for wine sales scenarios using AI. By following these steps, you've created a seamless integration between your scenario JSON, natural language requirements, and Claude's powerful AI capabilities.

The solution maintains compatibility with your existing application and follows best practices for deployment on Render. The implementation is modular, making it easy to maintain and extend in the future.

Key features of this solution:
- Two-step rubric generation process
- AI-powered customization based on scenarios and requirements
- Integration with your existing evaluation system
- Type-safe implementation with proper error handling
- Clean and intuitive user interface