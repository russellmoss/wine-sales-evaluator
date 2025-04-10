# Optimizing Wine Sales Evaluator for Render Deployment

This step-by-step guide will help you deploy your Wine Sales Evaluator application to Render without changing any core functionality. Each step includes Cursor.ai prompts and code snippets to facilitate an efficient deployment process.

## Table of Contents
1. [Storage Configuration](#1-storage-configuration)
2. [Environment Variables Setup](#2-environment-variables-setup)
3. [Render.yaml Configuration](#3-renderyaml-configuration)
4. [API Route Optimizations](#4-api-route-optimizations)
5. [Error Handling Improvements](#5-error-handling-improvements)
6. [Pre-Deployment Testing](#6-pre-deployment-testing)
7. [Deployment Process](#7-deployment-process)
8. [Post-Deployment Verification](#8-post-deployment-verification)

## 1. Storage Configuration

The primary challenge is ensuring your file-based storage works on Render's platform. Render provides persistent disk storage that needs to be properly configured.

### Cursor.ai Prompt:
```
Update the getStorageProvider function in app/utils/storage.ts to optimize for Render's filesystem. Ensure the storage directory path is correctly configured for both development and production environments, with special handling for Render's persistent disk.
```

### Updated Code for `app/utils/storage.ts`:

```typescript
// Factory function to get the appropriate storage provider
export function getStorageProvider(): StorageProvider {
  const storageType = process.env.JOB_STORAGE_TYPE || 'file';
  const maxAge = parseInt(process.env.JOB_MAX_AGE || '86400000', 10);
  const isDev = process.env.NODE_ENV === 'development';
  const isRender = process.env.RENDER === 'true';

  console.log(`Storage Provider: Initializing with type=${storageType}, isDev=${isDev}, isRender=${isRender}`);
  console.log(`Storage Provider: Environment variables:`, {
    NODE_ENV: process.env.NODE_ENV,
    RENDER: process.env.RENDER,
    JOB_STORAGE_TYPE: process.env.JOB_STORAGE_TYPE,
    JOB_MAX_AGE: process.env.JOB_MAX_AGE,
    RENDER_STORAGE_DIR: process.env.RENDER_STORAGE_DIR || 'Not set'
  });

  // Determine appropriate storage directory
  let storageDir;
  if (process.env.NODE_ENV === 'production' && process.env.RENDER === 'true') {
    // For Render production, use the persistent disk mount path
    storageDir = process.env.RENDER_STORAGE_DIR || '/var/data/jobs';
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

  // Create the directory if it doesn't exist
  if (!fs.existsSync(storageDir)) {
    console.log(`Storage Provider: Creating storage directory: ${storageDir}`);
    fs.mkdirSync(storageDir, { recursive: true });
  }
  
  return new FileStorageProvider(storageDir, maxAge);
}
```

## 2. Environment Variables Setup

Setting up environment variables correctly is crucial for Render deployment.

### Cursor.ai Prompt:
```
Update the .env.example file to include all necessary environment variables for Render deployment, and optimize the environment variable handling in next.config.js to avoid duplication and conflicts.
```

### Updated `.env.example`:

```
# Required for all environments
CLAUDE_API_KEY=your_api_key_here

# Storage configuration
JOB_STORAGE_TYPE=file
JOB_MAX_AGE=86400000

# Render-specific (only needed in production)
RENDER=true
RENDER_STORAGE_DIR=/var/data/jobs

# Feature flags
NEXT_PUBLIC_USE_DIRECT_EVALUATION=false

# Node environment
NODE_ENV=development
```

### Updated `next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone', // Optimized for production deployments
  images: {
    unoptimized: true,
  },
  // Simplified environment variable configuration
  env: {
    // Publicly accessible environment variables
    NEXT_PUBLIC_USE_DIRECT_EVALUATION: process.env.NEXT_PUBLIC_USE_DIRECT_EVALUATION || 'false',
  },
  // Ensure all dependencies are properly handled
  transpilePackages: ['@react-pdf/renderer', 'recharts'],
  // Disable webpack optimization for static export
  webpack: (config, { isServer }) => {
    // Add specific configuration for @react-pdf/renderer
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
      };
    }
    
    // Ensure CSS is properly processed
    config.module.rules.push({
      test: /\.css$/,
      use: ['style-loader', 'css-loader', 'postcss-loader'],
    });
    
    return config;
  },
};

module.exports = nextConfig;
```

## 3. Render.yaml Configuration

Configure `render.yaml` for a robust deployment that includes persistent storage.

### Cursor.ai Prompt:
```
Update the render.yaml file to include a persistent disk configuration for storing job data, and ensure all necessary environment variables are defined.
```

### Updated `render.yaml`:

```yaml
services:
  - type: web
    name: wine-sales-evaluator
    env: node
    buildCommand: npm ci && npm run build
    startCommand: npm start
    healthCheckPath: /api/health
    # Define a persistent disk for job storage
    disk:
      name: wine-evaluator-data
      mountPath: /var/data
      sizeGB: 1
    envVars:
      - key: NODE_ENV
        value: production
      - key: RENDER
        value: true
      - key: CLAUDE_API_KEY
        sync: false # This will be set via Render dashboard
      - key: RENDER_STORAGE_DIR
        value: /var/data/jobs
      - key: JOB_STORAGE_TYPE
        value: file
      - key: JOB_MAX_AGE
        value: "86400000"
      - key: NEXT_PUBLIC_USE_DIRECT_EVALUATION
        value: "false"
    # Add build-time environment variables if needed
    buildEnv:
      - key: NEXT_TELEMETRY_DISABLED
        value: "1"
    # Auto-deploy settings (optional)
    autoDeploy: true
```

## 4. API Route Optimizations

Optimize the health check API route for Render.

### Cursor.ai Prompt:
```
Enhance the health check API route in app/api/health/route.ts to include checks for storage and Claude API connectivity, making it more effective for Render's health check system.
```

### Updated `app/api/health/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { getStorageProvider } from '../../../app/utils/storage';
import { Anthropic } from '@anthropic-ai/sdk';

export async function GET() {
  console.log('Health check: API route called');
  
  try {
    // Check environment variables
    const envVars = {
      NODE_ENV: process.env.NODE_ENV,
      CLAUDE_API_KEY: process.env.CLAUDE_API_KEY ? 'Set (not shown for security)' : 'Not set',
      JOB_STORAGE_TYPE: process.env.JOB_STORAGE_TYPE,
      JOB_MAX_AGE: process.env.JOB_MAX_AGE,
      RENDER: process.env.RENDER,
      RENDER_STORAGE_DIR: process.env.RENDER_STORAGE_DIR
    };
    
    console.log('Health check: Environment variables', envVars);
    
    // Check storage provider
    console.log('Health check: Initializing storage provider');
    const storage = getStorageProvider();
    let storageStatus = 'ok';
    let jobCount = 0;
    
    try {
      // Test storage by listing jobs
      console.log('Health check: Testing storage by listing jobs');
      const jobs = await storage.listJobs();
      jobCount = jobs.length;
      console.log('Health check: Storage test successful, found', jobCount, 'jobs');
    } catch (storageError) {
      console.error('Health check: Storage test failed', storageError);
      storageStatus = 'error';
    }
    
    // Check Claude API connectivity
    let claudeApiStatus = 'unknown';
    
    if (process.env.CLAUDE_API_KEY) {
      try {
        console.log('Health check: Testing Claude API connectivity');
        const anthropic = new Anthropic({
          apiKey: process.env.CLAUDE_API_KEY,
        });
        
        // Simple API check with a short timeout - we don't need a full response
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await anthropic.messages.create({
          model: "claude-3-7-sonnet-20250219",
          max_tokens: 10,
          messages: [{ role: "user", content: "Hello" }],
          temperature: 0,
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        claudeApiStatus = 'ok';
        console.log('Health check: Claude API connectivity successful');
      } catch (claudeError) {
        console.error('Health check: Claude API test failed', claudeError);
        claudeApiStatus = 'error';
      }
    } else {
      console.log('Health check: Claude API key not set, skipping connectivity test');
    }
    
    // Return comprehensive health status
    return NextResponse.json({
      status: storageStatus === 'ok' && (claudeApiStatus === 'ok' || claudeApiStatus === 'unknown') ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      render: process.env.RENDER === 'true',
      components: {
        storage: {
          status: storageStatus,
          type: process.env.JOB_STORAGE_TYPE || 'file',
          jobCount: jobCount
        },
        claudeApi: {
          status: claudeApiStatus
        }
      }
    });
  } catch (error) {
    console.error('Health check: Error', error);
    
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 
```

## 5. Error Handling Improvements

Enhance error handling to ensure the app gracefully handles failures in a production environment.

### Cursor.ai Prompt:
```
Improve error handling in the API routes, focusing on graceful fallbacks and detailed error logging for Render deployment.
```

### Updated `app/api/analyze-conversation/route.ts` (error handling section):

```typescript
// This replaces the catch block in your POST handler
catch (error) {
  console.error('API Route: Error in analyze-conversation route:', error);
  
  // Detailed error logging
  console.error({
    errorType: error instanceof Error ? error.constructor.name : 'Unknown',
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    timestamp: new Date().toISOString()
  });
  
  // Determine error message based on the type of error
  let errorMessage = 'Internal server error';
  let statusCode = 500;
  
  if (error instanceof Error) {
    if (error.message.includes('Claude API') || error.message.includes('anthropic')) {
      errorMessage = 'Error communicating with Claude API. Please try again later.';
    } else if (error.message.includes('storage') || error.message.includes('file')) {
      errorMessage = 'Error saving analysis results. Please try again later.';
    } else if (error.message.includes('timeout') || error.message.includes('timed out')) {
      errorMessage = 'Analysis operation timed out. Please try again with a shorter conversation.';
      statusCode = 408; // Request Timeout
    }
  }
  
  return NextResponse.json({ 
    error: errorMessage,
    message: error instanceof Error ? error.message : 'Unknown error',
    requestId: crypto.randomUUID() // Include a request ID for reference
  }, { status: statusCode });
}
```

## 6. Pre-Deployment Testing

Set up a comprehensive testing script to validate your app before deploying to Render.

### Cursor.ai Prompt:
```
Create a comprehensive test script that verifies all critical functionality before deployment to Render, including storage, API routes, and Claude integration.
```

### Updated `scripts/pre-deployment-test.js`:

```javascript
// Pre-deployment test script
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Sample markdown file for testing
const SAMPLE_MARKDOWN = `# Wine Tasting Room Conversation

## Scenario: Wine Tasting Room Visit 

**Description:** A couple visiting the tasting room for the first time.

**Date:** 4/7/2025

## Conversation

### Staff Member (1)
hi my name is Russell and I'm going to be taking care of you today is this your first time at Malaya

### Guest (2)
Hi Russell, yes this is our first time here!
`;

async function runTests() {
  console.log('===== PRE-DEPLOYMENT TEST SUITE =====');
  console.log('Running tests on:', process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000');
  
  const results = {
    health: { status: 'pending' },
    storage: { status: 'pending' },
    claudeApi: { status: 'pending' },
    endToEnd: { status: 'pending' }
  };
  
  try {
    // Test 1: Health Check
    console.log('\n1. Testing Health Check API...');
    const healthResult = await testHealthCheck();
    results.health = healthResult;
    
    // Test 2: Storage
    console.log('\n2. Testing Storage...');
    const storageResult = await testStorage();
    results.storage = storageResult;
    
    // Test 3: Claude API
    console.log('\n3. Testing Claude API Integration...');
    const claudeResult = await testClaudeIntegration();
    results.claudeApi = claudeResult;
    
    // Test 4: End-to-end test
    console.log('\n4. Running End-to-End Test...');
    const e2eResult = await testEndToEnd();
    results.endToEnd = e2eResult;
    
    // Report results
    console.log('\n===== TEST RESULTS =====');
    Object.entries(results).forEach(([test, result]) => {
      console.log(`${test}: ${result.status.toUpperCase()}${result.message ? ` - ${result.message}` : ''}`);
    });
    
    // Overall status
    const allPassed = Object.values(results).every(r => r.status === 'pass');
    console.log('\n===== OVERALL STATUS =====');
    console.log(allPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌');
    
    if (!allPassed) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Test suite error:', error);
    process.exit(1);
  }
}

async function testHealthCheck() {
  try {
    const response = await fetch('http://localhost:3000/api/health');
    
    if (!response.ok) {
      return { 
        status: 'fail', 
        message: `Health check returned status ${response.status}`
      };
    }
    
    const data = await response.json();
    console.log('Health check response:', data);
    
    if (data.status !== 'ok') {
      return { 
        status: 'fail', 
        message: `Health check reported status: ${data.status}`
      };
    }
    
    return { status: 'pass' };
  } catch (error) {
    console.error('Health check error:', error);
    return { 
      status: 'error', 
      message: error.message 
    };
  }
}

async function testStorage() {
  try {
    // Create a test job via API
    const response = await fetch('http://localhost:3000/api/analyze-conversation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        markdown: 'Test storage functionality',
        fileName: 'storage-test.md'
      })
    });
    
    if (!response.ok) {
      return { 
        status: 'fail', 
        message: `Storage test request failed with status ${response.status}`
      };
    }
    
    const data = await response.json();
    console.log('Storage test response:', data);
    
    if (!data.jobId) {
      return { 
        status: 'fail', 
        message: 'No job ID returned in response'
      };
    }
    
    // Verify job was stored by checking its status
    const statusResponse = await fetch(`http://localhost:3000/api/check-job-status?jobId=${data.jobId}`);
    
    if (!statusResponse.ok) {
      return { 
        status: 'fail', 
        message: `Job status check failed with status ${statusResponse.status}`
      };
    }
    
    const statusData = await statusResponse.json();
    console.log('Job status response:', statusData);
    
    if (!statusData.id || statusData.id !== data.jobId) {
      return { 
        status: 'fail', 
        message: 'Job ID mismatch or missing in status response'
      };
    }
    
    return { status: 'pass' };
  } catch (error) {
    console.error('Storage test error:', error);
    return { 
      status: 'error', 
      message: error.message 
    };
  }
}

async function testClaudeIntegration() {
  try {
    // Send a test request to Claude via our API
    const response = await fetch('http://localhost:3000/api/analyze-conversation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        markdown: SAMPLE_MARKDOWN,
        fileName: 'claude-test.md',
        directEvaluation: true
      })
    });
    
    if (!response.ok) {
      return { 
        status: 'fail', 
        message: `Claude integration test failed with status ${response.status}`
      };
    }
    
    const data = await response.json();
    console.log('Claude integration test response:', data);
    
    if (!data.result) {
      return { 
        status: 'fail', 
        message: 'No result returned from Claude'
      };
    }
    
    // Verify the result has the expected structure
    const result = data.result;
    if (!result.staffName || !result.criteriaScores || !Array.isArray(result.criteriaScores)) {
      return { 
        status: 'fail', 
        message: 'Claude result is missing expected fields'
      };
    }
    
    return { status: 'pass' };
  } catch (error) {
    console.error('Claude integration test error:', error);
    return { 
      status: 'error', 
      message: error.message 
    };
  }
}

async function testEndToEnd() {
  try {
    // Submit a conversation for analysis
    console.log('Submitting a full conversation for analysis...');
    const response = await fetch('http://localhost:3000/api/analyze-conversation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        markdown: SAMPLE_MARKDOWN,
        fileName: 'e2e-test.md'
      })
    });
    
    if (!response.ok) {
      return { 
        status: 'fail', 
        message: `End-to-end test failed with status ${response.status}`
      };
    }
    
    const data = await response.json();
    console.log('Analysis job created:', data);
    
    if (!data.jobId) {
      return { 
        status: 'fail', 
        message: 'No job ID returned in response'
      };
    }
    
    // Poll for job completion
    console.log('Polling for job completion...');
    let completed = false;
    let attempts = 0;
    const maxAttempts = 10;
    let result = null;
    
    while (!completed && attempts < maxAttempts) {
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const statusResponse = await fetch(`http://localhost:3000/api/check-job-status?jobId=${data.jobId}`);
      
      if (!statusResponse.ok) {
        console.log(`Attempt ${attempts}: Job status check failed with status ${statusResponse.status}`);
        continue;
      }
      
      const job = await statusResponse.json();
      console.log(`Attempt ${attempts}: Job status: ${job.status}`);
      
      if (job.status === 'completed') {
        completed = true;
        result = job.result;
      } else if (job.status === 'failed') {
        return { 
          status: 'fail', 
          message: `Job failed: ${job.error || 'Unknown error'}`
        };
      }
    }
    
    if (!completed) {
      return { 
        status: 'fail', 
        message: `Job did not complete within ${maxAttempts} attempts`
      };
    }
    
    if (!result) {
      return { 
        status: 'fail', 
        message: 'No result in completed job'
      };
    }
    
    console.log('End-to-end test completed successfully');
    return { status: 'pass' };
  } catch (error) {
    console.error('End-to-end test error:', error);
    return { 
      status: 'error', 
      message: error.message 
    };
  }
}

runTests();
```

## 7. Deployment Process

Here's how to deploy your application to Render.

### Cursor.ai Prompt:
```
Create a detailed checklist for deploying the Wine Sales Evaluator to Render, including how to set up the environment variables, manage the persistent disk, and monitor the deployment.
```

### Render Deployment Checklist:

1. **Prepare your repository**
   - Ensure all the above code changes are committed to your git repository
   - Make sure your repository is accessible to Render (e.g., GitHub, GitLab)

2. **Create a new Web Service on Render**
   - Log in to your Render dashboard
   - Select "New" → "Web Service"
   - Connect your repository
   - Configure the service:
     - Name: wine-sales-evaluator
     - Environment: Node
     - Build Command: `npm ci && npm run build`
     - Start Command: `npm start`
   - Select the appropriate branch
   - Enable "Auto-Deploy"

3. **Configure environment variables**
   - Navigate to the "Environment" tab
   - Add the following environment variables:
     - `NODE_ENV`: `production`
     - `RENDER`: `true`
     - `CLAUDE_API_KEY`: [Your actual Claude API key]
     - `JOB_STORAGE_TYPE`: `file`
     - `JOB_MAX_AGE`: `86400000`
     - `NEXT_PUBLIC_USE_DIRECT_EVALUATION`: `false`

4. **Set up persistent disk**
   - Navigate to the "Disks" tab
   - Click "Add Disk"
   - Configure the disk:
     - Name: wine-evaluator-data
     - Mount Path: `/var/data`
     - Size: 1 GB
   - Click "Create"
   - Add the environment variable:
     - `RENDER_STORAGE_DIR`: `/var/data/jobs`

5. **Configure health check**
   - Navigate to the "Health" tab
   - Set the health check path to `/api/health`
   - Set the health check interval to 60 seconds

6. **Deploy the service**
   - Click "Save Changes" to trigger an initial deployment
   - Monitor the deployment logs for any errors

7. **Verify deployment**
   - Once the deployment is complete, open the service URL
   - Test the application functionality
   - Check the logs to ensure everything is working as expected

## 8. Post-Deployment Verification

After deploying, verify that everything is working correctly.

### Cursor.ai Prompt:
```
Create a post-deployment verification checklist for the Wine Sales Evaluator on Render, ensuring all components are functioning correctly.
```

### Post-Deployment Verification Checklist:

1. **Health Check**
   - Visit `[your-render-url]/api/health`
   - Verify that the response shows `"status": "ok"`
   - Check that both storage and Claude API connectivity are working

2. **Basic Functionality**
   - Open the main application URL
   - Upload a sample conversation markdown file
   - Verify that the analysis process starts correctly
   - Check that the analysis results are displayed properly

3. **Data Persistence**
   - Check the Render logs to confirm that files are being written to the mounted disk
   - Look for log messages like `"Using Render persistent storage at /var/data/jobs"`
   - Submit multiple analyses and verify they can all be retrieved

4. **Error Handling**
   - Test with an invalid or malformed markdown file
   - Verify that appropriate error messages are displayed
   - Check the logs for detailed error information

5. **Performance Monitoring**
   - Monitor the application performance using Render's metrics
   - Check response times for API endpoints
   - Monitor disk usage to ensure you don't exceed the allocated space

6. **Log Monitoring**
   - Set up log alerts for critical errors
   - Create regular log exports for analysis
   - Look for any unexpected error patterns

7. **Security Check**
   - Verify that environment variables, particularly the Claude API key, are not exposed
   - Check that sensitive data is not logged in plain text
   - Ensure error messages don't leak implementation details

If all these checks pass, your Wine Sales Evaluator is successfully deployed to Render!