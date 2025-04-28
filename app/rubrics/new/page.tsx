'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import RubricEditor from '@/app/components/rubrics/RubricEditor';
import AIRubricGenerator from '@/app/components/rubrics/AIRubricGenerator';
import type { Rubric } from '@/app/types/rubric';
import { RubricApi } from '@/app/utils/rubric-api';
import { toast } from 'react-hot-toast';

export default function NewRubricPage() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showManualEditor, setShowManualEditor] = useState(false);
  
  const handleAIRubricGenerated = async (rubric: Rubric) => {
    try {
      // Save the generated rubric
      const savedRubric = await RubricApi.createRubric(rubric);
      router.push('/rubrics');
      toast.success('Rubric created successfully!');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save rubric');
      toast.error('Failed to save rubric');
    }
  };

  const handleSave = async (rubric: Rubric) => {
    try {
      await RubricApi.createRubric(rubric);
      router.push('/rubrics');
      toast.success('Rubric created successfully!');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save rubric');
      toast.error('Failed to save rubric');
    }
  };
  
  const handleCancel = () => {
    router.push('/rubrics');
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Create New Rubric</h1>
      
      {errorMessage && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg">
          {errorMessage}
        </div>
      )}

      {!showManualEditor ? (
        <>
          <AIRubricGenerator onRubricGenerated={handleAIRubricGenerated} />
          
          <div className="flex items-center justify-center my-8">
            <div className="w-full border-t border-gray-300"></div>
            <span className="px-4 text-gray-500">or</span>
            <div className="w-full border-t border-gray-300"></div>
          </div>
          
          <button
            onClick={() => setShowManualEditor(true)}
            className="w-full py-2 px-4 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Create Rubric Manually
          </button>
        </>
      ) : (
        <RubricEditor 
          onSave={handleSave} 
          onCancel={handleCancel}
        />
      )}
    </div>
  );
} 