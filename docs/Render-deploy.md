# Fixing the Wine Sales Evaluator Deployment on Render

## Understanding the Issue

The application was originally designed to use Netlify Functions, but is now being deployed on Render. The error messages indicate:

1. The app is trying to access `/.netlify/functions/analyze-conversation` which doesn't exist on Render
2. Instead of getting JSON, it's receiving HTML (likely a 404 page), causing JSON parsing errors

## Step-by-Step Solution

### 1. Create a Render-compatible API Route Structure

First, we need to adapt the application to use Next.js API routes instead of Netlify Functions.

#### Cursor.ai Prompt:
```
Create a Next.js API route for analyze-conversation. Take the code from netlify/functions/analyze-conversation.ts and adapt it to work as a Next.js API route in pages/api/analyze-conversation.ts. Make sure to handle the same functionality but with Next.js API request/response objects instead of Netlify's event/context pattern.
```

Create the file structure:
```
app/api/analyze-conversation/route.ts
app/api/check-job-status/route.ts
```

### 2. Update API Routes

#### For `app/api/analyze-conversation/route.ts`:

#### Cursor.ai Prompt:
```
Update app/api/analyze-conversation/route.ts to directly use the logic from netlify/functions/analyze-conversation.ts. It should:
1. Use Next.js App Router pattern with export async function POST()
2. Convert the incoming request to the format expected by the analysis logic
3. Call the Claude API directly rather than through Netlify Functions
4. Return a properly formatted response
5. Handle errors appropriately
```

#### Example implementation:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { Anthropic } from '@anthropic-ai/sdk';
import { getStorageProvider, createJob } from '../../../app/utils/storage';

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY || '',
});

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    const { markdown, fileName } = body;
    
    if (!markdown) {
      return NextResponse.json({ 
        error: 'Markdown content is required' 
      }, { status: 400 });
    }

    // Initialize storage provider
    const storageProvider = getStorageProvider();
    
    // Create a new job
    const job = createJob(markdown, fileName);
    
    // Save the job
    await storageProvider.saveJob(job);
    
    // Process the conversation (simplified version of analyze-conversation-background)
    try {
      // Call Claude API
      const response = await anthropic.messages.create({
        model: "claude-3-7-sonnet-20250219",
        max_tokens: 4000,
        system: "You are a wine sales trainer evaluating a conversation between a winery staff member and guests.",
        messages: [
          { 
            role: "user", 
            content: `Evaluate this wine tasting conversation and return a JSON with these fields:
- staffName (extract from conversation)
- date (extract from conversation, format as YYYY-MM-DD)
- overallScore (number from 0-100)
- performanceLevel (based on score: Exceptional (90-100), Strong (80-89), Proficient (70-79), Developing (60-69), Needs Improvement (<60))
- criteriaScores (array of 10 objects with criterion, weight, score(1-5), weightedScore, and notes)
- strengths (array of 3 strengths)
- areasForImprovement (array of 3 areas)
- keyRecommendations (array of 3 recommendations)

The conversation to evaluate:
${markdown.substring(0, 15000)}${markdown.length > 15000 ? '...(truncated)' : ''}

Return ONLY the valid JSON with no additional explanation or text.`
          }
        ],
        temperature: 0.1
      });
      
      // Extract result from Claude response
      const result = response.content[0].text;
      let evaluationData;
      
      try {
        evaluationData = JSON.parse(result);
      } catch (parseError) {
        // Try to extract JSON from text if direct parsing fails
        const jsonMatch = result.match(/(\{[\s\S]*\})/);
        if (jsonMatch) {
          evaluationData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Failed to parse evaluation result');
        }
      }
      
      // Update job with the result
      job.status = 'completed';
      job.result = evaluationData;
      job.updatedAt = new Date().toISOString();
      await storageProvider.saveJob(job);
      
      // Return the job ID to the client
      return NextResponse.json({ 
        jobId: job.id,
        message: 'Analysis job completed successfully',
        result: evaluationData  // Include result directly for simplicity
      });
      
    } catch (error) {
      console.error('Error processing conversation:', error);
      
      // Update job status to failed
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.updatedAt = new Date().toISOString();
      await storageProvider.saveJob(job);
      
      return NextResponse.json({ 
        error: 'Failed to process conversation',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Error in analyze-conversation route:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
```

#### For `app/api/check-job-status/route.ts`:

#### Cursor.ai Prompt:
```
Create app/api/check-job-status/route.ts based on the Netlify function logic in netlify/functions/check-job-status.ts. It should:
1. Use Next.js App Router pattern with export async function GET()
2. Accept a jobId query parameter
3. Use the storage provider to fetch the job status
4. Return the job status as JSON
5. Handle errors appropriately
```

#### Example implementation:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getStorageProvider } from '../../../app/utils/storage';

export async function GET(request: NextRequest) {
  try {
    // Get the jobId query parameter
    const jobId = request.nextUrl.searchParams.get('jobId');
    
    if (!jobId) {
      return NextResponse.json({ error: 'No job ID provided' }, { status: 400 });
    }
    
    // Initialize storage provider
    const storage = getStorageProvider();
    
    // Get the job from storage
    const job = await storage.getJob(jobId);
    
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    
    // Return the job status
    return NextResponse.json(job);
    
  } catch (error) {
    console.error('Error in check-job-status route:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
```

### 3. Update the Frontend API Calls

Now we need to update the frontend components to use the new API routes instead of Netlify Functions.

#### Cursor.ai Prompt:
```
Update the MarkdownImporter.tsx component to use the new API routes instead of Netlify Functions. Replace all instances of '/.netlify/functions/analyze-conversation' with '/api/analyze-conversation' and '/.netlify/functions/check-job-status' with '/api/check-job-status'.
```

#### Update in `components/MarkdownImporter.tsx` and `app/components/MarkdownImporter.tsx`:

```typescript
// Replace
const response = await fetch('/.netlify/functions/analyze-conversation', {
  // ...
});

// With
const response = await fetch('/api/analyze-conversation', {
  // ...
});

// Replace
const statusResponse = await fetch(`/.netlify/functions/check-job-status?jobId=${jobId}`, {
  // ...
});

// With
const statusResponse = await fetch(`/api/check-job-status?jobId=${jobId}`, {
  // ...
});
```

### 4. Update Storage Provider for Render

The file system paths in the storage provider need to be updated for Render's environment.

#### Cursor.ai Prompt:
```
Update the getStorageProvider function in app/utils/storage.ts to use paths compatible with Render's file system. Make sure it uses an environment-appropriate storage directory.
```

#### Update in `app/utils/storage.ts`:

```typescript
export function getStorageProvider(): StorageProvider {
  const storageType = process.env.JOB_STORAGE_TYPE || 'file';
  const maxAge = parseInt(process.env.JOB_MAX_AGE || '86400000', 10);
  const isDev = process.env.NODE_ENV === 'development';

  console.log(`Initializing storage provider: type=${storageType}, isDev=${isDev}`);

  // Determine appropriate storage directory for Render
  let storageDir;
  if (process.env.NODE_ENV === 'production') {
    // For Render, use a writable directory
    storageDir = process.env.RENDER_STORAGE_DIR || '/tmp/jobs';
  } else {
    // For local development
    storageDir = path.join(process.cwd(), '.render', 'jobs');
  }

  console.log(`Using file storage provider with directory: ${storageDir}`);
  return new FileStorageProvider(storageDir, maxAge);
}
```

### 5. Update the render.yaml File (If Using It)

If you're using a `render.yaml` file for configuration:

#### Cursor.ai Prompt:
```
Create or update the render.yaml file to ensure proper environment variables and configuration for the Wine Sales Evaluator application on Render.
```

#### Example `render.yaml`:

```yaml
services:
  - type: web
    name: wine-sales-evaluator
    env: node
    buildCommand: npm ci && npm run build
    startCommand: npm start
    healthCheckPath: /api/health
    envVars:
      - key: NODE_ENV
        value: production
      - key: CLAUDE_API_KEY
        sync: false
      - key: RENDER_STORAGE_DIR
        value: /var/data/jobs
      - key: JOB_STORAGE_TYPE
        value: file
      - key: JOB_MAX_AGE
        value: 86400000
    disk:
      name: data
      mountPath: /var/data
      sizeGB: 1
```

### 6. Add a Health Check Endpoint

Add a simple health check endpoint for Render to verify your service is running:

#### Cursor.ai Prompt:
```
Create a simple health check API route at app/api/health/route.ts that returns a 200 OK response.
```

#### Implementation:

```typescript
// app/api/health/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    timestamp: new Date().toISOString()
  });
}
```

### 7. Update next.config.js to Handle Environment Variables

Update the Next.js configuration to properly handle environment variables:

#### Cursor.ai Prompt:
```
Update next.config.js to ensure proper handling of environment variables and any Render-specific configurations.
```

#### Example update:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  images: {
    unoptimized: true,
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
  // No need for rewrites since we're using direct API routes
};

module.exports = nextConfig;
```

### 8. Add Error Boundary and Fallback UI

Add error handling components to gracefully handle API failures:

#### Cursor.ai Prompt:
```
Create an ErrorBoundary component that can catch and display frontend errors gracefully, especially for API request failures.
```

### 9. Test Locally Before Deploying to Render

#### Cursor.ai Prompt:
```
What commands should I run to test these changes locally before deploying to Render?
```

Run these commands to test locally:
```bash
# Make sure all dependencies are installed
npm install

# Build the application
npm run build

# Start the application in production mode
npm start
```

### 10. Deploy to Render

Push your changes to your GitHub repository and deploy to Render:

1. Log in to your Render dashboard
2. Navigate to your service
3. Ensure all environment variables are set correctly:
   - `CLAUDE_API_KEY`
   - `NODE_ENV=production`
   - `RENDER_STORAGE_DIR=/var/data/jobs`
   - `JOB_STORAGE_TYPE=file`
   - `JOB_MAX_AGE=86400000`
4. Deploy the service
5. Monitor the build logs for any errors

## Troubleshooting

If you encounter issues after deployment:

1. Check the Render logs for detailed error messages
2. Verify that environment variables are correctly set
3. Ensure the storage directory is writable
4. Test API routes individually to isolate the issue
5. Add more detailed logging to pinpoint where the process is failing

## Additional Considerations

1. **Storage**: Consider using a database instead of file storage for production
2. **API Key Security**: Ensure your Claude API key is properly secured as an environment variable
3. **Error Handling**: Add more robust error handling throughout the application
4. **Monitoring**: Add monitoring to track API usage and performance