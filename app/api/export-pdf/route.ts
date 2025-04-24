import { NextResponse } from 'next/server';
import { PDFDocument, rgb } from 'pdf-lib';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PerformanceLevel } from '@/app/types/evaluation';

// Helper function to format date
const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Helper function to get performance level color
const getPerformanceLevelColor = (level: PerformanceLevel) => {
  switch (level) {
    case 'Exceptional':
      return '#4CAF50'; // Green
    case 'Strong':
      return '#2196F3'; // Blue
    case 'Proficient':
      return '#FFC107'; // Yellow
    case 'Developing':
      return '#FF9800'; // Orange
    case 'Needs Improvement':
      return '#F44336'; // Red
    default:
      return '#000000'; // Black
  }
};

// Helper function to add wrapped text
const addWrappedText = (doc: jsPDF, text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
  const words = text.split(' ');
  let line = '';
  let currentY = y;

  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + ' ';
    const testWidth = doc.getTextWidth(testLine);
    
    if (testWidth > maxWidth && i > 0) {
      doc.text(line, x, currentY);
      line = words[i] + ' ';
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  doc.text(line, x, currentY);
  return currentY + lineHeight;
};

// Helper function to ensure space
const ensureSpace = (doc: jsPDF, requiredSpace: number) => {
  const pageHeight = doc.internal.pageSize.height;
  const currentY = (doc as any).lastAutoTable?.finalY || 20;
  
  if (currentY + requiredSpace > pageHeight - 20) {
    doc.addPage();
    return 20;
  }
  return currentY;
};

interface ExportData {
  rubricId: string;
  conversationSummary: string;
  criteriaScores: Array<{
    criterion: string;
    weight: number;
    score: number;
    weightedScore: number;
    notes: string;
  }>;
  overallScore: number;
  performanceLevel: PerformanceLevel;
  strengths: string[];
  areasForImprovement: string[];
  keyRecommendations: string[];
  criteria?: {
    [key: string]: {
      score: number;
      feedback: string;
    };
  };
}

export async function POST(request: Request) {
  try {
    const data = await request.json() as ExportData;
    
    // Create a new PDF document
    const doc = new jsPDF();
    
    // Set margins and page dimensions
    const margin = 20;
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const contentWidth = pageWidth - 2 * margin;
    let y = margin;
    
    // Helper function to check if we need a new page
    const checkNewPage = (requiredHeight: number) => {
      if (y + requiredHeight > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
    };
    
    // Add title
    doc.setFontSize(20);
    doc.text('Sales Conversation Evaluation', margin, y);
    y += 25;
    
    // Add date and performance level
    doc.setFontSize(12);
    doc.text(`Date: ${formatDate(new Date().toISOString())}`, margin, y);
    y += 15;
    doc.text(`Overall Score: ${data.overallScore}%`, margin, y);
    y += 15;
    doc.text(`Performance Level: ${data.performanceLevel}`, margin, y);
    y += 25;
    
    // Add criteria scores table
    doc.setFontSize(14);
    doc.text('Evaluation Criteria', margin, y);
    y += 15;
    
    const tableData = data.criteriaScores.map(score => [
      score.criterion,
      score.weight,
      score.score,
      score.weightedScore,
      score.notes
    ]);
    
    autoTable(doc, {
      startY: y,
      head: [['Criterion', 'Weight', 'Score', 'Weighted Score', 'Notes']],
      body: tableData,
      margin: { left: margin, right: margin },
      styles: { fontSize: 10 },
      headStyles: { fillColor: [66, 66, 66] },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 20 },
        2: { cellWidth: 20 },
        3: { cellWidth: 30 },
        4: { cellWidth: 40 }
      },
      theme: 'grid'
    });
    
    // Get the final Y position after the table and add extra space
    y = (doc as any).lastAutoTable.finalY + 40;
    
    // Helper function to add a section with proper pagination
    const addSection = (title: string, items: string[]) => {
      // Check if we need a new page for the section header
      checkNewPage(40);
      
      // Add section header
      doc.setFontSize(14);
      doc.text(title, margin, y);
      y += 20;
      
      // Add items
      doc.setFontSize(12);
      items.forEach((item: string) => {
        if (item.trim()) {
          const lines = doc.splitTextToSize(`• ${item}`, contentWidth - 10);
          const itemHeight = lines.length * 7 + 10;
          
          // Check if we need a new page for this item
          checkNewPage(itemHeight);
          
          doc.text(lines, margin + 5, y);
          y += itemHeight;
        }
      });
      
      // Add spacing after section
      y += 30;
    };
    
    // Add sections with proper pagination
    addSection('Strengths', data.strengths);
    addSection('Areas for Improvement', data.areasForImprovement);
    addSection('Key Recommendations', data.keyRecommendations);
    
    // Convert to buffer
    const pdfBytes = doc.output('arraybuffer');
    
    // Return the PDF
    return new NextResponse(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="evaluation-${new Date().toISOString().split('T')[0]}.pdf"`
      }
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return new NextResponse(JSON.stringify({ error: 'Error generating PDF' }), { 
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
} 