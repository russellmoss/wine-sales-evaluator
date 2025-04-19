import React from 'react';

export type ModelType = 'claude' | 'gemini';

interface ModelSelectorProps {
  selectedModel: ModelType;
  onModelChange: (model: ModelType) => void;
  disabled?: boolean;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModel,
  onModelChange,
  disabled = false
}) => {
  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Select AI Model
      </label>
      <div className="flex space-x-4">
        <button
          onClick={() => onModelChange('claude')}
          disabled={disabled}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            selectedModel === 'claude'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          Claude
        </button>
        <button
          onClick={() => onModelChange('gemini')}
          disabled={disabled}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            selectedModel === 'gemini'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          Gemini
        </button>
      </div>
    </div>
  );
};

export default ModelSelector; 