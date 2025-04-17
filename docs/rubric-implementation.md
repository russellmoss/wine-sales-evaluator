# Revised Rubric Management Implementation Guide for Wine Sales Evaluator

This guide provides a step-by-step approach to implementing flexible rubric management in your Wine Sales Evaluator application while avoiding the React hooks issues you've been experiencing. Each step includes Cursor.ai prompts, code explanations, and testing strategies to ensure everything works properly.

## Understanding the Hook Issue

Before we begin, let's clarify the React hooks issue that's been causing problems. When using hooks in React components:

1. **Always use named imports for hooks**: `import { useState, useEffect } from 'react'`
2. **Use hooks directly**: Call `useState()` directly, not `React.useState()`
3. **Only use hooks in functional components**: Don't mix hooks with class components
4. **Follow the Rules of Hooks**: Only call hooks at the top level, not inside conditions or loops

With this in mind, let's implement the rubric management system correctly.

## Table of Contents
1. [Data Model Enhancement](#1-data-model-enhancement)
2. [Storage Provider Extension](#2-storage-provider-extension)
3. [API Endpoints for Rubric Management](#3-api-endpoints-for-rubric-management)
4. [Rubric List Component](#4-rubric-list-component)
5. [Rubric Detail Component](#5-rubric-detail-component)
6. [Rubric Editor Component](#6-rubric-editor-component)
7. [Incorporating Rubric Selection in Markdown Importer](#7-incorporating-rubric-selection-in-markdown-importer)
8. [Updating the Evaluation Process](#8-updating-the-evaluation-process)
9. [Integration Testing](#9-integration-testing)
10. [Deployment Configuration](#10-deployment-configuration)

## 1. Data Model Enhancement

Let's start by defining the TypeScript interfaces for our rubric system.

### Cursor.ai Prompt

```
Create TypeScript interfaces for a flexible rubric management system including:
1. A Rubric interface with id, name, description, isDefault flag, timestamps, and an array of criteria
2. A Criterion interface with id, name, description, weight, and scoring levels
3. A ScoringLevel interface with score and description
4. A PerformanceLevel interface with name, min/max scores, and description

Make sure they're compatible with the existing wine sales evaluator model.
```

### Implementation

Create a new file at `app/types/rubric.ts`:

```typescript
/**
 * Types for the flexible rubric management system
 */

// Core rubric structure
export interface Rubric {
  id: string;                 // Unique identifier
  name: string;               // Display name
  description: string;        // Purpose and guidance
  isDefault: boolean;         // Whether this is the default rubric
  createdAt: string;          // Creation timestamp
  updatedAt: string;          // Last update timestamp
  criteria: Criterion[];      // List of evaluation criteria
  performanceLevels: PerformanceLevel[]; // Performance classification thresholds
}

// Individual criterion definition
export interface Criterion {
  id: string;                 // Unique identifier
  name: string;               // Display name
  description: string;        // What this evaluates
  weight: number;             // Weight as percentage (0-100)
  scoringLevels: ScoringLevel[]; // Descriptions for each score
}

// Scoring level definition
export interface ScoringLevel {
  score: number;              // Score value (1-5)
  description: string;        // What this score represents
}

// Performance level thresholds
export interface PerformanceLevel {
  name: string;               // Level name (e.g., "Exceptional", "Strong", etc.)
  minScore: number;           // Minimum score for this level (0-100)
  maxScore: number;           // Maximum score for this level (0-100)
  description: string;        // Description of this performance level
}

// Helper function to validate a rubric
export function validateRubric(rubric: Rubric): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Basic validation
  if (!rubric.id) errors.push('Rubric ID is required');
  if (!rubric.name) errors.push('Rubric name is required');
  
  // Criteria validation
  if (!Array.isArray(rubric.criteria) || rubric.criteria.length === 0) {
    errors.push('Rubric must have at least one criterion');
  } else {
    // Check if weights sum to 100%
    const totalWeight = rubric.criteria.reduce((sum, criterion) => sum + criterion.weight, 0);
    if (Math.abs(totalWeight - 100) > 0.01) {
      errors.push(`Criteria weights must sum to 100% (current sum: ${totalWeight}%)`);
    }
    
    // Check each criterion
    rubric.criteria.forEach((criterion, index) => {
      if (!criterion.id) errors.push(`Criterion ${index + 1} is missing an ID`);
      if (!criterion.name) errors.push(`Criterion ${index + 1} is missing a name`);
      if (criterion.weight <= 0) errors.push(`Criterion ${criterion.name || index + 1} has invalid weight`);
      
      // Check scoring levels
      if (!Array.isArray(criterion.scoringLevels) || criterion.scoringLevels.length === 0) {
        errors.push(`Criterion ${criterion.name || index + 1} must have at least one scoring level`);
      } else {
        // Ensure scoring levels are complete (1-5)
        const scores = criterion.scoringLevels.map(level => level.score).sort((a, b) => a - b);
        const expectedScores = [1, 2, 3, 4, 5];
        const missingScores = expectedScores.filter(score => !scores.includes(score));
        
        if (missingScores.length > 0) {
          errors.push(`Criterion ${criterion.name || index + 1} is missing scoring levels: ${missingScores.join(', ')}`);
        }
      }
    });
  }
  
  // Performance levels validation
  if (!Array.isArray(rubric.performanceLevels) || rubric.performanceLevels.length === 0) {
    errors.push('Rubric must have at least one performance level');
  } else {
    // Check coverage of 0-100 range
    const levels = [...rubric.performanceLevels].sort((a, b) => a.minScore - b.minScore);
    
    // Check for gaps or overlaps
    for (let i = 0; i < levels.length - 1; i++) {
      if (levels[i].maxScore !== levels[i + 1].minScore) {
        errors.push(`Gap or overlap between performance levels "${levels[i].name}" and "${levels[i + 1].name}"`);
      }
    }
    
    // Check full range coverage
    if (levels[0].minScore !== 0) {
      errors.push('Performance levels must start at 0%');
    }
    
    if (levels[levels.length - 1].maxScore !== 100) {
      errors.push('Performance levels must end at 100%');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Helper function to create a default wine sales rubric
export function createDefaultWineSalesRubric(): Rubric {
  const now = new Date().toISOString();
  const rubricId = 'wine-sales-default';
  
  return {
    id: rubricId,
    name: 'Wine Sales Evaluation',
    description: 'Standard rubric for evaluating wine tasting room sales interactions',
    isDefault: true,
    createdAt: now,
    updatedAt: now,
    criteria: [
      {
        id: `${rubricId}-criterion-1`,
        name: 'Initial Greeting and Welcome',
        description: 'How effectively does the staff member welcome guests and set a positive tone?',
        weight: 8,
        scoringLevels: [
          { score: 1, description: 'No greeting or unwelcoming approach' },
          { score: 2, description: 'Basic greeting but minimal warmth' },
          { score: 3, description: 'Friendly greeting but lacks personalization' },
          { score: 4, description: 'Warm, friendly greeting with good eye contact' },
          { score: 5, description: 'Exceptional welcome that makes guests feel valued and excited' }
        ]
      },
      {
        id: `${rubricId}-criterion-2`,
        name: 'Building Rapport',
        description: 'How well does the staff member connect personally with the guests?',
        weight: 10,
        scoringLevels: [
          { score: 1, description: 'No attempt to connect personally with guests' },
          { score: 2, description: 'Minimal small talk, mostly transactional' },
          { score: 3, description: 'Some rapport-building questions but limited follow-up' },
          { score: 4, description: 'Good personal connection through meaningful conversation' },
          { score: 5, description: 'Excellent rapport building, including origin questions, future plans, and genuine interest' }
        ]
      },
      // Add remaining criteria with similar structure
      {
        id: `${rubricId}-criterion-3`,
        name: 'Winery History and Ethos',
        description: 'How effectively does the staff member communicate the winery\'s story and values?',
        weight: 10,
        scoringLevels: [
          { score: 1, description: 'No mention of winery history or values' },
          { score: 2, description: 'Brief, factual mention of winery background' },
          { score: 3, description: 'Adequate explanation of winery history and values' },
          { score: 4, description: 'Compelling storytelling about winery history, connecting to wines' },
          { score: 5, description: 'Passionate, engaging narrative that brings the winery ethos to life' }
        ]
      },
      {
        id: `${rubricId}-criterion-4`,
        name: 'Storytelling and Analogies',
        description: 'How well does the staff member use storytelling and analogies to describe wines?',
        weight: 10,
        scoringLevels: [
          { score: 1, description: 'Technical descriptions only, no storytelling or analogies' },
          { score: 2, description: 'Minimal storytelling, mostly factual information' },
          { score: 3, description: 'Some storytelling elements but lacking rich analogies' },
          { score: 4, description: 'Good use of stories and analogies that help guests understand wines' },
          { score: 5, description: 'Exceptional storytelling that creates memorable experiences and makes wine accessible' }
        ]
      },
      {
        id: `${rubricId}-criterion-5`,
        name: 'Recognition of Buying Signals',
        description: 'How well does the staff member notice and respond to buying signals?',
        weight: 12,
        scoringLevels: [
          { score: 1, description: 'Misses obvious buying signals completely' },
          { score: 2, description: 'Notices some signals but response is delayed or inappropriate' },
          { score: 3, description: 'Recognizes main buying signals with adequate response' },
          { score: 4, description: 'Quickly identifies buying signals and responds effectively' },
          { score: 5, description: 'Expertly recognizes subtle cues and capitalizes on buying moments' }
        ]
      },
      {
        id: `${rubricId}-criterion-6`,
        name: 'Customer Data Capture',
        description: 'How effectively does the staff member attempt to collect customer information?',
        weight: 8,
        scoringLevels: [
          { score: 1, description: 'No attempt to capture customer data' },
          { score: 2, description: 'Single basic attempt at data collection' },
          { score: 3, description: 'Multiple attempts but without explaining benefits' },
          { score: 4, description: 'Good data capture attempts with clear value proposition' },
          { score: 5, description: 'Natural, non-intrusive data collection that feels beneficial to guest' }
        ]
      },
      {
        id: `${rubricId}-criterion-7`,
        name: 'Asking for the Sale',
        description: 'How effectively does the staff member ask for wine purchases?',
        weight: 12,
        scoringLevels: [
          { score: 1, description: 'Never asks for sale or suggests purchase' },
          { score: 2, description: 'Vague suggestion about purchasing without direct ask' },
          { score: 3, description: 'Basic closing attempt but lacks confidence' },
          { score: 4, description: 'Clear, confident ask for purchase at appropriate time' },
          { score: 5, description: 'Multiple strategic closing attempts that feel natural and appropriate' }
        ]
      },
      {
        id: `${rubricId}-criterion-8`,
        name: 'Personalized Wine Recommendations',
        description: 'How well does the staff member customize wine recommendations based on guest preferences?',
        weight: 10,
        scoringLevels: [
          { score: 1, description: 'Generic recommendations unrelated to expressed interests' },
          { score: 2, description: 'Basic recommendations with minimal personalization' },
          { score: 3, description: 'Adequate recommendations based on general preferences' },
          { score: 4, description: 'Well-tailored recommendations based on specific guest feedback' },
          { score: 5, description: 'Expertly customized selections that perfectly match expressed interests' }
        ]
      },
      {
        id: `${rubricId}-criterion-9`,
        name: 'Wine Club Presentation',
        description: 'How effectively does the staff member present and invite guests to join the wine club?',
        weight: 12,
        scoringLevels: [
          { score: 1, description: 'No mention of wine club or inadequate response when asked' },
          { score: 2, description: 'Basic wine club information without personalization' },
          { score: 3, description: 'Adequate explanation of benefits but minimal customization' },
          { score: 4, description: 'Good presentation of wine club with benefits tailored to guest interests' },
          { score: 5, description: 'Compelling, personalized wine club presentation with clear invitation to join' }
        ]
      },
      {
        id: `${rubricId}-criterion-10`,
        name: 'Closing Interaction',
        description: 'How well does the staff member conclude the interaction and encourage future visits?',
        weight: 8,
        scoringLevels: [
          { score: 1, description: 'Abrupt ending with no thanks or future invitation' },
          { score: 2, description: 'Basic thank you but no encouragement to return' },
          { score: 3, description: 'Polite conclusion with general invitation to return' },
          { score: 4, description: 'Warm thank you with specific suggestion for future visit' },
          { score: 5, description: 'Memorable farewell that reinforces relationship and ensures future visits' }
        ]
      }
    ],
    performanceLevels: [
      { name: 'Exceptional', minScore: 90, maxScore: 100, description: 'Outstanding performance that exceeds expectations in all areas' },
      { name: 'Strong', minScore: 80, maxScore: 90, description: 'Very good performance with minor areas for improvement' },
      { name: 'Proficient', minScore: 70, maxScore: 80, description: 'Solid performance that meets expectations' },
      { name: 'Developing', minScore: 60, maxScore: 70, description: 'Basic performance with significant areas for improvement' },
      { name: 'Needs Improvement', minScore: 0, maxScore: 60, description: 'Performance requiring substantial training and development' }
    ]
  };
}
```

### Testing

Create a simple test script to verify the data model:

```typescript
// File: scripts/test-rubric-model.ts
import { createDefaultWineSalesRubric, validateRubric } from '../app/types/rubric';

// Test function
function testRubricModel() {
  console.log('Testing rubric model...');
  
  // Create default rubric and validate
  const defaultRubric = createDefaultWineSalesRubric();
  const validationResult = validateRubric(defaultRubric);
  
  console.log('Default rubric valid:', validationResult.isValid);
  if (!validationResult.isValid) {
    console.error('Validation errors:', validationResult.errors);
  }
  
  // Test with invalid rubric (modified weights)
  const invalidRubric = {
    ...defaultRubric,
    criteria: [
      ...defaultRubric.criteria.slice(0, 2),
      {
        ...defaultRubric.criteria[2],
        weight: 20 // Changed weight to make sum > 100
      },
      ...defaultRubric.criteria.slice(3)
    ]
  };
  
  const invalidResult = validateRubric(invalidRubric);
  console.log('Invalid rubric test result:');
  console.log('- Valid:', invalidResult.isValid);
  console.log('- Errors:', invalidResult.errors);
  
  return {
    defaultRubric,
    validationResult,
    invalidRubric,
    invalidResult
  };
}

// Run the test
testRubricModel();
```

Run this test with:

```bash
npx ts-node scripts/test-rubric-model.ts
```

You should see output confirming that the default rubric is valid and the modified one is invalid due to weights not summing to 100%.

## 2. Storage Provider Extension

Next, we'll extend the storage provider to handle rubrics.

### Cursor.ai Prompt

```
Extend the existing storage provider to support rubric management with proper TypeScript typing:
1. Add methods for saving, retrieving, listing, and deleting rubrics
2. Add methods for getting/setting the default rubric
3. Update both memory and file storage implementations
4. Ensure backward compatibility with existing code
```

### Implementation

Update the storage provider interface in `app/utils/storage.ts`:

```typescript
import { Rubric } from '../types/rubric';

// Add to existing StorageProvider interface
export interface StorageProvider {
  // Existing methods
  saveJob(job: JobStatus): Promise<void>;
  getJob(jobId: string): Promise<JobStatus | null>;
  listJobs(): Promise<JobStatus[]>;
  deleteJob(jobId: string): Promise<boolean>;
  cleanupExpiredJobs(): Promise<number>;
  
  // New methods for rubric management
  saveRubric(rubric: Rubric): Promise<void>;
  getRubric(rubricId: string): Promise<Rubric | null>;
  listRubrics(): Promise<Rubric[]>;
  deleteRubric(rubricId: string): Promise<boolean>;
  getDefaultRubric(): Promise<Rubric | null>;
  setDefaultRubric(rubricId: string): Promise<boolean>;
}

// Update JobStatus interface
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
  rubricId?: string; // New field to track which rubric was used for evaluation
}
```

Now, update the memory storage provider:

```typescript
// Add to MemoryStorageProvider class implementation
export class MemoryStorageProvider implements StorageProvider {
  private jobs: Map<string, JobStatus>;
  private rubrics: Map<string, Rubric>; // New map for rubrics
  private defaultRubricId?: string;     // Track default rubric ID
  private static instance: MemoryStorageProvider;

  constructor() {
    this.jobs = new Map();
    this.rubrics = new Map();
  }

  public static getInstance(): MemoryStorageProvider {
    if (!MemoryStorageProvider.instance) {
      MemoryStorageProvider.instance = new MemoryStorageProvider();
    }
    return MemoryStorageProvider.instance;
  }

  // Existing methods...

  // New methods for rubric management
  async saveRubric(rubric: Rubric): Promise<void> {
    console.log(`Memory Storage: Saving rubric ${rubric.id}`);
    this.rubrics.set(rubric.id, rubric);
    
    // If this is marked as default or there's no default yet, set it as default
    if (rubric.isDefault || !this.defaultRubricId) {
      this.defaultRubricId = rubric.id;
      
      // Ensure only one rubric is marked as default
      if (rubric.isDefault) {
        for (const [id, otherRubric] of this.rubrics.entries()) {
          if (id !== rubric.id && otherRubric.isDefault) {
            otherRubric.isDefault = false;
            this.rubrics.set(id, otherRubric);
          }
        }
      }
    }
    
    console.log(`Memory Storage: Rubric ${rubric.id} saved successfully`);
  }

  async getRubric(rubricId: string): Promise<Rubric | null> {
    console.log(`Memory Storage: Retrieving rubric ${rubricId}`);
    const rubric = this.rubrics.get(rubricId);
    
    if (rubric) {
      console.log(`Memory Storage: Found rubric ${rubricId}`);
    } else {
      console.log(`Memory Storage: Rubric ${rubricId} not found`);
    }
    
    return rubric || null;
  }

  async listRubrics(): Promise<Rubric[]> {
    console.log('Memory Storage: Listing all rubrics');
    return Array.from(this.rubrics.values());
  }

  async deleteRubric(rubricId: string): Promise<boolean> {
    console.log(`Memory Storage: Deleting rubric ${rubricId}`);
    
    // Check if this is the default rubric
    if (this.defaultRubricId === rubricId) {
      // Find another rubric to set as default
      const otherRubrics = Array.from(this.rubrics.values())
        .filter(r => r.id !== rubricId);
        
      if (otherRubrics.length > 0) {
        // Set the first available rubric as default
        this.defaultRubricId = otherRubrics[0].id;
        otherRubrics[0].isDefault = true;
        this.rubrics.set(otherRubrics[0].id, otherRubrics[0]);
      } else {
        // No other rubrics, clear default
        this.defaultRubricId = undefined;
      }
    }
    
    const deleted = this.rubrics.delete(rubricId);
    console.log(`Memory Storage: Rubric ${rubricId} ${deleted ? 'deleted successfully' : 'not found'}`);
    return deleted;
  }

  async getDefaultRubric(): Promise<Rubric | null> {
    console.log('Memory Storage: Retrieving default rubric');
    
    if (!this.defaultRubricId) {
      console.log('Memory Storage: No default rubric set');
      return null;
    }
    
    const defaultRubric = this.rubrics.get(this.defaultRubricId);
    
    if (defaultRubric) {
      console.log(`Memory Storage: Found default rubric ${this.defaultRubricId}`);
    } else {
      console.log(`Memory Storage: Default rubric ${this.defaultRubricId} not found`);
    }
    
    return defaultRubric || null;
  }

  async setDefaultRubric(rubricId: string): Promise<boolean> {
    console.log(`Memory Storage: Setting default rubric to ${rubricId}`);
    
    const rubric = this.rubrics.get(rubricId);
    if (!rubric) {
      console.log(`Memory Storage: Rubric ${rubricId} not found, cannot set as default`);
      return false;
    }
    
    // Update all rubrics to ensure only one is marked as default
    for (const [id, otherRubric] of this.rubrics.entries()) {
      if (id === rubricId) {
        otherRubric.isDefault = true;
      } else {
        otherRubric.isDefault = false;
      }
      this.rubrics.set(id, otherRubric);
    }
    
    this.defaultRubricId = rubricId;
    console.log(`Memory Storage: Rubric ${rubricId} set as default successfully`);
    return true;
  }
}
```

Now, update the file storage provider:

```typescript
// Add to FileStorageProvider class
export class FileStorageProvider implements StorageProvider {
  private jobsDir: string;
  private rubricsDir: string; // New directory for rubrics
  private maxAge: number;
  private retryAttempts: number;
  private retryDelay: number;

  constructor(jobsDir: string, maxAge: number) {
    this.jobsDir = jobsDir;
    this.rubricsDir = path.join(path.dirname(jobsDir), 'rubrics'); // Store rubrics in a separate directory
    this.maxAge = maxAge;
    this.retryAttempts = 3;
    this.retryDelay = 1000; // 1 second
    console.log(`FileStorageProvider: Initializing with jobsDir=${jobsDir}, rubricsDir=${this.rubricsDir}, maxAge=${maxAge}`);
    this.ensureJobsDir();
    this.ensureRubricsDir();
  }

  // Add this new method to ensure rubrics directory exists
  private ensureRubricsDir(): void {
    try {
      console.log(`FileStorageProvider: Checking if rubrics directory exists: ${this.rubricsDir}`);
      if (!fs.existsSync(this.rubricsDir)) {
        console.log(`FileStorageProvider: Creating rubrics directory: ${this.rubricsDir}`);
        fs.mkdirSync(this.rubricsDir, { recursive: true });
        console.log(`FileStorageProvider: Rubrics directory created successfully`);
      } else {
        console.log(`FileStorageProvider: Rubrics directory already exists`);
        // Log directory contents for debugging
        const files = fs.readdirSync(this.rubricsDir);
        console.log(`FileStorageProvider: Directory contains ${files.length} files:`, files);
      }
    } catch (error) {
      console.error(`FileStorageProvider: Error creating rubrics directory: ${this.rubricsDir}`, error);
      throw new Error(`Failed to create rubrics directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Existing methods...

  // New methods for rubric management
  async saveRubric(rubric: Rubric): Promise<void> {
    this.ensureRubricsDir();
    
    const rubricPath = path.join(this.rubricsDir, `${rubric.id}.json`);
    
    try {
      console.log(`FileStorageProvider: Saving rubric ${rubric.id} to ${rubricPath}`);
      
      // Handle default rubric logic
      if (rubric.isDefault) {
        // If this rubric is being set as default, ensure no other rubric is marked as default
        const existingRubrics = await this.listRubrics();
        for (const existingRubric of existingRubrics) {
          if (existingRubric.id !== rubric.id && existingRubric.isDefault) {
            existingRubric.isDefault = false;
            await this.saveRubric(existingRubric); // Recursively save the updated rubric
          }
        }
      }
      
      // Use retry mechanism for saving
      await this.retryOperation(
        async () => {
          await fs.promises.writeFile(rubricPath, JSON.stringify(rubric, null, 2));
          
          // Verify the file was written
          if (!fs.existsSync(rubricPath)) {
            throw new Error(`Rubric file was not created at ${rubricPath}`);
          }
          
          const fileStats = fs.statSync(rubricPath);
          if (fileStats.size === 0) {
            throw new Error(`Rubric file was created but is empty`);
          }
        },
        `save rubric ${rubric.id}`
      );
      
      console.log(`FileStorageProvider: Rubric ${rubric.id} saved successfully`);
    } catch (error) {
      console.error(`FileStorageProvider: Error saving rubric ${rubric.id}:`, error);
      throw new Error(`Failed to save rubric: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getRubric(rubricId: string): Promise<Rubric | null> {
    this.ensureRubricsDir();
    const rubricPath = path.join(this.rubricsDir, `${rubricId}.json`);
    
    try {
      if (!fs.existsSync(rubricPath)) {
        console.log(`File Storage: Rubric file not found: ${rubricPath}`);
        return null;
      }
      
      console.log(`File Storage: Reading rubric file: ${rubricPath}`);
      
      // Use retry mechanism for reading
      const rubricData = await this.retryOperation(
        async () => {
          const data = await fs.promises.readFile(rubricPath, 'utf8');
          if (!data || data.trim() === '') {
            throw new Error(`Rubric file is empty or contains only whitespace`);
          }
          return data;
        },
        `read rubric ${rubricId}`
      );
      
      let rubric: Rubric;
      try {
        rubric = JSON.parse(rubricData) as Rubric;
      } catch (parseError) {
        console.error(`File Storage: Error parsing rubric JSON for ${rubricId}:`, parseError);
        return null;
      }
      
      console.log(`File Storage: Successfully retrieved rubric ${rubricId}`);
      return rubric;
    } catch (error) {
      console.error(`File Storage: Error reading rubric ${rubricId}:`, error);
      return null;
    }
  }

  async listRubrics(): Promise<Rubric[]> {
    this.ensureRubricsDir();
    
    try {
      console.log(`File Storage: Listing all rubrics in ${this.rubricsDir}`);
      const files = await fs.promises.readdir(this.rubricsDir);
      const rubrics: Rubric[] = [];
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const rubricId = file.replace('.json', '');
          try {
            const rubric = await this.getRubric(rubricId);
            if (rubric) {
              rubrics.push(rubric);
            }
          } catch (error) {
            console.error(`File Storage: Error processing rubric file ${file}:`, error);
            // Continue with other files even if one fails
          }
        }
      }
      
      console.log(`File Storage: Found ${rubrics.length} rubrics`);
      return rubrics;
    } catch (error) {
      console.error('File Storage: Error listing rubrics:', error);
      return [];
    }
  }

  async deleteRubric(rubricId: string): Promise<boolean> {
    this.ensureRubricsDir();
    const rubricPath = path.join(this.rubricsDir, `${rubricId}.json`);
    
    try {
      // First check if this rubric exists and if it's the default
      const rubric = await this.getRubric(rubricId);
      if (!rubric) {
        console.log(`File Storage: Rubric ${rubricId} not found for deletion`);
        return false;
      }
      
      // Handle default rubric deletion
      if (rubric.isDefault) {
        // Find another rubric to set as default
        const allRubrics = await this.listRubrics();
        const otherRubrics = allRubrics.filter(r => r.id !== rubricId);
        
        if (otherRubrics.length > 0) {
          // Set the first one as default
          otherRubrics[0].isDefault = true;
          await this.saveRubric(otherRubrics[0]);
        }
      }
      
      // Now delete the rubric
      if (!fs.existsSync(rubricPath)) {
        console.log(`File Storage: Rubric file not found for deletion: ${rubricPath}`);
        return false;
      }
      
      console.log(`File Storage: Deleting rubric file: ${rubricPath}`);
      
      // Use retry mechanism for deletion
      await this.retryOperation(
        async () => {
          await fs.promises.unlink(rubricPath);
          
          // Verify the file was deleted
          if (fs.existsSync(rubricPath)) {
            throw new Error(`Rubric file still exists after deletion attempt`);
          }
        },
        `delete rubric ${rubricId}`
      );
      
      console.log(`File Storage: Rubric ${rubricId} deleted successfully`);
      return true;
    } catch (error) {
      console.error(`File Storage: Error deleting rubric ${rubricId}:`, error);
      return false;
    }
  }

  async getDefaultRubric(): Promise<Rubric | null> {
    console.log('File Storage: Retrieving default rubric');
    
    try {
      const rubrics = await this.listRubrics();
      const defaultRubric = rubrics.find(r => r.isDefault);
      
      if (defaultRubric) {
        console.log(`File Storage: Found default rubric ${defaultRubric.id}`);
        return defaultRubric;
      } else if (rubrics.length > 0) {
        // If no rubric is marked as default but there are rubrics, set the first one as default
        console.log(`File Storage: No default rubric found, setting ${rubrics[0].id} as default`);
        rubrics[0].isDefault = true;
        await this.saveRubric(rubrics[0]);
        return rubrics[0];
      } else {
        console.log('File Storage: No rubrics found');
        return null;
      }
    } catch (error) {
      console.error('File Storage: Error getting default rubric:', error);
      return null;
    }
  }

  async setDefaultRubric(rubricId: string): Promise<boolean> {
    console.log(`File Storage: Setting default rubric to ${rubricId}`);
    
    try {
      // Check if the rubric exists
      const rubric = await this.getRubric(rubricId);
      if (!rubric) {
        console.log(`File Storage: Rubric ${rubricId} not found, cannot set as default`);
        return false;
      }
      
      // Get all rubrics and update their isDefault flag
      const rubrics = await this.listRubrics();
      for (const r of rubrics) {
        if (r.id === rubricId) {
          if (!r.isDefault) {
            r.isDefault = true;
            await this.saveRubric(r);
          }
        } else if (r.isDefault) {
          r.isDefault = false;
          await this.saveRubric(r);
        }
      }
      
      console.log(`File Storage: Rubric ${rubricId} set as default successfully`);
      return true;
    } catch (error) {
      console.error(`File Storage: Error setting default rubric ${rubricId}:`, error);
      return false;
    }
  }
}
```

Finally, update the `getStorageProvider` function to initialize with a default rubric if none exists:

```typescript
// Add this function to initialize the rubric system
export async function initializeRubricSystem(): Promise<void> {
  try {
    console.log('Storage Provider: Initializing rubric system');
    const storage = getStorageProvider();
    
    // Check if any rubrics exist
    const rubrics = await storage.listRubrics();
    
    if (rubrics.length === 0) {
      console.log('Storage Provider: No rubrics found, creating default wine sales rubric');
      
      // Import the createDefaultWineSalesRubric function
      const { createDefaultWineSalesRubric } = require('../types/rubric');
      
      // Create and save default rubric
      const defaultRubric = createDefaultWineSalesRubric();
      await storage.saveRubric(defaultRubric);
      
      console.log('Storage Provider: Default wine sales rubric created successfully');
    } else {
      console.log(`Storage Provider: Found ${rubrics.length} existing rubrics`);
      
      // Ensure there's a default rubric
      const defaultRubric = rubrics.find(r => r.isDefault);
      if (!defaultRubric) {
        console.log('Storage Provider: No default rubric set, setting the first one as default');
        await storage.setDefaultRubric(rubrics[0].id);
      }
    }
  } catch (error) {
    console.error('Storage Provider: Error initializing rubric system:', error);
    throw new Error(`Failed to initialize rubric system: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
```

### Testing

Create a test script to verify the storage provider extensions:

```typescript
// File: scripts/test-rubric-storage.ts
import { getStorageProvider, initializeRubricSystem } from '../app/utils/storage';
import { createDefaultWineSalesRubric } from '../app/types/rubric';

async function testRubricStorage() {
  console.log('Testing rubric storage...');
  
  // Initialize the storage provider
  const storage = getStorageProvider();
  
  // Initialize the rubric system
  await initializeRubricSystem();
  
  // List all rubrics
  const initialRubrics = await storage.listRubrics();
  console.log(`Initial rubrics: ${initialRubrics.length}`);
  initialRubrics.forEach(r => console.log(`- ${r.id}: ${r.name} (default: ${r.isDefault})`));
  
  // Get the default rubric
  const defaultRubric = await storage.getDefaultRubric();
  console.log('Default rubric:', defaultRubric?.name);
  
  // Create a second test rubric
  const testRubric = {
    ...createDefaultWineSalesRubric(),
    id: 'test-rubric',
    name: 'Test Rubric',
    description: 'A test rubric for development',
    isDefault: false
  };
  
  // Save the test rubric
  await storage.saveRubric(testRubric);
  console.log('Test rubric saved');
  
  // List rubrics again
  const updatedRubrics = await storage.listRubrics();
  console.log(`Updated rubrics: ${updatedRubrics.length}`);
  updatedRubrics.forEach(r => console.log(`- ${r.id}: ${r.name} (default: ${r.isDefault})`));
  
  // Try setting the test rubric as default
  await storage.setDefaultRubric('test-rubric');
  
  // Check if default rubric changed
  const newDefaultRubric = await storage.getDefaultRubric();
  console.log('New default rubric:', newDefaultRubric?.name);
  
  // Delete the test rubric
  await storage.deleteRubric('test-rubric');
  console.log('Test rubric deleted');
  
  // List rubrics again
  const finalRubrics = await storage.listRubrics();
  console.log(`Final rubrics: ${finalRubrics.length}`);
  finalRubrics.forEach(r => console.log(`- ${r.id}: ${r.name} (default: ${r.isDefault})`));
  
  // Check default rubric again
  const finalDefaultRubric = await storage.getDefaultRubric();
  console.log('Final default rubric:', finalDefaultRubric?.name);
  
  console.log('Test completed successfully!');
}

testRubricStorage().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
```

Run this with:

```bash
npx ts-node scripts/test-rubric-storage.ts
```

## 3. API Endpoints for Rubric Management

Now, let's create API endpoints for rubric management.

### Cursor.ai Prompt

```
Create Next.js API route handlers for rubric management with the following endpoints:
1. GET /api/rubrics - List all rubrics
2. GET /api/rubrics/:id - Get a specific rubric
3. POST /api/rubrics - Create a new rubric
4. PUT /api/rubrics/:id - Update an existing rubric
5. DELETE /api/rubrics/:id - Delete a rubric
6. PUT /api/rubrics/:id/default - Set a rubric as default

Include proper error handling and TypeScript typing.
```

### Implementation

First, let's create the rubrics API endpoint:

```typescript
// File: app/api/rubrics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getStorageProvider, initializeRubricSystem } from '../../../app/utils/storage';
import { Rubric, validateRubric } from '../../../app/types/rubric';
import { v4 as uuidv4 } from 'uuid';

// Initialize rubric system
let initPromise: Promise<void> | null = null;

// Function to lazily initialize the rubric system
const ensureRubricSystem = () => {
  if (!initPromise) {
    initPromise = initializeRubricSystem().catch(err => {
      console.error('Failed to initialize rubric system:', err);
      // Reset so we can try again next time
      initPromise = null;
    });
  }
  return initPromise;
};

// GET /api/rubrics - List all rubrics
export async function GET(request: NextRequest) {
  try {
    console.log('API: GET /api/rubrics - Listing all rubrics');
    
    // Ensure rubric system is initialized
    await ensureRubricSystem();
    
    // Initialize storage provider
    const storage = getStorageProvider();
    
    // Get all rubrics
    const rubrics = await storage.listRubrics();
    console.log(`API: Found ${rubrics.length} rubrics`);
    
    // Return the rubrics
    return NextResponse.json(rubrics);
  } catch (error) {
    console.error('API: Error listing rubrics:', error);
    return NextResponse.json(
      { error: 'Failed to list rubrics', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST /api/rubrics - Create a new rubric
export async function POST(request: NextRequest) {
  try {
    console.log('API: POST /api/rubrics - Creating new rubric');
    
    // Ensure rubric system is initialized
    await ensureRubricSystem();
    
    // Parse the request body
    const rubricData = await request.json();
    console.log('API: Received rubric data:', rubricData);
    
    // Set required fields if not provided
    const now = new Date().toISOString();
    const rubric: Rubric = {
      ...rubricData,
      id: rubricData.id || uuidv4(),
      createdAt: rubricData.createdAt || now,
      updatedAt: now
    };
    
    // Validate the rubric
    const validation = validateRubric(rubric);
    if (!validation.isValid) {
      console.error('API: Invalid rubric data:', validation.errors);
      return NextResponse.json(
        { error: 'Invalid rubric data', validationErrors: validation.errors },
        { status: 400 }
      );
    }
    
    // Initialize storage provider
    const storage = getStorageProvider();
    
    // Save the rubric
    await storage.saveRubric(rubric);
    console.log(`API: Rubric ${rubric.id} created successfully`);
    
    // Return the created rubric
    return NextResponse.json(rubric, { status: 201 });
  } catch (error) {
    console.error('API: Error creating rubric:', error);
    return NextResponse.json(
      { error: 'Failed to create rubric', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
```

Now, let's create the individual rubric API endpoint:

```typescript
// File: app/api/rubrics/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getStorageProvider } from '../../../../app/utils/storage';
import { validateRubric } from '../../../../app/types/rubric';

// GET /api/rubrics/:id - Get a specific rubric
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const rubricId = params.id;
    console.log(`API: GET /api/rubrics/${rubricId} - Retrieving rubric`);
    
    // Initialize storage provider
    const storage = getStorageProvider();
    
    // Get the rubric
    const rubric = await storage.getRubric(rubricId);
    
    if (!rubric) {
      console.log(`API: Rubric ${rubricId} not found`);
      return NextResponse.json(
        { error: 'Rubric not found' },
        { status: 404 }
      );
    }
    
    console.log(`API: Rubric ${rubricId} found`);
    return NextResponse.json(rubric);
  } catch (error) {
    console.error(`API: Error retrieving rubric:`, error);
    return NextResponse.json(
      { error: 'Failed to retrieve rubric', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// PUT /api/rubrics/:id - Update an existing rubric
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const rubricId = params.id;
    console.log(`API: PUT /api/rubrics/${rubricId} - Updating rubric`);
    
    // Parse the request body
    const rubricData = await request.json();
    console.log(`API: Received rubric data for update`);
    
    // Initialize storage provider
    const storage = getStorageProvider();
    
    // Check if the rubric exists
    const existingRubric = await storage.getRubric(rubricId);
    if (!existingRubric) {
      console.log(`API: Rubric ${rubricId} not found for update`);
      return NextResponse.json(
        { error: 'Rubric not found' },
        { status: 404 }
      );
    }
    
    // Update the rubric data
    const updatedRubric = {
      ...existingRubric,
      ...rubricData,
      id: rubricId, // Ensure ID doesn't change
      createdAt: existingRubric.createdAt, // Preserve original creation timestamp
      updatedAt: new Date().toISOString() // Update the updatedAt timestamp
    };
    
    // Validate the updated rubric
    const validation = validateRubric(updatedRubric);
    if (!validation.isValid) {
      console.error('API: Invalid rubric data for update:', validation.errors);
      return NextResponse.json(
        { error: 'Invalid rubric data', validationErrors: validation.errors },
        { status: 400 }
      );
    }
    
    // Save the updated rubric
    await storage.saveRubric(updatedRubric);
    console.log(`API: Rubric ${rubricId} updated successfully`);
    
    // Return the updated rubric
    return NextResponse.json(updatedRubric);
  } catch (error) {
    console.error(`API: Error updating rubric:`, error);
    return NextResponse.json(
      { error: 'Failed to update rubric', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE /api/rubrics/:id - Delete a rubric
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const rubricId = params.id;
    console.log(`API: DELETE /api/rubrics/${rubricId} - Deleting rubric`);
    
    // Initialize storage provider
    const storage = getStorageProvider();
    
    // Try to delete the rubric
    const deleted = await storage.deleteRubric(rubricId);
    
    if (!deleted) {
      console.log(`API: Rubric ${rubricId} not found for deletion`);
      return NextResponse.json(
        { error: 'Rubric not found or could not be deleted' },
        { status: 404 }
      );
    }
    
    console.log(`API: Rubric ${rubricId} deleted successfully`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`API: Error deleting rubric:`, error);
    return NextResponse.json(
      { error: 'Failed to delete rubric', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
```

Now, let's create the API endpoint for setting a rubric as default:

```typescript
// File: app/api/rubrics/[id]/default/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getStorageProvider } from '../../../../../app/utils/storage';

// PUT /api/rubrics/:id/default - Set a rubric as default
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const rubricId = params.id;
    console.log(`API: PUT /api/rubrics/${rubricId}/default - Setting as default rubric`);
    
    // Initialize storage provider
    const storage = getStorageProvider();
    
    // Set the rubric as default
    const success = await storage.setDefaultRubric(rubricId);
    
    if (!success) {
      console.log(`API: Failed to set rubric ${rubricId} as default (not found)`);
      return NextResponse.json(
        { error: 'Rubric not found or could not be set as default' },
        { status: 404 }
      );
    }
    
    // Get the updated rubric to return
    const rubric = await storage.getRubric(rubricId);
    
    console.log(`API: Rubric ${rubricId} set as default successfully`);
    return NextResponse.json({ success: true, rubric });
  } catch (error) {
    console.error(`API: Error setting default rubric:`, error);
    return NextResponse.json(
      { error: 'Failed to set default rubric', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
```

Finally, update the analyze-conversation API to support a rubricId parameter:

```typescript
// Update in app/api/analyze-conversation/route.ts
// Add to the request parsing section:

// Parse the request body
const body = await request.json();
console.log('API Route: Request body parsed', { 
  hasMarkdown: !!body.markdown, 
  markdownLength: body.markdown?.length,
  fileName: body.fileName,
  rubricId: body.rubricId, // Log the rubricId if provided
  requestId
});

const { markdown, fileName, rubricId } = body;

// Then, when creating the job:
const job = createJob(markdown, fileName);
job.rubricId = rubricId; // Add the rubricId to the job if provided
```

### Testing

Create a simple API client for the frontend:

```typescript
// File: app/utils/rubric-api.ts
import { Rubric } from '../types/rubric';

// API client for rubric management
export const RubricApi = {
  // List all rubrics
  listRubrics: async (): Promise<Rubric[]> => {
    const response = await fetch('/api/rubrics');
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `Error listing rubrics: ${response.status}`);
    }
    return response.json();
  },
  
  // Get a specific rubric
  getRubric: async (id: string): Promise<Rubric> => {
    const response = await fetch(`/api/rubrics/${id}`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `Error retrieving rubric: ${response.status}`);
    }
    return response.json();
  },
  
  // Create a new rubric
  createRubric: async (rubric: Omit<Rubric, 'id' | 'createdAt' | 'updatedAt'>): Promise<Rubric> => {
    const response = await fetch('/api/rubrics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(rubric)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `Error creating rubric: ${response.status}`);
    }
    
    return response.json();
  },
  
  // Update an existing rubric
  updateRubric: async (id: string, rubric: Partial<Rubric>): Promise<Rubric> => {
    const response = await fetch(`/api/rubrics/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(rubric)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `Error updating rubric: ${response.status}`);
    }
    
    return response.json();
  },
  
  // Delete a rubric
  deleteRubric: async (id: string): Promise<boolean> => {
    const response = await fetch(`/api/rubrics/${id}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `Error deleting rubric: ${response.status}`);
    }
    
    const result = await response.json();
    return result.success;
  },
  
  // Set a rubric as default
  setDefaultRubric: async (id: string): Promise<Rubric> => {
    const response = await fetch(`/api/rubrics/${id}/default`, {
      method: 'PUT'
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `Error setting default rubric: ${response.status}`);
    }
    
    const result = await response.json();
    return result.rubric;
  }
};
```

Create a test script to verify the API endpoints:

```typescript
// File: scripts/test-rubric-api.ts
import fetch from 'node-fetch';
import { createDefaultWineSalesRubric } from '../app/types/rubric';

const BASE_URL = 'http://localhost:3000/api';

async function testRubricAPI() {
  console.log('Testing rubric API...');
  
  try {
    // Step 1: Get all rubrics
    console.log('Step 1: Getting all rubrics');
    const listResponse = await fetch(`${BASE_URL}/rubrics`);
    if (!listResponse.ok) {
      throw new Error(`Failed to list rubrics: ${listResponse.status} ${listResponse.statusText}`);
    }
    const initialRubrics = await listResponse.json();
    console.log(`Initial rubrics: ${initialRubrics.length}`);
    
    // Step 2: Create a test rubric
    console.log('Step 2: Creating a test rubric');
    const testRubric = {
      ...createDefaultWineSalesRubric(),
      id: `test-rubric-${Date.now()}`,
      name: 'Test Rubric API',
      description: 'A test rubric for API testing',
      isDefault: false
    };
    
    const createResponse = await fetch(`${BASE_URL}/rubrics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testRubric)
    });
    
    if (!createResponse.ok) {
      throw new Error(`Failed to create rubric: ${createResponse.status} ${createResponse.statusText}`);
    }
    
    const createdRubric = await createResponse.json();
    console.log(`Created rubric: ${createdRubric.id} - ${createdRubric.name}`);
    
    // Step 3: Get the created rubric
    console.log('Step 3: Getting the created rubric');
    const getResponse = await fetch(`${BASE_URL}/rubrics/${createdRubric.id}`);
    
    if (!getResponse.ok) {
      throw new Error(`Failed to get rubric: ${getResponse.status} ${getResponse.statusText}`);
    }
    
    const retrievedRubric = await getResponse.json();
    console.log(`Retrieved rubric: ${retrievedRubric.name}`);
    
    // Step 4: Update the rubric
    console.log('Step 4: Updating the rubric');
    const updatedData = {
      ...retrievedRubric,
      name: `${retrievedRubric.name} - Updated`,
      description: `${retrievedRubric.description} - Updated`
    };
    
    const updateResponse = await fetch(`${BASE_URL}/rubrics/${createdRubric.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatedData)
    });
    
    if (!updateResponse.ok) {
      throw new Error(`Failed to update rubric: ${updateResponse.status} ${updateResponse.statusText}`);
    }
    
    const updatedRubric = await updateResponse.json();
    console.log(`Updated rubric: ${updatedRubric.name}`);
    
    // Step 5: Set as default
    console.log('Step 5: Setting rubric as default');
    const defaultResponse = await fetch(`${BASE_URL}/rubrics/${createdRubric.id}/default`, {
      method: 'PUT'
    });
    
    if (!defaultResponse.ok) {
      throw new Error(`Failed to set rubric as default: ${defaultResponse.status} ${defaultResponse.statusText}`);
    }
    
    const defaultResult = await defaultResponse.json();
    console.log(`Set as default result:`, defaultResult.success);
    
    // Step 6: Delete the rubric
    console.log('Step 6: Deleting the rubric');
    const deleteResponse = await fetch(`${BASE_URL}/rubrics/${createdRubric.id}`, {
      method: 'DELETE'
    });
    
    if (!deleteResponse.ok) {
      throw new Error(`Failed to delete rubric: ${deleteResponse.status} ${deleteResponse.statusText}`);
    }
    
    const deleteResult = await deleteResponse.json();
    console.log(`Delete result:`, deleteResult.success);
    
    // Step 7: Get all rubrics again
    console.log('Step 7: Getting all rubrics again');
    const finalListResponse = await fetch(`${BASE_URL}/rubrics`);
    
    if (!finalListResponse.ok) {
      throw new Error(`Failed to list rubrics: ${finalListResponse.status} ${finalListResponse.statusText}`);
    }
    
    const finalRubrics = await finalListResponse.json();
    console.log(`Final rubrics: ${finalRubrics.length}`);
    
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

// Make sure the local development server is running
console.log('Make sure your Next.js development server is running on http://localhost:3000');
console.log('Press any key to start the test...');
process.stdin.once('data', () => {
  testRubricAPI().catch(console.error);
});
```

Run this with your local development server running:

```bash
npx ts-node scripts/test-rubric-api.ts
```

## 4. Rubric List Component

Now, let's create a React component to display a list of rubrics. We'll be careful to use proper React hook syntax.

### Cursor.ai Prompt

```
Create a RubricList functional component using proper React hooks:
1. Use proper named imports for useState and useEffect
2. Include loading, error, and empty states
3. Provide options to view, edit, or delete each rubric
4. Allow setting a rubric as default
5. Use proper TypeScript typing
```

### Implementation 

First, let's create a reusable confirmation dialog component:

```typescript
// File: app/components/ConfirmationDialog.tsx
import { FC } from 'react';

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
}

const ConfirmationDialog: FC<ConfirmationDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  isDestructive = false
}) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-2">{title}</h3>
          <p className="text-gray-600 mb-6">{message}</p>
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              {cancelText}
            </button>
            
            <button
              onClick={onConfirm}
              className={`px-4 py-2 rounded-md text-white ${
                isDestructive ? 'bg-red-600 hover:bg-red-700' : 'bg-purple-600 hover:bg-purple-700'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationDialog;
```

Now, let's create the RubricList component:

```typescript
// File: app/components/rubrics/RubricList.tsx
'use client';

import { FC, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Rubric } from '../../types/rubric';
import { RubricApi } from '../../utils/rubric-api';
import ConfirmationDialog from '../ConfirmationDialog';
import Link from 'next/link';

interface RubricListProps {
  onView?: (rubric: Rubric) => void;
  onEdit?: (rubric: Rubric) => void;
  onSelect?: (rubric: Rubric) => void;
  selectionMode?: boolean;
  selectedRubricId?: string;
}

const RubricList: FC<RubricListProps> = ({
  onView,
  onEdit,
  onSelect,
  selectionMode = false,
  selectedRubricId
}) => {
  const [rubrics, setRubrics] = useState<Rubric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rubricToDelete, setRubricToDelete] = useState<Rubric | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  
  const loadRubrics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await RubricApi.listRubrics();
      setRubrics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rubrics');
      toast.error('Failed to load rubrics');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    loadRubrics();
  }, []);
  
  const handleSetDefault = async (rubric: Rubric) => {
    try {
      if (rubric.isDefault) {
        // Already the default, no need to do anything
        return;
      }
      
      await RubricApi.setDefaultRubric(rubric.id);
      toast.success(`${rubric.name} set as default rubric`);
      await loadRubrics(); // Reload to update UI
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to set default rubric');
    }
  };
  
  const handleDeleteClick = (rubric: Rubric) => {
    setRubricToDelete(rubric);
    setShowDeleteConfirmation(true);
  };
  
  const confirmDelete = async () => {
    if (!rubricToDelete) return;
    
    try {
      await RubricApi.deleteRubric(rubricToDelete.id);
      toast.success(`${rubricToDelete.name} deleted successfully`);
      setShowDeleteConfirmation(false);
      setRubricToDelete(null);
      await loadRubrics(); // Reload to update UI
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete rubric');
    }
  };
  
  const cancelDelete = () => {
    setShowDeleteConfirmation(false);
    setRubricToDelete(null);
  };
  
  if (loading) {
    return (
      <div className="p-4 flex justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-700"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-lg">
        <p className="font-semibold">Error loading rubrics</p>
        <p>{error}</p>
        <button
          onClick={loadRubrics}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }
  
  if (rubrics.length === 0) {
    return (
      <div className="p-6 bg-gray-50 rounded-lg text-center">
        <p className="text-gray-600">No rubrics found. Create a new rubric to get started.</p>
        <Link href="/rubrics/new">
          <button className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
            Create New Rubric
          </button>
        </Link>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {rubrics.map((rubric) => (
        <div
          key={rubric.id}
          className={`p-4 bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow ${
            selectionMode && selectedRubricId === rubric.id ? 'border-purple-500 ring-2 ring-purple-200' : ''
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center">
                <h3 className="text-lg font-semibold">{rubric.name}</h3>
                {rubric.isDefault && (
                  <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                    Default
                  </span>
                )}
              </div>
              <p className="text-gray-600 text-sm mt-1">{rubric.description}</p>
              <p className="text-gray-500 text-xs mt-2">
                {rubric.criteria.length} criteria | Created: {new Date(rubric.createdAt).toLocaleDateString()}
              </p>
            </div>
            
            <div className="flex space-x-2">
              {selectionMode ? (
                <button
                  onClick={() => onSelect && onSelect(rubric)}
                  className={`px-3 py-1 rounded text-sm ${
                    selectedRubricId === rubric.id 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                >
                  {selectedRubricId === rubric.id ? 'Selected' : 'Select'}
                </button>
              ) : (
                <>
                  {onView && (
                    <button
                      onClick={() => onView(rubric)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                      title="View details"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                  )}
                  
                  {onEdit && (
                    <button
                      onClick={() => onEdit(rubric)}
                      className="p-2 text-green-600 hover:bg-green-50 rounded"
                      title="Edit rubric"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  )}
                  
                  {!rubric.isDefault && (
                    <button
                      onClick={() => handleSetDefault(rubric)}
                      className="p-2 text-yellow-600 hover:bg-yellow-50 rounded"
                      title="Set as default"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    </button>
                  )}
                  
                  {!rubric.isDefault && (
                    <button
                      onClick={() => handleDeleteClick(rubric)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                      title="Delete rubric"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      ))}
      
      <ConfirmationDialog
        isOpen={showDeleteConfirmation}
        title="Delete Rubric"
        message={`Are you sure you want to delete "${rubricToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        isDestructive={true}
      />
    </div>
  );
};

export default RubricList;
```

### Testing

Create a simple test page to see how the RubricList component looks:

```typescript
// File: app/rubrics/page.tsx
'use client';

import { FC, useState } from 'react';
import RubricList from '../components/rubrics/RubricList';
import { Rubric } from '../types/rubric';

const RubricManagementPage: FC = () => {
  const [selectedRubric, setSelectedRubric] = useState<Rubric | null>(null);
  
  const handleView = (rubric: Rubric) => {
    setSelectedRubric(rubric);
    alert(`View rubric: ${rubric.name}`);
  };
  
  const handleEdit = (rubric: Rubric) => {
    alert(`Edit rubric: ${rubric.name}`);
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Rubric Management</h1>
      
      <div className="mb-6">
        <RubricList 
          onView={handleView} 
          onEdit={handleEdit} 
        />
      </div>
    </div>
  );
};

export default RubricManagementPage;
```

Run the application with:

```bash
npm run dev
```

Navigate to `/rubrics` to see the RubricList component in action.

## 5. Rubric Detail Component

The Rubric Detail component displays a comprehensive view of a single rubric, including its criteria, scoring levels, and performance levels. This component follows proper React hooks usage and provides a clean, organized display of the rubric information.

### Implementation

Create the RubricDetail component in `app/components/rubrics/RubricDetail.tsx`:

```typescript
'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Rubric } from '../../types/rubric';
import { RubricApi } from '../../utils/rubric-api';

interface RubricDetailProps {
  rubricId: string;
  onEdit?: (rubric: Rubric) => void;
  onBack?: () => void;
}

const RubricDetail: React.FC<RubricDetailProps> = ({
  rubricId,
  onEdit,
  onBack
}) => {
  const [rubric, setRubric] = useState<Rubric | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const loadRubric = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await RubricApi.getRubric(rubricId);
        setRubric(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load rubric');
      } finally {
        setLoading(false);
      }
    };
    
    loadRubric();
  }, [rubricId]);
  
  const handleSetDefault = async () => {
    if (!rubric || rubric.isDefault) return;
    
    try {
      await RubricApi.setDefaultRubric(rubric.id);
      toast.success(`${rubric.name} set as default rubric`);
      // Update the local state
      setRubric(prevRubric => prevRubric ? { ...prevRubric, isDefault: true } : null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to set default rubric');
    }
  };
  
  if (loading) {
    return (
      <div className="p-4 flex justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-700"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-lg">
        <p className="font-semibold">Error loading rubric</p>
        <p>{error}</p>
        <div className="mt-4 flex space-x-2">
          {onBack && (
            <button
              onClick={onBack}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Back
            </button>
          )}
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
  
  if (!rubric) {
    return (
      <div className="p-4 bg-yellow-50 text-yellow-700 rounded-lg">
        <p>Rubric not found</p>
        {onBack && (
          <button
            onClick={onBack}
            className="mt-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Back
          </button>
        )}
      </div>
    );
  }
  
  return (
    <div className="bg-white shadow-sm rounded-lg">
      <div className="p-6 border-b">
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center">
              <h2 className="text-2xl font-semibold">{rubric.name}</h2>
              {rubric.isDefault && (
                <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                  Default
                </span>
              )}
            </div>
            <p className="text-gray-600 mt-1">{rubric.description}</p>
          </div>
          
          <div className="flex space-x-2">
            {onBack && (
              <button
                onClick={onBack}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
              >
                Back
              </button>
            )}
            
            {onEdit && (
              <button
                onClick={() => onEdit(rubric)}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Edit
              </button>
            )}
            
            {!rubric.isDefault && (
              <button
                onClick={handleSetDefault}
                className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
              >
                Set as Default
              </button>
            )}
          </div>
        </div>
        
        <div className="mt-4 text-sm text-gray-500">
          <p>Created: {new Date(rubric.createdAt).toLocaleString()}</p>
          <p>Last Updated: {new Date(rubric.updatedAt).toLocaleString()}</p>
        </div>
      </div>
      
      <div className="p-6">
        <h3 className="text-xl font-semibold mb-4">Criteria</h3>
        <div className="space-y-6">
          {rubric.criteria.map((criterion, index) => (
            <div key={criterion.id} className="border-b pb-4 last:border-0">
              <div className="flex justify-between">
                <h4 className="text-lg font-medium">
                  {index + 1}. {criterion.name}
                </h4>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded">
                  Weight: {criterion.weight}%
                </span>
              </div>
              
              <p className="text-gray-600 mt-1 italic">{criterion.description}</p>
              
              <div className="mt-4 grid grid-cols-1 md:grid-cols-5 gap-2">
                {criterion.scoringLevels
                  .sort((a, b) => a.score - b.score)
                  .map((level) => (
                    <div key={level.score} className="bg-gray-50 p-3 rounded border">
                      <div className="font-semibold">Score {level.score}</div>
                      <div className="text-sm text-gray-600 mt-1">{level.description}</div>
                    </div>
                  ))
                }
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="p-6 border-t">
        <h3 className="text-xl font-semibold mb-4">Performance Levels</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {rubric.performanceLevels
            .sort((a, b) => a.minScore - b.minScore)
            .map((level) => (
              <div key={level.name} className="bg-gray-50 p-4 rounded border">
                <div className="font-semibold text-lg">{level.name}</div>
                <div className="text-gray-700 mt-1">{level.minScore}-{level.maxScore}%</div>
                <div className="text-sm text-gray-600 mt-2">{level.description}</div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
};

export default RubricDetail;
```

### Component Features

1. **Proper React Hooks Usage**:
   - Uses named imports for hooks (`useState`, `useEffect`)
   - Follows React hooks rules (only called at top level)
   - Proper dependency array in `useEffect`

2. **Loading State**:
   - Shows a loading spinner while fetching rubric data
   - Handles loading state transitions properly

3. **Error Handling**:
   - Displays user-friendly error messages
   - Provides retry and back options
   - Uses toast notifications for async operations

4. **Comprehensive Display**:
   - Shows rubric header with name, description, and default status
   - Displays creation and update timestamps
   - Lists all criteria with their weights and scoring levels
   - Shows performance levels with score ranges
   - Responsive grid layouts for better viewing on different screen sizes

5. **Interactive Features**:
   - Back button to return to list view
   - Edit button to modify the rubric
   - Set as default option for non-default rubrics

6. **Accessibility**:
   - Semantic HTML structure
   - Clear visual hierarchy
   - Proper button labeling

### Usage

The RubricDetail component can be used in any parent component like this:

```typescript
<RubricDetail
  rubricId="your-rubric-id"
  onEdit={(rubric) => {
    // Handle edit action
  }}
  onBack={() => {
    // Handle navigation back to list
  }}
/>
```

### Testing

You can test the component by:

1. Navigating to `/rubrics` and clicking on a rubric to view details
2. Verifying that all rubric information is displayed correctly
3. Testing the edit and set default functionality
4. Checking responsive layout on different screen sizes
5. Verifying error states by temporarily disabling the API

The component is now ready to use in the rubric management system.

## 6. Rubric Editor Component

Now, let's create a component for creating and editing rubrics. We'll ensure proper React hooks usage to avoid the persistent issues you've been facing.

### Cursor.ai Prompt

```
Create a RubricEditor functional component using only functional component patterns and named imports for hooks:
1. Use only named imports for React hooks (useState, useEffect, etc.)
2. Make it a functional component, not a class component
3. Handle both creation and editing modes
4. Include form validation with proper state management
5. Allow adding/removing criteria and performance levels
6. Include loading, error, and saving states
7. Use proper TypeScript typing
```

### Implementation

First, let's create the RubricEditor component with proper hooks usage:

```typescript
// File: app/components/rubrics/RubricEditor.tsx
'use client';

import { FC, useState, useEffect, FormEvent } from 'react';
import { toast } from 'react-hot-toast';
import { Criterion, PerformanceLevel, Rubric, validateRubric } from '../../types/rubric';
import { RubricApi } from '../../utils/rubric-api';
import { v4 as uuidv4 } from 'uuid';
import ConfirmationDialog from '../ConfirmationDialog';

interface RubricEditorProps {
  rubricId?: string; // If provided, we're editing an existing rubric
  onSave?: (rubric: Rubric) => void;
  onCancel?: () => void;
}

const RubricEditor: FC<RubricEditorProps> = ({
  rubricId,
  onSave,
  onCancel
}) => {
  const isEditing = !!rubricId;
  
  // Form state - using named useState hook
  const [formData, setFormData] = useState<Partial<Rubric>>({
    name: '',
    description: '',
    isDefault: false,
    criteria: [],
    performanceLevels: []
  });
  
  // UI state - using named useState hooks
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
  
  // Load existing rubric if editing - using named useEffect hook
  useEffect(() => {
    if (isEditing) {
      const loadRubric = async () => {
        try {
          setLoading(true);
          setError(null);
          const data = await RubricApi.getRubric(rubricId);
          setFormData(data);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to load rubric');
          toast.error('Failed to load rubric');
        } finally {
          setLoading(false);
        }
      };
      
      loadRubric();
    } else {
      // Initialize with default structure for new rubric
      setFormData({
        name: '',
        description: '',
        isDefault: false,
        criteria: [createEmptyCriterion()],
        performanceLevels: [
          { name: 'Exceptional', minScore: 90, maxScore: 100, description: 'Outstanding performance' },
          { name: 'Strong', minScore: 80, maxScore: 90, description: 'Very good performance' },
          { name: 'Proficient', minScore: 70, maxScore: 80, description: 'Solid performance' },
          { name: 'Developing', minScore: 60, maxScore: 70, description: 'Basic performance' },
          { name: 'Needs Improvement', minScore: 0, maxScore: 60, description: 'Requires substantial improvement' }
        ]
      });
    }
  }, [isEditing, rubricId]);
  
  // Helper function to create an empty criterion
  const createEmptyCriterion = (): Criterion => ({
    id: uuidv4(),
    name: '',
    description: '',
    weight: 10,
    scoringLevels: [
      { score: 1, description: '' },
      { score: 2, description: '' },
      { score: 3, description: '' },
      { score: 4, description: '' },
      { score: 5, description: '' }
    ]
  });
  
  // Helper function to update a specific criterion
  const updateCriterion = (index: number, updates: Partial<Criterion>) => {
    setFormData(prev => {
      const updatedCriteria = [...(prev.criteria || [])];
      updatedCriteria[index] = {
        ...updatedCriteria[index],
        ...updates
      };
      return {
        ...prev,
        criteria: updatedCriteria
      };
    });
  };
  
  // Helper function to add a new criterion
  const addCriterion = () => {
    setFormData(prev => ({
      ...prev,
      criteria: [...(prev.criteria || []), createEmptyCriterion()]
    }));
  };
  
  // Helper function to remove a criterion
  const removeCriterion = (index: number) => {
    setFormData(prev => {
      const updatedCriteria = [...(prev.criteria || [])];
      updatedCriteria.splice(index, 1);
      return {
        ...prev,
        criteria: updatedCriteria
      };
    });
  };
  
  // Helper function to update a scoring level for a criterion
  const updateScoringLevel = (criterionIndex: number, levelIndex: number, description: string) => {
    setFormData(prev => {
      const updatedCriteria = [...(prev.criteria || [])];
      const updatedLevels = [...(updatedCriteria[criterionIndex].scoringLevels || [])];
      updatedLevels[levelIndex] = {
        ...updatedLevels[levelIndex],
        description
      };
      updatedCriteria[criterionIndex] = {
        ...updatedCriteria[criterionIndex],
        scoringLevels: updatedLevels
      };
      return {
        ...prev,
        criteria: updatedCriteria
      };
    });
  };
  
  // Helper function to update a performance level
  const updatePerformanceLevel = (index: number, updates: Partial<PerformanceLevel>) => {
    setFormData(prev => {
      const updatedLevels = [...(prev.performanceLevels || [])];
      updatedLevels[index] = {
        ...updatedLevels[index],
        ...updates
      };
      return {
        ...prev,
        performanceLevels: updatedLevels
      };
    });
  };
  
  // Form submission handler
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Validate the form data
    if (!formData.name?.trim()) {
      setValidationErrors(['Rubric name is required']);
      toast.error('Please provide a rubric name');
      return;
    }
    
    // Ensure we have criteria
    if (!formData.criteria?.length) {
      setValidationErrors(['At least one criterion is required']);
      toast.error('Please add at least one criterion');
      return;
    }
    
    // Validate the full rubric
    const validationResult = validateRubric(formData as Rubric);
    if (!validationResult.isValid) {
      setValidationErrors(validationResult.errors);
      toast.error('Please fix the validation errors');
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      setValidationErrors([]);
      
      let savedRubric: Rubric;
      
      if (isEditing) {
        // Update existing rubric
        savedRubric = await RubricApi.updateRubric(rubricId, formData);
        toast.success('Rubric updated successfully');
      } else {
        // Create new rubric
        savedRubric = await RubricApi.createRubric(formData);
        toast.success('Rubric created successfully');
      }
      
      // Call the onSave callback if provided
      if (onSave) {
        onSave(savedRubric);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save rubric');
      toast.error('Failed to save rubric');
    } finally {
      setSaving(false);
    }
  };
  
  // Cancel handler
  const handleCancel = () => {
    // Check if there are unsaved changes
    if (formData.name || (formData.criteria && formData.criteria.length > 0)) {
      setShowCancelConfirmation(true);
    } else {
      if (onCancel) onCancel();
    }
  };
  
  // Confirm cancel
  const confirmCancel = () => {
    setShowCancelConfirmation(false);
    if (onCancel) onCancel();
  };
  
  if (loading) {
    return (
      <div className="p-4 flex justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-700"></div>
      </div>
    );
  }
  
  return (
    <div className="bg-white shadow rounded-lg">
      <form onSubmit={handleSubmit}>
        <div className="p-6 border-b">
          <h2 className="text-2xl font-semibold mb-4">
            {isEditing ? 'Edit Rubric' : 'Create New Rubric'}
          </h2>
          
          {error && (
            <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">
              {error}
            </div>
          )}
          
          {validationErrors.length > 0 && (
            <div className="mb-4 p-4 bg-yellow-50 text-yellow-700 rounded-lg">
              <p className="font-semibold mb-2">Please fix the following errors:</p>
              <ul className="list-disc pl-5">
                {validationErrors.map((err, index) => (
                  <li key={index}>{err}</li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="grid grid-cols-1 gap-6">
            {/* Basic Information */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rubric Name*
              </label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description || ''}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                rows={3}
              />
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isDefault || false}
                onChange={e => setFormData(prev => ({ ...prev, isDefault: e.target.checked }))}
                id="isDefault"
                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
              />
              <label htmlFor="isDefault" className="ml-2 block text-sm text-gray-700">
                Set as default rubric
              </label>
            </div>
          </div>
        </div>
        
        {/* Criteria Section */}
        <div className="p-6 border-b">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">Evaluation Criteria</h3>
            <button
              type="button"
              onClick={addCriterion}
              className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              Add Criterion
            </button>
          </div>
          
          {formData.criteria && formData.criteria.length > 0 ? (
            <div className="space-y-8">
              {formData.criteria.map((criterion, index) => (
                <div key={criterion.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-lg font-medium">Criterion {index + 1}</h4>
                    <button
                      type="button"
                      onClick={() => removeCriterion(index)}
                      className="text-red-600 hover:text-red-800"
                      disabled={formData.criteria && formData.criteria.length <= 1}
                      title={formData.criteria && formData.criteria.length <= 1 ? 'Cannot remove last criterion' : 'Remove criterion'}
                    >
                      Remove
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Name*
                      </label>
                      <input
                        type="text"
                        value={criterion.name}
                        onChange={e => updateCriterion(index, { name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Weight (%)*
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={criterion.weight}
                        onChange={e => updateCriterion(index, { weight: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={criterion.description}
                      onChange={e => updateCriterion(index, { description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      rows={2}
                    />
                  </div>
                  
                  <div>
                    <h5 className="text-sm font-semibold mb-2">Scoring Levels</h5>
                    <div className="space-y-3">
                      {criterion.scoringLevels.map((level, levelIndex) => (
                        <div key={levelIndex} className="flex items-center">
                          <div className="w-16 flex-shrink-0">
                            <span className="font-medium">Score {level.score}:</span>
                          </div>
                          <input
                            type="text"
                            value={level.description}
                            onChange={e => updateScoringLevel(index, levelIndex, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder={`Description for score ${level.score}`}
                            required
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 italic">No criteria added yet. Click "Add Criterion" to start.</p>
          )}
        </div>
        
        {/* Performance Levels Section */}
        <div className="p-6 border-b">
          <h3 className="text-xl font-semibold mb-4">Performance Levels</h3>
          
          {formData.performanceLevels && formData.performanceLevels.length > 0 ? (
            <div className="space-y-4">
              {formData.performanceLevels.map((level, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Level Name*
                      </label>
                      <input
                        type="text"
                        value={level.name}
                        onChange={e => updatePerformanceLevel(index, { name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Min Score (%)*
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={level.minScore}
                        onChange={e => updatePerformanceLevel(index, { minScore: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Score (%)*
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={level.maxScore}
                        onChange={e => updatePerformanceLevel(index, { maxScore: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={level.description}
                      onChange={e => updatePerformanceLevel(index, { description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      rows={2}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 italic">No performance levels defined.</p>
          )}
        </div>
        
        {/* Action Buttons */}
        <div className="p-6 flex justify-end space-x-3">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            disabled={saving}
          >
            Cancel
          </button>
          
          <button
            type="submit"
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center"
            disabled={saving}
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              'Save Rubric'
            )}
          </button>
        </div>
      </form>
      
      <ConfirmationDialog
        isOpen={showCancelConfirmation}
        title="Discard Changes"
        message="Are you sure you want to discard your changes? This action cannot be undone."
        confirmText="Discard"
        cancelText="Continue Editing"
        onConfirm={confirmCancel}
        onCancel={() => setShowCancelConfirmation(false)}
        isDestructive={true}
      />
    </div>
  );
};

export default RubricEditor;
```

### Testing

Create a simple test page to ensure the RubricEditor works correctly:

```typescript
// File: app/rubrics/new/page.tsx
'use client';

import { FC, useState } from 'react';
import { useRouter } from 'next/navigation';
import RubricEditor from '../../components/rubrics/RubricEditor';
import { Rubric } from '../../types/rubric';

const NewRubricPage: FC = () => {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const handleSave = (rubric: Rubric) => {
    console.log('New rubric saved:', rubric);
    router.push('/rubrics');
  };
  
  const handleCancel = () => {
    router.push('/rubrics');
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Create New Rubric</h1>
      
      {errorMessage && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg">
          {errorMessage}
        </div>
      )}
      
      <RubricEditor 
        onSave={handleSave} 
        onCancel={handleCancel}
      />
    </div>
  );
};

export default NewRubricPage;
```

Create a page for editing existing rubrics:

```typescript
// File: app/rubrics/edit/[id]/page.tsx
'use client';

import { FC, useState } from 'react';
import { useRouter } from 'next/navigation';
import RubricEditor from '../../../components/rubrics/RubricEditor';
import { Rubric } from '../../../types/rubric';

interface EditRubricPageProps {
  params: {
    id: string;
  };
}

const EditRubricPage: FC<EditRubricPageProps> = ({ params }) => {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const rubricId = params.id;
  
  const handleSave = (rubric: Rubric) => {
    console.log('Rubric updated:', rubric);
    router.push('/rubrics');
  };
  
  const handleCancel = () => {
    router.push('/rubrics');
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Edit Rubric</h1>
      
      {errorMessage && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg">
          {errorMessage}
        </div>
      )}
      
      <RubricEditor 
        rubricId={rubricId}
        onSave={handleSave} 
        onCancel={handleCancel}
      />
    </div>
  );
};

export default EditRubricPage;
```

Update the RubricList component to add navigation to edit and create pages:

```typescript
// Update in RubricList.tsx - modify the onEdit handler
const RubricList: FC<RubricListProps> = ({
  onView,
  onEdit,
  onSelect,
  selectionMode = false,
  selectedRubricId
}) => {
  // ... existing code ...
  
  // Replace the edit button with this:
  {onEdit ? (
    <button
      onClick={() => onEdit(rubric)}
      className="p-2 text-green-600 hover:bg-green-50 rounded"
      title="Edit rubric"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    </button>
  ) : (
    <Link href={`/rubrics/edit/${rubric.id}`}>
      <button
        className="p-2 text-green-600 hover:bg-green-50 rounded"
        title="Edit rubric"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </button>
    </Link>
  )}
  
  // ... rest of the component ...
};
```

Now, update the rubrics page to include a "Create New" button:

```typescript
// Update in app/rubrics/page.tsx
'use client';

import { FC, useState } from 'react';
import Link from 'next/link';
import RubricList from '../components/rubrics/RubricList';
import RubricDetail from '../components/rubrics/RubricDetail';
import { Rubric } from '../types/rubric';

const RubricManagementPage: FC = () => {
  const [selectedRubric, setSelectedRubric] = useState<Rubric | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  
  const handleView = (rubric: Rubric) => {
    setSelectedRubric(rubric);
    setViewMode('detail');
  };
  
  const handleBack = () => {
    setViewMode('list');
    setSelectedRubric(null);
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Rubric Management</h1>
        
        {viewMode === 'list' && (
          <Link href="/rubrics/new">
            <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
              Create New Rubric
            </button>
          </Link>
        )}
      </div>
      
      {viewMode === 'list' ? (
        <RubricList 
          onView={handleView}
        />
      ) : (
        selectedRubric && (
          <RubricDetail 
            rubricId={selectedRubric.id} 
            onBack={handleBack}
          />
        )
      )}
    </div>
  );
};

export default RubricManagementPage;
```

Run the application and test navigation between list, view, create, and edit pages:

```bash
npm run dev
```

Navigate to `/rubrics` and test:
1. Viewing the list of rubrics
2. Creating a new rubric
3. Viewing a rubric's details
4. Editing an existing rubric

Debug any issues by checking the browser console for errors. Verify that all hooks are used correctly and ensure that you're seeing the expected components rendered.

## 7. Incorporating Rubric Selection in Markdown Importer

The Markdown Importer component has been updated to include rubric selection functionality, allowing users to choose which rubric to use when evaluating a conversation. This enhancement ensures that evaluations can be performed using different criteria sets as needed.

### Key Features Added

1. **Rubric Selection Dropdown**:
   - Displays a list of all available rubrics
   - Automatically selects the default rubric if available
   - Shows loading state while fetching rubrics
   - Provides fallback UI when no rubrics are found

2. **State Management**:
   ```typescript
   const [rubrics, setRubrics] = useState<Rubric[]>([]);
   const [selectedRubricId, setSelectedRubricId] = useState<string>('');
   const [loadingRubrics, setLoadingRubrics] = useState<boolean>(false);
   ```

3. **Automatic Rubric Loading**:
   ```typescript
   useEffect(() => {
     const loadRubrics = async () => {
       try {
         setLoadingRubrics(true);
         const data = await RubricApi.listRubrics();
         setRubrics(data);
         
         // Select the default rubric if available
         const defaultRubric = data.find(r => r.isDefault);
         if (defaultRubric) {
           setSelectedRubricId(defaultRubric.id);
         } else if (data.length > 0) {
           // Otherwise select the first one
           setSelectedRubricId(data[0].id);
         }
       } catch (err) {
         console.error('Error loading rubrics:', err);
         toast.error('Failed to load rubrics. Using default evaluation criteria.');
       } finally {
         setLoadingRubrics(false);
       }
     };
     
     loadRubrics();
   }, []);
   ```

4. **Integration with Analysis Process**:
   - The selected rubric ID is included in both direct and background evaluation requests:
   ```typescript
   const response = await fetch('/api/analyze-conversation', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
     },
     body: JSON.stringify({
       markdown: markdown,
       fileName: fileName,
       directEvaluation: true,
       rubricId: selectedRubricId || undefined
     }),
   });
   ```

5. **Enhanced UI Components**:
   ```tsx
   <div className="mb-6">
     <label className="block text-sm font-medium text-gray-700 mb-2">
       Select Evaluation Rubric
     </label>
     {loadingRubrics ? (
       <div className="flex items-center text-gray-500">
         <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500 mr-2"></div>
         Loading rubrics...
       </div>
     ) : rubrics.length > 0 ? (
       <select
         value={selectedRubricId}
         onChange={(e) => setSelectedRubricId(e.target.value)}
         className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
         disabled={isAnalyzing}
       >
         {rubrics.map((rubric) => (
           <option key={rubric.id} value={rubric.id}>
             {rubric.name}{rubric.isDefault ? ' (Default)' : ''}
           </option>
         ))}
       </select>
     ) : (
       <div className="text-yellow-600">
         No rubrics found. Using default evaluation criteria.
       </div>
     )}
   </div>
   ```

### User Experience Improvements

1. **Loading States**:
   - The file input and analyze button are disabled while rubrics are loading
   - A loading spinner is shown while fetching rubrics
   - Clear feedback when no rubrics are available

2. **Error Handling**:
   - Graceful fallback to default criteria if rubric loading fails
   - User-friendly error messages via toast notifications
   - Proper error state management in the UI

3. **Default Selection**:
   - Automatically selects the default rubric when available
   - Falls back to the first available rubric if no default is set
   - Clear indication of which rubric is the default in the dropdown

4. **Visual Feedback**:
   - Disabled states during loading and analysis
   - Clear labeling and instructions
   - Consistent styling with the rest of the application

### Testing

To test the rubric selection functionality:

1. **Basic Functionality**:
   ```typescript
   // Verify rubrics load correctly
   const rubrics = await RubricApi.listRubrics();
   expect(rubrics.length).toBeGreaterThan(0);
   
   // Verify default selection
   const defaultRubric = rubrics.find(r => r.isDefault);
   expect(defaultRubric).toBeDefined();
   ```

2. **Analysis Integration**:
   ```typescript
   // Verify rubric ID is included in analysis request
   const response = await fetch('/api/analyze-conversation', {
     method: 'POST',
     body: JSON.stringify({
       markdown: 'test conversation',
       fileName: 'test.md',
       rubricId: 'test-rubric-id'
     })
   });
   expect(response.ok).toBe(true);
   ```

3. **Error Handling**:
   ```typescript
   // Verify graceful handling of missing rubrics
   const response = await fetch('/api/analyze-conversation', {
     method: 'POST',
     body: JSON.stringify({
       markdown: 'test conversation',
       fileName: 'test.md',
       rubricId: 'non-existent-id'
     })
   });
   expect(response.status).toBe(404);
   ```

### Usage Example

```typescript
// In your page component
import MarkdownImporter from '../components/MarkdownImporter';

export default function AnalyzePage() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalysisComplete = (data: EvaluationData) => {
    console.log('Analysis complete with rubric:', data.rubricId);
    // Handle the evaluation results...
  };

  return (
    <MarkdownImporter
      onAnalysisComplete={handleAnalysisComplete}
      isAnalyzing={isAnalyzing}
      setIsAnalyzing={setIsAnalyzing}
    />
  );
}
```

This implementation ensures that users can easily select different rubrics for their evaluations while maintaining a smooth and intuitive user experience. The component handles loading states, errors, and edge cases appropriately, making it robust and user-friendly.

## 8. Updating the Evaluation Process

Now, let's update the evaluation process to use the selected rubric.

### Cursor.ai Prompt

```
Update the analyze-conversation function and Claude API integration to use the selected rubric:
1. Modify the analyze-conversation API route to accept and pass rubricId
2. Update the Claude API integration to include rubric criteria in the prompt
3. Ensure proper error handling if a rubric isn't found
4. Update the evaluation results to reference the rubric used
```

### Implementation

First, let's update the analyze-conversation API endpoint:

```typescript
// File: netlify/functions/analyze-conversation.ts (update)
// Find where you parse the request body and add rubricId:

// Parse the request body
const { markdown, fileName, directEvaluation, rubricId } = JSON.parse(event.body || '{}');
console.log('API Route: Request body parsed', { 
  hasMarkdown: !!markdown, 
  markdownLength: markdown?.length,
  fileName,
  directEvaluation,
  rubricId, // Log the rubricId
  requestId
});

// Then, when creating the job:
const job = createJob(markdown, fileName);
job.rubricId = rubricId; // Add the rubricId to the job
```

Next, update the background function to load and use the selected rubric:

```typescript
// File: netlify/functions/analyze-conversation-background.ts (update)

// Add this function to load a rubric
async function loadRubric(rubricId?: string): Promise<Rubric | null> {
  try {
    console.log(`Loading rubric: ${rubricId || 'default'}`);
    const storage = getStorageProvider();
    
    if (rubricId) {
      // Load the specific rubric
      const rubric = await storage.getRubric(rubricId);
      if (rubric) {
        console.log(`Found rubric: ${rubric.name}`);
        return rubric;
      }
      console.log(`Rubric not found: ${rubricId}, falling back to default`);
    }
    
    // Fall back to default rubric
    const defaultRubric = await storage.getDefaultRubric();
    if (defaultRubric) {
      console.log(`Using default rubric: ${defaultRubric.name}`);
      return defaultRubric;
    }
    
    console.log('No default rubric found, will use embedded default');
    return null;
  } catch (error) {
    console.error('Error loading rubric:', error);
    return null;
  }
}

// Update the analyzeConversationWithClaude function to accept a rubric
async function analyzeConversationWithClaude(
  conversation: string,
  staffName: string,
  date: string,
  rubricId?: string
): Promise<EvaluationResult> {
  console.log('Starting conversation analysis with Claude');
  
  // Validate environment variables
  const envCheck = validateEnvironment();
  if (!envCheck.isValid) {
    console.error('Missing required environment variables:', envCheck.missingVars);
    throw new Error(`Missing required environment variables: ${envCheck.missingVars.join(', ')}`);
  }
  
  // Check API key
  const apiKey = getClaudeApiKey();
  if (!apiKey) {
    throw new Error('Claude API key is missing. Please set CLAUDE_API_KEY in your environment variables.');
  }
  
  // First try to load the specified rubric or fall back to default
  const rubric = await loadRubric(rubricId);
  
  // If no rubric is found, load the embedded rubric
  const rubricContent = rubric 
    ? JSON.stringify(rubric, null, 2) 
    : await loadRubric(); // This will load the default embedded rubric
  
  // Prepare the prompt with the rubric
  const prompt = `You are an expert wine sales trainer evaluating a conversation between a winery staff member and a guest.

IMPORTANT INSTRUCTIONS:
1. Use the EXACT criteria and scoring guidelines from the provided rubric
2. For each criterion, provide a score (1-5) and detailed justification
3. Calculate the weighted score for each criterion using the weights specified
4. Determine the overall performance level based on the total weighted score
5. Provide specific examples from the conversation to support your evaluation

RUBRIC TO USE:
${rubricContent}

CONVERSATION TO EVALUATE:
${conversation}

STAFF MEMBER: ${staffName}
DATE: ${date}

Please provide your evaluation in the following JSON format:
{
  "staffName": "${staffName}",
  "date": "${date}",
  "overallScore": number,
  "performanceLevel": "Exceptional" | "Strong" | "Proficient" | "Developing" | "Needs Improvement",
  "criteriaScores": [
    {
      "criterion": string,
      "score": number,
      "weight": number,
      "weightedScore": number,
      "notes": string
    }
  ],
  "strengths": string[],
  "areasForImprovement": string[],
  "keyRecommendations": string[],
  "rubricId": "${rubricId || 'default'}"
}`;

  try {
    // Enforce rate limiting before making the API call
    await enforceRateLimit();
    
    console.log('Sending request to Claude API with rubric:', rubricId || 'default');
    const response = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 4000,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });
    
    console.log('Received response from Claude API');
    const result = response.content[0].text;
    console.log('Processing Claude response');
    
    try {
      // First try to parse the response directly
      let evaluation;
      try {
        evaluation = JSON.parse(result);
      } catch (parseError) {
        // If direct parsing fails, try to extract JSON from the response
        const jsonString = processCloudeResponse(result);
        evaluation = JSON.parse(jsonString);
      }
      
      // Add the rubricId to the evaluation data
      evaluation.rubricId = rubricId || 'default';
      
      // Validate and repair the evaluation data
      const validatedData = validateAndRepairEvaluationData(evaluation, conversation);
      console.log('Successfully processed evaluation result with rubric:', rubricId || 'default');
      return validatedData;
    } catch (error) {
      console.error('Error processing Claude response:', error);
      throw new Error('Failed to process Claude response');
    }
  } catch (error) {
    console.error('Error calling Claude API:', error);
    if (error instanceof Error) {
      // Check for specific error types
      if (error.message.includes('404') || error.message.includes('not_found_error')) {
        throw new Error('Claude API model not found. Please check your API key and model name.');
      } else if (error.message.includes('401') || error.message.includes('unauthorized')) {
        throw new Error('Unauthorized access to Claude API. Please check your API key.');
      } else if (error.message.includes('429') || error.message.includes('rate_limit')) {
        throw new Error('Rate limit exceeded for Claude API. Please try again later.');
      }
    }
    throw error;
  }
}

// Update the handler function to pass the rubricId
export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  console.log(`[${new Date().toISOString()}] Background function: Received request`);
  
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    console.log(`[${new Date().toISOString()}] Background function: Invalid HTTP method: ${event.httpMethod}`);
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }
  
  try {
    // Parse the request body
    const { jobId, conversation, staffName, date, rubricId } = JSON.parse(event.body || '{}');
    
    // Validate required fields
    if (!jobId) {
      console.log(`[${new Date().toISOString()}] Background function: Missing jobId in request`);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing jobId in request' })
      };
    }
    
    if (!conversation) {
      console.log(`[${new Date().toISOString()}] Background function: Missing conversation in request`);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing conversation in request' })
      };
    }
    
    // Get the job from storage
    const job = await storage.getJob(jobId);
    if (!job) {
      console.log(`[${new Date().toISOString()}] Background function: Job ${jobId} not found`);
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Job not found' })
      };
    }
    
    // Update job status to processing
    job.status = 'processing';
    job.updatedAt = new Date().toISOString();
    await storage.saveJob(job);
    console.log(`[${new Date().toISOString()}] Background function: Updated job ${jobId} status to processing`);
    
    // Analyze the conversation with Claude, passing the rubricId
    const evaluationResult = await analyzeConversationWithClaude(
      conversation,
      staffName,
      date,
      rubricId || job.rubricId // Use the rubricId from the request or job
    );
    
    // Update job with the evaluation result
    job.status = 'completed';
    job.result = evaluationResult;
    job.updatedAt = new Date().toISOString();
    await storage.saveJob(job);
    console.log(`[${new Date().toISOString()}] Background function: Updated job ${jobId} status to completed`);
    
    // Return success response
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: 'Job processed successfully',
        jobId: job.id
      })
    };
  } catch (error: unknown) {
    console.error(`[${new Date().toISOString()}] Background function: Error processing request:`, error);
    
    // If we have a job ID, update the job status to failed
    try {
      const { jobId } = JSON.parse(event.body || '{}');
      if (jobId) {
        const job = await storage.getJob(jobId);
        if (job) {
          job.status = 'failed';
          job.error = error instanceof Error ? error.message : 'Unknown error';
          job.errorDetails = {
            type: error instanceof Error ? error.name : 'UnknownError',
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          };
          job.updatedAt = new Date().toISOString();
          await storage.saveJob(job);
          console.log(`[${new Date().toISOString()}] Background function: Updated job ${jobId} status to failed`);
        }
      }
    } catch (updateError) {
      console.error(`[${new Date().toISOString()}] Background function: Error updating job status:`, updateError);
    }
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
```

### Testing

Test the updated evaluation process by:

1. Start the development server: `npm run dev`
2. Create a new custom rubric or modify an existing one
3. Upload a conversation markdown and select your custom rubric
4. Analyze the conversation and verify that the evaluation uses the correct criteria

## 9. Integration Testing

Let's create a comprehensive integration test to verify the entire rubric management and evaluation flow works correctly.

### Cursor.ai Prompt

```
Create an integration test script that verifies the full rubric management and evaluation workflow:
1. Create a custom rubric with specific criteria
2. Fetch and verify the rubric was saved correctly
3. Upload a conversation markdown and analyze it with the custom rubric
4. Verify the evaluation results match the expected criteria
5. Delete the test rubric when done
```

### Implementation

Create a new integration test script:

```typescript
// File: scripts/integration-test.ts
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';
import { createDefaultWineSalesRubric, Rubric } from '../app/types/rubric';

const BASE_URL = 'http://localhost:3000/api';
const TEST_CONVERSATION_PATH = path.join(__dirname, '..', 'public', 'data', 'sample_conversation.md');

async function runIntegrationTest() {
  console.log('Starting integration test for rubric management and evaluation flow');
  
  try {
    // Step 1: Create a test rubric
    const testRubricId = `test-rubric-${uuidv4().substring(0, 8)}`;
    console.log(`Step 1: Creating test rubric with ID ${testRubricId}`);
    
    const baseRubric = createDefaultWineSalesRubric();
    const testRubric: Rubric = {
      ...baseRubric,
      id: testRubricId,
      name: 'Integration Test Rubric',
      description: 'A rubric for testing the integration flow',
      isDefault: false,
      // Modify criteria to be distinctly different
      criteria: baseRubric.criteria.map(criterion => ({
        ...criterion,
        id: `${testRubricId}-${criterion.id.split('-').pop()}`,
        description: `Test criterion for ${criterion.name}`
      }))
    };
    
    const createResponse = await fetch(`${BASE_URL}/rubrics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testRubric)
    });
    
    if (!createResponse.ok) {
      throw new Error(`Failed to create test rubric: ${createResponse.status} ${createResponse.statusText}`);
    }
    
    const createdRubric = await createResponse.json();
    console.log(`Test rubric created: ${createdRubric.name}`);
    
    // Step 2: Verify the rubric was saved correctly
    console.log('Step 2: Verifying rubric was saved correctly');
    const getRubricResponse = await fetch(`${BASE_URL}/rubrics/${testRubricId}`);
    
    if (!getRubricResponse.ok) {
      throw new Error(`Failed to fetch test rubric: ${getRubricResponse.status} ${getRubricResponse.statusText}`);
    }
    
    const fetchedRubric = await getRubricResponse.json();
    console.log(`Verified rubric: ${fetchedRubric.name}`);
    
    // Check that all fields match what we expect
    const fieldsMatch = 
      fetchedRubric.id === testRubricId &&
      fetchedRubric.name === 'Integration Test Rubric' &&
      fetchedRubric.criteria.length === testRubric.criteria.length;
    
    if (!fieldsMatch) {
      throw new Error('Fetched rubric does not match the created rubric');
    }
    
    // Step 3: Upload and analyze a conversation with the custom rubric
    console.log('Step 3: Analyzing conversation with custom rubric');
    
    // Read the test conversation markdown
    if (!fs.existsSync(TEST_CONVERSATION_PATH)) {
      throw new Error(`Test conversation file not found at ${TEST_CONVERSATION_PATH}`);
    }
    
    const conversationMarkdown = fs.readFileSync(TEST_CONVERSATION_PATH, 'utf8');
    
    // Submit the conversation for analysis with our custom rubric
    const analyzeResponse = await fetch(`${BASE_URL}/analyze-conversation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        markdown: conversationMarkdown,
        fileName: 'test-conversation.md',
        directEvaluation: true,
        rubricId: testRubricId
      })
    });
    
    if (!analyzeResponse.ok) {
      throw new Error(`Failed to analyze conversation: ${analyzeResponse.status} ${analyzeResponse.statusText}`);
    }
    
    const analysisResult = await analyzeResponse.json();
    
    if (!analysisResult.result) {
      throw new Error('No analysis result returned');
    }
    
    // Step 4: Verify the evaluation results match the expected criteria
    console.log('Step 4: Verifying evaluation results use the custom rubric');
    
    const evaluation = analysisResult.result;
    
    // Check that the rubricId is correct
    if (evaluation.rubricId !== testRubricId) {
      throw new Error(`Evaluation used wrong rubric: ${evaluation.rubricId} instead of ${testRubricId}`);
    }
    
    // Check that the criteria match our custom rubric
    const criteriaMatch = evaluation.criteriaScores.every(score => {
      const matchingCriterion = testRubric.criteria.find(c => c.name === score.criterion);
      return !!matchingCriterion;
    });
    
    if (!criteriaMatch) {
      throw new Error('Evaluation criteria do not match the custom rubric');
    }
    
    console.log('Evaluation successfully used custom rubric!');
    console.log(`Staff: ${evaluation.staffName}`);
    console.log(`Score: ${evaluation.overallScore}%`);
    console.log(`Performance Level: ${evaluation.performanceLevel}`);
    
    // Step 5: Delete the test rubric
    console.log('Step 5: Cleaning up - deleting test rubric');
    const deleteResponse = await fetch(`${BASE_URL}/rubrics/${testRubricId}`, {
      method: 'DELETE'
    });
    
    if (!deleteResponse.ok) {
      throw new Error(`Failed to delete test rubric: ${deleteResponse.status} ${deleteResponse.statusText}`);
    }
    
    const deleteResult = await deleteResponse.json();
    
    if (!deleteResult.success) {
      throw new Error('Rubric deletion reported failure');
    }
    
    console.log('Test rubric deleted successfully');
    
    // Verify deletion
    const checkResponse = await fetch(`${BASE_URL}/rubrics/${testRubricId}`);
    if (checkResponse.status !== 404) {
      throw new Error(`Expected 404 after deletion, got ${checkResponse.status}`);
    }
    
    console.log('Integration test completed successfully!');
    
  } catch (error) {
    console.error('Integration test failed:', error);
    process.exit(1);
  }
}

// Make sure the local development server is running
console.log('Make sure your Next.js development server is running on http://localhost:3000');
console.log('Press any key to start the integration test...');
process.stdin.once('data', () => {
  runIntegrationTest().catch(console.error);
});
```

### Testing

Run the integration test with:

```bash
npx ts-node scripts/integration-test.ts
```

Ensure your local development server is running first. The test will:

1. Create a custom test rubric
2. Verify the rubric was saved correctly
3. Analyze a conversation using the custom rubric
4. Verify the evaluation correctly used the custom criteria
5. Clean up by deleting the test rubric

If the test completes successfully, all parts of the rubric management system are working correctly.

## 10. Deployment Configuration

Finally, let's update the deployment configuration to ensure the rubric management system works correctly in production.

### Cursor.ai Prompt

```
Update the deployment configuration for Render to support the rubric management system:
1. Ensure persistent storage for rubrics
2. Update environment variables
3. Add any necessary build commands
4. Document the deployment process
```

### Implementation

Update the `render.yaml` file to include persistent storage for rubrics:

```yaml
# File: render.yaml (updated)
services:
  - type: web
    name: wine-sales-evaluator
    env: node
    buildCommand: npm ci --include=dev && npm run build && chmod +x render-setup.sh
    startCommand: ./render-setup.sh && node server.js
    healthCheckPath: /api/health
    # Define a persistent disk for storage
    disk:
      name: wine-evaluator-data
      mountPath: /var/data
      sizeGB: 1
    envVars:
      - key: NODE_ENV
        value: production
      - key: RENDER
        value: "true"
      - key: CLAUDE_API_KEY
        sync: false # This will be set via Render dashboard
      - key: RENDER_STORAGE_DIR
        value: /var/data/storage
      - key: JOB_STORAGE_TYPE
        value: file
      - key: JOB_MAX_AGE
        value: "86400000"
      - key: NEXT_PUBLIC_USE_DIRECT_EVALUATION
        value: "false"
      - key: PORT
        value: "10000"
    # Auto-deploy settings
    autoDeploy: true
```

Now, update the `render-setup.sh` script to create directories for rubrics:

```bash
#!/bin/bash

# Define environment variables
STORAGE_DIR=${RENDER_STORAGE_DIR:-/var/data/storage}
JOBS_DIR=${STORAGE_DIR}/jobs
RUBRICS_DIR=${STORAGE_DIR}/rubrics

echo "========== Render Setup Script =========="
echo "Starting setup for Wine Sales Evaluator"
echo "Current user: $(whoami)"
echo "Current directory: $(pwd)"
echo "Storage directory: $STORAGE_DIR"
echo "Jobs directory: $JOBS_DIR"
echo "Rubrics directory: $RUBRICS_DIR"

# Create storage directory if it doesn't exist
if [ ! -d "$STORAGE_DIR" ]; then
  echo "Creating storage directory: $STORAGE_DIR"
  mkdir -p "$STORAGE_DIR"
  if [ $? -ne 0 ]; then
    echo "ERROR: Failed to create storage directory: $STORAGE_DIR"
    echo "Trying alternative location..."
    STORAGE_DIR="/tmp/storage"
    JOBS_DIR=${STORAGE_DIR}/jobs
    RUBRICS_DIR=${STORAGE_DIR}/rubrics
    echo "New storage directory: $STORAGE_DIR"
    mkdir -p "$STORAGE_DIR"
  else
    echo "Storage directory created successfully"
  fi
else
  echo "Storage directory already exists"
  ls -la "$STORAGE_DIR"
fi

# Create jobs directory if it doesn't exist
if [ ! -d "$JOBS_DIR" ]; then
  echo "Creating jobs directory: $JOBS_DIR"
  mkdir -p "$JOBS_DIR"
  if [ $? -ne 0 ]; then
    echo "ERROR: Failed to create jobs directory: $JOBS_DIR"
  else
    echo "Jobs directory created successfully"
  fi
else
  echo "Jobs directory already exists"
fi

# Create rubrics directory if it doesn't exist
if [ ! -d "$RUBRICS_DIR" ]; then
  echo "Creating rubrics directory: $RUBRICS_DIR"
  mkdir -p "$RUBRICS_DIR"
  if [ $? -ne 0 ]; then
    echo "ERROR: Failed to create rubrics directory: $RUBRICS_DIR"
  else
    echo "Rubrics directory created successfully"
  fi
else
  echo "Rubrics directory already exists"
fi

# Set permissions
echo "Setting permissions on $STORAGE_DIR"
chmod -R 755 "$STORAGE_DIR"
if [ $? -ne 0 ]; then
  echo "WARNING: Failed to set permissions on $STORAGE_DIR"
else
  echo "Permissions set successfully"
fi

# Show directory contents and permissions
echo "Directory contents and permissions:"
ls -la "$STORAGE_DIR"
ls -la "$JOBS_DIR"
ls -la "$RUBRICS_DIR"

# Export the actual storage directory for the application to use
export RENDER_STORAGE_DIR="$STORAGE_DIR"
echo "Exported RENDER_STORAGE_DIR=$RENDER_STORAGE_DIR"

echo "Setup complete!"
echo "======================================="
```

Update the `storage.ts` file to include the correct path structure for Render:

```typescript
// Update in app/utils/storage.ts

// Determine appropriate storage directory
let storageDir;
if (process.env.NODE_ENV === 'production' && process.env.RENDER === 'true') {
  // For Render production, use the persistent disk mount path
  storageDir = path.join(process.env.RENDER_STORAGE_DIR || '/var/data/storage', 'jobs');
  console.log(`Storage Provider: Using Render persistent storage at ${storageDir}`);
} else if (process.env.NODE_ENV === 'production') {
  // For other production environments (not Render)
  storageDir = '/tmp/jobs';
  console.log(`Storage Provider: Using production temporary storage at ${storageDir}`);
} else {
  // For local development
  storageDir = path.join(process.cwd(), '.render', 'jobs');
  console.log(`Storage Provider: Using local development storage at ${storageDir}`);
}

// And similarly, for the rubricsDir in FileStorageProvider:
this.rubricsDir = path.join(path.dirname(jobsDir), 'rubrics');
```

Create a deployment documentation file:

```markdown
# Wine Sales Evaluator Deployment Guide

This guide explains how to deploy the Wine Sales Evaluator application with the new rubric management system to Render.

## Prerequisites

- A Render account
- Access to the Wine Sales Evaluator repository
- An Anthropic API key for Claude AI

## Deployment Steps

1. **Set up a new Web Service in Render**:
   - Connect your GitHub repository
   - Select the branch to deploy
   - Set the service name to "wine-sales-evaluator"
   - Set the environment to "Node"
   - Set the build command to: `npm ci --include=dev && npm run build && chmod +x render-setup.sh`
   - Set the start command to: `./render-setup.sh && node server.js`

2. **Configure Environment Variables**:
   - `NODE_ENV`: `production`
   - `RENDER`: `true`
   - `CLAUDE_API_KEY`: Your Anthropic Claude API key
   - `RENDER_STORAGE_DIR`: `/var/data/storage`
   - `JOB_STORAGE_TYPE`: `file`
   - `JOB_MAX_AGE`: `86400000`
   - `NEXT_PUBLIC_USE_DIRECT_EVALUATION`: `false`
   - `PORT`: `10000`

3. **Set up a Persistent Disk**:
   - Create a new disk with at least 1GB of space
   - Mount it at: `/var/data`
   - This will store both jobs and rubrics data

4. **Deploy the Application**:
   - Click "Create Web Service"
   - The initial deployment will take a few minutes
   - The application will initialize with a default rubric

## Post-Deployment Setup

After the initial deployment:

1. **Access the Application**:
   - Navigate to the Render-provided URL
   - You should see the Wine Sales Evaluator dashboard

2. **Create Custom Rubrics**:
   - Navigate to the rubrics management page
   - Create any custom rubrics you need
   - Designate one as the default if desired

3. **Upload and Analyze Conversations**:
   - Upload conversation markdown files
   - Select the appropriate rubric
   - Click "Analyze" to evaluate the conversation

## Troubleshooting

If you encounter issues:

1. **Check the Logs**:
   - Go to the "Logs" tab in your Render dashboard
   - Look for any error messages

2. **Verify Persistent Storage**:
   - Check that the directories were created correctly
   - Ensure the application has write permissions

3. **Test the Health Endpoint**:
   - Navigate to `/api/health` to check the application status
   - This will show any issues with components

4. **Common Issues**:
   - If rubrics aren't saving, check the persistent disk configuration
   - If analysis fails, check that your Claude API key is valid

## Maintenance

- **Backups**: The application data is stored on the persistent disk. Make sure to set up regular backups.
- **Updates**: When deploying updates, the application will maintain all existing rubrics and jobs data.
- **Cleanup**: Old jobs are automatically cleaned up after the time specified in `JOB_MAX_AGE` (default: 24 hours).
```

### Testing the Deployment

To test the deployment:

1. Push your changes to your git repository
2. Deploy to Render using the Render dashboard or the `render.yaml` file
3. Verify that all services are running correctly
4. Test creating a rubric in the production environment
5. Test analyzing a conversation with a custom rubric

## Summary and Conclusion

You now have a complete implementation of the rubric management system for your Wine Sales Evaluator. This implementation carefully follows proper React hooks usage patterns to avoid the persistent issues you were experiencing.

Key improvements in this implementation:

1. **Proper React Hooks Usage**:
   - All components use named imports for hooks (`import { useState, useEffect } from 'react'`)
   - Hooks are called directly, not through the React namespace
   - All components are functional, not class-based
   - Hooks are only called at the top level

2. **Comprehensive Rubric Management**:
   - Create, view, edit, and delete rubrics
   - Set default rubrics
   - Custom criteria and scoring levels
   - Integration with the evaluation process

3. **Flexible Evaluation Process**:
   - Select specific rubrics for evaluation
   - Results reference the rubric used
   - Fallback to default rubric when needed

4. **Robust Error Handling**:
   - Validation of rubrics and evaluation data
   - Proper error states in UI components
   - Recovery mechanisms if something fails

5. **Persistent Storage**:
   - Data is stored on Render's persistent disk
   - Separate directories for jobs and rubrics
   - Automatic initialization of the system

This implementation should resolve the persistent hooks-related issues you've been experiencing while providing a powerful and flexible rubric management system for your Wine Sales Evaluator.