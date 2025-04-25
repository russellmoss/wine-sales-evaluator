"use client";

import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import LoadingIndicator from './LoadingIndicator';
import { toast } from 'react-hot-toast';

interface ConversationPDFExportProps {
  markdown: string;
  highlightedSections?: Array<{
    id: string;
    criterionId: string;
    color: string;
    text: string;
  }>;
  onClose: () => void;
  fileName?: string;
}

const CRITERIA_COLORS = [
  { bg: 'bg-red-100', rgb: [254, 226, 226] },
  { bg: 'bg-orange-100', rgb: [255, 237, 213] },
  { bg: 'bg-yellow-100', rgb: [254, 249, 195] },
  { bg: 'bg-green-100', rgb: [220, 252, 231] },
  { bg: 'bg-teal-100', rgb: [204, 251, 241] },
  { bg: 'bg-blue-100', rgb: [219, 234, 254] },
  { bg: 'bg-indigo-100', rgb: [224, 231, 255] },
  { bg: 'bg-purple-100', rgb: [237, 233, 254] },
  { bg: 'bg-pink-100', rgb: [252, 231, 243] },
  { bg: 'bg-gray-100', rgb: [243, 244, 246] }
];

const PAGE_MARGINS = {
  top: 15,
  right: 5,
  bottom: 15,
  left: 15
};

const MAX_LINE_WIDTH = 190; // A4 page width (210mm) minus margins
const PAGE_HEIGHT = 297; // A4 page height in mm
const BOTTOM_MARGIN = PAGE_MARGINS.bottom + 5; // Add 5mm buffer for safety

const ConversationPDFExport: React.FC<ConversationPDFExportProps> = ({
  markdown,
  highlightedSections = [],
  onClose,
  fileName = 'wine-tasting-conversation.pdf'
}) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const splitTextIntoLines = (text: string, doc: jsPDF, fontSize: number) => {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    doc.setFontSize(fontSize);
    const charWidth = doc.getTextWidth('a') / doc.getFontSize();

    words.forEach(word => {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      const testWidth = testLine.length * charWidth * fontSize;

      if (testWidth <= MAX_LINE_WIDTH) {
        currentLine = testLine;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    });

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  };

  const handleExport = () => {
    setIsGenerating(true);
    
    try {
      const doc = new jsPDF();
      let yPosition = PAGE_MARGINS.top;
      
      // Add title
      doc.setFontSize(24);
      const titleLines = splitTextIntoLines('Wine Tasting Room Conversation', doc, 24);
      titleLines.forEach(line => {
        doc.text(line, PAGE_MARGINS.left, yPosition);
        yPosition += 12;
      });
      
      // Add date
      doc.setFontSize(12);
      const dateMatch = markdown.match(/Date: (.*)/);
      if (dateMatch) {
        doc.text(`Date: ${dateMatch[1]}`, PAGE_MARGINS.left, yPosition);
        yPosition += 8;
      }
      
      // Add description
      const descriptionMatch = markdown.match(/Description: (.*)/);
      if (descriptionMatch) {
        const descriptionLines = splitTextIntoLines(`Description: ${descriptionMatch[1]}`, doc, 12);
        descriptionLines.forEach(line => {
          doc.text(line, PAGE_MARGINS.left, yPosition);
          yPosition += 8;
        });
        yPosition += 4; // Extra space after description
      }

      // Add highlighting legend if there are highlighted sections
      if (highlightedSections.length > 0) {
        doc.setFontSize(16);
        doc.text('Highlighting Legend', PAGE_MARGINS.left, yPosition);
        yPosition += 12;

        // Group highlights by criterion
        const highlightsByCriterion = highlightedSections.reduce((acc, highlight) => {
          if (!acc[highlight.criterionId]) {
            acc[highlight.criterionId] = [];
          }
          acc[highlight.criterionId].push(highlight);
          return acc;
        }, {} as Record<string, typeof highlightedSections>);

        // Add legend entries
        doc.setFontSize(12);
        Object.entries(highlightsByCriterion).forEach(([criterionId, highlights]) => {
          doc.text(`Criterion: ${criterionId}`, PAGE_MARGINS.left, yPosition);
          yPosition += 8;
          
          highlights.forEach(highlight => {
            const color = CRITERIA_COLORS.find(c => c.bg === highlight.color)?.rgb || [0, 0, 0];
            const textLines = splitTextIntoLines(`• ${highlight.text}`, doc, 12);
            
            textLines.forEach(line => {
              // Draw background rectangle
              const textWidth = doc.getTextWidth(line);
              doc.setFillColor(color[0], color[1], color[2]);
              doc.rect(PAGE_MARGINS.left, yPosition - 4, textWidth + 2, 8, 'F');
              
              // Draw text
              doc.setTextColor(0, 0, 0);
              doc.text(line, PAGE_MARGINS.left + 1, yPosition);
              yPosition += 8;
            });
          });
          yPosition += 4;
        });
        yPosition += 8;
      }

      // Add conversation content
      doc.setFontSize(16);
      doc.text('Conversation', PAGE_MARGINS.left, yPosition);
      yPosition += 12;

      // Process and add conversation lines
      const lines = markdown.split('\n');
      let currentSpeaker = '';
      let currentBlock: string[] = [];
      
      doc.setFontSize(12);
      lines.forEach((line, index) => {
        if (line.startsWith('### ')) {
          // If we have a previous block, render it
          if (currentBlock.length > 0) {
            const blockText = currentBlock.join(' ');
            const blockLines = splitTextIntoLines(blockText, doc, 12);
            blockLines.forEach(blockLine => {
              // Check if we need a new page before adding this line
              if (yPosition > PAGE_HEIGHT - BOTTOM_MARGIN) {
                doc.addPage();
                yPosition = PAGE_MARGINS.top;
              }
              doc.text(blockLine, PAGE_MARGINS.left, yPosition);
              yPosition += 8;
            });
            yPosition += 4; // Space between blocks
            currentBlock = [];
          }

          // Check if we need a new page before adding the speaker
          if (yPosition > PAGE_HEIGHT - BOTTOM_MARGIN) {
            doc.addPage();
            yPosition = PAGE_MARGINS.top;
          }

          // New speaker
          currentSpeaker = line.replace('### ', '');
          doc.setFontSize(14);
          const speakerLines = splitTextIntoLines(currentSpeaker, doc, 14);
          speakerLines.forEach(speakerLine => {
            doc.text(speakerLine, PAGE_MARGINS.left, yPosition);
            yPosition += 8;
          });
          doc.setFontSize(12);
        } else if (line.trim() && !line.startsWith('##') && !line.startsWith('**')) {
          currentBlock.push(line.trim());
        }

        // If this is the last line, render the final block
        if (index === lines.length - 1 && currentBlock.length > 0) {
          const blockText = currentBlock.join(' ');
          const blockLines = splitTextIntoLines(blockText, doc, 12);
          blockLines.forEach(blockLine => {
            // Check if we need a new page before adding this line
            if (yPosition > PAGE_HEIGHT - BOTTOM_MARGIN) {
              doc.addPage();
              yPosition = PAGE_MARGINS.top;
            }
            doc.text(blockLine, PAGE_MARGINS.left, yPosition);
            yPosition += 8;
          });
        }
      });
      
      // Save the PDF
      doc.save(fileName);
      toast.success('Conversation exported successfully');
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
          <h2 className="text-2xl font-bold">Export Conversation</h2>
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
              This will generate a PDF containing the conversation with highlighted sections and a legend.
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

export default ConversationPDFExport; 