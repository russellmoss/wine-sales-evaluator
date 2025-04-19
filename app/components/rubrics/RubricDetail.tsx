'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Rubric } from '../../types/rubric';
import { RubricApi } from '../../utils/rubric-api';
import { exportRubricToPDF, exportRubricToJSON } from '../../utils/rubric-export';

interface RubricDetailProps {
  rubricId: string;
  onEdit?: (rubric: Rubric) => void;
  onBack?: () => void;
}

const RubricDetail: React.FC<RubricDetailProps> = ({
  rubricId,
  onEdit,
  onBack
}) => {
  const [rubric, setRubric] = useState<Rubric | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const loadRubric = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await RubricApi.getRubric(rubricId);
        setRubric(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load rubric');
      } finally {
        setLoading(false);
      }
    };
    
    loadRubric();
  }, [rubricId]);
  
  const handleSetDefault = async () => {
    if (!rubric || rubric.isDefault) return;
    
    try {
      await RubricApi.setDefaultRubric(rubric.id);
      toast.success(`${rubric.name} set as default rubric`);
      // Update the local state
      setRubric(prevRubric => prevRubric ? { ...prevRubric, isDefault: true } : null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to set default rubric');
    }
  };
  
  const handleExportPDF = () => {
    if (!rubric) return;
    
    try {
      exportRubricToPDF(rubric);
      toast.success('Rubric exported as PDF');
    } catch (error) {
      console.error('Error exporting rubric:', error);
      toast.error('Failed to export rubric. Please try again.');
    }
  };
  
  const handleExportJSON = () => {
    if (!rubric) return;
    
    try {
      exportRubricToJSON(rubric);
      toast.success('Rubric exported as JSON');
    } catch (error) {
      console.error('Error exporting rubric:', error);
      toast.error('Failed to export rubric. Please try again.');
    }
  };
  
  if (loading) {
    return (
      <div className="p-4 flex justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-700"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-lg">
        <p className="font-semibold">Error loading rubric</p>
        <p>{error}</p>
        <div className="mt-4 flex space-x-2">
          {onBack && (
            <button
              onClick={onBack}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Back
            </button>
          )}
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
  
  if (!rubric) {
    return (
      <div className="p-4 bg-yellow-50 text-yellow-700 rounded-lg">
        <p>Rubric not found</p>
        {onBack && (
          <button
            onClick={onBack}
            className="mt-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Back
          </button>
        )}
      </div>
    );
  }
  
  return (
    <div className="bg-white shadow-sm rounded-lg">
      <div className="p-6 border-b">
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center">
              <h2 className="text-2xl font-semibold">{rubric.name}</h2>
              {rubric.isDefault && (
                <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                  Default
                </span>
              )}
            </div>
            <p className="text-gray-600 mt-1">{rubric.description}</p>
          </div>
          
          <div className="flex space-x-2">
            {onBack && (
              <button
                onClick={onBack}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
              >
                Back
              </button>
            )}
            
            <button
              onClick={handleExportPDF}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export PDF
            </button>
            
            <button
              onClick={handleExportJSON}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export JSON
            </button>
            
            {onEdit && (
              <button
                onClick={() => onEdit(rubric)}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Edit
              </button>
            )}
            
            {!rubric.isDefault && (
              <button
                onClick={handleSetDefault}
                className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
              >
                Set as Default
              </button>
            )}
          </div>
        </div>
        
        <div className="mt-4 text-sm text-gray-500">
          <p>Created: {new Date(rubric.createdAt).toLocaleString()}</p>
          <p>Last Updated: {new Date(rubric.updatedAt).toLocaleString()}</p>
        </div>
      </div>
      
      <div className="p-6">
        <h3 className="text-xl font-semibold mb-4">Criteria</h3>
        <div className="space-y-6">
          {rubric.criteria.map((criterion, index) => (
            <div key={criterion.id} className="border-b pb-4 last:border-0">
              <div className="flex justify-between">
                <h4 className="text-lg font-medium">
                  {index + 1}. {criterion.name}
                </h4>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded">
                  Weight: {criterion.weight}%
                </span>
              </div>
              
              <p className="text-gray-600 mt-1 italic">{criterion.description}</p>
              
              <div className="mt-4 grid grid-cols-1 md:grid-cols-5 gap-2">
                {criterion.scoringLevels
                  .sort((a, b) => a.score - b.score)
                  .map((level) => (
                    <div key={level.score} className="bg-gray-50 p-3 rounded border">
                      <div className="font-semibold">Score {level.score}</div>
                      <div className="text-sm text-gray-600 mt-1">{level.description}</div>
                    </div>
                  ))
                }
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="p-6 border-t">
        <h3 className="text-xl font-semibold mb-4">Performance Levels</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {rubric.performanceLevels
            .sort((a, b) => a.minScore - b.minScore)
            .map((level) => (
              <div key={level.name} className="bg-gray-50 p-4 rounded border">
                <div className="font-semibold text-lg">{level.name}</div>
                <div className="text-gray-700 mt-1">{level.minScore}-{level.maxScore}%</div>
                <div className="text-sm text-gray-600 mt-2">{level.description}</div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
};

export default RubricDetail; 