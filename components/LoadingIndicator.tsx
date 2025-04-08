import React from 'react';

interface LoadingIndicatorProps {
  message?: string;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ message = 'Loading...' }) => {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-6">
      <div className="relative w-24 h-24">
        <div className="absolute top-0 left-0 h-24 w-24 rounded-full border-4 border-blue-200"></div>
        <div className="absolute top-0 left-0 h-24 w-24 rounded-full border-b-4 border-blue-600 animate-spin"></div>
      </div>
      <p className="text-blue-700 font-medium text-lg">{message}</p>
      <div className="flex space-x-2 mt-2">
        <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
        <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
        <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
      </div>
      <p className="text-sm text-gray-500 text-center max-w-md mt-2">
        This may take a minute as Claude analyzes the conversation against all criteria in the rubric.
      </p>
    </div>
  );
};

export default LoadingIndicator; 