// Rate limiting configuration
const RATE_LIMIT = {
  MAX_REQUESTS_PER_MINUTE: 10,
  REQUEST_WINDOW_MS: 60 * 1000, // 1 minute in milliseconds
  lastRequestTime: 0
};

// Validate required environment variables
export const validateEnvironment = (): { isValid: boolean; missingVars: string[] } => {
  const requiredVars = [
    'CLAUDE_API_KEY',
    'JOB_STORAGE_TYPE',
    'JOB_MAX_AGE'
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  return {
    isValid: missingVars.length === 0,
    missingVars
  };
};

// Check if we're in development mode
const isDevelopmentMode = () => {
  return process.env.NODE_ENV === 'development' || process.env.NETLIFY_DEV === 'true';
};

// Get the API key with fallback for development
export const getClaudeApiKey = () => {
  const apiKey = process.env.CLAUDE_API_KEY;
  
  // Log API key status (without exposing the actual key)
  if (apiKey) {
    console.log(`[${new Date().toISOString()}] Claude API: API key found (length: ${apiKey.length})`);
    // Check if the key has the expected format
    if (apiKey.startsWith('sk-ant-')) {
      console.log(`[${new Date().toISOString()}] Claude API: API key format looks valid`);
    } else {
      console.warn(`[${new Date().toISOString()}] Claude API: WARNING - API key format may be invalid (should start with 'sk-ant-')`);
    }
  } else {
    console.warn(`[${new Date().toISOString()}] Claude API: WARNING - API key not found in environment variables`);
    
    // For development mode, provide a more helpful error message
    if (isDevelopmentMode()) {
      console.warn(`[${new Date().toISOString()}] Claude API: WARNING - Running in development mode without API key`);
      console.warn(`[${new Date().toISOString()}] Claude API: WARNING - Please set CLAUDE_API_KEY in your .env.local file`);
      console.warn(`[${new Date().toISOString()}] Claude API: WARNING - Example: CLAUDE_API_KEY=sk-ant-api03-...`);
    }
  }
  
  return apiKey;
};

// Function to enforce rate limiting
export const enforceRateLimit = async () => {
  const now = Date.now();
  const timeSinceLastRequest = now - RATE_LIMIT.lastRequestTime;
  
  if (timeSinceLastRequest < RATE_LIMIT.REQUEST_WINDOW_MS / RATE_LIMIT.MAX_REQUESTS_PER_MINUTE) {
    const delayMs = (RATE_LIMIT.REQUEST_WINDOW_MS / RATE_LIMIT.MAX_REQUESTS_PER_MINUTE) - timeSinceLastRequest;
    console.log(`Rate limiting: Waiting ${delayMs}ms before next request`);
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  
  RATE_LIMIT.lastRequestTime = Date.now();
}; 