import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import GlobalErrorBoundary from './components/GlobalErrorBoundary';

// Initialize the font with proper error handling
const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap', // Use swap to prevent FOIT (Flash of Invisible Text)
  fallback: ['system-ui', 'arial'], // Provide fallback fonts
});

export const metadata: Metadata = {
  title: 'Wine Sales Evaluator',
  description: 'Evaluate wine tasting conversations using Claude AI',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter?.className || ''}>
        <GlobalErrorBoundary>
          {children}
        </GlobalErrorBoundary>
        <Toaster position="top-right" />
      </body>
    </html>
  );
} 