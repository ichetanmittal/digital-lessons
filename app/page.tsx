import { getLessons } from '@/lib/supabase/queries';
import { LessonForm } from '@/components/lesson-form';
import { LessonsTable } from '@/components/lessons-table';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const lessons = await getLessons(true);

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-3">
            Digital Lessons
          </h1>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Create New Lesson
          </h2>
          <LessonForm />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Your Lessons
          </h2>
          <LessonsTable initialLessons={lessons} />
        </div>
      </div>
    </main>
  );
}
