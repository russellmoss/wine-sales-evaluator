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
      // Call the API to analyze the conversation
      const response = await fetch('/api/analyze-conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          markdown,
          fileName 
        }),
      });
      
      // Get the response text first
      const responseText = await response.text();
      
      // Handle non-OK responses
      if (!response.ok) {
        let errorMessage = `Error: ${response.status}`;
        
        try {
          // Try to parse the error as JSON
          const errorData = JSON.parse(responseText);
          if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (e) {
          // If the error can't be parsed as JSON, use the raw text
          if (responseText) {
            errorMessage = responseText.substring(0, 100); // Limit error message length
          }
        }
        
        throw new Error(errorMessage);
      }
      
      // Try multiple approaches to extract valid JSON from the response
      let evaluationData: EvaluationData | null = null;
      let parseError: Error | null = null;
      
      // Approach 1: Direct JSON parse
      try {
        evaluationData = JSON.parse(responseText);
      } catch (e) {
        parseError = e as Error;
        console.log('Direct JSON parse failed, trying alternative approaches');
      }
      
      // Approach 2: Look for JSON code blocks
      if (!evaluationData) {
        const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch) {
          try {
            evaluationData = JSON.parse(codeBlockMatch[1].trim());
            console.log('Successfully extracted JSON from code block');
          } catch (e) {
            console.log('Failed to parse JSON from code block');
          }
        }
      }
      
      // Approach 3: Look for JSON object with curly braces
      if (!evaluationData) {
        const jsonMatch = responseText.match(/(\{[\s\S]*\})/);
        if (jsonMatch) {
          try {
            evaluationData = JSON.parse(jsonMatch[0]);
            console.log('Successfully extracted JSON from text');
          } catch (e) {
            console.log('Failed to parse JSON from text match');
          }
        }
      }
      
      // Approach 4: Look for JSON array with square brackets
      if (!evaluationData) {
        const arrayMatch = responseText.match(/(\[[\s\S]*\])/);
        if (arrayMatch) {
          try {
            evaluationData = JSON.parse(arrayMatch[0]);
            console.log('Successfully extracted JSON array from text');
          } catch (e) {
            console.log('Failed to parse JSON array from text match');
          }
        }
      }
      
      // If all approaches failed, throw an error
      if (!evaluationData) {
        console.error('All JSON parsing attempts failed:', parseError);
        throw new Error('Failed to parse evaluation data from response');
      }
      
      // Validate the evaluation data structure
      const validationResult = validateEvaluationData(evaluationData);
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