import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Check if the GEMINI_API_KEY is set
  const hasGeminiApiKey = !!process.env.GEMINI_API_KEY;
  
  // Check if the CLAUDE_API_KEY is set
  const hasClaudeApiKey = !!process.env.CLAUDE_API_KEY;
  
  // Get the first few characters of the API keys for debugging
  const geminiApiKeyPreview = hasGeminiApiKey && process.env.GEMINI_API_KEY 
    ? process.env.GEMINI_API_KEY.substring(0, 10) + '...' 
    : 'Not set';
  
  const claudeApiKeyPreview = hasClaudeApiKey && process.env.CLAUDE_API_KEY
    ? process.env.CLAUDE_API_KEY.substring(0, 10) + '...' 
    : 'Not set';
  
  // Return the environment variable status
  return NextResponse.json({
    hasGeminiApiKey,
    hasClaudeApiKey,
    geminiApiKeyPreview,
    claudeApiKeyPreview,
    nodeEnv: process.env.NODE_ENV,
    // List all environment variables (without their values)
    envKeys: Object.keys(process.env)
  });
} 