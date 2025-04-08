"use client";

import React, { useState } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import MarkdownImporter from './MarkdownImporter';
import LoadingIndicator from './LoadingIndicator';
import ErrorDisplay from './ErrorDisplay';
import { EvaluationData } from '../types/evaluation';

const WineEvaluationDashboard: React.FC = () => {
  const [evaluationData, setEvaluationData] = useState<EvaluationData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalysisComplete = (newEvaluationData: EvaluationData) => {
    try {
      // Reset any previous errors
      setError(null);
      
      // Validate that the received data is in the expected format
      if (!newEvaluationData.staffName || !newEvaluationData.criteriaScores) {
        throw new Error('The received evaluation data is incomplete');
      }
      
      // Set the evaluation data to update the dashboard
      setEvaluationData(newEvaluationData);
    } catch (error) {
      console.error('Error setting evaluation data:', error);
      setError(error instanceof Error ? error.message : 'Failed to process evaluation data');
      toast.error('Failed to process evaluation data');
    }
  };

  const handleExportPDF = () => {
    if (!evaluationData) {
      toast.error('No evaluation data to export');
      return;
    }
    
    // TODO: Implement PDF export functionality
    toast.success('PDF export functionality coming soon!');
  };

  const retryLastAnalysis = () => {
    setError(null);
    // If you have the markdown stored, you can retry the analysis here
    // This would need to be implemented based on your specific requirements
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Toaster position="top-right" />
      
      <h1 className="text-2xl font-bold mb-6">Wine Sales Evaluation Dashboard</h1>
      
      {/* Add the new importer component alongside your existing buttons */}
      <div className="flex flex-wrap justify-end items-center gap-4 mb-4">
        <MarkdownImporter 
          onAnalysisComplete={handleAnalysisComplete}
          isAnalyzing={isAnalyzing}
          setIsAnalyzing={setIsAnalyzing}
        />
        
        {/* Export PDF button */}
        <button
          onClick={handleExportPDF}
          disabled={!evaluationData || isAnalyzing}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 flex items-center"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
          Export PDF
        </button>
      </div>
      
      {/* Add loading indicator when analyzing */}
      {isAnalyzing && (
        <LoadingIndicator message="Claude is analyzing the conversation..." />
      )}
      
      {/* Add error display when there's an error */}
      {error && (
        <ErrorDisplay 
          title="Analysis Error" 
          message={error}
          onRetry={retryLastAnalysis} 
        />
      )}
      
      {/* Evaluation display */}
      {evaluationData && !isAnalyzing && !error && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-semibold">{evaluationData.staffName}</h2>
              <p className="text-gray-600">Date: {evaluationData.date}</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-purple-700">{evaluationData.overallScore}%</div>
              <div className="text-sm font-medium text-gray-600">{evaluationData.performanceLevel}</div>
            </div>
          </div>
          
          {/* Criteria Scores */}
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-3">Criteria Scores</h3>
            <div className="space-y-3">
              {evaluationData.criteriaScores.map((criterion, index) => (
                <div key={index} className="border-b pb-3">
                  <div className="flex justify-between items-center">
                    <div className="font-medium">{criterion.criterion}</div>
                    <div className="text-sm">
                      <span className="font-medium">{criterion.score}/5</span>
                      <span className="text-gray-500 ml-2">(Weight: {criterion.weight})</span>
                    </div>
                  </div>
                  <div className="mt-1 text-sm text-gray-600">{criterion.notes}</div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Strengths and Areas for Improvement */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-lg font-medium mb-2">Strengths</h3>
              <ul className="list-disc pl-5 space-y-1">
                {evaluationData.strengths.map((strength, index) => (
                  <li key={index} className="text-gray-700">{strength}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-medium mb-2">Areas for Improvement</h3>
              <ul className="list-disc pl-5 space-y-1">
                {evaluationData.areasForImprovement.map((area, index) => (
                  <li key={index} className="text-gray-700">{area}</li>
                ))}
              </ul>
            </div>
          </div>
          
          {/* Key Recommendations */}
          <div>
            <h3 className="text-lg font-medium mb-2">Key Recommendations</h3>
            <ul className="list-disc pl-5 space-y-1">
              {evaluationData.keyRecommendations.map((recommendation, index) => (
                <li key={index} className="text-gray-700">{recommendation}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
      
      {/* Empty state */}
      {!evaluationData && !isAnalyzing && !error && (
        <div className="text-center py-12">
          <p className="text-gray-500">
            {isAnalyzing ? 'Analyzing conversation...' : 'No evaluation data loaded. Import a conversation or JSON file to begin.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default WineEvaluationDashboard; 