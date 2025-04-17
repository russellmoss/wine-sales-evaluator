import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { marked, Token } from 'marked';

export const exportConversationToPDF = async (markdown: string, fileName: string) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15; // Reduced margin for better space usage
  const textWidth = pageWidth - (margin * 2);
  
  // Parse markdown to get conversation parts
  const tokens = marked.lexer(markdown);
  
  // Title
  doc.setFontSize(14); // Smaller title
  doc.text('Wine Tasting Conversation', pageWidth / 2, margin, { align: 'center' });
  
  // Add date if available from filename (assuming format like YYYY-MM-DD-conversation.md)
  const dateMatch = fileName.match(/(\d{4}-\d{2}-\d{2})/);
  if (dateMatch) {
    doc.setFontSize(11);
    doc.text(`Date: ${dateMatch[1]}`, margin, margin + 10);
  }
  
  let currentY = margin + 20;
  
  // Process each token
  tokens.forEach((token: Token) => {
    // Check if we need a new page
    if (currentY > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      currentY = margin;
    }

    if (token.type === 'paragraph') {
      doc.setFontSize(11); // Consistent 11pt font
      
      // Identify speaker (Staff or Guest)
      const text = token.text;
      const isSpeakerLine = text.startsWith('Staff:') || text.startsWith('Guest:');
      
      if (isSpeakerLine) {
        // Extract speaker and message
        const [speaker, ...messageParts] = text.split(':');
        const message = messageParts.join(':').trim();
        
        // Set different colors for Staff and Guest
        if (speaker === 'Staff') {
          doc.setTextColor(0, 102, 204); // Blue for staff
        } else {
          doc.setTextColor(51, 153, 51); // Green for guest
        }
        
        // Add speaker label
        doc.setFont('helvetica', 'normal'); // No bold text
        doc.text(`${speaker}:`, margin, currentY);
        
        // Add message with wrapping
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(message, textWidth - 20); // Extra indent for message
        doc.text(lines, margin + 15, currentY); // Reduced indent
        
        // Move Y position based on number of lines with reduced spacing
        currentY += (lines.length * 5) + 3; // Reduced line height and spacing
      } else {
        // Regular paragraph (not speaker dialogue)
        doc.setTextColor(0, 0, 0);
        const lines = doc.splitTextToSize(text, textWidth);
        doc.text(lines, margin, currentY);
        currentY += (lines.length * 5) + 3; // Reduced line height and spacing
      }
    } else if (token.type === 'heading') {
      doc.setFontSize(12); // Smaller headings
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal'); // No bold text
      doc.text(token.text, margin, currentY);
      currentY += 8; // Reduced heading spacing
    } else if (token.type === 'space') {
      currentY += 3; // Reduced spacing between sections
    }
    
    // Reset text color after each token
    doc.setTextColor(0, 0, 0);
  });
  
  // Save the PDF
  const pdfFileName = `conversation-${fileName.replace('.md', '')}.pdf`;
  doc.save(pdfFileName);
}; 