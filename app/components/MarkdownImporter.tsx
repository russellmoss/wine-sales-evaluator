"use client";

import React, { FC, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { validateEvaluationData } from '../utils/validation';
import { EvaluationData } from '../types/evaluation';

interface MarkdownImporterProps {
  onAnalysisComplete: (data: EvaluationData) => void;
  isAnalyzing: boolean;
  setIsAnalyzing: (isAnalyzing: boolean) => void;
}

const MarkdownImporter: FC<MarkdownImporterProps> = ({ onAnalysisComplete, isAnalyzing, setIsAnalyzing }) => {
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

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
    
    try {
      setIsAnalyzing(true);
      setError(null);
      setJobId(null);

      // Check if we should use direct evaluation (for development or if env var is set)
      const useDirectEvaluation = process.env.NEXT_PUBLIC_USE_DIRECT_EVALUATION === 'true' || 
                                  process.env.NODE_ENV === 'development';
      
      if (useDirectEvaluation) {
        console.log('Using direct evaluation mode (development or env var set)');
        toast('Using direct evaluation mode (no background processing)');
        
        // Call the direct evaluation endpoint
        const response = await fetch('/.netlify/functions/analyze-conversation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            markdown: markdown,
            fileName: fileName,
            directEvaluation: true
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Error: ${response.status}`);
        }

        const { result } = await response.json();
        
        if (!result) {
          throw new Error('No result returned from direct evaluation');
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
        
        return;
      }

      // Start the analysis job
      const response = await fetch('/.netlify/functions/analyze-conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          markdown: markdown,
          fileName: fileName
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
      
      // Store job ID for polling
      setJobId(jobId);
      
      // Show toast notification
      toast.success('Analysis started! This may take a minute...');

      // Poll for job status
      let completed = false;
      let result = null;
      let retryCount = 0;
      const startTime = Date.now();
      const MAX_POLLING_TIME = 300000; // 300 seconds max polling time
      
      while (!completed && retryCount < 20 && (Date.now() - startTime) < MAX_POLLING_TIME) {
        // Wait 3 seconds between polls
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        try {
          const statusResponse = await fetch(`/.netlify/functions/check-job-status?jobId=${jobId}`, {
            method: 'GET'
          });
          
          if (!statusResponse.ok) {
            // If 404, job not found yet in KV store - retry
            if (statusResponse.status === 404) {
              console.log(`Job ${jobId} not found yet, retrying... (${retryCount + 1}/20)`);
              retryCount++;
              continue;
            }
            throw new Error(`Error checking status: ${statusResponse.status}`);
          }
          
          const job = await statusResponse.json();
          
          if (job.status === 'completed') {
            completed = true;
            result = job.result;
          } else if (job.status === 'failed') {
            throw new Error(job.error || 'Analysis failed');
          } else {
            console.log(`Job status: ${job.status}`);
            // Still processing, continue polling
          }
        } catch (error) {
          console.error('Error checking job status:', error);
          // If we get repeated errors, increment retry count
          retryCount++;
        }
      }
      
      if (!completed) {
        console.error(`Job polling timed out after ${(Date.now() - startTime) / 1000} seconds`);
        
        // Try direct evaluation as a fallback
        toast('Background job timed out. Trying direct evaluation...');
        
        const directResponse = await fetch('/.netlify/functions/analyze-conversation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            markdown: markdown,
            fileName: fileName,
            directEvaluation: true
          }),
        });

        if (!directResponse.ok) {
          throw new Error('Direct evaluation also failed');
        }

        const { result: directResult } = await directResponse.json();
        
        if (!directResult) {
          throw new Error('No result returned from direct evaluation');
        }
        
        result = directResult;
      }
      
      if (!result) {
        throw new Error('No result returned from analysis');
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
      setJobId(null);
      
    } catch (error) {
      console.error('Error analyzing conversation:', error);
      setError(error instanceof Error ? error.message : 'An error occurred during analysis');
      toast.error(error instanceof Error ? error.message : 'Error analyzing conversation. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Upload Conversation Markdown
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept=".md,.txt"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100"
          disabled={isAnalyzing}
        />
      </div>
      
      <button
        onClick={analyzeConversation}
        disabled={!markdown || isAnalyzing}
        className={`w-full py-2 px-4 rounded-md text-white font-medium
          ${!markdown || isAnalyzing
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700'
          }`}
      >
        {isAnalyzing ? (
          <div className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {jobId ? `Analyzing (Job: ${jobId.substring(0, 8)}...)` : 'Analyzing...'}
          </div>
        ) : (
          'Analyze Conversation'
        )}
      </button>
      
      {error && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}
    </div>
  );
};

export default MarkdownImporter; 