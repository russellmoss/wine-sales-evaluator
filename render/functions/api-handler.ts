import { NextApiRequest, NextApiResponse } from 'next';
import { handler as analyzeConversationHandler } from '../../netlify/functions/analyze-conversation';
import { handler as checkJobStatusHandler } from '../../netlify/functions/check-job-status';
import { handler as forceCompleteJobHandler } from '../../netlify/functions/force-complete-job';

// Helper function to convert Next.js request to a format similar to Netlify functions
const convertRequest = (req: NextApiRequest) => {
  // Convert headers to a format compatible with Netlify functions
  const headers: Record<string, string> = {};
  Object.entries(req.headers).forEach(([key, value]) => {
    if (value !== undefined) {
      headers[key] = Array.isArray(value) ? value[0] : value;
    }
  });

  // Convert query parameters to a format compatible with Netlify functions
  const queryStringParameters: Record<string, string> = {};
  Object.entries(req.query).forEach(([key, value]) => {
    if (value !== undefined) {
      queryStringParameters[key] = Array.isArray(value) ? value[0] : value;
    }
  });

  return {
    body: req.body,
    queryStringParameters,
    headers,
    httpMethod: req.method || 'GET',
    path: req.url || '/',
    isBase64Encoded: false,
    multiValueHeaders: {},
    multiValueQueryStringParameters: {},
    stageVariables: {},
    requestContext: {
      accountId: '',
      apiId: '',
      authorizer: {},
      protocol: 'HTTP/1.1',
      httpMethod: req.method || 'GET',
      identity: {
        accessKey: null,
        accountId: null,
        apiKey: null,
        apiKeyId: null,
        caller: null,
        clientCert: null,
        cognitoAuthenticationProvider: null,
        cognitoAuthenticationType: null,
        cognitoIdentityId: null,
        cognitoIdentityPoolId: null,
        principalOrgId: null,
        sourceIp: req.socket.remoteAddress || '',
        user: null,
        userAgent: req.headers['user-agent'] || '',
        userArn: null
      },
      path: req.url || '/',
      stage: 'prod',
      requestId: '',
      requestTimeEpoch: Date.now(),
      resourceId: '',
      resourcePath: '',
    },
    resource: '',
  };
};

// Create a mock context for Netlify functions
const createContext = () => {
  return {
    callbackWaitsForEmptyEventLoop: true,
    functionName: 'render-api-handler',
    functionVersion: '1.0',
    invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:render-api-handler',
    memoryLimitInMB: '1024',
    awsRequestId: 'mock-request-id',
    logGroupName: '/aws/lambda/render-api-handler',
    logStreamName: '2023/01/01/[$LATEST]mock-log-stream',
    getRemainingTimeInMillis: () => 30000,
    done: () => {},
    fail: () => {},
    succeed: () => {},
  };
};

// Helper function to safely parse JSON
const safeJsonParse = (str: string) => {
  try {
    return JSON.parse(str);
  } catch (error) {
    console.error('Error parsing JSON:', error);
    return { error: 'Invalid JSON response' };
  }
};

// API handler for all endpoints
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const path = req.url || '';
  
  try {
    // Route to the appropriate handler based on the path
    if (path.startsWith('/api/analyze-conversation')) {
      const netlifyReq = convertRequest(req);
      const context = createContext();
      const result = await analyzeConversationHandler(netlifyReq, context);
      const body = safeJsonParse(result.body);
      res.status(result.statusCode).json(body);
    } 
    else if (path.startsWith('/api/check-job-status')) {
      const netlifyReq = convertRequest(req);
      const context = createContext();
      const result = await checkJobStatusHandler(netlifyReq, context);
      const body = safeJsonParse(result.body);
      res.status(result.statusCode).json(body);
    }
    else if (path.startsWith('/api/force-complete-job')) {
      const netlifyReq = convertRequest(req);
      const context = createContext();
      const result = await forceCompleteJobHandler(netlifyReq, context);
      const body = safeJsonParse(result.body);
      res.status(result.statusCode).json(body);
    }
    else {
      res.status(404).json({ error: 'Not found' });
    }
  } catch (error) {
    console.error('API handler error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 