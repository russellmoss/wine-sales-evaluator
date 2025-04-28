"use client";

import React from 'react';
import { useRouter } from 'next/navigation';

const BackButton: React.FC = () => {
  const router = useRouter();
  
  return (
    <button
      onClick={() => router.back()}
      className="mb-6 flex items-center text-gray-600 hover:text-gray-900 transition-colors"
    >
      <svg
        className="w-5 h-5 mr-2"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10 19l-7-7m0 0l7-7m-7 7h18"
        />
      </svg>
      Back
    </button>
  );
};

export default BackButton; 