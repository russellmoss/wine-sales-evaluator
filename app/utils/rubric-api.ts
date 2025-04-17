import { Rubric } from '../types/rubric';

// Helper function to get the base URL
function getBaseUrl() {
  // Get the configured base path from Next.js config
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  
  if (typeof window !== 'undefined') {
    // Client-side: Use the current origin + base path
    return `${window.location.origin}${basePath}`;
  }
  
  // Server-side
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const host = process.env.VERCEL_URL || process.env.RENDER_EXTERNAL_URL || 'localhost:3000';
  return `${protocol}://${host}${basePath}`;
}

// API client for rubric management
export const RubricApi = {
  // List all rubrics
  listRubrics: async (): Promise<Rubric[]> => {
    console.log('RubricApi: Fetching rubrics...');
    const response = await fetch(`${getBaseUrl()}/api/rubrics`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('RubricApi: Error fetching rubrics:', errorData);
      throw new Error(errorData.error || `Error listing rubrics: ${response.status}`);
    }
    const data = await response.json();
    console.log('RubricApi: Rubrics fetched successfully:', data);
    return data;
  },
  
  // Get a specific rubric
  getRubric: async (id: string): Promise<Rubric> => {
    const response = await fetch(`${getBaseUrl()}/api/rubrics/${id}`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `Error retrieving rubric: ${response.status}`);
    }
    return response.json();
  },
  
  // Create a new rubric
  createRubric: async (rubric: Omit<Rubric, 'id' | 'createdAt' | 'updatedAt'>): Promise<Rubric> => {
    const response = await fetch(`${getBaseUrl()}/api/rubrics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(rubric)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `Error creating rubric: ${response.status}`);
    }
    
    return response.json();
  },
  
  // Update an existing rubric
  updateRubric: async (id: string, rubric: Partial<Rubric>): Promise<Rubric> => {
    const response = await fetch(`${getBaseUrl()}/api/rubrics/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(rubric)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `Error updating rubric: ${response.status}`);
    }
    
    return response.json();
  },
  
  // Delete a rubric
  deleteRubric: async (id: string): Promise<boolean> => {
    const response = await fetch(`${getBaseUrl()}/api/rubrics/${id}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `Error deleting rubric: ${response.status}`);
    }
    
    const result = await response.json();
    return result.success;
  },
  
  // Set a rubric as default
  setDefaultRubric: async (id: string): Promise<Rubric> => {
    const response = await fetch(`${getBaseUrl()}/api/rubrics/${id}/default`, {
      method: 'PUT'
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `Error setting default rubric: ${response.status}`);
    }
    
    const result = await response.json();
    return result.rubric;
  }
};