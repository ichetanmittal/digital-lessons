import { getLessons } from '@/lib/supabase/queries';
import { LessonForm } from '@/components/lesson-form';
import { LessonsTable } from '@/components/lessons-table';
import { Navbar } from '@/components/navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const lessons = await getLessons(true);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gradient-to-br from-gray-50/20 to-gray-100/20 dark:from-gray-900/20 dark:to-gray-950/20 backdrop-blur-3xl py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Create New Lesson</CardTitle>
              <CardDescription>
                Describe your lesson and let AI generate an interactive learning experience
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LessonForm />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Your Lessons</CardTitle>
              <CardDescription>
                View and manage all your generated lessons
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LessonsTable initialLessons={lessons} />
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
