import { Rubric } from '../types/rubric';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api';

export async function getRubric(id: string): Promise<Rubric> {
  const response = await fetch(`${API_BASE_URL}/rubrics/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch rubric');
  }
  return response.json();
}

export async function updateRubric(rubric: Rubric): Promise<Rubric> {
  const response = await fetch(`${API_BASE_URL}/rubrics/${rubric.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(rubric),
  });
  if (!response.ok) {
    throw new Error('Failed to update rubric');
  }
  return response.json();
}

export async function listRubrics(): Promise<Rubric[]> {
  const response = await fetch(`${API_BASE_URL}/rubrics`);
  if (!response.ok) {
    throw new Error('Failed to fetch rubrics');
  }
  return response.json();
}

export async function createRubric(rubric: Omit<Rubric, 'id' | 'createdAt' | 'updatedAt'>): Promise<Rubric> {
  const response = await fetch(`${API_BASE_URL}/rubrics`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(rubric),
  });
  if (!response.ok) {
    throw new Error('Failed to create rubric');
  }
  return response.json();
}

export async function deleteRubric(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/rubrics/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete rubric');
  }
} 