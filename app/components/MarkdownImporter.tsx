"use client";

import React, { FC, useRef, useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { validateEvaluationData } from '../utils/validation';
import { EvaluationData } from '../types/evaluation';
import { Rubric } from '../types/rubric';
import { RubricApi } from '../utils/rubric-api';
import ModelSelector, { ModelType } from './ModelSelector';

interface MarkdownImporterProps {
  onAnalysisComplete: (data: EvaluationData, markdown: string, fileName: string) => void;
  isAnalyzing: boolean;
  setIsAnalyzing: (isAnalyzing: boolean) => void;
}

const MarkdownImporter: FC<MarkdownImporterProps> = ({ onAnalysisComplete, isAnalyzing, setIsAnalyzing }) => {
  console.log('MarkdownImporter: Component rendering');
  
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<ModelType>('claude');
  
  const [rubrics, setRubrics] = useState<Rubric[]>([]);
  const [selectedRubricId, setSelectedRubricId] = useState<string>('');
  const [loadingRubrics, setLoadingRubrics] = useState<boolean>(false);
  
  useEffect(() => {
    console.log('MarkdownImporter: Component mounted, loading rubrics...');
    const loadRubrics = async () => {
      try {
        setLoadingRubrics(true);
        const data = await RubricApi.listRubrics();
        console.log('MarkdownImporter: Rubrics loaded:', data);
        setRubrics(data);
        
        const defaultRubric = data.find(r => r.isDefault);
        console.log('MarkdownImporter: Default rubric:', defaultRubric);
        if (defaultRubric) {
          setSelectedRubricId(defaultRubric.id);
        } else if (data.length > 0) {
          console.log('MarkdownImporter: No default rubric, using first one:', data[0]);
          setSelectedRubricId(data[0].id);
        }
      } catch (err) {
        console.error('MarkdownImporter: Error loading rubrics:', err);
        toast.error('Failed to load rubrics. Using default evaluation criteria.');
      } finally {
        setLoadingRubrics(false);
      }
    };
    
    loadRubrics();
  }, []);

  // Log state changes
  useEffect(() => {
    console.log('MarkdownImporter: State updated:', {
      rubrics: rubrics.length,
      selectedRubricId,
      loadingRubrics
    });
  }, [rubrics, selectedRubricId, loadingRubrics]);

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

  const handleCleanup = async () => {
    if (!markdown) {
      toast.error('Please upload a conversation first');
      return;
    }

    try {
      setIsAnalyzing(true);
      const response = await fetch('/api/cleanup-conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ markdown }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to clean up conversation');
      }

      const { cleanedMarkdown, pdfBuffer } = await response.json();

      // Create PDF blob and download
      const pdfBlob = new Blob([Buffer.from(pdfBuffer, 'base64')], { type: 'application/pdf' });
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = pdfUrl;
      a.download = 'cleaned_conversation.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(pdfUrl);

      // Also save the cleaned markdown
      const markdownBlob = new Blob([cleanedMarkdown], { type: 'text/markdown' });
      const markdownUrl = URL.createObjectURL(markdownBlob);
      const markdownLink = document.createElement('a');
      markdownLink.href = markdownUrl;
      markdownLink.download = 'cleaned_conversation.md';
      document.body.appendChild(markdownLink);
      markdownLink.click();
      document.body.removeChild(markdownLink);
      URL.revokeObjectURL(markdownUrl);

      toast.success('Conversation cleaned and downloaded');
    } catch (error) {
      console.error('Error cleaning up conversation:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to clean up conversation');
    } finally {
      setIsAnalyzing(false);
    }
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

      const useDirectEvaluation = process.env.NEXT_PUBLIC_USE_DIRECT_EVALUATION === 'true' || 
                                  process.env.NODE_ENV === 'development';
      
      if (useDirectEvaluation) {
        console.log('Using direct evaluation mode with rubric:', selectedRubricId);
        console.log('Using model:', selectedModel);
        toast('Using direct evaluation mode');
        
        const response = await fetch('/api/analyze-conversation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            markdown: markdown,
            fileName: fileName,
            rubricId: selectedRubricId || undefined,
            model: selectedModel,
            directEvaluation: true
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.error('API error response:', errorData);
          throw new Error(errorData.error || `API error: ${response.status} ${response.statusText}`);
        }
        
        const { jobId, result, message } = await response.json();
        
        if (!result) {
          throw new Error('No result returned from direct evaluation');
        }
        
        // Add model information to the result
        const resultWithModel = {
          ...result,
          model: selectedModel
        };
        
        const validationResult = validateEvaluationData(resultWithModel);
        if (!validationResult.isValid) {
          console.warn('Validation issues found:', validationResult.errors);
          toast.error('The evaluation data has some issues, but we\'ll try to use it anyway');
        }
        
        onAnalysisComplete(validationResult.data, markdown, fileName);
        toast.success(`${selectedModel === 'gemini' ? 'Gemini' : 'Claude'} evaluation completed successfully!`);
        
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        setMarkdown(null);
        setFileName('');
        setJobId(jobId);
        
        return;
      }

      const response = await fetch('/api/analyze-conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversation: markdown,
          staffName: 'Staff Member',
          date: new Date().toISOString().split('T')[0],
          rubricId: selectedRubricId || undefined,
          model: selectedModel
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('API error response:', errorData);
        throw new Error(errorData.error || `API error: ${response.status} ${response.statusText}`);
      }

      const { jobId, message } = await response.json();
      
      if (!jobId) {
        throw new Error('No job ID received');
      }
      
      setJobId(jobId);
      
      toast.success('Analysis started! This may take a minute...');

      let completed = false;
      let result = null;
      let retryCount = 0;
      const startTime = Date.now();
      const MAX_POLLING_TIME = 300000;
      
      while (!completed && retryCount < 20 && (Date.now() - startTime) < MAX_POLLING_TIME) {
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        try {
          const statusResponse = await fetch(`/api/check-job-status?jobId=${jobId}`, {
            method: 'GET'
          });
          
          if (!statusResponse.ok) {
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
          }
        } catch (error) {
          console.error('Error checking job status:', error);
          retryCount++;
        }
      }
      
      if (!completed) {
        console.error(`Job polling timed out after ${(Date.now() - startTime) / 1000} seconds`);
        
        toast('Background job timed out. Trying direct evaluation...');
        
        const directResponse = await fetch('/api/analyze-conversation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            conversation: markdown,
            staffName: 'Staff Member',
            date: new Date().toISOString().split('T')[0],
            directEvaluation: true,
            rubricId: selectedRubricId || undefined
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
      
      const validationResult = validateEvaluationData(result);
      if (!validationResult.isValid) {
        console.warn('Validation issues found:', validationResult.errors);
        toast.error('The evaluation data has some issues, but we\'ll try to use it anyway');
      }
      
      onAnalysisComplete(validationResult.data, markdown, fileName);
      toast.success('Conversation analyzed successfully!');
      
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

  // Add console log to render function to verify state
  console.log('MarkdownImporter: Rendering with state:', {
    rubrics,
    selectedRubricId,
    loadingRubrics,
    markdown,
    fileName,
    error,
    jobId
  });

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <div className="mb-6">
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
          disabled={isAnalyzing || loadingRubrics}
        />
      </div>
      
      <ModelSelector
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        disabled={isAnalyzing || loadingRubrics}
      />
      
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Evaluation Rubric
        </label>
        {loadingRubrics ? (
          <div className="flex items-center text-gray-500">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500 mr-2"></div>
            Loading rubrics...
          </div>
        ) : rubrics.length > 0 ? (
          <select
            value={selectedRubricId}
            onChange={(e) => setSelectedRubricId(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            disabled={isAnalyzing}
          >
            {rubrics.map((rubric) => (
              <option key={rubric.id} value={rubric.id}>
                {rubric.name}{rubric.isDefault ? ' (Default)' : ''}
              </option>
            ))}
          </select>
        ) : (
          <div className="text-yellow-600">
            No rubrics found. Using default evaluation criteria.
          </div>
        )}
      </div>
      
      <div className="flex space-x-4">
        <button
          onClick={analyzeConversation}
          disabled={!markdown || isAnalyzing || loadingRubrics}
          className={`w-full py-2 px-4 rounded-md text-white font-medium
            ${!markdown || isAnalyzing || loadingRubrics
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

        <button
          onClick={handleCleanup}
          disabled={!markdown || isAnalyzing}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isAnalyzing ? 'Cleaning...' : 'Clean & Download'}
        </button>
      </div>
      
      {error && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}
    </div>
  );
};

export default MarkdownImporter; 