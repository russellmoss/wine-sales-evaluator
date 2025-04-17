'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import RubricEditor from '@/app/components/rubrics/RubricEditor';
import type { Rubric } from '@/app/types/rubric';

interface EditRubricPageProps {
  params: {
    id: string;
  };
}

export default function EditRubricPage({ params }: EditRubricPageProps) {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const handleSave = (rubric: Rubric) => {
    console.log('Rubric updated:', rubric);
    router.push('/rubrics');
  };
  
  const handleCancel = () => {
    router.push('/rubrics');
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Edit Rubric</h1>
      
      {errorMessage && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg">
          {errorMessage}
        </div>
      )}
      
      <RubricEditor 
        rubricId={params.id}
        onSave={handleSave} 
        onCancel={handleCancel}
      />
    </div>
  );
} 