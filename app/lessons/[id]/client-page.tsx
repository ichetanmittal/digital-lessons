'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCodeStream } from '@/lib/hooks/useCodeStream';
import { CodePreview } from '@/components/code-preview';
import { LessonRenderer } from '@/components/lesson-renderer';

interface ClientPageProps {
  lessonId: string;
  initialStatus: string;
  initialCode?: string;
  initialTitle?: string;
  initialError?: string;
}

export function ClientLessonPage({
  lessonId,
  initialStatus,
  initialCode,
  initialTitle,
  initialError,
}: ClientPageProps) {
  const [showGenerating, setShowGenerating] = useState(initialStatus === 'generating');

  const { code, status, isStreaming, error } = useCodeStream({
    lessonId,
    enabled: initialStatus === 'generating',
  });

  // Switch to showing rendered lesson once generation completes
  useEffect(() => {
    if (status === 'generated' && !isStreaming) {
      setShowGenerating(false);
    }
  }, [status, isStreaming]);

  // Handle failed status
  if (initialStatus === 'failed' || (status as string) === 'failed') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center max-w-md">
          <div className="text-red-600 text-6xl mb-4">✗</div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Generation Failed
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {error || initialError || 'An error occurred while generating this lesson.'}
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // Show code streaming view while generating
  if (showGenerating && isStreaming) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <CodePreview
          code={code || initialCode || ''}
          isStreaming={isStreaming}
          status={status as 'generating' | 'generated' | 'failed' | 'unknown'}
          error={error}
          title={initialTitle}
        />
      </div>
    );
  }

  // Show code preview if no code yet but not streaming
  if (!code && !initialCode && !isStreaming && status !== 'failed') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Preparing Lesson...
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            This page will update automatically.
          </p>
        </div>
      </div>
    );
  }

  // Show rendered lesson
  const finalCode = code || initialCode;
  if (finalCode) {
    return <LessonRenderer code={finalCode} title={initialTitle || 'Lesson'} />;
  }

  return null;
}
