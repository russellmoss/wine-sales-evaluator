"use client";

import React, { useState, useRef } from 'react';
import { toast } from 'react-hot-toast';
import type { WineEvaluation } from '@/types/evaluation';
import { validateEvaluationData } from '../utils/validation';
import { EvaluationData } from '../types/evaluation';

interface MarkdownImporterProps {
  onAnalysisComplete: (evaluationData: WineEvaluation) => void;
  isAnalyzing: boolean;
  setIsAnalyzing: (value: boolean) => void;
}

const MarkdownImporter: React.FC<MarkdownImporterProps> = ({ 
  onAnalysisComplete,
  isAnalyzing,
  setIsAnalyzing
}) => {
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setFileName(file.name);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setMarkdown(content);
    };
    reader.readAsText(file);
  };
  
  const analyzeConversation = async () => {
    if (!markdown) {
      toast.error('Please select a markdown file first');
      return;
    }
    
    setIsAnalyzing(true);
    
    try {
      // Start the analysis job
      const response = await fetch('/.netlify/functions/analyze-conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          markdown,
          fileName 
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error: ${response.status}`);
      }
      
      const { jobId, message } = await response.json();
      
      if (!jobId) {
        throw new Error('No job ID received');
      }
      
      // Show toast notification
      toast.success('Analysis started! This may take a minute...');
      
      // Poll for job status
      let completed = false;
      let result = null;
      
      while (!completed) {
        // Wait 3 seconds between polls
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const statusResponse = await fetch(`/.netlify/functions/check-job-status?jobId=${jobId}`, {
          method: 'GET'
        });
        
        if (!statusResponse.ok) {
          throw new Error(`Error checking status: ${statusResponse.status}`);
        }
        
        const job = await statusResponse.json();
        
        if (job.status === 'completed') {
          completed = true;
          result = job.result;
        } else if (job.status === 'failed') {
          throw new Error(job.error || 'Analysis failed');
        }
        
        // If still processing, continue polling
      }
      
      // Validate the evaluation data structure
      const validationResult = validateEvaluationData(result);
      if (!validationResult.isValid) {
        console.warn('Validation issues found:', validationResult.errors);
        toast.error('The evaluation data has some issues, but we\'ll try to use it anyway');
      }
      
      // Use the validated data
      onAnalysisComplete(validationResult.data);
      toast.success('Conversation analyzed successfully!');
      
      // Reset the form
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setMarkdown(null);
      setFileName('');
      
    } catch (error) {
      console.error('Error analyzing conversation:', error);
      toast.error(error instanceof Error ? error.message : 'Error analyzing conversation. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".md,.txt"
        className="hidden"
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        className="px-4 py-2 bg-purple-700 text-white rounded hover:bg-purple-600 flex items-center"
        disabled={isAnalyzing}
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
        </svg>
        Import Conversation
      </button>
      
      {fileName && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          <span className="text-sm text-gray-600 truncate max-w-xs">{fileName}</span>
          <button
            onClick={analyzeConversation}
            disabled={isAnalyzing}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 flex items-center"
          >
            {isAnalyzing ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Analyzing...
              </>
            ) : (
              <>Analyze with Claude</>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default MarkdownImporter; 