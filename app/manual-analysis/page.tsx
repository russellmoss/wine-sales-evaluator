'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { RubricScorer } from '@/app/components/RubricScorer';
import { RubricApi } from '@/app/utils/rubric-api';
import { Rubric } from '@/app/types/rubric';
import { Button } from '@/app/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { marked } from 'marked';

// Configure marked to preserve line breaks
marked.setOptions({
  breaks: true,
  gfm: true
});

export default function ManualAnalysisPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const conversationId = searchParams.get('conversationId');
  const rubricId = searchParams.get('rubricId');
  const [rubric, setRubric] = useState<Rubric | null>(null);
  const [loading, setLoading] = useState(true);
  const [conversationSummary, setConversationSummary] = useState<string>('');

  useEffect(() => {
    const loadRubric = async () => {
      try {
        if (rubricId) {
          const loadedRubric = await RubricApi.getRubric(rubricId);
          if (loadedRubric) {
            setRubric(loadedRubric);
          } else {
            console.error(`Rubric ${rubricId} not found`);
            const rubrics = await RubricApi.listRubrics();
            const defaultRubric = rubrics.find((r: Rubric) => r.isDefault);
            if (defaultRubric) {
              setRubric(defaultRubric);
            }
          }
        } else {
          const rubrics = await RubricApi.listRubrics();
          const defaultRubric = rubrics.find((r: Rubric) => r.isDefault);
          if (defaultRubric) {
            setRubric(defaultRubric);
          }
        }
      } catch (error) {
        console.error('Error loading rubric:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRubric();
  }, [rubricId]);

  useEffect(() => {
    const loadConversation = async () => {
      // First try to get from sessionStorage
      const storedMarkdown = sessionStorage.getItem('manualAnalysisMarkdown');
      console.log('Stored markdown:', storedMarkdown);
      
      if (storedMarkdown) {
        // Add extra line breaks between messages
        const formattedMarkdown = storedMarkdown.replace(/\n\n/g, '\n\n\n');
        const html = await marked(formattedMarkdown);
        setConversationSummary(html);
        return;
      }

      // If not in sessionStorage, try to get from localStorage
      const localStorageMarkdown = localStorage.getItem('manualAnalysisMarkdown');
      console.log('Local storage markdown:', localStorageMarkdown);
      
      if (localStorageMarkdown) {
        // Add extra line breaks between messages
        const formattedMarkdown = localStorageMarkdown.replace(/\n\n/g, '\n\n\n');
        const html = await marked(formattedMarkdown);
        setConversationSummary(html);
        return;
      }

      // If still not found, try to get from URL parameters
      const urlMarkdown = searchParams.get('markdown');
      console.log('URL markdown:', urlMarkdown);
      
      if (urlMarkdown) {
        // Add extra line breaks between messages
        const formattedMarkdown = urlMarkdown.replace(/\n\n/g, '\n\n\n');
        const html = await marked(formattedMarkdown);
        setConversationSummary(html);
        return;
      }

      console.log('No conversation found in any storage location');
    };

    loadConversation();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!rubric || !conversationSummary) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <p className="text-lg text-gray-600">
          {!rubric ? 'No rubric selected' : 'No conversation selected'}
        </p>
        <Button 
          onClick={() => router.push('/')}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Home</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      {/* Left side - Conversation content */}
      <div className="w-1/2 p-6 overflow-y-auto bg-gray-50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Conversation Content</h2>
          <Button 
            onClick={() => router.push('/')}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Home</span>
          </Button>
        </div>
        <div 
          className="prose max-w-none bg-white p-4 rounded-lg shadow whitespace-pre-wrap"
          dangerouslySetInnerHTML={{ __html: conversationSummary }}
        />
      </div>

      {/* Right side - Rubric scorer */}
      <RubricScorer 
        rubric={rubric} 
        conversationId={conversationId || ''} 
        conversationSummary={conversationSummary}
      />
    </div>
  );
} 