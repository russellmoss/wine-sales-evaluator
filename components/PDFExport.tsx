"use client";

import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { EvaluationData } from '@/types/evaluation';
import LoadingIndicator from './LoadingIndicator';
import { toast } from 'react-hot-toast';

interface PDFExportProps {
  evaluationData: EvaluationData;
  onClose: () => void;
  fileName?: string;
  highlightedSections?: Array<{
    id: string;
    criterionId: string;
    color: string;
    text: string;
  }>;
}

const PDFExport: React.FC<PDFExportProps> = ({ 
  evaluationData, 
  onClose, 
  fileName = 'wine-sales-evaluation.pdf',
  highlightedSections 
}) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleExport = () => {
    if (!evaluationData) {
      toast.error('No evaluation data available to export');
      return;
    }
    
    setIsGenerating(true);
    
    try {
      const doc = new jsPDF();
      let yPosition = 20; // Starting Y position
      
      // Add title
      doc.setFontSize(24);
      doc.text('Wine Sales Performance Evaluation', 20, yPosition);
      yPosition += 20;
      
      // Add date
      doc.setFontSize(12);
      doc.text(`Generated on ${new Date().toLocaleDateString()}`, 20, yPosition);
      yPosition += 20;
      
      // Add summary section
      doc.setFontSize(16);
      doc.text('Evaluation Summary', 20, yPosition);
      yPosition += 20;
      
      doc.setFontSize(12);
      doc.text(`Staff Member: ${evaluationData.staffName}`, 20, yPosition);
      yPosition += 10;
      doc.text(`Date: ${new Date(evaluationData.date).toLocaleDateString()}`, 20, yPosition);
      yPosition += 10;
      doc.text(`Performance Level: ${evaluationData.performanceLevel}`, 20, yPosition);
      yPosition += 10;
      doc.text(`Overall Score: ${evaluationData.overallScore}/5`, 20, yPosition);
      yPosition += 20;
      
      // Add criteria scores table
      doc.setFontSize(16);
      doc.text('Detailed Criteria Analysis', 20, yPosition);
      yPosition += 10;
      
      const tableData = evaluationData.criteriaScores.map(criterion => {
        const criterionHighlights = highlightedSections?.filter(
          section => section.criterionId === criterion.criterion
        ) || [];
        
        let notes = criterion.notes || '';
        if (criterionHighlights.length > 0) {
          if (notes) {
            notes += '\n\n';
          }
          notes += 'Highlighted Sections:';
          criterionHighlights.forEach(highlight => {
            notes += `\n• ${highlight.text}`;
          });
        }
        
        return [
          criterion.criterion,
          criterion.score.toString(),
          notes
        ];
      });
      
      autoTable(doc, {
        startY: yPosition,
        head: [['Criterion', 'Score', 'Notes']],
        body: tableData,
        theme: 'grid',
        styles: {
          fontSize: 10,
          cellPadding: 5,
        },
        columnStyles: {
          0: { cellWidth: 60 },
          1: { cellWidth: 20 },
          2: { cellWidth: 110 },
        }
      });

      // Get the final Y position after the table
      const finalY = (doc as any).lastAutoTable.finalY || yPosition + 100;

      // Add strengths section
      doc.setFontSize(16);
      doc.text('Key Strengths', 20, finalY + 20);
      evaluationData.strengths.forEach((strength, index) => {
        doc.setFontSize(12);
        doc.text(`• ${strength}`, 20, finalY + 30 + (index * 10));
      });

      // Add areas for improvement
      doc.setFontSize(16);
      doc.text('Areas for Improvement', 20, finalY + 50);
      evaluationData.areasForImprovement.forEach((area, index) => {
        doc.setFontSize(12);
        doc.text(`• ${area}`, 20, finalY + 60 + (index * 10));
      });

      // Add recommendations
      doc.setFontSize(16);
      doc.text('Key Recommendations', 20, finalY + 80);
      evaluationData.keyRecommendations.forEach((recommendation, index) => {
        doc.setFontSize(12);
        doc.text(`• ${recommendation}`, 20, finalY + 90 + (index * 10));
      });
      
      // Save the PDF
      doc.save(fileName);
      toast.success('PDF exported successfully');
      onClose();
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Export Evaluation</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {isGenerating ? (
          <div className="flex flex-col items-center justify-center p-8">
            <LoadingIndicator />
            <p className="mt-4 text-gray-600">Generating PDF...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-600">
              This will generate a PDF report containing the evaluation data and highlighted sections.
            </p>
            <button
              onClick={handleExport}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
            >
              Generate and Download PDF
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PDFExport; 