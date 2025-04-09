import React from 'react';
import { WineEvaluation, CriterionScore } from '../types/evaluation';

interface PDFExportViewProps {
  evaluation: WineEvaluation;
}

const PDFExportView: React.FC<PDFExportViewProps> = ({ evaluation }) => {
  const getScoreColor = (score: number): string => {
    if (score >= 4) return '#22c55e'; // green
    if (score >= 3) return '#f59e0b'; // orange
    return '#ef4444'; // red
  };

  const getPerformanceLevelColor = (level: string): string => {
    switch (level.toLowerCase()) {
      case 'exceptional':
        return '#22c55e';
      case 'proficient':
        return '#f59e0b';
      default:
        return '#ef4444';
    }
  };

  return (
    <div className="bg-white p-8 rounded-lg shadow-lg max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Wine Sales Performance Evaluation</h1>
        <div className="text-gray-600">
          <p>Staff Member: {evaluation.staffName}</p>
          <p>Date: {new Date(evaluation.date).toLocaleDateString()}</p>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Performance Summary</h2>
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-600">Overall Score</p>
              <div className="flex items-center justify-between">
                <p className="text-2xl font-bold">{evaluation.overallScore}/5</p>
                <p className="text-2xl font-bold">{evaluation.performanceLevel}</p>
              </div>
            </div>
            <div>
              <p className="text-gray-600">Performance Level</p>
              <p className="text-2xl font-bold" style={{ color: getPerformanceLevelColor(evaluation.performanceLevel) }}>
                {evaluation.performanceLevel}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Evaluation Criteria</h2>
        <div className="space-y-4">
          {evaluation.criteriaScores.map((criterion: CriterionScore) => (
            <div key={criterion.criterion} className="border-b pb-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium">{criterion.criterion}</h3>
                <div className="text-lg font-semibold" style={{ color: getScoreColor(criterion.score) }}>
                  {criterion.score}/5
                </div>
              </div>
              <p className="text-gray-700">{criterion.notes}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-semibold mb-4">Key Strengths</h2>
          <ul className="list-disc pl-5 space-y-2">
            {evaluation.strengths.map((strength, index) => (
              <li key={index} className="text-gray-700">{strength}</li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-4">Areas for Improvement</h2>
          <ul className="list-disc pl-5 space-y-2">
            {evaluation.areasForImprovement.map((area, index) => (
              <li key={index} className="text-gray-700">{area}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Key Recommendations</h2>
        <ul className="list-disc pl-5 space-y-2">
          {evaluation.keyRecommendations.map((recommendation, index) => (
            <li key={index} className="text-gray-700">{recommendation}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default PDFExportView; 