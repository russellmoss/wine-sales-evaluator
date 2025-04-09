import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  console.log('API route: Starting request processing');
  
  try {
    // Parse the request body
    console.log('API route: Parsing request body');
    const body = await request.json();
    console.log('API route: Request body parsed successfully');
    
    // Determine if we're in development or production
    const isDevelopment = process.env.NODE_ENV === 'development';
    console.log(`API route: Environment: ${isDevelopment ? 'development' : 'production'}`);
    
    // In development, we'll call the Netlify function directly
    // In production, we'll use the Netlify function URL
    let functionUrl;
    
    if (isDevelopment) {
      // For local development, use the Netlify dev server if available
      const netlifyDevUrl = process.env.NETLIFY_DEV_URL || 'http://localhost:8888';
      functionUrl = `${netlifyDevUrl}/.netlify/functions/analyze-conversation`;
      console.log(`API route: Development mode - using Netlify dev URL: ${functionUrl}`);
    } else {
      // For production, use the deployed Netlify function URL
      const netlifyUrl = process.env.NETLIFY_URL || '';
      if (!netlifyUrl) {
        throw new Error('NETLIFY_URL environment variable is not set in production');
      }
      functionUrl = `${netlifyUrl}/.netlify/functions/analyze-conversation`;
      console.log(`API route: Production mode - using Netlify URL: ${functionUrl}`);
    }
    
    // Forward the request to the Netlify function
    console.log('API route: Sending request to Netlify function');
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    console.log(`API route: Received response from Netlify function with status: ${response.status}`);
    
    // Get the response data
    const data = await response.json();
    
    // Return the response from the Netlify function
    return NextResponse.json(data, { status: response.status });
    
  } catch (error) {
    console.error('API route error:', error);
    // Log more details about the error
    if (error instanceof Error) {
      console.error('API route error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred' 
    }, { status: 500 });
  }
} 