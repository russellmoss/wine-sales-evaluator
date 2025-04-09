"use client";

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { WineEvaluation } from '@/types/evaluation';
import type { AnalysisState } from '@/types/analysis';
import MarkdownImporter from './MarkdownImporter';
import LoadingIndicator from './LoadingIndicator';

const WineEvaluationDashboard: React.FC = () => {
  const router = useRouter();
  const [analysisState, setAnalysisState] = useState<AnalysisState>({
    isAnalyzing: false,
    error: null,
    evaluationData: null
  });

  const handleAnalysisComplete = useCallback(async (data: WineEvaluation) => {
    try {
      // Set the evaluation data
      setAnalysisState(prev => ({
        ...prev,
        evaluationData: data,
        error: null
      }));
      
      // Store the data in localStorage
      localStorage.setItem('wineEvaluationData', JSON.stringify(data));
      
      // Verify the data was stored correctly
      const storedData = localStorage.getItem('wineEvaluationData');
      if (!storedData) {
        throw new Error('Failed to store evaluation data');
      }
      
      // Navigate to the detailed results page
      router.push('/detailed-results');
    } catch (err) {
      console.error('Error handling analysis completion:', err);
      setAnalysisState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to process evaluation data'
      }));
    }
  }, [router]);

  const setIsAnalyzing = useCallback((value: boolean) => {
    setAnalysisState(prev => ({
      ...prev,
      isAnalyzing: value
    }));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Wine Sales Performance Evaluator
          </h1>
          <p className="text-xl text-gray-600">
            Upload a markdown file containing a wine tasting conversation to analyze sales performance
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          {analysisState.isAnalyzing ? (
            <div className="flex flex-col items-center justify-center py-12">
              <LoadingIndicator message="Analyzing conversation with Claude..." />
              <p className="mt-4 text-gray-600">This may take a few moments...</p>
            </div>
          ) : (
            <MarkdownImporter
              onAnalysisComplete={handleAnalysisComplete}
              isAnalyzing={analysisState.isAnalyzing}
              setIsAnalyzing={setIsAnalyzing}
            />
          )}

          {analysisState.error && (
            <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg">
              {analysisState.error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WineEvaluationDashboard; 