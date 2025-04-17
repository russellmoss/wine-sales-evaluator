import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { EvaluationData, CriterionScore } from '../types/evaluation';

// Helper function to format date string
const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    return dateString;
  }
};

// Helper function to get performance level color
const getPerformanceLevelColor = (score: number): string => {
  if (score >= 90) return '#059669'; // emerald-600
  if (score >= 80) return '#16a34a'; // green-600
  if (score >= 70) return '#ca8a04'; // yellow-600
  if (score >= 60) return '#ea580c'; // orange-600
  return '#dc2626'; // red-600
};

// Helper function to wrap text within margins and handle page breaks
const addWrappedText = (doc: jsPDF, text: string, x: number, y: number, maxWidth: number, bottomMargin: number): number => {
  // Check if we need a new page
  if (y > doc.internal.pageSize.getHeight() - bottomMargin) {
    doc.addPage();
    y = bottomMargin; // Reset Y to top margin of new page
  }

  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y);
  return (lines.length - 1) * doc.getTextDimensions('Test').h; // Return total height of wrapped text
};

// Helper function to ensure we don't start a section too close to the bottom
const ensureSpace = (doc: jsPDF, currentY: number, neededSpace: number, topMargin: number, bottomMargin: number): number => {
  if (currentY + neededSpace > doc.internal.pageSize.getHeight() - bottomMargin) {
    doc.addPage();
    return topMargin;
  }
  return currentY;
};

export const exportEvaluationToPDF = async (evaluationData: EvaluationData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const bottomMargin = 30;
  const textWidth = pageWidth - (margin * 2);
  
  // Title
  doc.setFontSize(20);
  doc.text('Wine Evaluation Report', pageWidth / 2, margin, { align: 'center' });
  
  // Basic Information
  doc.setFontSize(12);
  doc.text(`Staff Member: ${evaluationData.staffName}`, margin, 40);
  doc.text(`Date: ${evaluationData.date}`, margin, 50);
  doc.text(`Overall Score: ${evaluationData.overallScore}`, margin, 60);
  doc.text(`Performance Level: ${evaluationData.performanceLevel}`, margin, 70);
  
  // Criteria Scores
  doc.setFontSize(14);
  doc.text('Criteria Scores', margin, 90);
  
  const criteriaTableData = evaluationData.criteriaScores.map((criterion: CriterionScore) => [
    criterion.criterion,
    criterion.score.toString(),
    criterion.notes || ''
  ]);
  
  autoTable(doc, {
    startY: 100,
    head: [['Criterion', 'Score', 'Notes']],
    body: criteriaTableData,
    margin: { left: margin, right: margin, bottom: bottomMargin },
  });
  
  // Get the last Y position after the table
  let currentY = (doc as any).lastAutoTable.finalY + 20;
  
  // Strengths
  currentY = ensureSpace(doc, currentY, 100, margin, bottomMargin); // Ensure space for section
  doc.setFontSize(14);
  doc.text('Strengths', margin, currentY);
  currentY += 10;
  doc.setFontSize(12);
  
  // Add each strength with proper text wrapping
  evaluationData.strengths.forEach((strength) => {
    currentY = ensureSpace(doc, currentY, 20, margin, bottomMargin);
    doc.text('•', margin, currentY);
    const extraHeight = addWrappedText(doc, strength, margin + 5, currentY, textWidth - 5, bottomMargin);
    currentY += 10 + extraHeight;
  });
  
  // Areas for Improvement
  currentY = ensureSpace(doc, currentY + 10, 100, margin, bottomMargin); // Add extra spacing and ensure space
  doc.setFontSize(14);
  doc.text('Areas for Improvement', margin, currentY);
  currentY += 10;
  doc.setFontSize(12);
  
  // Add each area for improvement with proper text wrapping
  evaluationData.areasForImprovement.forEach((area) => {
    currentY = ensureSpace(doc, currentY, 20, margin, bottomMargin);
    doc.text('•', margin, currentY);
    const extraHeight = addWrappedText(doc, area, margin + 5, currentY, textWidth - 5, bottomMargin);
    currentY += 10 + extraHeight;
  });
  
  // Key Recommendations
  currentY = ensureSpace(doc, currentY + 10, 100, margin, bottomMargin); // Add extra spacing and ensure space
  doc.setFontSize(14);
  doc.text('Key Recommendations', margin, currentY);
  currentY += 10;
  doc.setFontSize(12);
  
  // Add each recommendation with proper text wrapping
  evaluationData.keyRecommendations.forEach((recommendation) => {
    currentY = ensureSpace(doc, currentY, 20, margin, bottomMargin);
    doc.text('•', margin, currentY);
    const extraHeight = addWrappedText(doc, recommendation, margin + 5, currentY, textWidth - 5, bottomMargin);
    currentY += 10 + extraHeight;
  });
  
  // Save the PDF
  const fileName = `wine-evaluation-${evaluationData.staffName.replace(/\s+/g, '-')}-${evaluationData.date}.pdf`;
  doc.save(fileName);
}; 