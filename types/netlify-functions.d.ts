declare module '@netlify/functions' {
  export interface HandlerContext {
    functionName: string;
    functionVersion: string;
    invokedFunctionArn: string;
    memoryLimitInMB: string;
    awsRequestId: string;
    logGroupName: string;
    logStreamName: string;
    getRemainingTimeInMillis: () => number;
    done: (error?: Error | null, result?: any) => void;
    fail: (error: Error | string) => void;
    succeed: (result?: any) => void;
  }

  export interface HandlerEvent {
    httpMethod: string;
    path: string;
    headers: Record<string, string>;
    queryStringParameters: Record<string, string> | null;
    body: string | null;
    isBase64Encoded: boolean;
  }

  export interface HandlerResponse {
    statusCode: number;
    body: string;
    headers?: Record<string, string>;
    isBase64Encoded?: boolean;
  }

  export interface Handler {
    (event: HandlerEvent, context: HandlerContext): Promise<HandlerResponse>;
  }
} 