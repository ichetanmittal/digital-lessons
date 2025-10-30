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

    let lesson;
    try {
      lesson = await getUserLessonById(id, true);
    } catch (dbError) {
      console.error(`Failed to fetch lesson ${id} from database:`, dbError);
      const errorMessage = dbError instanceof Error ? dbError.message : 'Unknown error';
      if (errorMessage.toLowerCase().includes('not found') || errorMessage.toLowerCase().includes('no rows')) {
        return NextResponse.json(
          { error: 'Lesson not found' },
          { status: 404 }
        );
      } else if (errorMessage.toLowerCase().includes('auth') || errorMessage.toLowerCase().includes('permission')) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      } else {
        throw dbError;
      }
    }

    return NextResponse.json({ lesson }, { status: 200 });
  } catch (error) {
    console.error('Error fetching lesson:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lesson' },
      { status: 500 }
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

    try {
      await deleteUserLesson(id, true);
    } catch (dbError) {
      console.error(`Failed to delete lesson ${id}:`, dbError);
      const errorMessage = dbError instanceof Error ? dbError.message : 'Unknown error';
      if (errorMessage.toLowerCase().includes('not found') || errorMessage.toLowerCase().includes('no rows')) {
        return NextResponse.json(
          { error: 'Lesson not found' },
          { status: 404 }
        );
      } else if (errorMessage.toLowerCase().includes('auth') || errorMessage.toLowerCase().includes('permission')) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      } else {
        throw dbError;
      }
    }

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
