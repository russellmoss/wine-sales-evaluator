// Simple script to test the API route
const fetch = require('node-fetch');

async function testApi() {
  console.log('Testing API route...');
  
  try {
    // Test the health endpoint
    console.log('Testing health endpoint...');
    const healthResponse = await fetch('http://localhost:3000/api/health');
    console.log('Health endpoint response:', {
      status: healthResponse.status,
      statusText: healthResponse.statusText,
      ok: healthResponse.ok
    });
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('Health endpoint data:', healthData);
    }
    
    // Test the analyze-conversation endpoint
    console.log('Testing analyze-conversation endpoint...');
    const analyzeResponse = await fetch('http://localhost:3000/api/analyze-conversation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        markdown: '# Test Conversation\n\nThis is a test conversation.',
        fileName: 'test.md'
      }),
    });
    
    console.log('Analyze-conversation endpoint response:', {
      status: analyzeResponse.status,
      statusText: analyzeResponse.statusText,
      ok: analyzeResponse.ok
    });
    
    if (analyzeResponse.ok) {
      const analyzeData = await analyzeResponse.json();
      console.log('Analyze-conversation endpoint data:', analyzeData);
    } else {
      const errorData = await analyzeResponse.json().catch(() => ({ error: 'Unknown error' }));
      console.error('Analyze-conversation endpoint error:', errorData);
    }
    
  } catch (error) {
    console.error('Error testing API:', error);
  }
}

testApi(); 