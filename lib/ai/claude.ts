/**
 * Claude AI integration for lesson generation with Langfuse tracing
 */

import Anthropic from '@anthropic-ai/sdk';
import { createLessonPrompt } from './prompts';
import { getLangfuse } from '@/lib/tracing/langfuse';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface GenerationResult {
  code: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
  model: string;
  traceId?: string;
}

/**
 * Generate a TypeScript React component from a lesson outline using Claude
 * @param outline - The lesson outline from the user
 * @param lessonId - The lesson ID for tracing
 */
export async function generateLesson(outline: string, lessonId?: string): Promise<GenerationResult> {
  const langfuse = getLangfuse();

  // Create a trace for this generation
  const trace = langfuse.trace({
    name: 'lesson-generation',
    userId: 'system',
    metadata: {
      lessonId,
      outline,
    },
    tags: ['claude', 'lesson-generation'],
  });

  const prompt = createLessonPrompt(outline);

  // Start generation span
  const generation = trace.generation({
    name: 'claude-generate-lesson',
    model: 'claude-3-5-sonnet-20241022',
    modelParameters: {
      maxTokens: 8192,
      temperature: 0.7,
    },
    input: prompt,
  });

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 8192,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Extract the generated code from Claude's response
    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    let code = content.text.trim();

    // Clean up code fences if Claude added them despite instructions
    if (code.startsWith('```')) {
      code = code.replace(/^```(?:typescript|tsx|ts|javascript|jsx|js)?\n/, '');
      code = code.replace(/\n```$/, '');
      code = code.trim();
    }

    // End generation span with success
    generation.end({
      output: code,
      usage: {
        input: message.usage.input_tokens,
        output: message.usage.output_tokens,
        total: message.usage.input_tokens + message.usage.output_tokens,
      },
      statusMessage: 'success',
    });

    return {
      code,
      usage: {
        input_tokens: message.usage.input_tokens,
        output_tokens: message.usage.output_tokens,
      },
      model: message.model,
      traceId: trace.id,
    };
  } catch (error) {
    // End generation span with error
    generation.end({
      statusMessage: 'error',
      level: 'ERROR',
    });

    throw error;
  }
}
