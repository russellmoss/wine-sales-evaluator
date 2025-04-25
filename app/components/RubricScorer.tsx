'use client';

import React, { useState, useEffect } from 'react';
import { Rubric, Criterion, ScoringLevel } from '@/app/types/rubric';
import { EvaluationData, PerformanceLevel, CriterionScore, calculateTotalScore } from '@/app/types/evaluation';
import { exportEvaluationToPDF } from '@/app/utils/pdfExport';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Textarea } from '@/app/components/ui/textarea';

interface RubricScorerProps {
  rubric: Rubric;
  conversationId: string;
  conversationSummary: string;
  selectedCriterion: string | null;
  onCriterionSelect: (criterionId: string | null) => void;
  highlightedSections: Array<{
    id: string;
    criterionId: string;
    color: string;
    text: string;
  }>;
  criteriaColors: string[];
}

export function RubricScorer({ 
  rubric, 
  conversationId, 
  conversationSummary,
  selectedCriterion,
  onCriterionSelect,
  highlightedSections,
  criteriaColors
}: RubricScorerProps) {
  const [evaluationData, setEvaluationData] = useState<EvaluationData>({
    overallScore: 0,
    performanceLevel: 'Proficient' as PerformanceLevel,
    criteriaScores: [],
    strengths: ['', '', ''],
    areasForImprovement: ['', '', ''],
    keyRecommendations: ['', '', ''],
    criteria: {},
    conversationSummary,
    staffName: '',
    date: new Date().toISOString(),
    observationalNotes: {
      productKnowledge: { score: 0, notes: '' },
      handlingObjections: { score: 0, notes: '' },
      customerEngagement: { score: 0, notes: '' },
      salesTechniques: { score: 0, notes: '' }
    },
    rubricId: rubric.id
  });
  const [isLegendExpanded, setIsLegendExpanded] = useState(false);

  // Calculate overall score whenever criteria scores change
  useEffect(() => {
    const criteriaScores: CriterionScore[] = rubric.criteria.map(criterion => {
      const score = evaluationData.criteria[criterion.id]?.score || 0;
      const feedback = evaluationData.criteria[criterion.id]?.feedback || '';
      const weightedScore = score * criterion.weight;
      
      return {
        criterion: criterion.name,
        weight: criterion.weight,
        score,
        weightedScore,
        notes: feedback
      };
    });

    const overallScore = calculateTotalScore(criteriaScores);
    
    // Determine performance level based on overall score
    let performanceLevel: PerformanceLevel = 'Proficient';
    if (overallScore >= 90) performanceLevel = 'Exceptional';
    else if (overallScore >= 80) performanceLevel = 'Strong';
    else if (overallScore >= 70) performanceLevel = 'Proficient';
    else if (overallScore >= 60) performanceLevel = 'Developing';
    else performanceLevel = 'Needs Improvement';
    
    setEvaluationData(prev => ({
      ...prev,
      overallScore,
      performanceLevel,
      criteriaScores
    }));
  }, [evaluationData.criteria, rubric.criteria]);

  const handleScoreChange = (criterionId: string, score: number) => {
    setEvaluationData(prev => ({
      ...prev,
      criteria: {
        ...prev.criteria,
        [criterionId]: {
          ...prev.criteria[criterionId],
          score,
          feedback: prev.criteria[criterionId]?.feedback || ''
        }
      }
    }));
  };

  const handleFeedbackChange = (criterionId: string, feedback: string) => {
    setEvaluationData(prev => ({
      ...prev,
      criteria: {
        ...prev.criteria,
        [criterionId]: {
          ...prev.criteria[criterionId],
          feedback
        }
      }
    }));
  };

  const handleStrengthsChange = (index: number, value: string) => {
    setEvaluationData(prev => {
      const newStrengths = [...prev.strengths];
      newStrengths[index] = value;
      return { ...prev, strengths: newStrengths };
    });
  };

  const handleAreasForImprovementChange = (index: number, value: string) => {
    setEvaluationData(prev => {
      const newAreas = [...prev.areasForImprovement];
      newAreas[index] = value;
      return { ...prev, areasForImprovement: newAreas };
    });
  };

  const handleKeyRecommendationsChange = (index: number, value: string) => {
    setEvaluationData(prev => {
      const newRecommendations = [...prev.keyRecommendations];
      newRecommendations[index] = value;
      return { ...prev, keyRecommendations: newRecommendations };
    });
  };

  const handleExportPDF = async () => {
    try {
      await exportEvaluationToPDF(evaluationData);
    } catch (error) {
      console.error('Error exporting PDF:', error);
    }
  };

  if (!rubric) {
    return null;
  }

  return (
    <div className="fixed right-0 top-0 h-screen w-1/2 overflow-y-auto bg-white p-6 shadow-lg">
      <div className="sticky top-0 bg-white z-10 pb-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Evaluation Rubric</h2>
          <div className="flex items-center gap-2">
            <Button 
              onClick={() => setIsLegendExpanded(!isLegendExpanded)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm py-1 px-3"
            >
              {isLegendExpanded ? 'Hide Legend' : 'Show Legend'}
            </Button>
            <Button 
              onClick={handleExportPDF}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm py-1 px-3"
            >
              Export PDF
            </Button>
          </div>
        </div>

        <div className="flex justify-between items-center mb-4">
          <div>
            <p className="text-lg font-semibold">Overall Score: {evaluationData.overallScore}%</p>
            <p className="text-lg font-semibold">Performance Level: {evaluationData.performanceLevel}</p>
          </div>
        </div>

        {/* Collapsible Color Legend */}
        {isLegendExpanded && (
          <div className="mb-4 border rounded-lg p-3 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-700">Highlighting Legend</h3>
              <div className="text-xs text-gray-500">
                {highlightedSections.length} highlights
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1">
              {rubric.criteria.map((criterion, index) => {
                const highlightCount = highlightedSections.filter(
                  section => section.criterionId === criterion.id
                ).length;
                
                return (
                  <div 
                    key={criterion.id}
                    className={`flex items-center p-1.5 rounded text-sm ${
                      selectedCriterion === criterion.id ? 'ring-1 ring-blue-500 bg-blue-50' : 'hover:bg-gray-100'
                    }`}
                    onClick={() => onCriterionSelect(selectedCriterion === criterion.id ? null : criterion.id)}
                  >
                    <div className={`w-3 h-3 rounded-full ${criteriaColors[index % criteriaColors.length]} mr-2`} />
                    <span className="flex-1 truncate">{criterion.name}</span>
                    {highlightCount > 0 && (
                      <span className="text-xs bg-gray-200 px-1.5 py-0.5 rounded-full ml-1">
                        {highlightCount}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      
      <div className="space-y-6">
        {rubric.criteria.map((criterion, index) => (
          <div 
            key={criterion.id}
            onClick={() => onCriterionSelect(selectedCriterion === criterion.id ? null : criterion.id)}
            className={`cursor-pointer ${
              selectedCriterion === criterion.id ? 'ring-2 ring-blue-500 rounded-lg' : ''
            }`}
          >
            <Card className="w-full">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <div className={`w-4 h-4 rounded-full ${criteriaColors[index % criteriaColors.length]} mr-2`} />
                  {criterion.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">{criterion.description}</p>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Score</label>
                    <div className="flex space-x-2">
                      {[1, 2, 3, 4, 5].map((score) => (
                        <Button
                          key={score}
                          className={`flex-1 ${
                            evaluationData.criteria[criterion.id]?.score === score
                              ? 'bg-blue-600 text-white'
                              : 'bg-white text-gray-700 border border-gray-300'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleScoreChange(criterion.id, score);
                          }}
                        >
                          {score}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Feedback</label>
                    <Textarea
                      value={evaluationData.criteria[criterion.id]?.feedback || ''}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleFeedbackChange(criterion.id, e.target.value);
                      }}
                      placeholder="Enter feedback for this criterion"
                      className="min-h-[100px] w-full"
                    />
                  </div>

                  {/* Highlighted sections for this criterion */}
                  {highlightedSections.filter(section => section.criterionId === criterion.id).length > 0 && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Highlighted Sections</label>
                      <div className="space-y-1.5">
                        {highlightedSections
                          .filter(section => section.criterionId === criterion.id)
                          .map(section => (
                            <div 
                              key={section.id}
                              className={`p-2 rounded text-sm ${section.color}`}
                            >
                              <div className="text-gray-700">{section.text}</div>
                            </div>
                          ))
                        }
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        ))}

        {/* Strengths Section */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Strengths</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[0, 1, 2].map((index) => (
                <div key={index} className="space-y-2">
                  <Textarea
                    value={evaluationData.strengths[index] || ''}
                    onChange={(e) => handleStrengthsChange(index, e.target.value)}
                    placeholder="Enter a strength"
                    className="min-h-[60px] w-full"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Areas for Improvement Section */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Areas for Improvement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[0, 1, 2].map((index) => (
                <div key={index} className="space-y-2">
                  <Textarea
                    value={evaluationData.areasForImprovement[index] || ''}
                    onChange={(e) => handleAreasForImprovementChange(index, e.target.value)}
                    placeholder="Enter an area for improvement"
                    className="min-h-[60px] w-full"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Key Recommendations Section */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Key Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[0, 1, 2].map((index) => (
                <div key={index} className="space-y-2">
                  <Textarea
                    value={evaluationData.keyRecommendations[index] || ''}
                    onChange={(e) => handleKeyRecommendationsChange(index, e.target.value)}
                    placeholder="Enter a key recommendation"
                    className="min-h-[60px] w-full"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 