import { notFound } from 'next/navigation';
import { getLessonById } from '@/lib/supabase/queries';
import { ClientLessonPage } from './client-page';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function LessonPage({ params }: PageProps) {
  const { id } = await params;

  try {
    const lesson = await getLessonById(id, true);

    // Pass initial lesson data to client component for streaming
    return (
      <ClientLessonPage
        lessonId={id}
        initialStatus={lesson.status}
        initialCode={lesson.generated_code || undefined}
        initialTitle={lesson.title}
        initialError={lesson.error_message || undefined}
      />
    );
  } catch (error) {
    console.error('Error loading lesson:', error);
    return notFound();
  }
}
