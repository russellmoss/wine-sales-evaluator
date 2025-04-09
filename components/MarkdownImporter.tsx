"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { WineEvaluation } from '@/types/evaluation';
import { validateEvaluationData } from '@/types/evaluation';
import LoadingIndicator from './LoadingIndicator';

interface MarkdownImporterProps {
  onEvaluationData: (data: WineEvaluation) => void;
  isAnalyzing: boolean;
  setIsAnalyzing: (analyzing: boolean) => void;
}

const MarkdownImporter: React.FC<MarkdownImporterProps> = ({ 
  onEvaluationData, 
  isAnalyzing, 
  setIsAnalyzing 
}) => {
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [localAnalyzing, setLocalAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync local analyzing state with parent component
  useEffect(() => {
    setLocalAnalyzing(isAnalyzing);
  }, [isAnalyzing]);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setLocalAnalyzing(true);
    setIsAnalyzing(true);
    setError(null);

    try {
      // Read the file content
      const reader = new FileReader();
      
      // Create a promise to handle the file reading
      const fileContentPromise = new Promise<string>((resolve, reject) => {
        reader.onload = (e) => {
          const content = e.target?.result as string;
          resolve(content);
        };
        reader.onerror = () => {
          reject(new Error('Failed to read file'));
        };
      });
      
      // Start reading the file
      reader.readAsText(file);
      
      // Wait for the file to be read
      const content = await fileContentPromise;
      
      // Send the content to the API
      const response = await fetch('/api/analyze-conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          markdown: content,
          fileName: file.name
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error: ${response.status}`);
      }

      const data = await response.json();
      
      // Validate the data structure using the proper validation function
      if (!validateEvaluationData(data)) {
        throw new Error('Invalid evaluation data structure received from API');
      }
      
      // Pass the data to the parent component
      onEvaluationData(data);
    } catch (err) {
      console.error('Error analyzing conversation:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while analyzing the file');
    } finally {
      setLocalAnalyzing(false);
      setIsAnalyzing(false);
      if (!error) {
        setFileName(null);
      }
    }
  }, [onEvaluationData, setIsAnalyzing, error]);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center">
        <input
          type="file"
          ref={fileInputRef}
          accept=".md,.txt"
          onChange={handleFileUpload}
          disabled={localAnalyzing}
          className="hidden"
        />
        
        <button
          onClick={handleButtonClick}
          disabled={localAnalyzing}
          className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center w-full max-w-md"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
          </svg>
          {localAnalyzing ? 'Analyzing...' : 'Select Markdown File'}
        </button>
        
        {fileName && !localAnalyzing && (
          <p className="mt-2 text-sm text-gray-600">Selected file: {fileName}</p>
        )}
      </div>
      
      {localAnalyzing && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg w-full">
          <LoadingIndicator message="Analyzing conversation with Claude..." />
        </div>
      )}
      
      {error && (
        <div className="text-red-500 text-sm mt-2">{error}</div>
      )}
    </div>
  );
};

export default MarkdownImporter; 