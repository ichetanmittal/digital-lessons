import { NextRequest, NextResponse } from 'next/server';
import { createLesson, getLessons } from '@/lib/supabase/queries';
import { inngest } from '@/inngest/client';

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
 * Create a new lesson and trigger background generation with Inngest
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { outline } = body;

    // Validation
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

    // Step 1: Create lesson record with 'generating' status
    const lesson = await createLesson({ outline }, true);

    // Step 2: Send event to Inngest for background processing
    await inngest.send({
      name: "lesson/generate",
      data: {
        lessonId: lesson.id,
        outline: outline,
      },
    });

    console.log(`🚀 Triggered Inngest background job for lesson: ${lesson.id}`);

    return NextResponse.json(
      {
        lesson: {
          id: lesson.id,
          status: 'generating',
          message: 'Lesson generation started',
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating lesson:', error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create lesson' },
      { status: 500 }
    );
  }
}
