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

    console.log('MarkdownImporter: File selected:', file.name, 'Size:', file.size, 'bytes');
    setFileName(file.name);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      console.log('MarkdownImporter: File content loaded, length:', content.length);
      console.log('MarkdownImporter: First 100 chars of content:', content.substring(0, 100));
      setMarkdown(content);
    };
    
    reader.onerror = (error) => {
      console.error('MarkdownImporter: Error reading file:', error);
      toast.error('Error reading file. Please try again.');
    };
    
    reader.readAsText(file);
  };

  // Add a useEffect to log when markdown state changes
  useEffect(() => {
    if (markdown) {
      console.log('MarkdownImporter: Markdown state updated, length:', markdown.length);
    } else {
      console.log('MarkdownImporter: Markdown state is null');
    }
  }, [markdown]);

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
      toast.error('Please upload a markdown file first');
      return;
    }

    try {
      setIsAnalyzing(true);
      setError(null);

      // Generate a consistent job ID
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const jobId = `job_${timestamp}_${randomStr}`;
      setJobId(jobId);

      console.log('Starting analysis with job ID:', jobId);

      // Send the markdown content to the API
      const response = await fetch('/api/analyze-conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          markdown,
          fileName,
          jobId,
          rubricId: selectedRubricId,
          model: 'gemini'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze conversation');
      }

      const data = await response.json();
      console.log('Analysis response:', data);

      // Start polling for job status
      let retries = 0;
      const maxRetries = 20;
      const pollInterval = 3000; // 3 seconds

      const pollJobStatus = async () => {
        try {
          console.log(`Polling job status (attempt ${retries + 1}/${maxRetries}) for job ID: ${jobId}`);
          const statusResponse = await fetch(`/api/check-job-status?jobId=${jobId}`);
          
          if (!statusResponse.ok) {
            throw new Error('Failed to check job status');
          }

          const statusData = await statusResponse.json();
          console.log('Job status response:', statusData);

          if (statusData.status === 'completed') {
            console.log('Job completed successfully');
            if (statusData.results) {
              onAnalysisComplete(statusData.results, markdown, fileName);
            } else {
              throw new Error('No results found in completed job');
            }
          } else if (statusData.status === 'failed') {
            throw new Error(statusData.error || 'Job failed');
          } else if (retries < maxRetries) {
            retries++;
            setTimeout(pollJobStatus, pollInterval);
          } else {
            throw new Error('Job timed out');
          }
        } catch (error) {
          console.error('Error polling job status:', error);
          setError(error instanceof Error ? error.message : 'An error occurred');
          setIsAnalyzing(false);
        }
      };

      // Start polling
      pollJobStatus();
    } catch (error) {
      console.error('Error analyzing conversation:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
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