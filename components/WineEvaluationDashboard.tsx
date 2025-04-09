"use client";

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { WineEvaluation } from '@/types/evaluation';
import MarkdownImporter from './MarkdownImporter';
import LoadingIndicator from './LoadingIndicator';
import { AnalysisState } from '../types/analysis';

const WineEvaluationDashboard: React.FC = () => {
  const router = useRouter();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [evaluationData, setEvaluationData] = useState<WineEvaluation | null>(null);

  const handleAnalysisComplete = useCallback(async (data: WineEvaluation) => {
    try {
      // Set the evaluation data
      setEvaluationData(data);
      
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
      setError(err instanceof Error ? err.message : 'Failed to process evaluation data');
    }
  }, [router]);

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
          {isAnalyzing ? (
            <div className="flex flex-col items-center justify-center py-12">
              <LoadingIndicator message="Analyzing conversation with Claude..." />
              <p className="mt-4 text-gray-600">This may take a few moments...</p>
            </div>
          ) : (
            <MarkdownImporter
              onEvaluationData={handleAnalysisComplete}
              isAnalyzing={isAnalyzing}
              setIsAnalyzing={setIsAnalyzing}
            />
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WineEvaluationDashboard; 