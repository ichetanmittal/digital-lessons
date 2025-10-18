import { NextRequest, NextResponse } from 'next/server';
import { getLessonById } from '@/lib/supabase/queries';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/lessons/[id]
 * Fetch a single lesson by ID
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

    const lesson = await getLessonById(id, true);

    return NextResponse.json({ lesson }, { status: 200 });
  } catch (error) {
    console.error('Error fetching lesson:', error);
    return NextResponse.json(
      { error: 'Lesson not found' },
      { status: 404 }
    );
  }
}
