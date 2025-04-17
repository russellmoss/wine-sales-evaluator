import { NextApiRequest, NextApiResponse } from 'next';
import { Handler, HandlerContext, HandlerEvent } from '@netlify/functions';
import { handler as analyzeConversationHandler } from '../../netlify/functions/analyze-conversation';
import { handler as checkJobStatusHandler } from '../../netlify/functions/check-job-status';
import { handler as forceCompleteJobHandler } from '../../netlify/functions/force-complete-job';

// Helper function to convert Next.js request to a format similar to Netlify functions
const convertRequest = (_req: NextApiRequest): HandlerEvent => {
  // Convert headers to a format compatible with Netlify functions
  const headers: Record<string, string> = {};
  Object.entries(_req.headers).forEach(([key, value]) => {
    if (value !== undefined) {
      headers[key] = Array.isArray(value) ? value[0] : value;
    }
  });

  // Convert query parameters to a format compatible with Netlify functions
  const queryStringParameters: Record<string, string> = {};
  Object.entries(_req.query).forEach(([key, value]) => {
    if (value !== undefined) {
      queryStringParameters[key] = Array.isArray(value) ? value[0] : value;
    }
  });

  // Ensure path is never undefined and convert undefined to null where needed
  const path = _req.url || '/';
  
  return {
    httpMethod: 'POST',
    headers,
    queryStringParameters,
    body: _req.body ? JSON.stringify(_req.body) : null,
    path,
    isBase64Encoded: false
  };
};

// Create a mock context for Netlify functions
const createContext = (): HandlerContext => {
  return {
    functionName: 'api-handler',
    functionVersion: '$LATEST',
    invokedFunctionArn: 'mock-arn',
    memoryLimitInMB: '1024',
    awsRequestId: 'mock-request-id',
    logGroupName: 'mock-log-group',
    logStreamName: 'mock-log-stream',
    getRemainingTimeInMillis: () => 10000,
    done: (_error?: Error | null, _result?: any) => {},
    fail: (_error: Error | string) => {},
    succeed: (_messageOrObject: any) => {}
  };
};

// Helper function to safely parse JSON
const safeJsonParse = (str: string) => {
  try {
    return JSON.parse(str);
  } catch (_error) {
    console.error('Error parsing JSON:', _error);
    return { error: 'Invalid JSON response' };
  }
};

// API handler for all endpoints
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const path = req.url || '';
    
    // Route to the appropriate handler based on the path
    if (path.includes('/analyze-conversation')) {
      const netlifyReq = convertRequest(req);
      const context = createContext();
      const result = await analyzeConversationHandler(netlifyReq, context);
      const body = safeJsonParse(result.body);
      res.status(result.statusCode).json(body);
    } else if (path.includes('/check-job-status')) {
      const netlifyReq = convertRequest(req);
      const context = createContext();
      const result = await checkJobStatusHandler(netlifyReq, context);
      const body = safeJsonParse(result.body);
      res.status(result.statusCode).json(body);
    } else if (path.includes('/force-complete-job')) {
      const netlifyReq = convertRequest(req);
      const context = createContext();
      const result = await forceCompleteJobHandler(netlifyReq, context);
      const body = safeJsonParse(result.body);
      res.status(result.statusCode).json(body);
    } else {
      res.status(404).json({ error: 'Not found' });
    }
  } catch (_error) {
    console.error('API handler error:', _error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 