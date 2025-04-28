'use client';

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { RubricTemplate } from '@/app/types/rubricGenerator';
import { Rubric } from '@/app/types/rubric';
import { generateRubric } from '@/app/utils/rubricService';
import { convertTemplateToRubric } from '@/app/utils/rubricConverter';
import { RubricApi } from '@/app/utils/rubric-api';

interface AIRubricGeneratorProps {
  onRubricGenerated: (rubric: Rubric) => void;
}

const AIRubricGenerator: React.FC<AIRubricGeneratorProps> = ({ onRubricGenerated }) => {
  const [scenarioFile, setScenarioFile] = useState<File | null>(null);
  const [scenarioData, setScenarioData] = useState<any | null>(null);
  const [requirements, setRequirements] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setScenarioFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        setScenarioData(data);
        setError(null);
      } catch (err) {
        setError('Invalid JSON file. Please upload a valid scenario file.');
        toast.error('Invalid JSON file');
      }
    };
    reader.readAsText(file);
  };

  const handleGenerateRubric = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!scenarioData) {
      toast.error('Please upload a scenario file');
      return;
    }
    
    if (!requirements.trim()) {
      toast.error('Please enter requirements for the rubric');
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    
    try {
      const template = await generateRubric(scenarioData, requirements);
      const rubric = convertTemplateToRubric(template);
      onRubricGenerated(rubric as Rubric);
      toast.success('Rubric generated successfully!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate rubric';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Generate Rubric with AI</h2>
      
      <form onSubmit={handleGenerateRubric} className="space-y-6">
        {/* Step 1: Upload Scenario */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Step 1: Upload Scenario JSON
          </label>
          <input
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-purple-50 file:text-purple-700
              hover:file:bg-purple-100"
            disabled={isGenerating}
          />
          {scenarioData && (
            <div className="mt-2 text-sm text-green-600">
              ✓ Scenario loaded: {scenarioData.title || 'Untitled Scenario'}
            </div>
          )}
        </div>
        
        {/* Step 2: Enter Requirements */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Step 2: Enter Rubric Requirements
          </label>
          <textarea
            value={requirements}
            onChange={(e) => setRequirements(e.target.value)}
            placeholder="Describe what the rubric should focus on (e.g., hospitality, personalization, overcoming objections, asking for the sale, wine club pitching, data capture)"
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
            rows={5}
            disabled={isGenerating}
          />
          <p className="mt-1 text-sm text-gray-500">
            Be specific about what areas you want to evaluate and their relative importance.
          </p>
        </div>
        
        {/* Submit Button */}
        <button
          type="submit"
          disabled={isGenerating || !scenarioData || !requirements.trim()}
          className={`w-full py-2 px-4 rounded-md text-white font-medium
            ${!scenarioData || !requirements.trim() || isGenerating
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-purple-600 hover:bg-purple-700'
            }`}
        >
          {isGenerating ? (
            <div className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating Rubric...
            </div>
          ) : (
            'Generate Rubric'
          )}
        </button>
      </form>
      
      {error && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}
    </div>
  );
};

export default AIRubricGenerator; 