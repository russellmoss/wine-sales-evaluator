'use client';

import { useState, useEffect } from 'react';
import { Rubric } from '../types/rubric';
import { RubricApi } from '../utils/rubric-api';

interface RubricSelectorProps {
  selectedRubric: Rubric | null;
  onRubricSelect: (rubric: Rubric) => void;
}

export function RubricSelector({ selectedRubric, onRubricSelect }: RubricSelectorProps) {
  const [rubrics, setRubrics] = useState<Rubric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadRubrics = async () => {
      try {
        const loadedRubrics = await RubricApi.listRubrics();
        setRubrics(loadedRubrics);
      } catch (err) {
        setError('Failed to load rubrics');
        console.error('Error loading rubrics:', err);
      } finally {
        setLoading(false);
      }
    };

    loadRubrics();
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 w-48 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-600">{error}</div>;
  }

  return (
    <div className="relative">
      <select
        value={selectedRubric?.id || ''}
        onChange={(e) => {
          const rubric = rubrics.find(r => r.id === e.target.value);
          if (rubric) {
            onRubricSelect(rubric);
          }
        }}
        className="block w-48 px-4 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="">Select a rubric</option>
        {rubrics.map((rubric) => (
          <option key={rubric.id} value={rubric.id}>
            {rubric.name}
            {rubric.isDefault ? ' (Default)' : ''}
          </option>
        ))}
      </select>
    </div>
  );
} 