"use client";

import React, { useState, useEffect } from 'react';
import { Document, Page, Text, View, StyleSheet, PDFViewer, pdf } from '@react-pdf/renderer';
import type { EvaluationData } from '@/types/evaluation';
import LoadingIndicator from './LoadingIndicator';

// Register fonts with error handling
import { Font } from '@react-pdf/renderer';
try {
  Font.register({
    family: 'Roboto',
    fonts: [
      { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf', fontWeight: 300 },
      { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf', fontWeight: 400 },
      { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-medium-webfont.ttf', fontWeight: 500 },
      { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf', fontWeight: 700 },
    ],
  });
} catch (error) {
  console.error('Error registering fonts:', error);
  // Fallback to system fonts if registration fails
  Font.register({
    family: 'Roboto',
    fonts: [
      { src: 'https://fonts.gstatic.com/s/roboto/v20/KFOmCnqEu92Fr1Mu4mxK.ttf', fontWeight: 400 },
    ],
  });
}

// Create styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 30,
    fontFamily: 'Roboto',
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    borderBottomStyle: 'solid',
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: '#1F2937',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 500,
    color: '#1F2937',
    marginBottom: 10,
  },
  summaryCard: {
    backgroundColor: '#F3F4F6',
    padding: 15,
    borderRadius: 5,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  summaryLabel: {
    width: '30%',
    fontSize: 12,
    color: '#6B7280',
  },
  summaryValue: {
    width: '70%',
    fontSize: 12,
    color: '#1F2937',
    fontWeight: 500,
  },
  criterionCard: {
    marginBottom: 15,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'solid',
    borderRadius: 5,
  },
  criterionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  criterionName: {
    fontSize: 14,
    fontWeight: 500,
    color: '#1F2937',
  },
  criterionScore: {
    fontSize: 14,
    fontWeight: 700,
  },
  criterionNotes: {
    fontSize: 12,
    color: '#4B5563',
    marginTop: 5,
  },
  exampleBox: {
    backgroundColor: '#F3F4F6',
    padding: 10,
    marginTop: 5,
    borderRadius: 3,
  },
  exampleText: {
    fontSize: 12,
    color: '#4B5563',
    fontStyle: 'italic',
  },
  listItem: {
    fontSize: 12,
    color: '#4B5563',
    marginBottom: 5,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    fontSize: 10,
    color: '#6B7280',
    textAlign: 'center',
  },
});

// Helper function to get score color
const getScoreColor = (score: number): string => {
  if (score >= 4) return '#10B981'; // Green
  if (score >= 3) return '#F59E0B'; // Yellow
  return '#EF4444'; // Red
};

// Helper function to extract example from notes
const extractExample = (notes: string): string | null => {
  const exampleMatch = notes.match(/For example,([^.]*)/i);
  return exampleMatch ? exampleMatch[1].trim() : null;
};

// Helper function to extract suggestions from notes
const extractSuggestions = (notes: string): string[] => {
  const suggestions: string[] = [];
  const lines = notes.split('\n');
  
  for (const line of lines) {
    if (line.includes('suggest') || line.includes('recommend') || line.includes('improve')) {
      suggestions.push(line.trim());
    }
  }
  
  return suggestions;
};

interface PDFExportProps {
  evaluationData: EvaluationData;
  onClose: () => void;
}

// Separate component for the PDF document
const PDFDocument: React.FC<{ evaluationData: EvaluationData }> = ({ evaluationData }) => {
  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
    }
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Wine Sales Performance Evaluation</Text>
          <Text style={styles.subtitle}>Generated on {formatDate(new Date().toISOString())}</Text>
        </View>

        {/* Summary Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Evaluation Summary</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Staff Member:</Text>
              <Text style={styles.summaryValue}>{evaluationData.staffName}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Date:</Text>
              <Text style={styles.summaryValue}>{formatDate(evaluationData.date)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Performance Level:</Text>
              <Text style={styles.summaryValue}>{evaluationData.performanceLevel}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Overall Score:</Text>
              <Text style={styles.summaryValue}>{evaluationData.totalScore}/5</Text>
            </View>
          </View>
        </View>

        {/* Criteria Scores Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detailed Criteria Analysis</Text>
          {evaluationData.criteriaScores.map((criterion, index) => {
            const scoreColor = getScoreColor(criterion.score);
            const example = extractExample(criterion.notes);
            const suggestions = extractSuggestions(criterion.notes);

            return (
              <View key={index} style={styles.criterionCard}>
                <View style={styles.criterionHeader}>
                  <Text style={styles.criterionName}>{criterion.criterion}</Text>
                  <Text style={[styles.criterionScore, { color: scoreColor }]}>
                    {criterion.score}/5
                  </Text>
                </View>
                <Text style={styles.criterionNotes}>{criterion.notes}</Text>
                {example && (
                  <View style={styles.exampleBox}>
                    <Text style={styles.exampleText}>"{example}"</Text>
                  </View>
                )}
                {suggestions.length > 0 && (
                  <View style={{ marginTop: 5 }}>
                    <Text style={[styles.criterionNotes, { fontWeight: 500 }]}>Suggestions for Improvement:</Text>
                    {suggestions.map((suggestion, idx) => (
                      <Text key={idx} style={styles.listItem}>• {suggestion}</Text>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Strengths Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Strengths</Text>
          {evaluationData.strengths.map((strength, index) => (
            <Text key={index} style={styles.listItem}>• {strength}</Text>
          ))}
        </View>

        {/* Areas for Improvement Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Areas for Improvement</Text>
          {evaluationData.areasForImprovement.map((area, index) => (
            <Text key={index} style={styles.listItem}>• {area}</Text>
          ))}
        </View>

        {/* Recommendations Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Recommendations</Text>
          {evaluationData.keyRecommendations.map((recommendation, index) => (
            <Text key={index} style={styles.listItem}>• {recommendation}</Text>
          ))}
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Generated by Wine Sales Performance Evaluator
        </Text>
      </Page>
    </Document>
  );
};

const PDFExport: React.FC<PDFExportProps> = ({ evaluationData, onClose }) => {
  const [isClient, setIsClient] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Set isClient to true when component mounts
  useEffect(() => {
    setIsClient(true);
    setIsLoading(false);
  }, []);

  const handleDownload = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Create PDF blob
      const blob = await pdf(<PDFDocument evaluationData={evaluationData} />).toBlob();
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `wine-evaluation-${evaluationData.staffName.replace(/\s+/g, '-').toLowerCase()}.pdf`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      URL.revokeObjectURL(url);
      setIsLoading(false);
    } catch (err) {
      console.error('Error generating PDF:', err);
      setError('Failed to generate PDF. Please try again.');
      setIsLoading(false);
    }
  };

  // Show loading state while waiting for client-side rendering
  if (!isClient || isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-700">Loading PDF viewer...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state if there's an error
  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
          <div className="flex flex-col items-center">
            <div className="text-red-500 text-xl mb-4">⚠️</div>
            <p className="text-gray-700 mb-4">{error}</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-4 rounded-lg shadow-xl w-11/12 h-5/6 flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Export Evaluation as PDF</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        
        <div className="flex-1 overflow-hidden">
          <PDFViewer width="100%" height="100%">
            <PDFDocument evaluationData={evaluationData} />
          </PDFViewer>
        </div>
        
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleDownload}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default PDFExport; 