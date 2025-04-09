import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { WineEvaluation } from './types/evaluation';

interface CriterionScore {
  Criterion: string;
  Weight: number;
  Score: number;
  'Weighted Score': number;
}

interface DemoData {
  final_score: number;
  performance_level: string;
  criteria_scores: CriterionScore[];
  strengths: string[];
  improvements: string[];
  recommendations: string[];
  detailed_notes: Record<string, string>;
}

const WineEvaluationDashboard: React.FC = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [evaluationData, setEvaluationData] = useState<DemoData | null>(null);

  useEffect(() => {
    // Simulating data loading
    setIsAnalyzing(true);
    
    // Simulated evaluation results
    const demoData: DemoData = {
      final_score: 78.4,
      performance_level: "Proficient",
      criteria_scores: [
        { Criterion: "Initial Greeting and Welcome", Weight: 8, Score: 2, "Weighted Score": 16 },
        { Criterion: "Building Rapport", Weight: 10, Score: 3, "Weighted Score": 30 },
        { Criterion: "Winery History and Ethos", Weight: 10, Score: 3, "Weighted Score": 30 },
        { Criterion: "Storytelling and Analogies", Weight: 10, Score: 3, "Weighted Score": 30 },
        { Criterion: "Recognition of Buying Signals", Weight: 12, Score: 4, "Weighted Score": 48 },
        { Criterion: "Customer Data Capture", Weight: 8, Score: 4, "Weighted Score": 32 },
        { Criterion: "Asking for the Sale", Weight: 12, Score: 4, "Weighted Score": 48 },
        { Criterion: "Personalized Wine Recommendations", Weight: 10, Score: 3, "Weighted Score": 30 },
        { Criterion: "Wine Club Presentation", Weight: 12, Score: 5, "Weighted Score": 60 },
        { Criterion: "Closing Interaction", Weight: 8, Score: 4, "Weighted Score": 32 }
      ],
      strengths: [
        "Strong wine club presentation with clear benefits and personalization",
        "Effective customer data capture with clear value propositions",
        "Good recognition of buying signals with appropriate responses"
      ],
      improvements: [
        "Enhance the initial greeting with more warmth and enthusiasm",
        "Build rapport earlier in the interaction and ask more follow-up questions",
        "Develop more vivid analogies and stories to make wines memorable"
      ],
      recommendations: [
        "Create a script for greeting and closing to ensure consistent, warm interactions",
        "Practice active listening and asking open-ended questions to build stronger connections",
        "Develop a personal storytelling approach that connects wines to the winery's history and values"
      ],
      detailed_notes: {
        "Initial Greeting and Welcome": "Introduced himself but the greeting was very casual with minimal warmth. Did not set an enthusiastic tone for the experience.",
        "Building Rapport": "Asked where guests were from, but this was delayed until midway through the tasting. Limited personal connection.",
        "Winery History and Ethos": "Explained winemaking philosophy briefly but referred guests to the menu for history rather than sharing it personally.",
        "Storytelling and Analogies": "Used some storytelling elements about wines but lacked rich analogies or memorable descriptions.",
        "Recognition of Buying Signals": "Recognized enthusiasm for the Brut Cuvée and offered to set aside a bottle. Also stepped up when guests showed interest in taking wine home.",
        "Customer Data Capture": "Good data capture through wine club signup and QR code contest entry. Provided clear reasons for data collection.",
        "Asking for the Sale": "Clear, direct asks for both wine club signup and bottle purchases. Good transition from tasting to sales.",
        "Personalized Wine Recommendations": "Adequate recommendations with some food pairing suggestions, but limited customization based on guest feedback.",
        "Wine Club Presentation": "Excellent presentation of wine club benefits, tiers, and personalized invitation to join. Connected geographic location to club value.",
        "Closing Interaction": "Warm thank you with specific mention of looking forward to seeing guests at future events. Good reinforcement of relationship."
      }
    };
    
    setTimeout(() => {
      setEvaluationData(demoData);
      setIsAnalyzing(false);
    }, 1000);
  }, []);

  const getScoreColor = (score: number): string => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-green-500';
    if (score >= 70) return 'text-yellow-500';
    if (score >= 60) return 'text-orange-500';
    return 'text-red-500';
  };
  
  const getBarColor = (score: number): string => {
    if (score >= 4) return '#4ECDC4';
    if (score >= 3) return '#FFD166';
    return '#FF6B6B';
  };

  if (isAnalyzing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
        <img src="https://i.imgur.com/qfTW5j0.png" alt="Winery Logo" className="w-64 mb-6 opacity-20" />
        <h1 className="text-2xl font-gilda text-darkBrown mb-4">Analyzing Sales Conversation</h1>
        <div className="w-16 h-16 border-4 border-darkBrown border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!evaluationData) {
    return <div className="text-center p-8 text-darkBrown">No evaluation data available</div>;
  }

  const chartData = evaluationData.criteria_scores.map(item => ({
    name: item.Criterion,
    score: item.Score,
    fill: getBarColor(item.Score)
  }));

  return (
    <div className="bg-background min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8">
          <div>
            <img src="https://i.imgur.com/qfTW5j0.png" alt="Winery Logo" className="h-16 mb-4 md:mb-0" />
          </div>
          <div className="text-center md:text-right">
            <h1 className="text-3xl font-gilda text-darkBrown">Sales Performance Evaluation</h1>
            <p className="text-darkBrown opacity-75">Evaluation Date: April 7, 2025</p>
          </div>
        </div>
        
        {/* Score Overview */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="text-center md:text-left mb-4 md:mb-0">
              <h2 className="text-xl font-gilda text-darkBrown mb-2">Overall Performance</h2>
              <div className={`text-5xl font-bold ${getScoreColor(evaluationData.final_score)}`}>
                {evaluationData.final_score}%
              </div>
              <div className="text-xl text-darkBrown mt-2">{evaluationData.performance_level}</div>
            </div>
            
            <div className="w-full md:w-2/3 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={chartData}
                  margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 5]} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={100} />
                  <Tooltip 
                    formatter={(value) => [`${value}/5`, 'Score']}
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #D8D1AE' }}
                  />
                  <Bar dataKey="score" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        
        {/* Strengths and Improvements */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-gilda text-darkBrown mb-4 pb-2 border-b border-background">Strengths</h2>
            <ul className="space-y-2">
              {evaluationData.strengths.map((strength, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-gilda text-darkBrown mb-4 pb-2 border-b border-background">Areas for Improvement</h2>
            <ul className="space-y-2">
              {evaluationData.improvements.map((improvement, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-orange-500 mr-2">⚠</span>
                  <span>{improvement}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        {/* Recommendations */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-gilda text-darkBrown mb-4 pb-2 border-b border-background">Key Recommendations</h2>
          <ol className="space-y-4">
            {evaluationData.recommendations.map((recommendation, index) => (
              <li key={index} className="flex">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-darkBrown text-white flex items-center justify-center mr-3">
                  {index + 1}
                </div>
                <div className="pt-1">{recommendation}</div>
              </li>
            ))}
          </ol>
        </div>
        
        {/* Detailed Notes */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-gilda text-darkBrown mb-4 pb-2 border-b border-background">Detailed Evaluation Notes</h2>
          <div className="space-y-4">
            {evaluationData.criteria_scores.map((criterion) => (
              <div key={criterion.Criterion} className="pb-4 border-b border-gray-100 last:border-0">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium text-darkBrown">{criterion.Criterion}</h3>
                  <div className={`px-2 py-1 rounded text-white text-sm ${getBarColor(criterion.Score) === '#4ECDC4' ? 'bg-green-500' : (getBarColor(criterion.Score) === '#FFD166' ? 'bg-yellow-500' : 'bg-red-500')}`}>
                    Score: {criterion.Score}/5
                  </div>
                </div>
                <p className="text-gray-700">{evaluationData.detailed_notes[criterion.Criterion]}</p>
              </div>
            ))}
          </div>
        </div>
        
        {/* Footer */}
        <div className="mt-8 text-center text-darkBrown opacity-75">
          <p>Milea Estate Winery • Sales Performance Evaluation System</p>
          <p className="text-sm">Confidential - For Internal Use Only</p>
        </div>
      </div>
    </div>
  );
};

export default WineEvaluationDashboard;
