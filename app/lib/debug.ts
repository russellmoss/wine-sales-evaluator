/**
 * Sanitizes an error object for logging
 * @param error The error to sanitize
 * @returns An object safe for logging and debugging
 */
export function sanitizeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause ? sanitizeError(error.cause) : undefined,
    };
  }
  
  if (typeof error === 'object' && error !== null) {
    return { ...error };
  }
  
  return { value: error };
}

/**
 * Extracts staff name from a conversation markdown
 * Useful for debugging or fallback values
 */
export function extractStaffName(markdown: string): string | null {
  // Look for patterns like "Staff Member: name" or "Staff: name"
  const staffMemberMatch = markdown.match(/Staff(?:\s+Member)?(?:\s+\(\d+\))?[:\s]+([^\n]+)/i);
  if (staffMemberMatch && staffMemberMatch[1]) {
    // Extract name if it appears like "hi my name is Russell"
    const nameMatch = staffMemberMatch[1].match(/(?:hi|hello|hey)[\s,]+(?:my name is|i'm|i am)\s+([^\s,\.]+)/i);
    if (nameMatch && nameMatch[1]) {
      return nameMatch[1].trim();
    }
    return staffMemberMatch[1].trim();
  }
  return null;
}

/**
 * Extracts date from a conversation markdown
 * Useful for debugging or fallback values
 */
export function extractDate(markdown: string): string | null {
  const dateMatch = markdown.match(/Date:?\s+(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})/i);
  if (dateMatch && dateMatch[1]) {
    // Try to parse and format date consistently
    try {
      const dateStr = dateMatch[1];
      const date = new Date(dateStr);
      return date.toISOString().split('T')[0]; // YYYY-MM-DD format
    } catch (e) {
      return dateMatch[1]; // Return as is if parsing fails
    }
  }
  return null;
} 