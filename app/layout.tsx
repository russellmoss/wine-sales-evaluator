import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import GlobalErrorBoundary from './components/GlobalErrorBoundary';
import ToasterProvider from './components/ToasterProvider';

// Initialize the font with proper error handling
const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap', // Use swap to prevent FOIT (Flash of Invisible Text)
  fallback: ['system-ui', 'arial'], // Provide fallback fonts
});

export const metadata: Metadata = {
  title: 'Wine Sales Evaluator',
  description: 'AI-powered wine sales conversation evaluator',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <GlobalErrorBoundary>
          {children}
        </GlobalErrorBoundary>
        <ToasterProvider />
      </body>
    </html>
  );
} 