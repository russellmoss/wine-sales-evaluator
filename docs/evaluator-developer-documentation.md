# Wine Sales Evaluator Developer Documentation

## Table of Contents

1. [Introduction](#introduction)
2. [Directory Structure](#directory-structure)
3. [Key Components](#key-components)
4. [Storage System](#storage-system)
5. [API Architecture](#api-architecture)
6. [Evaluation Process](#evaluation-process)
7. [Rubric System](#rubric-system)
   - [Current Rubric Structure](#current-rubric-structure)
   - [Adding New Rubrics](#adding-new-rubrics)
   - [Implementing Rubric Selection](#implementing-rubric-selection)
8. [Deployment](#deployment)
9. [Troubleshooting](#troubleshooting)
10. [Future Enhancements](#future-enhancements)

## Introduction

The Wine Sales Evaluator is a Next.js application designed to analyze and evaluate wine tasting room conversations between staff members and guests. It uses Claude AI to provide detailed performance evaluations based on customizable rubrics. The application generates comprehensive reports with specific strengths, areas for improvement, and actionable recommendations.

The application is designed with a winery management perspective in mind, allowing for custom evaluation criteria that match your specific training and performance goals.

## Directory Structure

```
wine-sales-evaluator/
├── app/                       # Main Next.js app directory
│   ├── api/                   # API routes
│   │   ├── analyze-conversation/  # Handles conversation analysis
│   │   ├── check-job-status/      # Checks status of analysis jobs
│   │   ├── force-complete-job/    # Forces job completion (debug)
│   │   └── health/               # Health check endpoint
│   ├── components/            # React components for app UI
│   │   ├── ErrorBoundary.tsx       # Error handling component
│   │   ├── GlobalErrorBoundary.tsx # App-wide error handling
│   │   ├── LoadingIndicator.tsx    # Loading animation
│   │   ├── MarkdownImporter.tsx    # File import component
│   │   └── WineEvaluationDashboard.tsx # Main dashboard 
│   ├── detailed-results/      # Detailed results page
│   ├── types/                 # TypeScript type definitions
│   │   └── evaluation.ts      # Evaluation data types
│   ├── utils/                 # Utility functions
│   │   ├── storage.ts         # Storage system
│   │   └── validation.ts      # Data validation utilities
│   ├── globals.css            # Global styles
│   ├── layout.tsx             # Root layout
│   └── page.tsx               # Home page
├── components/                # Shared components
│   ├── BackButton.tsx             # Navigation button
│   ├── DetailedResults.tsx        # Results display
│   ├── ErrorDisplay.tsx           # Error message component
│   ├── LoadingIndicator.tsx       # Loading spinner
│   ├── MarkdownImporter.tsx       # File upload component 
│   ├── PDFExport.tsx              # PDF export functionality
│   ├── PDFExportView.tsx          # PDF view component
│   └── WineEvaluationDashboard.tsx # Main dashboard alternate
├── netlify/                   # Netlify functions
│   └── functions/             # Serverless functions
│       ├── analyze-conversation.ts        # Main analysis function
│       ├── analyze-conversation-background.ts # Background processing
│       ├── check-job-status.ts            # Status checking function
│       ├── force-complete-job.ts          # Debug function
│       └── test-blobs.ts                  # Storage testing
├── public/                    # Static assets
│   └── data/                  # Sample data and rubrics
│       ├── sample_conversation.md         # Example conversation
│       ├── wines_sales_rubric.md          # Default rubric
│       └── evaluation_example.json        # Example evaluation
├── docs/                      # Documentation
│   └── wine-tasting-conversation-2025-04-07 (1).md # Sample conversation
├── types/                     # Global type definitions
│   ├── analysis.ts                 # Analysis types
│   ├── evaluation.ts               # Evaluation data types
│   └── netlify-functions.d.ts      # Netlify function types
├── render/                    # Render-specific files
│   └── functions/             # Render functions
│       └── api-handler.ts          # API handler for Render
├── next.config.js            # Next.js configuration
├── postcss.config.js         # PostCSS configuration
├── tailwind.config.js        # Tailwind CSS configuration
├── tsconfig.json             # TypeScript configuration
├── render.yaml               # Render deployment configuration
├── render-setup.sh           # Render setup script
├── server.js                 # Custom server for Render
└── package.json              # Project dependencies
```

## Key Components

### MarkdownImporter

The `MarkdownImporter` component allows users to upload markdown files containing wine tasting conversations. It handles file selection, reading, and submitting the content for analysis.

### WineEvaluationDashboard

The main dashboard component that displays evaluation results, including scores, strengths, areas for improvement, and recommendations.

### DetailedResults

Provides an in-depth view of the evaluation results, including detailed notes for each criterion and visualizations.

### PDFExport

Allows exporting the evaluation as a professional PDF report for sharing or record-keeping.

## Storage System

The application uses a flexible storage system that adapts based on the deployment environment:

1. **Memory Storage**: In-memory storage for development environments
2. **File Storage**: Persistent storage for production environments

The storage system handles job data, including the conversation content, analysis status, and results.

```typescript
// Key interfaces from app/utils/storage.ts
export interface JobStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'unknown' | 'api_error';
  result?: any;
  error?: string;
  errorDetails?: {
    type: string;
    message: string;
    timestamp: string;
    isTimeout?: boolean;
  };
  createdAt: string;
  updatedAt: string;
  expiresAt?: number;
  markdown?: string;
  fileName?: string;
}

export interface StorageProvider {
  saveJob(job: JobStatus): Promise<void>;
  getJob(jobId: string): Promise<JobStatus | null>;
  listJobs(): Promise<JobStatus[]>;
  deleteJob(jobId: string): Promise<boolean>;
  cleanupExpiredJobs(): Promise<number>;
}
```

## API Architecture

The application uses Next.js API routes for server-side operations:

1. `/api/analyze-conversation`: Analyzes conversation markdown using Claude AI
2. `/api/check-job-status`: Checks the status of ongoing analysis jobs
3. `/api/health`: Health check endpoint for monitoring
4. `/api/force-complete-job`: Debug endpoint to manually complete jobs

These API routes interact with the Claude AI API and the storage system to manage the analysis process.

## Evaluation Process

The evaluation process follows these steps:

1. User uploads a conversation markdown file
2. The file is sent to the `/api/analyze-conversation` endpoint
3. The application creates a job and stores it in the storage system
4. Claude AI analyzes the conversation based on the selected rubric
5. The results are stored and returned to the client
6. The dashboard displays the evaluation results

## Rubric System

The current system uses a single rubric defined in `public/data/wines_sales_rubric.md`. To support multiple rubrics, we need to implement a selection mechanism and modify the analysis process to use the selected rubric.

### Current Rubric Structure

The current rubric is structured as a markdown file with sections for each criterion, including detailed scoring guidelines for each level (1-5).

```markdown
# Winery Sales Simulation Evaluation Rubric

## Overview
This rubric is designed to evaluate the performance of winery tasting room staff members during guest interactions. Each criterion is scored on a scale of 1-5, with specific guidelines for each score level.

## Evaluation Criteria

### 1. Initial Greeting and Welcome (Weight: 8%)
*How effectively does the staff member welcome guests and set a positive tone?*

| Score | Description |
|-------|-------------|
| 1 | No greeting or unwelcoming approach |
| 2 | Basic greeting but minimal warmth |
| 3 | Friendly greeting but lacks personalization |
| 4 | Warm, friendly greeting with good eye contact |
| 5 | Exceptional welcome that makes guests feel valued and excited |

// Additional criteria follow the same pattern
```

### Adding New Rubrics

To add support for multiple rubrics, follow these steps:

1. Create new rubric files in the `public/data/rubrics/` directory
2. Implement a rubric management system
3. Modify the UI to allow rubric selection
4. Update the analysis process to use the selected rubric

#### Step 1: Create New Rubric Files

Create a directory structure for organizing rubrics:

```
public/
└── data/
    └── rubrics/
        ├── wine_sales.md         # Default sales rubric
        ├── wine_tasting.md       # Tasting-focused rubric
        ├── wine_club.md          # Wine club-focused rubric
        └── customer_service.md   # General service rubric
```

Each rubric should follow the same structure as the current rubric but with criteria specific to its focus area.

#### Step 2: Implement Rubric Management System

Create a new utility file `app/utils/rubrics.ts` to manage rubric loading and metadata:

```typescript
// app/utils/rubrics.ts
import fs from 'fs';
import path from 'path';

export interface RubricMetadata {
  id: string;
  name: string;
  description: string;
  fileName: string;
  criteria: string[];
}

const RUBRICS_DIR = path.join(process.cwd(), 'public', 'data', 'rubrics');

// List all available rubrics
export async function listRubrics(): Promise<RubricMetadata[]> {
  try {
    const files = await fs.promises.readdir(RUBRICS_DIR);
    const rubrics: RubricMetadata[] = [];
    
    for (const file of files) {
      if (file.endsWith('.md')) {
        const filePath = path.join(RUBRICS_DIR, file);
        const content = await fs.promises.readFile(filePath, 'utf8');
        
        // Extract metadata from rubric content
        const nameMatch = content.match(/^# (.+)$/m);
        const descriptionMatch = content.match(/^## Overview\s+(.+?)(?=##|$)/ms);
        const criteriaMatches = content.matchAll(/^### \d+\.\s+([^(]+)/gm);
        
        const criteria: string[] = [];
        for (const match of criteriaMatches) {
          criteria.push(match[1].trim());
        }
        
        rubrics.push({
          id: file.replace('.md', ''),
          name: nameMatch ? nameMatch[1].trim() : file,
          description: descriptionMatch ? descriptionMatch[1].trim() : '',
          fileName: file,
          criteria
        });
      }
    }
    
    return rubrics;
  } catch (error) {
    console.error('Error listing rubrics:', error);
    return [];
  }
}

// Load a specific rubric by ID
export async function loadRubric(rubricId: string): Promise<string | null> {
  try {
    const filePath = path.join(RUBRICS_DIR, `${rubricId}.md`);
    
    if (!fs.existsSync(filePath)) {
      return null;
    }
    
    return await fs.promises.readFile(filePath, 'utf8');
  } catch (error) {
    console.error(`Error loading rubric ${rubricId}:`, error);
    return null;
  }
}
```

#### Step 3: Create a Rubric Selection Component

Create a new component for selecting rubrics:

```typescript
// components/RubricSelector.tsx
"use client";

import React, { useEffect, useState } from 'react';

interface RubricOption {
  id: string;
  name: string;
  description: string;
}

interface RubricSelectorProps {
  onRubricChange: (rubricId: string) => void;
  defaultRubricId?: string;
}

const RubricSelector: React.FC<RubricSelectorProps> = ({ 
  onRubricChange, 
  defaultRubricId = 'wine_sales' 
}) => {
  const [rubrics, setRubrics] = useState<RubricOption[]>([]);
  const [selectedRubricId, setSelectedRubricId] = useState<string>(defaultRubricId);
  const [loading, setLoading] = useState<boolean>(true);
  
  useEffect(() => {
    async function loadRubrics() {
      try {
        setLoading(true);
        const response = await fetch('/api/rubrics');
        
        if (!response.ok) {
          throw new Error(`Error fetching rubrics: ${response.status}`);
        }
        
        const data = await response.json();
        setRubrics(data);
      } catch (error) {
        console.error('Error loading rubrics:', error);
        // Fallback to default rubrics if API fails
        setRubrics([
          { id: 'wine_sales', name: 'Wine Sales', description: 'Evaluate wine sales conversations' },
          { id: 'wine_tasting', name: 'Wine Tasting', description: 'Evaluate wine tasting presentations' },
          { id: 'wine_club', name: 'Wine Club', description: 'Evaluate wine club presentations' }
        ]);
      } finally {
        setLoading(false);
      }
    }
    
    loadRubrics();
  }, []);
  
  const handleRubricChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRubricId = e.target.value;
    setSelectedRubricId(newRubricId);
    onRubricChange(newRubricId);
  };
  
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Evaluation Rubric
      </label>
      <select
        value={selectedRubricId}
        onChange={handleRubricChange}
        className="block w-full rounded-md border-gray-300 shadow-sm 
                   focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        disabled={loading}
      >
        {loading ? (
          <option>Loading rubrics...</option>
        ) : (
          rubrics.map(rubric => (
            <option key={rubric.id} value={rubric.id}>
              {rubric.name}
            </option>
          ))
        )}
      </select>
      {selectedRubricId && rubrics.length > 0 && (
        <p className="mt-1 text-sm text-gray-500">
          {rubrics.find(r => r.id === selectedRubricId)?.description || ''}
        </p>
      )}
    </div>
  );
};

export default RubricSelector;
```

#### Step 4: Create an API Endpoint for Rubrics

Create a new API endpoint to list available rubrics:

```typescript
// app/api/rubrics/route.ts
import { NextResponse } from 'next/server';
import { listRubrics } from '../../../app/utils/rubrics';

export async function GET() {
  try {
    const rubrics = await listRubrics();
    return NextResponse.json(rubrics);
  } catch (error) {
    console.error('Error in rubrics API route:', error);
    return NextResponse.json({ 
      error: 'Failed to list rubrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
```

#### Step 5: Update the MarkdownImporter Component

Modify the `MarkdownImporter` component to include the rubric selector:

```typescript
// components/MarkdownImporter.tsx
"use client";

import React, { FC, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { validateEvaluationData } from '../app/utils/validation';
import { EvaluationData } from '../app/types/evaluation';
import RubricSelector from './RubricSelector';

interface MarkdownImporterProps {
  onAnalysisComplete: (data: EvaluationData) => void;
  isAnalyzing: boolean;
  setIsAnalyzing: (isAnalyzing: boolean) => void;
}

const MarkdownImporter: FC<MarkdownImporterProps> = ({ onAnalysisComplete, isAnalyzing, setIsAnalyzing }) => {
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [selectedRubricId, setSelectedRubricId] = useState<string>('wine_sales');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setMarkdown(content);
    };
    reader.readAsText(file);
  };
  
  const handleRubricChange = (rubricId: string) => {
    setSelectedRubricId(rubricId);
  };

  const analyzeConversation = async () => {
    if (!markdown) {
      toast.error('Please select a markdown file first');
      return;
    }
    
    try {
      setIsAnalyzing(true);
      setError(null);
      setJobId(null);

      // Include the selected rubric ID in the request
      const response = await fetch('/api/analyze-conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          markdown: markdown,
          fileName: fileName,
          rubricId: selectedRubricId,
          directEvaluation: process.env.NEXT_PUBLIC_USE_DIRECT_EVALUATION === 'true'
        }),
      });
      
      // Rest of the method remains the same...
    } catch (error) {
      console.error('Error analyzing conversation:', error);
      setError(error instanceof Error ? error.message : 'An error occurred during analysis');
      toast.error(error instanceof Error ? error.message : 'Error analyzing conversation. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Upload Conversation Markdown
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept=".md,.txt"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100"
          disabled={isAnalyzing}
        />
      </div>
      
      {/* Add the rubric selector */}
      <RubricSelector 
        onRubricChange={handleRubricChange}
        defaultRubricId="wine_sales"
      />
      
      <button
        onClick={analyzeConversation}
        disabled={!markdown || isAnalyzing}
        className={`w-full py-2 px-4 rounded-md text-white font-medium
          ${!markdown || isAnalyzing
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700'
          }`}
      >
        {isAnalyzing ? (
          <div className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {jobId ? `Analyzing (Job: ${jobId.substring(0, 8)}...)` : 'Analyzing...'}
          </div>
        ) : (
          'Analyze Conversation'
        )}
      </button>
      
      {error && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}
    </div>
  );
};

export default MarkdownImporter;
```

#### Step 6: Update the Analysis API to Use the Selected Rubric

Modify the `analyze-conversation` API route to load and use the selected rubric:

```typescript
// app/api/analyze-conversation/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { loadRubric } from '../../../app/utils/rubrics';
// Other imports remain the same

export async function POST(request: NextRequest) {
  // Existing code...
  
  try {
    // Parse the request body
    const body = await request.json();
    const { markdown, fileName, rubricId = 'wine_sales' } = body;
    
    // Load the selected rubric
    const rubric = await loadRubric(rubricId);
    
    if (!rubric) {
      return NextResponse.json({ 
        error: `Rubric with ID '${rubricId}' not found`,
        requestId
      }, { status: 400 });
    }
    
    // Existing code for creating job and processing...
    
    // Use the loaded rubric in the Claude prompt
    const prompt = `You are an expert wine sales trainer evaluating a conversation between a winery staff member and a guest.

IMPORTANT INSTRUCTIONS:
1. Use the EXACT criteria and scoring guidelines from the rubric below
2. For each criterion, provide a score (1-5) and detailed justification
3. Calculate the weighted score for each criterion using the weights specified
4. Determine the overall performance level based on the total weighted score
5. Provide specific examples from the conversation to support your evaluation

RUBRIC:
${rubric}

CONVERSATION TO EVALUATE:
${markdown.substring(0, 30000)}${markdown.length > 30000 ? '...(truncated)' : ''}

Return ONLY the valid JSON with no additional explanation or text.`;
    
    // Remaining code is the same...
  } catch (error) {
    // Error handling...
  }
}
```

### Implementing Rubric Selection

With the components and API endpoints in place, you can now implement rubric selection in your application:

1. Add the `RubricSelector` component to your main dashboard or import page
2. Pass the selected rubric ID to the `analyzeConversation` function
3. Update the analysis process to use the selected rubric

#### Example Implementation Flow

1. User uploads a conversation markdown file
2. User selects a rubric from the dropdown
3. The application sends the conversation and rubric ID to the API
4. Claude AI analyzes the conversation based on the selected rubric
5. The results are stored and returned to the client
6. The dashboard displays the evaluation results

## Creating Custom Rubrics

To create a new custom rubric:

1. Create a new markdown file in `public/data/rubrics/` following the established format
2. Ensure each criterion has a weight specified (weights should sum to 100%)
3. Define clear scoring guidelines for each criterion (scores 1-5)
4. Include detailed descriptions for each score level

### Example Rubric Structure

```markdown
# Wine Club Presentation Rubric

## Overview
This rubric evaluates staff performance in presenting wine club offerings and converting guests to members.

## Evaluation Criteria

### 1. Timing of Wine Club Introduction (Weight: 15%)
*How well did the staff member time the wine club introduction?*

| Score | Description |
|-------|-------------|
| 1 | Introduced too early before building rapport or allowing guest to taste wines |
| 2 | Timing was awkward or forced, interrupting the guest experience |
| 3 | Adequate timing that didn't disrupt the experience but wasn't optimally placed |
| 4 | Good timing after guest showed interest in the wines |
| 5 | Excellent timing that naturally flowed from guest buying signals and expressed interests |

### 2. Clarity of Membership Benefits (Weight: 20%)
*How clearly were wine club benefits explained?*

| Score | Description |
|-------|-------------|
| 1 | Benefits were unclear or not mentioned |
| 2 | Minimal explanation of benefits with little detail |
| 3 | Standard explanation of core benefits with adequate detail |
| 4 | Clear explanation with specific details tailored to guest interests |
| 5 | Exceptional clarity with compelling, personalized value propositions |

# Additional criteria follow the same pattern...
```

## Deployment

The application is successfully deployed on Render using the configuration in `render.yaml`. The deployment process includes:

1. Building the Next.js application
2. Running the setup script to prepare the environment
3. Starting the server with a persistent storage volume

Key deployment files:

- `render.yaml`: Defines the service configuration
- `render-setup.sh`: Prepares the environment and storage directories
- `server.js`: Custom server for running the application
- `next.config.js`: Next.js configuration for production

## Troubleshooting

Common issues and their solutions:

1. **Storage Access Issues**
   - Check that the correct storage directory is configured
   - Ensure the application has write permissions to the storage directory
   - Verify the environment variables are set correctly

2. **Claude API Errors**
   - Verify the API key is set and valid
   - Check the API call parameters and format
   - Review API rate limits and usage

3. **Rubric Loading Errors**
   - Ensure rubric files are in the correct directory
   - Verify rubric file format follows the expected structure
   - Check for proper markdown formatting

## Future Enhancements

Potential future enhancements for the Wine Sales Evaluator:

1. **Advanced Rubric Management**
   - Web interface for creating and editing rubrics
   - Rubric versioning and history
   - Role-based access to rubric management

2. **Enhanced Reporting**
   - Comparative analysis across evaluations
   - Trend analysis over time
   - Team performance dashboards

3. **Integration with Training Materials**
   - Link evaluation results to specific training materials
   - Personalized improvement plans
   - Integration with learning management systems

4. **Multi-user Support**
   - User accounts and permissions
   - Evaluator-specific views and reports
   - Manager dashboards for team oversight

5. **Additional Analysis Options**
   - Sentiment analysis of conversations
   - Guest satisfaction prediction
   - Sales success probability estimation

This documentation provides a comprehensive overview of the Wine Sales Evaluator application, with a focus on implementing and customizing rubrics for different evaluation scenarios. By following the guidelines and examples, you can extend the application to support multiple specialized rubrics for various aspects of winery operations.