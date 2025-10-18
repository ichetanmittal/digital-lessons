import { NextRequest, NextResponse } from 'next/server';
import { createLesson, getLessons, updateLesson } from '@/lib/supabase/queries';
import { generateLesson } from '@/lib/ai/claude';
import { validateTypeScriptCode } from '@/lib/ai/validator';
import { flushTraces } from '@/lib/tracing/langfuse';

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
 * Create a new lesson and generate it with Claude AI
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

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

    // Step 2: Generate lesson with Claude (with retry logic)
    let generatedCode: string | undefined;
    let retryCount = 0;
    const maxRetries = 3;
    let lastError: string | undefined;

    while (retryCount < maxRetries && !generatedCode) {
      try {
        console.log(`Generating lesson (attempt ${retryCount + 1}/${maxRetries})...`);

        // Call Claude AI with tracing
        const result = await generateLesson(outline, lesson.id);

        // Validate the generated code
        const validation = validateTypeScriptCode(result.code);

        if (validation.isValid && validation.code) {
          // Success! Save the lesson
          const generationTime = Date.now() - startTime;

          await updateLesson(
            lesson.id,
            {
              status: 'generated',
              generated_code: validation.code,
              metadata: {
                prompt_tokens: result.usage.input_tokens,
                completion_tokens: result.usage.output_tokens,
                generation_time_ms: generationTime,
                retry_count: retryCount,
                trace_id: result.traceId,
              },
            },
            true
          );

          generatedCode = validation.code;

          console.log(`✅ Lesson generated successfully in ${generationTime}ms`);
          console.log(`📊 Langfuse Trace ID: ${result.traceId}`);
        } else {
          // Validation failed
          console.warn('Validation failed:', validation.errors);
          lastError = validation.errors.join('; ');
          retryCount++;

          if (retryCount >= maxRetries) {
            throw new Error(`Validation failed after ${maxRetries} attempts: ${lastError}`);
          }
        }
      } catch (error) {
        retryCount++;
        lastError = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Generation attempt ${retryCount} failed:`, error);

        if (retryCount >= maxRetries) {
          // Max retries reached - mark as failed
          await updateLesson(
            lesson.id,
            {
              status: 'failed',
              error_message: lastError,
              metadata: {
                retry_count: retryCount,
                generation_time_ms: Date.now() - startTime,
              },
            },
            true
          );

          throw new Error(`Failed to generate lesson after ${maxRetries} attempts: ${lastError}`);
        }

        // Wait before retrying (exponential backoff)
        await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount));
      }
    }

    // Flush traces to Langfuse before responding
    await flushTraces();

    return NextResponse.json(
      {
        lesson: {
          id: lesson.id,
          status: 'generated',
          message: 'Lesson generated successfully',
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in lesson generation:', error);

    // Flush traces even on error
    await flushTraces();

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate lesson' },
      { status: 500 }
    );
  }
}
