/**
 * Streaming OpenAI integration for real-time code generation
 * Emits code chunks as they're generated from OpenAI API
 * Uses Langfuse automatic instrumentation for tracing
 */

import OpenAI from 'openai';
import { observeOpenAI } from 'langfuse';
import { createLessonPrompt } from './prompts';
import { streamEventStore } from '@/lib/streaming/event-store';
import type { LessonType } from '@/lib/types';

export interface ImageData {
  url: string;
  prompt: string;
  revisedPrompt?: string;
  size: string;
  generatedAt: string;
}

// Initialize OpenAI client with Langfuse automatic instrumentation
const baseOpenAI = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = observeOpenAI(baseOpenAI);

/**
 * Generate lesson with streaming - emits code chunks in real-time to frontend
 */
export async function generateLessonWithStreaming(
  outline: string,
  lessonId: string,
  lessonType: LessonType = 'auto',
  generatedImages?: ImageData[]
): Promise<{ code: string; usage: { input_tokens: number; output_tokens: number }; model: string; traceId?: string }> {
  // Emit status event
  streamEventStore.emit({
    type: 'status',
    lessonId,
    status: 'streaming',
    message: 'Starting code generation...',
    timestamp: Date.now(),
  });

  const prompt = createLessonPrompt(outline, lessonType, generatedImages?.map((img) => ({
    url: img.url,
    prompt: img.prompt,
  })));

  let fullCode = '';
  let inputTokens = 0;
  let outputTokens = 0;

  try {
    // Create streaming response from OpenAI - automatically instrumented by Langfuse wrapper
    const stream = openai.chat.completions.stream({
      model: 'gpt-5',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    console.log(`🚀 Starting streaming generation for lesson ${lessonId}`);

    // Process stream chunks
    for await (const chunk of stream) {
      if (chunk.choices?.[0]?.delta?.content) {
        const content = chunk.choices[0].delta.content;
        fullCode += content;

        // Emit code chunk to frontend
        streamEventStore.emit({
          type: 'code-chunk',
          lessonId,
          code: content,
          timestamp: Date.now(),
        });

        console.log(`📨 Emitted chunk (${content.length} chars) for lesson ${lessonId}`);
      }
    }

    // Get final message for token counts from the stream object
    if ('finalMessage' in stream && typeof stream.finalMessage === 'function') {
      const finalMessage = stream.finalMessage() as unknown;
      if (finalMessage && typeof finalMessage === 'object' && 'usage' in finalMessage) {
        const usage = (finalMessage as Record<string, unknown>).usage as Record<string, unknown> | undefined;
        if (usage && typeof usage === 'object') {
          inputTokens = (usage.prompt_tokens as number) || 0;
          outputTokens = (usage.completion_tokens as number) || 0;
        }
      }
    }

    // Clean up code
    if (fullCode.startsWith('```')) {
      fullCode = fullCode.replace(/^```(?:typescript|tsx|ts|javascript|jsx|js)?\n/, '');
      fullCode = fullCode.replace(/\n```$/, '');
      fullCode = fullCode.trim();
    }

    console.log(`✅ Streaming complete for lesson ${lessonId} (${fullCode.length} chars)`);

    return {
      code: fullCode,
      usage: { input_tokens: inputTokens, output_tokens: outputTokens },
      model: 'gpt-5',
      traceId: `streaming-${lessonId}`, // For backward compatibility
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ Streaming error for lesson ${lessonId}:`, errorMsg);

    // Emit error to frontend
    streamEventStore.emit({
      type: 'error',
      lessonId,
      error: errorMsg,
      timestamp: Date.now(),
    });

    throw error;
  }
}
