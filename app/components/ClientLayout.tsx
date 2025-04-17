'use client';

import React from 'react';
import GlobalErrorBoundary from './GlobalErrorBoundary';
import Providers from './Providers';

interface ClientLayoutProps {
  children: React.ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  return (
    <GlobalErrorBoundary>
      <Providers>
        {children}
      </Providers>
    </GlobalErrorBoundary>
  );
} 