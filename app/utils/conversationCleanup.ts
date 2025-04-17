import { marked } from 'marked';

export const cleanupConversation = async (markdown: string): Promise<string> => {
  try {
    console.log('Starting conversation cleanup process...');
    console.log('Original markdown length:', markdown.length);
    
    // Call Claude API to clean up the conversation
    console.log('Sending cleanup request to Claude API...');
    const response = await fetch('/api/cleanup-conversation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ markdown }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('Cleanup API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      throw new Error('Failed to clean up conversation');
    }

    console.log('Received response from cleanup API');
    const data = await response.json();
    console.log('Cleaned markdown length:', data.cleanedMarkdown?.length || 0);

    if (!data.cleanedMarkdown) {
      console.error('No cleaned markdown returned from API');
      throw new Error('No cleaned markdown returned from API');
    }

    return data.cleanedMarkdown;
  } catch (error) {
    console.error('Error in cleanupConversation:', error);
    throw error;
  }
}; 