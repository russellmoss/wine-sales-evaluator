"use client";

import React, { useState } from 'react';
import { EvaluationData, CriterionScore } from '../types/evaluation';
import Link from 'next/link';

interface DetailedResultsProps {
  evaluationData: EvaluationData;
}

const DetailedResults: React.FC<DetailedResultsProps> = ({ evaluationData }) => {
  const [expandedCriterion, setExpandedCriterion] = useState<string | null>(null);

  const getScoreColor = (score: number) => {
    if (score >= 4) return 'bg-green-500';
    if (score >= 3) return 'bg-yellow-500';
    return 'bg-red-500';
  };

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

  const extractExample = (notes: string): string | null => {
    const match = notes.match(/demonstrated\s+([^.]*)/i);
    return match ? match[1].trim() : null;
  };

  const extractSuggestions = (notes: string): string[] => {
    const suggestions = notes.match(/suggestions?[^:]*:([^.]*)/gi);
    if (!suggestions) return [];
    return suggestions.map(s => s.replace(/suggestions?[^:]*:/i, '').trim());
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Detailed Evaluation Results</h1>
          <Link href="/" className="text-blue-600 hover:text-blue-800">
            Back to Dashboard
          </Link>
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
                  {evaluationData.overallScore}%
                </span>
              </div>
            </div>
            <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-200">
              <div
                style={{ width: `${evaluationData.overallScore}%` }}
                className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${getScoreColor(evaluationData.overallScore / 20)}`}
              />
            </div>
          </div>
        </div>

        {/* Criteria Scores Bar Chart */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Criteria Scores Overview</h2>
          <div className="h-64 flex items-end space-x-2">
            {evaluationData.criteriaScores.map((criterion, index) => (
              <div 
                key={index} 
                className="flex-1 flex flex-col items-center"
              >
                <div 
                  className={`w-full ${getScoreColor(criterion.score)} rounded-t`}
                  style={{ 
                    height: `${(criterion.score / 5) * 100}%`,
                    minHeight: '20px'
                  }}
                ></div>
                <div className="text-xs mt-2 text-center font-medium">
                  {criterion.score}/5
                </div>
                <div className="text-xs mt-1 text-center text-gray-500 rotate-45 origin-top-left whitespace-nowrap">
                  {criterion.criterion.split(' ')[0]}
                </div>
              </div>
            ))}
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
                          <blockquote className="text-gray-700 italic">
                            &quot;{extractExample(criterion.notes)}&quot;
                          </blockquote>
                        </div>
                      )}

                      {criterion.score < 4 && (
                        <div className="bg-yellow-50 p-4 rounded-md">
                          <h4 className="text-md font-semibold text-gray-900 mb-2">Areas for Improvement</h4>
                          <ul className="list-disc pl-4 space-y-2">
                            {extractSuggestions(criterion.notes).map((suggestion, idx) => (
                              <li key={idx} className="text-gray-700">{suggestion}</li>
                            ))}
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
      </div>
    </div>
  );
};

export default DetailedResults; 