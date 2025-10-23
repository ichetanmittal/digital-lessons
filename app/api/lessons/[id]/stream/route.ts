import { NextRequest, NextResponse } from 'next/server';
import { getLessonById } from '@/lib/supabase/queries';
import { streamEventStore } from '@/lib/streaming/event-store';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/lessons/[id]/stream
 * Server-Sent Events endpoint for real-time code generation streaming
 * Receives events from Inngest background job and forwards to frontend
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const { id } = await context.params;

  if (!id) {
    return NextResponse.json(
      { error: 'Lesson ID is required' },
      { status: 400 }
    );
  }

  console.log(`🔌 Opening stream for lesson ${id}`);

  try {
    // Create a readable stream for SSE
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Initial lesson fetch from DB
          const lesson = await getLessonById(id, true);

          // Send initial state
          controller.enqueue(
            `data: ${JSON.stringify({
              type: 'status',
              status: lesson.status,
              message: `Connected to stream for lesson ${id}`,
            })}\n\n`
          );

          console.log(`📡 Initial status sent: ${lesson.status}`);

          // Track if stream is closed
          let isClosed = false;

          // Subscribe to real-time streaming events from Inngest
          const unsubscribe = streamEventStore.subscribe(id, (event) => {
            try {
              // Skip sending if stream is already closed
              if (isClosed) {
                console.log(`⚠️ Stream closed, skipping event: ${event.type}`);
                return;
              }

              console.log(`📤 Streaming event: ${event.type}`);
              controller.enqueue(`data: ${JSON.stringify(event)}\n\n`);

              // Close on completion or error
              if (event.type === 'complete' || event.type === 'error') {
                isClosed = true;
                setTimeout(() => {
                  controller.close();
                  unsubscribe();
                }, 500); // Delay to ensure client receives event
              }
            } catch (error) {
              // Handle "Invalid state: Controller is already closed" gracefully
              if (error instanceof Error && error.message.includes('closed')) {
                console.log(`⚠️ Controller closed during streaming, unsubscribing`);
                isClosed = true;
                unsubscribe();
              } else {
                console.error('Error sending stream event:', error);
              }
            }
          });

          // Fallback: Also poll DB every 2 seconds in case of event store issues
          const dbPollInterval = setInterval(async () => {
            try {
              const updated = await getLessonById(id, true);

              // If status changed to completed
              if (updated.status === 'generated' || updated.status === 'failed') {
                clearInterval(dbPollInterval);

                // Only send complete if we haven't already
                controller.enqueue(
                  `data: ${JSON.stringify({
                    type: 'complete',
                    lessonId: id,
                    status: updated.status,
                    code: updated.generated_code || '',
                    error: updated.error_message,
                    timestamp: Date.now(),
                  })}\n\n`
                );

                setTimeout(() => {
                  controller.close();
                  unsubscribe();
                }, 500);
              }
            } catch (error) {
              console.error('Error polling DB:', error);
            }
          }, 2000);

          // Set timeout to stop after 30 minutes
          setTimeout(() => {
            clearInterval(dbPollInterval);
            controller.close();
            unsubscribe();
          }, 30 * 60 * 1000);
        } catch (error) {
          console.error('Stream error:', error);
          controller.enqueue(
            `data: ${JSON.stringify({
              type: 'error',
              lessonId: id,
              message: error instanceof Error ? error.message : 'Unknown error',
              timestamp: Date.now(),
            })}\n\n`
          );
          controller.close();
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable buffering for Nginx
      },
    });
  } catch (error) {
    console.error('Error creating stream:', error);
    return NextResponse.json(
      { error: 'Failed to create stream' },
      { status: 500 }
    );
  }
}
