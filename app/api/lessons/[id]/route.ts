import { NextRequest, NextResponse } from 'next/server';
import { getUserLessonById, deleteUserLesson } from '@/lib/supabase/auth-queries';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/lessons/[id]
 * Fetch a single lesson by ID for authenticated user
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: 'Lesson ID is required' },
        { status: 400 }
      );
    }

    const lesson = await getUserLessonById(id, true);

    return NextResponse.json({ lesson }, { status: 200 });
  } catch (error) {
    console.error('Error fetching lesson:', error);
    return NextResponse.json(
      { error: 'Lesson not found or access denied' },
      { status: 404 }
    );
  }
}

/**
 * DELETE /api/lessons/[id]
 * Delete a lesson by ID for authenticated user
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: 'Lesson ID is required' },
        { status: 400 }
      );
    }

    await deleteUserLesson(id, true);

    return NextResponse.json(
      { message: 'Lesson deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting lesson:', error);
    return NextResponse.json(
      { error: 'Failed to delete lesson' },
      { status: 500 }
    );
  }
}
