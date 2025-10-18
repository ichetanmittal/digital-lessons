import { NextRequest, NextResponse } from 'next/server';
import { createLesson, getLessons } from '@/lib/supabase/queries';

/**
 * GET /api/lessons
 * Fetch all lessons
 */
export async function GET() {
  try {
    const lessons = await getLessons(true);
    return NextResponse.json({ lessons }, { status: 200 });
  } catch (error) {
    console.error('Error fetching lessons:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lessons' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/lessons
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { outline } = body;

    if (!outline || typeof outline !== 'string') {
      return NextResponse.json(
        { error: 'Outline is required and must be a string' },
        { status: 400 }
      );
    }

    if (outline.length < 10) {
      return NextResponse.json(
        { error: 'Outline must be at least 10 characters' },
        { status: 400 }
      );
    }

    const lesson = await createLesson({ outline }, true);

    return NextResponse.json(
      { lesson, message: 'Lesson creation started' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating lesson:', error);
    return NextResponse.json(
      { error: 'Failed to create lesson' },
      { status: 500 }
    );
  }
}
