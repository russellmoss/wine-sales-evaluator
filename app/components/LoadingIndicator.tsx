import React from 'react';

interface LoadingIndicatorProps {
  message?: string;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ 
  message = 'Processing...' 
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
      <div className="relative w-20 h-20">
        <div className="absolute top-0 left-0 w-full h-full border-4 border-purple-200 rounded-full"></div>
        <div className="absolute top-0 left-0 w-full h-full border-4 border-purple-700 rounded-full animate-spin border-t-transparent"></div>
      </div>
      <p className="text-purple-700 font-medium">{message}</p>
      <p className="text-sm text-gray-500 text-center max-w-md">
        Claude is analyzing the conversation. This may take a minute as it carefully evaluates against all criteria in the rubric.
      </p>
    </div>
  );
};

export default LoadingIndicator; 