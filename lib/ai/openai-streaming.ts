/**
 * Streaming OpenAI integration for real-time code generation
 * Emits code chunks as they're generated from OpenAI API
 */

import OpenAI from 'openai';
import { createLessonPrompt, createValidationPrompt } from './prompts';
import { getLangfuse } from '@/lib/tracing/langfuse';
import { streamEventStore } from '@/lib/streaming/event-store';
import type { LessonType } from '@/lib/types';

export interface ImageData {
  url: string;
  prompt: string;
  revisedPrompt?: string;
  size: string;
  generatedAt: string;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate lesson with streaming - emits code chunks in real-time to frontend
 */
export async function generateLessonWithStreaming(
  outline: string,
  lessonId: string,
  lessonType: LessonType = 'auto',
  generatedImages?: ImageData[]
): Promise<{ code: string; usage: { input_tokens: number; output_tokens: number } }> {
  const langfuse = getLangfuse();

  // Emit status event
  streamEventStore.emit({
    type: 'status',
    lessonId,
    status: 'streaming',
    message: 'Starting code generation...',
    timestamp: Date.now(),
  });

  const trace = langfuse.trace({
    name: 'lesson-generation-streaming',
    userId: 'system',
    input: { outline, lessonId, hasImages: !!generatedImages?.length },
    metadata: { lessonId, streaming: true },
    tags: ['streaming', 'real-time'],
  });

  const prompt = createLessonPrompt(outline, lessonType, generatedImages?.map((img) => ({
    url: img.url,
    prompt: img.prompt,
  })));

  const generation = trace.generation({
    name: 'openai-generate-streaming',
    model: 'gpt-5',
    modelParameters: {
      reasoning_effort: 'low',
      text_verbosity: 'low',
    },
    input: prompt,
  });

  let fullCode = '';
  let inputTokens = 0;
  let outputTokens = 0;

  try {
    // Create streaming response from OpenAI using chat.completions.create with stream
    const stream = await (openai.chat.completions.stream as any)({
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

    // Get final message for token counts
    const finalMessage = stream.finalMessage?.() as any;
    if (finalMessage?.usage) {
      inputTokens = finalMessage.usage.prompt_tokens || 0;
      outputTokens = finalMessage.usage.completion_tokens || 0;
    }

    // Clean up code
    if (fullCode.startsWith('```')) {
      fullCode = fullCode.replace(/^```(?:typescript|tsx|ts|javascript|jsx|js)?\n/, '');
      fullCode = fullCode.replace(/\n```$/, '');
      fullCode = fullCode.trim();
    }

    console.log(`✅ Streaming complete for lesson ${lessonId} (${fullCode.length} chars)`);

    generation.end({
      output: fullCode,
      usage: {
        input: inputTokens,
        output: outputTokens,
        total: inputTokens + outputTokens,
      },
      statusMessage: 'success',
    });

    trace.update({
      output: {
        success: true,
        codeLength: fullCode.length,
      },
      metadata: {
        totalTokens: inputTokens + outputTokens,
      },
    });

    return {
      code: fullCode,
      usage: { input_tokens: inputTokens, output_tokens: outputTokens },
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ Streaming error for lesson ${lessonId}:`, errorMsg);

    generation.end({
      statusMessage: 'error',
      level: 'ERROR',
    });

    trace.update({
      output: { success: false, error: errorMsg },
    });

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
