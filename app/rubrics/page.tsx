'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import RubricList from '../components/rubrics/RubricList';
import RubricDetail from '../components/rubrics/RubricDetail';
import { Rubric } from '../types/rubric';

const RubricManagementPage: React.FC = () => {
  const router = useRouter();
  const [selectedRubric, setSelectedRubric] = useState<Rubric | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  
  const handleView = (rubric: Rubric) => {
    setSelectedRubric(rubric);
    setViewMode('detail');
  };
  
  const handleEdit = (rubric: Rubric) => {
    router.push(`/rubrics/edit/${rubric.id}`);
  };
  
  const handleBack = () => {
    setViewMode('list');
    setSelectedRubric(null);
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Rubric Management</h1>
        
        <div className="flex space-x-4">
          <Link href="/">
            <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
              Back to Analyzer
            </button>
          </Link>
          
          {viewMode === 'list' && (
            <Link href="/rubrics/new">
              <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                Create New Rubric
              </button>
            </Link>
          )}
          
          {viewMode === 'detail' && selectedRubric && (
            <button
              onClick={() => handleEdit(selectedRubric)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Edit Rubric
            </button>
          )}
        </div>
      </div>
      
      {viewMode === 'list' ? (
        <RubricList 
          onView={handleView}
        />
      ) : (
        selectedRubric && (
          <RubricDetail 
            rubricId={selectedRubric.id} 
            onBack={handleBack}
          />
        )
      )}
    </div>
  );
};

export default RubricManagementPage; 