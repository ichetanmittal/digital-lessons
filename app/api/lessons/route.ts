import { NextRequest, NextResponse } from 'next/server';
import { getUserLessons, createUserLesson, updateUserLesson } from '@/lib/supabase/auth-queries';
import { inngest } from '@/inngest/client';
import { checkInngestHealth } from '@/lib/inngest-check';

/**
 * GET /api/lessons
 * Fetch all lessons for authenticated user
 */
export async function GET() {
  try {
    const lessons = await getUserLessons(true);
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
 * Create a new lesson for authenticated user and trigger background generation with Inngest
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;

  // Step 0: Parse and validate request body
  try {
    body = await request.json();
  } catch (parseError) {
    console.error('Failed to parse request body:', parseError);
    return NextResponse.json(
      { error: 'Invalid JSON in request body' },
      { status: 400 }
    );
  }

  try {
    const { outline, generateImages = true } = body;

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

    // Step 1: Check if Inngest is running BEFORE creating lesson
    let isInngestHealthy: boolean;
    try {
      isInngestHealthy = await checkInngestHealth();
    } catch (healthError) {
      console.error('Failed to check Inngest health:', healthError);
      return NextResponse.json(
        {
          error: 'Failed to check Inngest service status',
          message: 'Unable to verify service availability. Please try again.',
        },
        { status: 503 }
      );
    }

    if (!isInngestHealthy) {
      console.error('❌ Inngest dev server is not running. Please start it with: bunx inngest-cli@latest dev');
      return NextResponse.json(
        {
          error: 'Inngest service is not available',
          message: 'Please start the Inngest dev server with: bunx inngest-cli@latest dev',
        },
        { status: 503 }
      );
    }

    // Step 2: Create lesson record with 'generating' status for authenticated user
    let lesson;
    try {
      lesson = await createUserLesson({ outline }, true);
    } catch (createError) {
      console.error('Failed to create lesson in database:', createError);
      return NextResponse.json(
        { error: 'Failed to create lesson record' },
        { status: 500 }
      );
    }

    // Step 3: Send event to Inngest for background processing (with optional image generation)
    try {
      await inngest.send({
        name: "lesson/generate",
        data: {
          lessonId: lesson.id,
          outline: outline,
          generateImages: generateImages === true, // Pass image generation flag
        },
      });

      console.log(`🚀 Triggered Inngest background job for lesson: ${lesson.id} (images: ${generateImages})`);

      return NextResponse.json(
        {
          lesson: {
            id: lesson.id,
            status: 'generating',
            message: 'Lesson generation started',
            generateImages: generateImages,
          },
        },
        { status: 201 }
      );
    } catch (inngestError) {
      // If Inngest send fails (unexpected, since we checked health), update lesson to failed status
      console.error('Failed to send event to Inngest:', inngestError);

      try {
        await updateUserLesson(
          lesson.id,
          {
            status: 'failed',
            error_message: 'Inngest service is not available. Please ensure Inngest dev server is running.',
          },
          true
        );
      } catch (updateError) {
        console.error('Failed to update lesson status after Inngest error:', updateError);
      }

      return NextResponse.json(
        {
          error: 'Inngest service is not available',
          message: 'Please start the Inngest dev server with: bunx inngest-cli@latest dev',
        },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error('Unexpected error creating lesson:', error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create lesson' },
      { status: 500 }
    );
  }
}
