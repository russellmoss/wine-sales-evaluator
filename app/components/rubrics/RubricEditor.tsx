'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import type { Rubric, Criterion, PerformanceLevel } from '@/app/types/rubric';
import { RubricApi } from '@/app/utils/rubric-api';
import ConfirmationDialog from '../ConfirmationDialog';

interface RubricEditorProps {
  rubricId?: string;
  onSave?: (rubric: Rubric) => void;
  onCancel?: () => void;
}

const createEmptyCriterion = (): Criterion => ({
  id: uuidv4(),
  name: '',
  description: '',
  weight: 10,
  scoringLevels: [
    { score: 1, description: '' },
    { score: 2, description: '' },
    { score: 3, description: '' },
    { score: 4, description: '' },
    { score: 5, description: '' }
  ]
});

const defaultPerformanceLevels: PerformanceLevel[] = [
  { name: 'Exceptional', minScore: 90, maxScore: 100, description: 'Outstanding performance that exceeds expectations' },
  { name: 'Strong', minScore: 80, maxScore: 90, description: 'Very good performance with minor areas for improvement' },
  { name: 'Proficient', minScore: 70, maxScore: 80, description: 'Solid performance that meets expectations' },
  { name: 'Developing', minScore: 60, maxScore: 70, description: 'Basic performance with significant areas for improvement' },
  { name: 'Needs Improvement', minScore: 0, maxScore: 60, description: 'Performance requiring substantial improvement' }
];

export default function RubricEditor({ rubricId, onSave, onCancel }: RubricEditorProps) {
  const isEditing = !!rubricId;
  
  // Form state
  const [formData, setFormData] = useState<Partial<Rubric>>({
    name: '',
    description: '',
    isDefault: false,
    criteria: [],
    performanceLevels: []
  });
  
  // UI state
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Load existing rubric function
  const loadRubric = useCallback(async () => {
    if (!rubricId) return;
    
    try {
      setLoading(true);
      setError(null);
      const data = await RubricApi.getRubric(rubricId);
      setFormData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rubric');
      toast.error('Failed to load rubric');
    } finally {
      setLoading(false);
    }
  }, [rubricId]);

  // Load existing rubric if editing
  useEffect(() => {
    if (isEditing) {
      loadRubric();
    } else {
      // Initialize with default structure for new rubric
      setFormData({
        name: '',
        description: '',
        isDefault: false,
        criteria: [createEmptyCriterion()],
        performanceLevels: [
          { name: 'Exceptional', minScore: 90, maxScore: 100, description: 'Outstanding performance' },
          { name: 'Strong', minScore: 80, maxScore: 90, description: 'Very good performance' },
          { name: 'Proficient', minScore: 70, maxScore: 80, description: 'Solid performance' },
          { name: 'Developing', minScore: 60, maxScore: 70, description: 'Basic performance' },
          { name: 'Needs Improvement', minScore: 0, maxScore: 60, description: 'Requires substantial improvement' }
        ]
      });
    }
  }, [isEditing, loadRubric]);

  // Calculate total weight from all criteria
  const totalWeight = formData.criteria?.reduce((sum, criterion) => sum + (criterion.weight || 0), 0) || 0;
  const isWeightValid = totalWeight === 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate total weight
    if (!isWeightValid) {
      setValidationErrors([`Total weight must equal 100% (current: ${totalWeight}%)`]);
      toast.error('Total criteria weight must equal 100%');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setValidationErrors([]);
      
      let savedRubric: Rubric;
      
      if (isEditing) {
        savedRubric = await RubricApi.updateRubric(rubricId!, formData);
        toast.success('Rubric updated successfully');
      } else {
        // Ensure all required fields are present for a new rubric
        const newRubric = {
          name: formData.name || '',
          description: formData.description || '',
          isDefault: formData.isDefault || false,
          criteria: formData.criteria || [createEmptyCriterion()],
          performanceLevels: formData.performanceLevels || defaultPerformanceLevels
        };
        savedRubric = await RubricApi.createRubric(newRubric);
        toast.success('Rubric created successfully');
      }
      
      if (onSave) {
        onSave(savedRubric);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save rubric');
      toast.error('Failed to save rubric');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (hasUnsavedChanges()) {
      setShowCancelConfirmation(true);
    } else {
      onCancel?.();
    }
  };

  const hasUnsavedChanges = () => {
    return formData.name !== '' || formData.description !== '' || formData.criteria!.length > 1;
  };

  const addCriterion = () => {
    setFormData(prev => ({
      ...prev,
      criteria: [...(prev.criteria || []), createEmptyCriterion()]
    }));
  };

  const removeCriterion = (index: number) => {
    setFormData(prev => {
      const newCriteria = [...(prev.criteria || [])];
      newCriteria.splice(index, 1);
      return {
        ...prev,
        criteria: newCriteria
      };
    });
  };

  const updateCriterion = (index: number, updates: Partial<Criterion>) => {
    setFormData(prev => {
      const newCriteria = [...(prev.criteria || [])];
      newCriteria[index] = {
        ...newCriteria[index],
        ...updates
      };
      return {
        ...prev,
        criteria: newCriteria
      };
    });
  };

  const updateScoringLevel = (criterionIndex: number, levelIndex: number, description: string) => {
    setFormData(prev => {
      const newCriteria = [...(prev.criteria || [])];
      const criterion = { ...newCriteria[criterionIndex] };
      const scoringLevels = [...criterion.scoringLevels];
      scoringLevels[levelIndex] = {
        ...scoringLevels[levelIndex],
        description
      };
      criterion.scoringLevels = scoringLevels;
      newCriteria[criterionIndex] = criterion;
      return {
        ...prev,
        criteria: newCriteria
      };
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-700"></div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-lg shadow p-6">
      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Rubric Name*
          </label>
          <input
            type="text"
            value={formData.name || ''}
            onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            value={formData.description || ''}
            onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
            rows={3}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="isDefault"
            checked={formData.isDefault || false}
            onChange={e => setFormData(prev => ({ ...prev, isDefault: e.target.checked }))}
            className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
          />
          <label htmlFor="isDefault" className="ml-2 block text-sm text-gray-700">
            Set as default rubric
          </label>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Evaluation Criteria</h3>
          <button
            type="button"
            onClick={addCriterion}
            className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            Add Criterion
          </button>
        </div>

        <div className="space-y-4">
          {formData.criteria?.map((criterion, index) => (
            <div key={criterion.id} className="border rounded-lg p-4 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-md font-medium">Criterion {index + 1}</h4>
                <button
                  type="button"
                  onClick={() => removeCriterion(index)}
                  className="text-red-600 hover:text-red-800"
                  disabled={formData.criteria?.length === 1}
                >
                  Remove
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Name*
                  </label>
                  <input
                    type="text"
                    value={criterion.name}
                    onChange={e => updateCriterion(index, { name: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Weight (%)*
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={criterion.weight}
                      onChange={e => {
                        const newWeight = parseInt(e.target.value) || 0;
                        updateCriterion(index, { weight: newWeight });
                      }}
                      className={`block w-full pr-10 ${
                        isWeightValid ? 'border-gray-300 focus:border-purple-500 focus:ring-purple-500' 
                        : 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      } rounded-md`}
                      required
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      {criterion.weight > 0 && (
                        <span className="text-gray-500 sm:text-sm">%</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  value={criterion.description}
                  onChange={e => updateCriterion(index, { description: e.target.value })}
                  rows={2}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Scoring Levels
                </label>
                {criterion.scoringLevels.map((level, levelIndex) => (
                  <div key={level.score} className="flex items-center space-x-2">
                    <span className="w-20 flex-shrink-0">Score {level.score}:</span>
                    <input
                      type="text"
                      value={level.description}
                      onChange={e => updateScoringLevel(index, levelIndex, e.target.value)}
                      className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                      placeholder={`Description for score ${level.score}`}
                      required
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-6 border-b">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-xl font-semibold">Evaluation Criteria</h3>
            <p className={`text-sm mt-1 ${isWeightValid ? 'text-green-600' : 'text-red-600'}`}>
              Total Weight: {totalWeight}% {isWeightValid ? '✓' : `(must equal 100%)`}
            </p>
          </div>
          <button
            type="button"
            onClick={addCriterion}
            className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            Add Criterion
          </button>
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-6">
        {onCancel && (
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            disabled={saving}
          >
            Cancel
          </button>
        )}
        
        <button
          type="submit"
          className={`px-4 py-2 text-white rounded-md flex items-center ${
            isWeightValid ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-400 cursor-not-allowed'
          }`}
          disabled={saving || !isWeightValid}
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Saving...
            </>
          ) : (
            'Save Rubric'
          )}
        </button>
      </div>

      <ConfirmationDialog
        isOpen={showCancelConfirmation}
        title="Discard Changes"
        message="Are you sure you want to discard your changes? This action cannot be undone."
        confirmText="Discard"
        cancelText="Continue Editing"
        onConfirm={() => onCancel?.()}
        onCancel={() => setShowCancelConfirmation(false)}
        isDestructive={true}
      />
    </form>
  );
} 