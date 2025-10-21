import { NextRequest, NextResponse } from 'next/server';
import { createLesson, getLessons, updateLesson } from '@/lib/supabase/queries';
import { inngest } from '@/inngest/client';
import { checkInngestHealth } from '@/lib/inngest-check';

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

    // Step 1: Check if Inngest is running
    const isInngestHealthy = await checkInngestHealth();

    if (!isInngestHealthy) {
      console.warn('⚠️  Inngest dev server is not running. Please start it with: bunx inngest-cli@latest dev');
    }

    // Step 2: Create lesson record with 'generating' status
    const lesson = await createLesson({ outline }, true);

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
          warning: !isInngestHealthy ? 'Inngest dev server is not running. The lesson will remain in "generating" status until Inngest processes it.' : undefined,
        },
        { status: 201 }
      );
    } catch (inngestError) {
      // If Inngest send fails, update lesson to failed status
      console.error('Failed to send event to Inngest:', inngestError);

      await updateLesson(
        lesson.id,
        {
          status: 'failed',
          error_message: 'Inngest service is not available. Please ensure Inngest dev server is running.',
        },
        true
      );

      return NextResponse.json(
        {
          error: 'Inngest service is not available',
          message: 'Please start the Inngest dev server with: bunx inngest-cli@latest dev',
        },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error('Error creating lesson:', error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create lesson' },
      { status: 500 }
    );
  }
}
