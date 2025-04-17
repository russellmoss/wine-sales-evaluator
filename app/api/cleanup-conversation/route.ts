import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import jsPDF from 'jspdf';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

export async function POST(request: NextRequest) {
  try {
    console.log('Cleanup API: Starting request processing');
    const { markdown } = await request.json();

    if (!markdown) {
      console.log('Cleanup API: No markdown content provided');
      return NextResponse.json(
        { error: 'No markdown content provided' },
        { status: 400 }
      );
    }

    console.log('Cleanup API: Received markdown of length:', markdown.length);
    console.log('Cleanup API: Calling Gemini API...');

    const prompt = `You are tasked with cleaning up and formatting a wine tasting conversation. This is a VERY important task and you MUST maintain the COMPLETE conversation without any truncation or summarization. Follow these rules exactly:

1. Fix any spelling and grammar errors while maintaining the natural flow
2. Keep all Staff: and Guest: prefixes
3. Maintain every single interaction and detail - do not skip or summarize anything
4. Use single line breaks between speakers
5. Use at most double line breaks between major sections
6. Format as clean markdown
7. Do not add any commentary or additional text
8. Do not truncate or shorten the conversation in any way
9. Ensure the entire conversation is preserved from start to finish

Here's the conversation to clean up:

${markdown}

Return the complete cleaned conversation exactly as is, just with fixed spelling/grammar and proper formatting.`;

    const result = await model.generateContent(prompt);
    const cleanedMarkdown = result.response.text();

    if (!cleanedMarkdown) {
      console.error('Cleanup API: No cleaned markdown received from Gemini');
      return NextResponse.json(
        { error: 'Failed to get cleaned markdown from Gemini' },
        { status: 500 }
      );
    }

    const lengthDifference = Math.abs(markdown.length - cleanedMarkdown.length);
    const percentDifference = (lengthDifference / markdown.length) * 100;
    
    if (percentDifference > 20) {
      console.error('Cleanup API: Significant content loss detected', {
        originalLength: markdown.length,
        cleanedLength: cleanedMarkdown.length,
        percentLost: percentDifference.toFixed(2) + '%'
      });
      return NextResponse.json(
        { 
          error: 'Conversation may be too long for complete processing. Try breaking it into smaller sections.',
          details: {
            originalLength: markdown.length,
            cleanedLength: cleanedMarkdown.length,
            percentLost: percentDifference.toFixed(2) + '%'
          }
        },
        { status: 413 }
      );
    }

    // Generate PDF using jsPDF
    const pdfBuffer = await generatePDF(cleanedMarkdown);

    console.log('Cleanup API: Successfully cleaned markdown, length:', cleanedMarkdown.length);
    console.log('Cleanup API: Content preservation:', {
      originalLength: markdown.length,
      cleanedLength: cleanedMarkdown.length,
      percentageKept: (100 - percentDifference).toFixed(2) + '%'
    });

    // Return both the cleaned markdown and PDF
    const response = NextResponse.json({ 
      cleanedMarkdown,
      pdfBuffer: pdfBuffer.toString('base64')
    });

    return response;

  } catch (error) {
    console.error('Cleanup API: Error processing request:', error);
    
    // Handle specific API errors
    if (error instanceof Error) {
      const errorMessage = error.message || '';
      
      if (errorMessage.includes('max_tokens')) {
        return NextResponse.json(
          { 
            error: 'Conversation is too long to process in one request. Please break it into smaller sections.',
            details: errorMessage
          },
          { status: 413 }
        );
      }
      
      if (errorMessage.includes('rate_limit')) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again in a few moments.' },
          { status: 429 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to clean up conversation' },
      { status: 500 }
    );
  }
}

async function generatePDF(markdown: string): Promise<Buffer> {
  // Create new jsPDF instance
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'letter'
  });

  // Define margins (in points)
  const margin = {
    top: 50,
    right: 50,
    bottom: 50,
    left: 50
  };

  // Get page dimensions
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const contentWidth = pageWidth - margin.left - margin.right;
  const contentHeight = pageHeight - margin.top - margin.bottom;

  // Set title
  doc.setFontSize(20);
  const title = 'Cleaned Wine Tasting Conversation';
  const titleWidth = doc.getTextWidth(title);
  doc.text(title, (pageWidth - titleWidth) / 2, margin.top);

  // Set up text formatting
  doc.setFontSize(12);
  const lineHeight = 16;
  let yPosition = margin.top + 40; // Start below title

  // Process each line
  const lines = markdown.split('\n');
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Set color based on speaker
    if (trimmedLine.startsWith('Staff:')) {
      doc.setTextColor(0, 0, 255); // Blue for staff
    } else if (trimmedLine.startsWith('Guest:')) {
      doc.setTextColor(0, 100, 0); // Green for guest
    } else {
      doc.setTextColor(0, 0, 0); // Black for other text
    }

    if (trimmedLine) {
      // Split long lines to fit within content width
      const splitLines = doc.splitTextToSize(trimmedLine, contentWidth);
      
      // Check if we need a new page before adding text
      for (const splitLine of splitLines) {
        // If we're about to exceed the bottom margin, add a new page
        if (yPosition + lineHeight > pageHeight - margin.bottom) {
          doc.addPage();
          yPosition = margin.top; // Reset Y position to top margin of new page
        }

        // Add the line with proper left margin
        doc.text(splitLine, margin.left, yPosition);
        yPosition += lineHeight;
      }
    } else {
      // Add spacing for empty lines, but check for page break
      if (yPosition + lineHeight / 2 > pageHeight - margin.bottom) {
        doc.addPage();
        yPosition = margin.top;
      } else {
        yPosition += lineHeight / 2;
      }
    }
  }

  // Convert to Buffer
  const pdfBytes = doc.output('arraybuffer');
  return Buffer.from(pdfBytes);
} 