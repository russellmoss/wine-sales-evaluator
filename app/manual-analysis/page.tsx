'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { RubricScorer } from '@/app/components/RubricScorer';
import { RubricApi } from '@/app/utils/rubric-api';
import { Rubric } from '@/app/types/rubric';
import { Button } from '@/app/components/ui/button';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { marked } from 'marked';

// Configure marked to preserve line breaks and add custom renderer for paragraphs
marked.setOptions({
  breaks: true,
  gfm: true,
  renderer: new marked.Renderer({
    paragraph(text) {
      return `<p class="mb-4">${text}</p>`;
    }
  })
});

// Make the page dynamic to prevent static generation issues
export const dynamic = 'force-dynamic';

function ManualAnalysisContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const conversationId = searchParams.get('conversationId');
  const rubricId = searchParams.get('rubricId');
  const [rubric, setRubric] = useState<Rubric | null>(null);
  const [loading, setLoading] = useState(true);
  const [conversationSummary, setConversationSummary] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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
        setError('Failed to load rubric. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadRubric();
  }, [rubricId]);

  useEffect(() => {
    const loadConversation = async () => {
      try {
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
          const html = await marked(urlMarkdown);
          setConversationSummary(html);
          return;
        }

        console.log('No conversation found in any storage location');
        setError('No conversation found. Please try again.');
      } catch (error) {
        console.error('Error loading conversation:', error);
        setError('Failed to load conversation. Please try again.');
      }
    };

    loadConversation();
  }, [searchParams]);

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
        <Button 
          onClick={() => router.back()}
          className="mt-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Back
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (!rubric) {
    return (
      <div className="p-4">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Warning: </strong>
          <span className="block sm:inline">No rubric found. Please try again.</span>
        </div>
        <Button 
          onClick={() => router.back()}
          className="mt-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      {/* Main content */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <Button 
            onClick={() => router.back()}
            className="flex items-center"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </div>
        
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">Manual Analysis</h1>
          <div className="prose max-w-none [&>p]:mb-4 [&>p:last-child]:mb-0" dangerouslySetInnerHTML={{ __html: conversationSummary }} />
        </div>
      </div>

      {/* Sliding panel */}
      <div 
        className={`fixed right-0 top-0 h-screen transition-all duration-300 ease-in-out ${
          isSidebarOpen ? 'w-1/2' : 'w-12'
        }`}
      >
        {/* Toggle button */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className={`absolute left-0 top-1/2 -translate-y-1/2 bg-white border border-gray-200 rounded-l-lg p-2 shadow-md z-10 ${
            isSidebarOpen ? 'rotate-180' : ''
          }`}
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        {/* Panel content */}
        <div className={`h-full bg-white border-l shadow-lg overflow-y-auto ${
          isSidebarOpen ? 'opacity-100' : 'opacity-0'
        }`}>
          {isSidebarOpen && (
            <div className="p-4">
              <RubricScorer 
                rubric={rubric}
                conversationId={conversationId || ''}
                conversationSummary={conversationSummary}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ManualAnalysisPage() {
  return (
    <Suspense fallback={
      <div className="p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    }>
      <ManualAnalysisContent />
    </Suspense>
  );
} 