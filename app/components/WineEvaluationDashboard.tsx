"use client";

import React, { useState, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import Link from 'next/link';
import MarkdownImporter from './MarkdownImporter';
import LoadingIndicator from './LoadingIndicator';
import ErrorDisplay from './ErrorDisplay';
import { EvaluationData } from '../types/evaluation';
import { exportEvaluationToPDF } from '../utils/pdfExport';
import { exportConversationToPDF } from '../utils/conversationPdfExport';
import { cleanupConversation } from '../utils/conversationCleanup';

const WineEvaluationDashboard: React.FC = () => {
  const [evaluationData, setEvaluationData] = useState<EvaluationData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isCleaningUp, setIsCleaningUp] = useState(false);

  const handleAnalysisComplete = (newEvaluationData: EvaluationData, markdownContent: string, markdownFileName: string) => {
    try {
      console.log('Received evaluation data:', JSON.stringify(newEvaluationData, null, 2));
      console.log('Validation check - required fields:', {
        hasStaffName: Boolean(newEvaluationData.staffName),
        hasCriteriaScores: Boolean(newEvaluationData.criteriaScores),
        hasOverallScore: Boolean(newEvaluationData.overallScore),
        hasPerformanceLevel: Boolean(newEvaluationData.performanceLevel)
      });
      
      // Reset any previous errors
      setError(null);
      
      // Validate that the received data is in the expected format
      if (!newEvaluationData.staffName || !newEvaluationData.criteriaScores) {
        throw new Error('The received evaluation data is incomplete');
      }
      
      // Store the markdown content for potential export
      setMarkdown(markdownContent);
      setFileName(markdownFileName);
      
      // Set the evaluation data to update the dashboard
      setEvaluationData(newEvaluationData);
      console.log('Evaluation data set successfully');
    } catch (error) {
      console.error('Error setting evaluation data:', error);
      setError(error instanceof Error ? error.message : 'Failed to process evaluation data');
      toast.error('Failed to process evaluation data');
    }
  };

  const handleExportConversation = async () => {
    if (!markdown || !fileName) {
      toast.error('No conversation available to export');
      return;
    }
    try {
      setIsCleaningUp(true);
      toast.loading('Cleaning up conversation...');
      
      // Clean up the conversation using Claude
      const cleanedMarkdown = await cleanupConversation(markdown);
      
      // Export the cleaned conversation to PDF
      await exportConversationToPDF(cleanedMarkdown, fileName);
      
      toast.dismiss();
      toast.success('Conversation exported as PDF');
    } catch (error) {
      console.error('Error exporting conversation:', error);
      toast.dismiss();
      toast.error('Failed to export conversation. Please try again.');
    } finally {
      setIsCleaningUp(false);
    }
  };

  const handleExportPDF = () => {
    if (!evaluationData) {
      toast.error('No evaluation data available');
      return;
    }
    try {
      exportEvaluationToPDF(evaluationData);
      toast.success('Evaluation exported as PDF');
    } catch (error) {
      console.error('Error exporting evaluation:', error);
      toast.error('Failed to export evaluation. Please try again.');
    }
  };

  const retryLastAnalysis = () => {
    setError(null);
    // If you have the markdown stored, you can retry the analysis here
    // This would need to be implemented based on your specific requirements
  };

  // Helper function for overall score color
  const getOverallScoreColor = (score: number): string => {
    const color = score >= 90 ? 'text-emerald-600' :
                 score >= 80 ? 'text-green-600' :
                 score >= 70 ? 'text-yellow-600' :
                 score >= 60 ? 'text-orange-600' :
                              'text-red-600';
    console.log(`Overall score ${score} assigned color class: ${color}`);
    return color;
  };

  // Helper function for individual criterion score color
  const getCriterionScoreColor = (score: number): string => {
    const color = score >= 4 ? 'bg-emerald-600' :
                 score === 3 ? 'bg-yellow-600' :
                              'bg-red-600';
    console.log(`Criterion score ${score} assigned color class: ${color}`);
    return color;
  };

  // Add a debug log when evaluation data changes
  useEffect(() => {
    if (evaluationData) {
      console.log('Evaluation data updated - Full details:', {
        staffName: evaluationData.staffName,
        date: evaluationData.date,
        overallScore: {
          value: evaluationData.overallScore,
          color: getOverallScoreColor(evaluationData.overallScore),
          performanceLevel: evaluationData.performanceLevel
        },
        criteriaScores: evaluationData.criteriaScores.map(c => ({
          criterion: c.criterion,
          score: c.score,
          color: getCriterionScoreColor(c.score),
          weight: c.weight,
          notes: c.notes
        }))
      });
    }
  }, [evaluationData]);

  return (
    <div className="container mx-auto px-4 py-8">
      <Toaster position="top-right" />
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Wine Sales Evaluation Dashboard</h1>
        <Link href="/rubrics">
          <button className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>
            </svg>
            Manage Rubrics
          </button>
        </Link>
      </div>
      
      {/* Add the new importer component alongside your existing buttons */}
      <div className="flex flex-wrap justify-end items-center gap-4 mb-4">
        <MarkdownImporter 
          onAnalysisComplete={handleAnalysisComplete}
          isAnalyzing={isAnalyzing}
          setIsAnalyzing={setIsAnalyzing}
        />
        
        {/* Export buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleExportConversation}
            disabled={!markdown || isAnalyzing || isCleaningUp}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCleaningUp ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Cleaning up...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"></path>
                </svg>
                Export Conversation
              </>
            )}
          </button>
          
          <button
            onClick={handleExportPDF}
            disabled={!evaluationData || isAnalyzing}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            Export Report
          </button>
        </div>
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
              <div 
                className={`text-3xl font-bold ${getOverallScoreColor(evaluationData.overallScore)}`}
              >
                {evaluationData.overallScore}%
              </div>
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
                    <div className="flex items-center gap-2">
                      <div 
                        className={`px-3 py-1 rounded-full text-white text-sm ${getCriterionScoreColor(criterion.score)}`}
                      >
                        {criterion.score}/5
                      </div>
                      <span className="text-gray-500">(Weight: {criterion.weight})</span>
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