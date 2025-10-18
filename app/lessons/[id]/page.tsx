import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getLessonById } from '@/lib/supabase/queries';
import { LessonRenderer } from '@/components/lesson-renderer';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function LessonPage({ params }: PageProps) {
  const { id } = await params;

  try {
    const lesson = await getLessonById(id, true);

    if (lesson.status === 'generating') {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Generating Lesson...
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Your lesson is being created. This page will update automatically.
            </p>
          </div>
        </div>
      );
    }

    if (lesson.status === 'failed') {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
          <div className="text-center max-w-md">
            <div className="text-red-600 text-6xl mb-4">✗</div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Generation Failed
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {lesson.error_message || 'An error occurred while generating this lesson.'}
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

    if (!lesson.generated_code) {
      return notFound();
    }

    return <LessonRenderer code={lesson.generated_code} title={lesson.title} />;
  } catch (error) {
    console.error('Error loading lesson:', error);
    return notFound();
  }
}
