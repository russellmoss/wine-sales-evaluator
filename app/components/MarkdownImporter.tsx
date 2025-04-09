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
  const [evaluationData, setEvaluationData] = useState<EvaluationData | null>(null);

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
    try {
      setIsAnalyzing(true);
      setError(null);

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
        throw new Error(`Error starting analysis: ${response.status}`);
      }

      const { jobId } = await response.json();

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

      // Validate the evaluation data
      if (!result || !validateEvaluationData(result)) {
        throw new Error('Invalid evaluation data received');
      }

      // Update the evaluation data
      setEvaluationData(result);
      toast.success('Analysis completed successfully');

      // Reset the form
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setMarkdown(null);
      setFileName('');
      
    } catch (error) {
      console.error('Error analyzing conversation:', error);
      setError(error instanceof Error ? error.message : 'An error occurred during analysis');
      toast.error('Failed to analyze conversation');
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
        {isAnalyzing ? 'Analyzing...' : 'Analyze Conversation'}
      </button>
    </div>
  );
};

export default MarkdownImporter; 