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
2. Find the staff member's name in the conversation (usually introduced as "my name is [Name]" or similar) and replace "Staff:" with "[Name]:"
3. Maintain every single interaction and detail - do not skip or summarize anything
4. Use single line breaks between speakers
5. Use at most double line breaks between major sections
6. Format as clean markdown with these specific rules:
   - Convert any text between single stars that describes actions (like *picks up glass*) to italics using markdown _picks up glass_
   - Convert any text between double stars (like **Date:**) to bold using markdown **Date:**
   - Remove ### from headers but make the text bold (e.g., "### Staff:" becomes "**Staff:**")
   - All action descriptions and non-dialog text should be italicized (e.g., *nods appreciatively* becomes _nods appreciatively_)
7. Do not add any commentary or additional text
8. Do not truncate or shorten the conversation in any way
9. Ensure the entire conversation is preserved from start to finish

Here's the conversation to clean up:

${markdown}

Return the complete cleaned conversation exactly as is, just with fixed spelling/grammar and proper markdown formatting.`;

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

  // Font sizes and line heights
  const fontSize = {
    title: 16,
    header: 14,
    body: 12
  };
  const lineHeight = fontSize.body * 1.5;

  let yPosition = margin.top;

  // Helper function to write wrapped text
  const writeWrappedText = (text: string, x: number, y: number, maxWidth: number): number => {
    const words = text.split(' ');
    let line = '';
    let currentY = y;

    for (const word of words) {
      const testLine = line + (line ? ' ' : '') + word;
      const testWidth = doc.getTextWidth(testLine);

      if (testWidth > maxWidth) {
        doc.text(line, x, currentY);
        line = word;
        currentY += lineHeight;

        // Check for page break
        if (currentY + lineHeight > pageHeight - margin.bottom) {
          doc.addPage();
          currentY = margin.top;
        }
      } else {
        line = testLine;
      }
    }

    // Write the last line
    if (line) {
      doc.text(line, x, currentY);
      currentY += lineHeight;
    }

    return currentY;
  };

  // Process each line
  const lines = markdown.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      yPosition += lineHeight / 2;
      continue;
    }

    // Check for page break
    if (yPosition + lineHeight > pageHeight - margin.bottom) {
      doc.addPage();
      yPosition = margin.top;
    }

    // Handle different line types
    if (line.startsWith('# ')) {
      // Main title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(fontSize.title);
      doc.setTextColor(0, 0, 0);
      const text = line.substring(2);
      const textWidth = doc.getTextWidth(text);
      doc.text(text, (pageWidth - textWidth) / 2, yPosition);
      yPosition += lineHeight * 1.5;
    }
    else if (line.startsWith('## ') || line.startsWith('### ')) {
      // Section headers
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(fontSize.header);
      doc.setTextColor(0, 0, 0);
      const text = line.startsWith('## ') ? line.substring(3) : line.substring(4);
      doc.text(text, margin.left, yPosition);
      yPosition += lineHeight * 1.2;
    }
    else if (line.startsWith('**')) {
      // Handle metadata and speaker lines differently
      doc.setFontSize(fontSize.body);
      const text = line.replace(/\*\*/g, '');
      
      if (text.includes('Guest:') || text.includes('Russell:')) {
        // Speaker line - format name in bold and remove colon
        const parts = text.split(':');
        const speaker = parts[0];
        const dialogue = parts[1] ? parts[1].trim() : '';
        
        // Write speaker name in bold with colon
        doc.setFont('helvetica', 'bold');
        if (speaker === 'Guest') {
          doc.setTextColor(0, 100, 0); // Green for guest
        } else {
          doc.setTextColor(0, 0, 255); // Blue for Russell
        }
        const speakerText = speaker + ':';
        const speakerWidth = doc.getTextWidth(speakerText);
        doc.text(speakerText, margin.left, yPosition);
        
        // Write dialogue in normal font
        if (dialogue) {
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(0, 0, 0); // Reset to black for dialogue
          yPosition = writeWrappedText(dialogue, margin.left + speakerWidth + 10, yPosition, contentWidth - speakerWidth - 10);
        } else {
          yPosition += lineHeight;
        }
      } else {
        // Regular metadata - keep bold
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        yPosition = writeWrappedText(text, margin.left, yPosition, contentWidth);
      }
    }
    else {
      // Handle regular text with potential actions
      doc.setFontSize(fontSize.body);
      
      // Split the line into parts, preserving action text
      const parts = line.split(/(\*[^*]+\*)/);
      let currentX = margin.left;
      
      for (const part of parts) {
        if (part.startsWith('*') && part.endsWith('*')) {
          // Action text
          doc.setFont('helvetica', 'italic');
          doc.setTextColor(90, 90, 90);
          const actionText = part.slice(1, -1);
          yPosition = writeWrappedText(actionText, currentX, yPosition, contentWidth - (currentX - margin.left));
          currentX = margin.left; // Reset X position after action
        } else if (part.trim()) {
          // Regular text - check for speaker
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(0, 0, 0); // Black for regular text
          yPosition = writeWrappedText(part.trim(), currentX, yPosition, contentWidth - (currentX - margin.left));
          currentX = margin.left; // Reset X position after text
        }
      }
    }

    // Add some spacing between paragraphs
    yPosition += lineHeight * 0.5;
  }

  // Convert to Buffer
  const pdfBytes = doc.output('arraybuffer');
  return Buffer.from(pdfBytes);
} 