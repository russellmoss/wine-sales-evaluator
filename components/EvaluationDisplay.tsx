'use client';

import React from 'react';
import type { EvaluationData } from '../app/types/evaluation';

interface EvaluationDisplayProps {
  evaluationData: EvaluationData;
}

export default function EvaluationDisplay({ evaluationData }: EvaluationDisplayProps) {
  return (
    <div className="bg-white shadow-lg rounded-lg p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Evaluation Results</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600">Staff Member: {evaluationData.staffName}</p>
            <p className="text-gray-600">Date: {evaluationData.date}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-purple-600">{evaluationData.overallScore}%</p>
            <p className="text-lg font-semibold text-purple-800">{evaluationData.performanceLevel}</p>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-3">Criteria Scores</h3>
        <div className="space-y-3">
          {evaluationData.criteriaScores.map((criterion, index) => (
            <div key={index} className="border rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <h4 className="font-medium">{criterion.criterion}</h4>
                  <p className="text-sm text-gray-600">{criterion.notes}</p>
                </div>
                <div className="ml-4 text-right">
                  <p className="font-bold text-purple-600">{criterion.score}/5</p>
                  <p className="text-sm text-gray-500">Weight: {criterion.weight}%</p>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full"
                  style={{ width: `${(criterion.score / 5) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">Strengths</h3>
          <ul className="list-disc list-inside space-y-1">
            {evaluationData.strengths.map((strength, index) => (
              <li key={index} className="text-gray-700">{strength}</li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">Areas for Improvement</h3>
          <ul className="list-disc list-inside space-y-1">
            {evaluationData.areasForImprovement.map((area, index) => (
              <li key={index} className="text-gray-700">{area}</li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">Key Recommendations</h3>
          <ul className="list-disc list-inside space-y-1">
            {evaluationData.keyRecommendations.map((recommendation, index) => (
              <li key={index} className="text-gray-700">{recommendation}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
} 