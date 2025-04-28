"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Toaster, toast } from 'react-hot-toast';
import RubricGenerator from '@/components/RubricGenerator';
import { RubricTemplate } from '@/app/types/rubricGenerator';
import { saveRubric } from '@/app/utils/rubricService';
import BackButton from '@/components/BackButton';

export default function RubricGeneratorPage() {
  const router = useRouter();
  const [generatedRubric, setGeneratedRubric] = useState<RubricTemplate | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const handleRubricGenerated = (rubric: RubricTemplate) => {
    setGeneratedRubric(rubric);
    
    // Store in localStorage for immediate use
    localStorage.setItem('wineEvaluationRubric', JSON.stringify(rubric));
  };

  const handleSaveRubric = async () => {
    if (!generatedRubric) {
      toast.error('No rubric to save');
      return;
    }
    
    setIsSaving(true);
    
    try {
      await saveRubric(generatedRubric);
      toast.success('Rubric saved successfully!');
      
      // Redirect to the dashboard after a short delay
      setTimeout(() => {
        router.push('/');
      }, 1500);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save rubric';
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUseRubric = () => {
    // Redirect to the main dashboard with the rubric
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Toaster position="top-right" />
      
      <div className="max-w-4xl mx-auto">
        <BackButton />
        
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Wine Sales Rubric Generator
          </h1>
          <p className="text-xl text-gray-600">
            Create a customized evaluation rubric based on your specific scenario and requirements
          </p>
        </div>
        
        {!generatedRubric ? (
          <RubricGenerator onRubricGenerated={handleRubricGenerated} />
        ) : (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{generatedRubric.title}</h2>
            <p className="text-gray-700 mb-6">{generatedRubric.description}</p>
            
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">Evaluation Criteria</h3>
              <div className="space-y-4">
                {Object.entries(generatedRubric.criteriaWeights).map(([criterion, weight]) => (
                  <div key={criterion} className="flex justify-between items-center border-b pb-3">
                    <div>
                      <h4 className="font-medium">{criterion}</h4>
                      <p className="text-sm text-gray-600">{generatedRubric.criteriaDescriptions[criterion]}</p>
                    </div>
                    <span className="font-medium text-purple-700">{weight}%</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">Scoring Levels</h3>
              <div className="space-y-2">
                {Object.entries(generatedRubric.scoringLevels).map(([level, description]) => (
                  <div key={level} className="flex items-start">
                    <span className="font-medium text-purple-700 w-8">{level}</span>
                    <span className="text-gray-700">{description}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 mt-8">
              <button
                onClick={handleUseRubric}
                className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 transition-colors"
              >
                Use This Rubric
              </button>
              
              <button
                onClick={handleSaveRubric}
                disabled={isSaving}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors flex justify-center items-center"
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving Rubric...
                  </>
                ) : (
                  'Save Rubric'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 