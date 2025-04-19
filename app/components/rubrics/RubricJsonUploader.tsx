import { useState } from 'react';
import { toast } from 'react-hot-toast';
import type { Rubric } from '@/app/types/rubric';
import { validateRubric } from '@/app/utils/rubric-validation';

interface RubricJsonUploaderProps {
  onRubricLoaded: (rubric: Rubric) => void;
}

export default function RubricJsonUploader({ onRubricLoaded }: RubricJsonUploaderProps) {
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setError(null);
      const content = await file.text();
      const rubricData = JSON.parse(content);

      // Validate the rubric data
      const validation = validateRubric(rubricData);
      if (!validation.isValid) {
        setError(`Invalid rubric format: ${validation.errors.join(', ')}`);
        toast.error('Invalid rubric format');
        return;
      }

      // Call the callback with the loaded rubric
      onRubricLoaded(rubricData);
      toast.success('Rubric loaded successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse rubric JSON');
      toast.error('Failed to parse rubric JSON');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center w-full">
        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <svg className="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
            </svg>
            <p className="mb-2 text-sm text-gray-500">
              <span className="font-semibold">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-500">JSON file containing rubric data</p>
          </div>
          <input
            type="file"
            className="hidden"
            accept=".json"
            onChange={handleFileUpload}
          />
        </label>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg">
          {error}
        </div>
      )}
    </div>
  );
} 