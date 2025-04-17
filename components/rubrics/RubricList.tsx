'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import type { Rubric } from '@/app/types/rubric';
import ConfirmationDialog from '../ConfirmationDialog';

interface RubricListProps {
  onView?: (rubric: Rubric) => void;
  onEdit?: (rubric: Rubric) => void;
  onSelect?: (rubric: Rubric) => void;
  selectionMode?: boolean;
  selectedRubricId?: string;
}

export default function RubricList({
  onView,
  onEdit,
  onSelect,
  selectionMode = false,
  selectedRubricId
}: RubricListProps) {
  const [rubrics, setRubrics] = useState<Rubric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rubricToDelete, setRubricToDelete] = useState<Rubric | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  // Load rubrics on component mount
  useEffect(() => {
    loadRubrics();
  }, []);

  const loadRubrics = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/rubrics');
      if (!response.ok) {
        throw new Error(`Failed to load rubrics: ${response.status}`);
      }
      const data = await response.json();
      setRubrics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rubrics');
      toast.error('Failed to load rubrics');
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async (rubric: Rubric) => {
    try {
      if (rubric.isDefault) return; // Already default

      const response = await fetch(`/api/rubrics/${rubric.id}/default`, {
        method: 'PUT'
      });

      if (!response.ok) {
        throw new Error(`Failed to set default: ${response.status}`);
      }

      toast.success(`${rubric.name} set as default rubric`);
      await loadRubrics(); // Reload to update UI
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to set default rubric');
    }
  };

  const handleDeleteClick = (rubric: Rubric) => {
    setRubricToDelete(rubric);
    setShowDeleteConfirmation(true);
  };

  const confirmDelete = async () => {
    if (!rubricToDelete) return;

    try {
      const response = await fetch(`/api/rubrics/${rubricToDelete.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`Failed to delete: ${response.status}`);
      }

      toast.success(`${rubricToDelete.name} deleted successfully`);
      setShowDeleteConfirmation(false);
      setRubricToDelete(null);
      await loadRubrics(); // Reload to update UI
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete rubric');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-700"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-lg">
        <p className="font-semibold">Error loading rubrics</p>
        <p>{error}</p>
        <button
          onClick={loadRubrics}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (rubrics.length === 0) {
    return (
      <div className="p-6 bg-gray-50 rounded-lg text-center">
        <p className="text-gray-600 mb-4">No rubrics found. Create a new rubric to get started.</p>
        <Link href="/rubrics/new">
          <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
            Create New Rubric
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {rubrics.map((rubric) => (
        <div
          key={rubric.id}
          className={`p-4 bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow ${
            selectionMode && selectedRubricId === rubric.id ? 'border-purple-500 ring-2 ring-purple-200' : ''
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center">
                <h3 className="text-lg font-semibold">{rubric.name}</h3>
                {rubric.isDefault && (
                  <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                    Default
                  </span>
                )}
              </div>
              <p className="text-gray-600 text-sm mt-1">{rubric.description}</p>
              <p className="text-gray-500 text-xs mt-2">
                {rubric.criteria.length} criteria • Last updated: {new Date(rubric.updatedAt).toLocaleDateString()}
              </p>
            </div>

            <div className="flex space-x-2">
              {selectionMode ? (
                <button
                  onClick={() => onSelect?.(rubric)}
                  className={`px-3 py-1 rounded text-sm ${
                    selectedRubricId === rubric.id
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                >
                  {selectedRubricId === rubric.id ? 'Selected' : 'Select'}
                </button>
              ) : (
                <>
                  {onView && (
                    <button
                      onClick={() => onView(rubric)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                      title="View details"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                  )}

                  {onEdit && (
                    <button
                      onClick={() => onEdit(rubric)}
                      className="p-2 text-green-600 hover:bg-green-50 rounded"
                      title="Edit rubric"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  )}

                  {!rubric.isDefault && (
                    <button
                      onClick={() => handleSetDefault(rubric)}
                      className="p-2 text-yellow-600 hover:bg-yellow-50 rounded"
                      title="Set as default"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    </button>
                  )}

                  {!rubric.isDefault && (
                    <button
                      onClick={() => handleDeleteClick(rubric)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                      title="Delete rubric"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      ))}

      <ConfirmationDialog
        isOpen={showDeleteConfirmation}
        title="Delete Rubric"
        message={`Are you sure you want to delete "${rubricToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={() => {
          setShowDeleteConfirmation(false);
          setRubricToDelete(null);
        }}
        isDestructive={true}
      />
    </div>
  );
} 