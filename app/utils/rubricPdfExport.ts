import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Rubric, Criterion, PerformanceLevel } from '../types/rubric';

// Helper function to ensure we have enough space on the page
const ensureSpace = (doc: jsPDF, currentY: number, requiredSpace: number, margin: number, bottomMargin: number): number => {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (currentY + requiredSpace > pageHeight - bottomMargin) {
    doc.addPage();
    return margin;
  }
  return currentY;
};

// Helper function to add wrapped text and return the height used
const addWrappedText = (doc: jsPDF, text: string, x: number, y: number, maxWidth: number, bottomMargin: number): number => {
  const lines = doc.splitTextToSize(text, maxWidth);
  const lineHeight = doc.getTextDimensions('test').h * 1.2;
  const totalHeight = lines.length * lineHeight;
  
  // Check if we need a new page
  let currentY = y;
  const pageHeight = doc.internal.pageSize.getHeight();
  
  lines.forEach((line: string) => {
    if (currentY > pageHeight - bottomMargin) {
      doc.addPage();
      currentY = 20;
    }
    doc.text(line, x, currentY);
    currentY += lineHeight;
  });
  
  return totalHeight;
};

export const exportRubricToPDF = (rubric: Rubric) => {
  // Create new document
  const doc = new jsPDF();
  
  // Set up dimensions and margins
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const bottomMargin = 30;
  const textWidth = pageWidth - (margin * 2);
  let currentY = margin;
  
  // Title
  doc.setFontSize(20);
  doc.text(rubric.name, pageWidth / 2, currentY, { align: 'center' });
  currentY += 15;
  
  // Description
  if (rubric.description) {
    doc.setFontSize(12);
    currentY = ensureSpace(doc, currentY, 20, margin, bottomMargin);
    const descHeight = addWrappedText(doc, rubric.description, margin, currentY, textWidth, bottomMargin);
    currentY += descHeight + 10;
  }
  
  // Metadata
  doc.setFontSize(10);
  doc.setTextColor(100);
  currentY = ensureSpace(doc, currentY, 30, margin, bottomMargin);
  doc.text(`Created: ${new Date(rubric.createdAt).toLocaleDateString()}`, margin, currentY);
  currentY += 5;
  doc.text(`Last Updated: ${new Date(rubric.updatedAt).toLocaleDateString()}`, margin, currentY);
  currentY += 5;
  doc.text(`Default Rubric: ${rubric.isDefault ? 'Yes' : 'No'}`, margin, currentY);
  currentY += 15;
  
  // Reset text color
  doc.setTextColor(0);
  
  // Criteria Section
  doc.setFontSize(16);
  currentY = ensureSpace(doc, currentY, 10, margin, bottomMargin);
  doc.text('Evaluation Criteria', margin, currentY);
  currentY += 10;
  
  // Criteria Table
  const criteriaTableData = rubric.criteria.map((criterion: Criterion) => {
    const scoringLevels = criterion.scoringLevels
      .sort((a, b) => a.score - b.score)
      .map(level => `Score ${level.score}: ${level.description}`)
      .join('\n\n');
      
    return [
      criterion.name,
      `${criterion.weight}%`,
      criterion.description,
      scoringLevels
    ];
  });
  
  autoTable(doc, {
    startY: currentY,
    head: [['Criterion', 'Weight', 'Description', 'Scoring Levels']],
    body: criteriaTableData,
    margin: { left: margin, right: margin, bottom: bottomMargin },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 20 },
      2: { cellWidth: 40 },
      3: { cellWidth: 'auto' }
    },
    styles: {
      overflow: 'linebreak',
      cellPadding: 5
    },
    headStyles: {
      fillColor: [100, 100, 100]
    }
  });
  
  // Get the last Y position after the table
  currentY = (doc as any).lastAutoTable.finalY + 15;
  
  // Performance Levels Section
  doc.setFontSize(16);
  currentY = ensureSpace(doc, currentY, 10, margin, bottomMargin);
  doc.text('Performance Levels', margin, currentY);
  currentY += 10;
  
  // Performance Levels Table
  const performanceLevelsData = rubric.performanceLevels
    .sort((a, b) => b.minScore - a.minScore)
    .map((level: PerformanceLevel) => [
      level.name,
      `${level.minScore}% - ${level.maxScore}%`,
      level.description
    ]);
  
  autoTable(doc, {
    startY: currentY,
    head: [['Level', 'Score Range', 'Description']],
    body: performanceLevelsData,
    margin: { left: margin, right: margin, bottom: bottomMargin },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 30 },
      2: { cellWidth: 'auto' }
    },
    styles: {
      overflow: 'linebreak',
      cellPadding: 5
    },
    headStyles: {
      fillColor: [100, 100, 100]
    }
  });
  
  // Save the PDF
  const fileName = `rubric-${rubric.name.toLowerCase().replace(/\s+/g, '-')}.pdf`;
  doc.save(fileName);
}; 