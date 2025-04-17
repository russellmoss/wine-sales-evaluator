'use client';

import React from 'react';
import { EvaluationData } from '../app/types/evaluation';

interface Props {
  data: EvaluationData;
}

export default function EvaluationReport({ data }: Props) {
  return (
    <div className="bg-white shadow-lg rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-4">Evaluation Results</h2>
      
      {/* Display overall score */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2">Overall Score</h3>
        <div className="text-3xl font-bold text-purple-600">
          {data.overallScore}%
        </div>
        <div className="text-lg text-gray-600">
          Performance Level: {data.performanceLevel}
        </div>
      </div>
      
      {/* Display criteria scores */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-4">Criteria Scores</h3>
        <div className="space-y-4">
          {data.criteriaScores.map((criterion, index) => (
            <div key={index} className="border-b pb-4 last:border-0">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h4 className="font-medium text-lg">{criterion.criterion}</h4>
                  <p className="text-gray-600 mt-1">{criterion.justification}</p>
                </div>
                <div className="ml-4 text-right">
                  <div className="font-bold text-lg">
                    {criterion.score}/5
                  </div>
                  <div className="text-sm text-gray-500">
                    Weight: {criterion.weight}%
                  </div>
                  <div className="text-sm font-medium text-purple-600">
                    Weighted: {criterion.weightedScore}%
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Display summary */}
      {data.summary && (
        <div>
          <h3 className="text-xl font-semibold mb-2">Summary</h3>
          <p className="text-gray-600 whitespace-pre-wrap">{data.summary}</p>
        </div>
      )}
    </div>
  );
} 