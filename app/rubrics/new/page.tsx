'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import RubricEditor from '@/app/components/rubrics/RubricEditor';
import type { Rubric } from '@/app/types/rubric';

export default function NewRubricPage() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const handleSave = (rubric: Rubric) => {
    console.log('New rubric saved:', rubric);
    router.push('/rubrics');
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
      
      <RubricEditor 
        onSave={handleSave} 
        onCancel={handleCancel}
      />
    </div>
  );
} 