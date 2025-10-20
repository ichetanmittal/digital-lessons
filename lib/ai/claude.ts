/**
 * Claude AI integration for lesson generation with Langfuse tracing
 */

import Anthropic from '@anthropic-ai/sdk';
import { createLessonPrompt, createValidationPrompt } from './prompts';
import { getLangfuse } from '@/lib/tracing/langfuse';
import type { LessonType } from '@/lib/types';

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
 * @param lessonType - The type of lesson to generate (quiz, tutorial, test, explanation, auto)
 */
export async function generateLesson(
  outline: string,
  lessonId?: string,
  lessonType: LessonType = 'auto'
): Promise<GenerationResult> {
  const langfuse = getLangfuse();

  // Create a trace for this generation (production pattern)
  const trace = langfuse.trace({
    name: 'lesson-generation',
    userId: 'system',
    input: {
      outline,
      lessonId,
    },
    metadata: {
      lessonId,
      requestType: 'lesson-generation',
    },
    tags: ['claude', 'lesson-generation', 'education'],
  });

  const prompt = createLessonPrompt(outline, lessonType);

  // Start generation span
  const generation = trace.generation({
    name: 'claude-generate-lesson',
    model: 'claude-sonnet-4-20250514',
    modelParameters: {
      maxTokens: 8192,
      temperature: 0.7,
    },
    input: prompt,
  });

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
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

    // Update trace with final result (production pattern)
    trace.update({
      output: {
        success: true,
        lessonId,
        codeLength: code.length,
        model: message.model,
      },
      metadata: {
        totalTokens: message.usage.input_tokens + message.usage.output_tokens,
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
      },
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

    // Update trace with error (production pattern)
    trace.update({
      output: {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      metadata: {
        errorType: error instanceof Error ? error.constructor.name : 'UnknownError',
      },
    });

    throw error;
  }
}

/**
 * Fix validation errors in generated code using Claude
 * @param code - The code with validation errors
 * @param errors - Array of validation error messages
 * @param lessonId - The lesson ID for tracing
 */
export async function fixValidationErrors(
  code: string,
  errors: string[],
  lessonId?: string
): Promise<GenerationResult> {
  const langfuse = getLangfuse();

  // Create a trace for this fix operation
  const trace = langfuse.trace({
    name: 'lesson-validation-fix',
    userId: 'system',
    input: {
      errors,
      lessonId,
      codeLength: code.length,
    },
    metadata: {
      lessonId,
      requestType: 'validation-fix',
      errorCount: errors.length,
    },
    tags: ['claude', 'validation-fix', 'auto-fix'],
  });

  const prompt = createValidationPrompt(code, errors);

  // Start generation span
  const generation = trace.generation({
    name: 'claude-fix-validation',
    model: 'claude-sonnet-4-20250514',
    modelParameters: {
      maxTokens: 8192,
      temperature: 0.3, // Lower temperature for more consistent fixes
    },
    input: prompt,
  });

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      temperature: 0.3, // Lower temperature for fixes
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Extract the fixed code from Claude's response
    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    let fixedCode = content.text.trim();

    // Clean up code fences if Claude added them
    if (fixedCode.startsWith('```')) {
      fixedCode = fixedCode.replace(/^```(?:typescript|tsx|ts|javascript|jsx|js)?\n/, '');
      fixedCode = fixedCode.replace(/\n```$/, '');
      fixedCode = fixedCode.trim();
    }

    // End generation span with success
    generation.end({
      output: fixedCode,
      usage: {
        input: message.usage.input_tokens,
        output: message.usage.output_tokens,
        total: message.usage.input_tokens + message.usage.output_tokens,
      },
      statusMessage: 'success',
    });

    // Update trace with final result
    trace.update({
      output: {
        success: true,
        lessonId,
        codeLength: fixedCode.length,
        model: message.model,
      },
      metadata: {
        totalTokens: message.usage.input_tokens + message.usage.output_tokens,
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
      },
    });

    return {
      code: fixedCode,
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

    // Update trace with error
    trace.update({
      output: {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      metadata: {
        errorType: error instanceof Error ? error.constructor.name : 'UnknownError',
      },
    });

    throw error;
  }
}
