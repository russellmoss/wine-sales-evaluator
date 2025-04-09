"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { EvaluationData } from '@/types/evaluation';
import LoadingIndicator from '@/components/LoadingIndicator';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import dynamic from 'next/dynamic';

// Dynamically import PDFExport with no SSR
const PDFExport = dynamic(() => import('@/components/PDFExport'), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-700">Loading PDF viewer...</p>
        </div>
      </div>
    </div>
  ),
});

const BackButton = () => {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push('/')}
      className="mb-6 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors flex items-center"
    >
      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
      </svg>
      Back to Dashboard
    </button>
  );
};

export default function DetailedResultsPage() {
  const router = useRouter();
  const [evaluationData, setEvaluationData] = useState<EvaluationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCriterion, setExpandedCriterion] = useState<string | null>(null);
  const [hoveredCriterion, setHoveredCriterion] = useState<string | null>(null);
  const [chartLoaded, setChartLoaded] = useState(false);
  const [showPDFExport, setShowPDFExport] = useState(false);

  useEffect(() => {
    try {
      // Try to get the data from localStorage
      const storedData = localStorage.getItem('wineEvaluationData');
      
      if (!storedData) {
        setError('No evaluation data found. Please upload a conversation first.');
        setLoading(false);
        return;
      }

      // Parse the data
      const parsedData = JSON.parse(storedData);
      
      // Validate the data structure
      if (!parsedData.staffName || !parsedData.date || !parsedData.totalScore || !parsedData.criteriaScores) {
        console.error('Invalid evaluation data structure:', parsedData);
        setError('Invalid evaluation data structure. Please upload a conversation again.');
        setLoading(false);
        return;
      }
      
      // Set the evaluation data
      setEvaluationData(parsedData);
      
      // Trigger animation after a short delay
      setTimeout(() => {
        setChartLoaded(true);
      }, 500);
    } catch (err) {
      console.error('Error loading evaluation data:', err);
      setError('Failed to load evaluation data. Please try uploading the conversation again.');
    } finally {
      // Add a small delay before setting loading to false to ensure the UI is ready
      setTimeout(() => {
        setLoading(false);
      }, 300);
    }
  }, []);

  // Helper function to get color based on score
  const getScoreColor = (score: number) => {
    if (score >= 4) return '#10B981'; // green-500
    if (score >= 3) return '#F59E0B'; // yellow-500
    return '#EF4444'; // red-500
  };

  // Helper function to get hover color based on score
  const getHoverColor = (score: number) => {
    if (score >= 4) return 'bg-green-600';
    if (score >= 3) return 'bg-yellow-600';
    return 'bg-red-600';
  };

  // Helper function to get text color based on score
  const getTextColor = (score: number) => {
    if (score >= 4) return 'text-green-700';
    if (score >= 3) return 'text-yellow-700';
    return 'text-red-700';
  };

  // Helper function to get color based on performance level
  const getPerformanceLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'exceptional': return 'text-green-600';
      case 'strong': return 'text-green-500';
      case 'proficient': return 'text-yellow-500';
      case 'developing': return 'text-orange-500';
      case 'needs improvement': return 'text-red-500';
      default: return 'text-gray-600';
    }
  };

  // Helper function to extract examples from notes
  const extractExample = (notes: string): string | null => {
    // Look for the pattern "Staff demonstrated [behavior] when they said: '[quote]'"
    const match = notes.match(/Staff demonstrated[^:]*:?\s*['"]([^'"]+)['"]/i);
    if (match && match[1]) {
      return match[1].trim();
    }
    
    // Fallback to any quoted text
    const quoteMatch = notes.match(/['"]([^'"]+)['"]/);
    if (quoteMatch && quoteMatch[1]) {
      return quoteMatch[1].trim();
    }
    
    return null;
  };

  // Helper function to extract suggestions from notes
  const extractSuggestions = (notes: string): string[] => {
    // Look for "Suggestions:" followed by text
    const suggestionsMatch = notes.match(/Suggestions:([^.]*)/i);
    if (suggestionsMatch && suggestionsMatch[1]) {
      return [suggestionsMatch[1].trim()];
    }
    
    // Look for bullet points or numbered lists
    const bulletPoints = notes.match(/[-•*]\s*([^\n]+)/g);
    if (bulletPoints) {
      return bulletPoints.map(point => point.replace(/[-•*]\s*/, '').trim());
    }
    
    return [];
  };

  // Add this function to handle the export button click
  const handleExportClick = () => {
    if (!evaluationData) {
      console.error('No evaluation data available for PDF export');
      return;
    }
    
    // Validate the evaluation data before showing the PDF export
    if (!evaluationData.staffName || !evaluationData.criteriaScores) {
      console.error('Invalid evaluation data for PDF export');
      return;
    }
    
    setShowPDFExport(true);
  };

  // Add this function to handle closing the PDF viewer
  const handleClosePDF = () => {
    setShowPDFExport(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingIndicator />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-lg">
          <div className="text-center">
            <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="mt-4 text-xl font-semibold text-gray-900">Error</h2>
            <p className="mt-2 text-gray-600">{error}</p>
            <button
              onClick={() => router.push('/')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!evaluationData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-lg">
          <div className="text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="mt-4 text-xl font-semibold text-gray-900">No Data Available</h2>
            <p className="mt-2 text-gray-600">Please upload a conversation to see evaluation results.</p>
            <button
              onClick={() => router.push('/')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <BackButton />
      
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Evaluation Results for {evaluationData.staffName}
        </h1>
        <button
          onClick={handleExportClick}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export PDF
        </button>
      </div>

      {/* Summary Card */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-700">Staff Member</h2>
            <p className="text-gray-900">{evaluationData.staffName}</p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-700">Date</h2>
            <p className="text-gray-900">{evaluationData.date}</p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-700">Performance Level</h2>
            <p className={`font-semibold ${getPerformanceLevelColor(evaluationData.performanceLevel)}`}>
              {evaluationData.performanceLevel}
            </p>
          </div>
        </div>
      </div>

      {/* Overall Score */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Overall Score</h2>
        <div className="relative pt-1">
          <div className="flex mb-2 items-center justify-between">
            <div>
              <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200">
                {evaluationData.totalScore > 100 
                  ? Math.round((evaluationData.totalScore / 500) * 100).toFixed(1) 
                  : evaluationData.totalScore.toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-200">
            <div
              style={{ width: `${evaluationData.totalScore > 100 
                ? Math.round((evaluationData.totalScore / 500) * 100) 
                : evaluationData.totalScore}%` }}
              className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${getScoreColor(evaluationData.totalScore > 100 
                ? Math.round((evaluationData.totalScore / 500) * 100) / 20 
                : evaluationData.totalScore / 20)}`}
            />
          </div>
        </div>
      </div>

      {/* Criteria Scores Bar Chart */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Criteria Scores Overview</h2>
        
        {/* Bar Chart using Recharts */}
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={evaluationData.criteriaScores.map(criterion => ({
                name: criterion.criterion.split(' ')[0], // Use first word for brevity
                score: criterion.score,
                fullName: criterion.criterion,
                weight: criterion.weight,
                notes: criterion.notes
              }))}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45} 
                textAnchor="end" 
                height={60}
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                domain={[0, 5]} 
                ticks={[0, 1, 2, 3, 4, 5]}
                label={{ value: 'Score', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-gray-800 text-white p-3 rounded shadow-lg">
                        <p className="font-bold">{data.fullName}</p>
                        <p>Score: {data.score}/5</p>
                        <p>Weight: {data.weight}%</p>
                        <p className="mt-1 text-gray-300 truncate max-w-xs">
                          {data.notes.substring(0, 100)}...
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar 
                dataKey="score" 
                name="Score"
                animationDuration={1000}
                animationBegin={0}
              >
                {evaluationData.criteriaScores.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={getScoreColor(entry.score)} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Legend */}
        <div className="flex justify-center mt-6 space-x-4">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-500 rounded mr-1"></div>
            <span className="text-xs">Good (4-5)</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-yellow-500 rounded mr-1"></div>
            <span className="text-xs">Average (3)</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-red-500 rounded mr-1"></div>
            <span className="text-xs">Needs Improvement (1-2)</span>
          </div>
        </div>
      </div>

      {/* Detailed Criteria Scores */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Detailed Criteria Analysis</h2>
        <div className="space-y-6">
          {evaluationData.criteriaScores.map((criterion, index) => (
            <div key={index} className="border-b border-gray-200 pb-6 last:border-b-0">
              <div 
                className="flex justify-between items-center cursor-pointer"
                onClick={() => setExpandedCriterion(expandedCriterion === criterion.criterion ? null : criterion.criterion)}
              >
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900">{criterion.criterion}</h3>
                  <p className="text-sm text-gray-500">Weight: {criterion.weight}%</p>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-lg font-semibold text-gray-900">
                    {criterion.score}/5
                  </span>
                  <span className="text-sm text-gray-500">
                    ({criterion.weightedScore} points)
                  </span>
                  <svg 
                    className={`w-5 h-5 ml-2 transition-transform ${expandedCriterion === criterion.criterion ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24" 
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </div>
              </div>

              {expandedCriterion === criterion.criterion && (
                <div className="mt-4 pl-4 border-l-4 border-blue-200">
                  <div className="prose max-w-none">
                    <h4 className="text-md font-semibold text-gray-900 mb-2">Evaluation Notes</h4>
                    <p className="text-gray-700 mb-4">{criterion.notes}</p>

                    {extractExample(criterion.notes) && (
                      <div className="bg-gray-50 p-4 rounded-md mb-4">
                        <h4 className="text-md font-semibold text-gray-900 mb-2">Specific Example</h4>
                        <blockquote className="text-gray-700 italic border-l-4 border-blue-300 pl-4">
                          "{extractExample(criterion.notes)}"
                        </blockquote>
                      </div>
                    )}

                    {criterion.score < 4 && (
                      <div className="bg-yellow-50 p-4 rounded-md">
                        <h4 className="text-md font-semibold text-gray-900 mb-2">Areas for Improvement</h4>
                        <ul className="list-disc pl-4 space-y-2">
                          {extractSuggestions(criterion.notes).length > 0 ? (
                            extractSuggestions(criterion.notes).map((suggestion, idx) => (
                              <li key={idx} className="text-gray-700">{suggestion}</li>
                            ))
                          ) : (
                            <li className="text-gray-700">Review the evaluation notes for specific improvement areas.</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Strengths */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Key Strengths</h2>
        <ul className="list-disc pl-4 space-y-2">
          {evaluationData.strengths.map((strength, index) => (
            <li key={index} className="text-gray-700">{strength}</li>
          ))}
        </ul>
      </div>

      {/* Areas for Improvement */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Areas for Improvement</h2>
        <ul className="list-disc pl-4 space-y-2">
          {evaluationData.areasForImprovement.map((area, index) => (
            <li key={index} className="text-gray-700">{area}</li>
          ))}
        </ul>
      </div>

      {/* Key Recommendations */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Key Recommendations</h2>
        <ul className="list-disc pl-4 space-y-2">
          {evaluationData.keyRecommendations.map((recommendation, index) => (
            <li key={index} className="text-gray-700">{recommendation}</li>
          ))}
        </ul>
      </div>

      {/* PDF Export Modal */}
      {showPDFExport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 w-full max-w-4xl h-[90vh] relative">
            <button
              onClick={handleClosePDF}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <PDFExport evaluationData={evaluationData} onClose={handleClosePDF} />
          </div>
        </div>
      )}
    </div>
  );
} 