"use client";

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { WineEvaluation, CriterionScore } from '@/types/evaluation';
import MarkdownImporter from '@/components/MarkdownImporter';
import LoadingIndicator from '@/components/LoadingIndicator';
import PDFExport from '@/components/PDFExport';

const WineEvaluationDashboard: React.FC = () => {
  const router = useRouter();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPDFExport, setShowPDFExport] = useState(false);
  const [evaluationData, setEvaluationData] = useState<WineEvaluation | null>(null);

  const handleAnalysisComplete = useCallback((data: WineEvaluation) => {
    // Set the evaluation data
    setEvaluationData(data);
    
    // Store the data in localStorage with the correct key
    localStorage.setItem('wineEvaluationData', JSON.stringify(data));
    
    // Add a delay to ensure the data is fully processed
    setTimeout(() => {
      // Navigate to the detailed results page
      router.push('/detailed-results');
    }, 1000);
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

        {evaluationData && (
          <div className="mt-8 flex justify-center">
            <button
              onClick={() => setShowPDFExport(true)}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Export as PDF
            </button>
          </div>
        )}

        {showPDFExport && evaluationData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-4 w-full max-w-4xl h-[90vh]">
              <PDFExport
                evaluationData={evaluationData}
                onClose={() => setShowPDFExport(false)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WineEvaluationDashboard; 