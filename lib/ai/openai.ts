/**
 * OpenAI integration for lesson generation with Langfuse tracing
 */

import OpenAI from 'openai';
import { createLessonPrompt, createValidationPrompt } from './prompts';
import { getLangfuse } from '@/lib/tracing/langfuse';
import type { LessonType } from '@/lib/types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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
 * Generate a TypeScript React component from a lesson outline using OpenAI
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
    tags: ['openai', 'lesson-generation', 'education'],
  });

  const prompt = createLessonPrompt(outline, lessonType);

  // Start generation span
  const generation = trace.generation({
    name: 'openai-generate-lesson',
    model: 'gpt-5',
    modelParameters: {
      reasoning_effort: 'medium',
      text_verbosity: 'low',
    },
    input: prompt,
  });

  try {
    const result = await openai.responses.create({
      model: 'gpt-5',
      input: prompt,
      reasoning: {
        effort: 'medium', // medium reasoning for better code quality
      },
      text: {
        verbosity: 'low', // low verbosity to get just the code
      },
    });

    // Extract the generated code from OpenAI's response
    const content = result.output_text;
    if (!content) {
      throw new Error('No content in OpenAI GPT-5 response');
    }

    let code = content.trim();

    // Clean up code fences if OpenAI added them despite instructions
    if (code.startsWith('```')) {
      code = code.replace(/^```(?:typescript|tsx|ts|javascript|jsx|js)?\n/, '');
      code = code.replace(/\n```$/, '');
      code = code.trim();
    }

    // End generation span with success
    generation.end({
      output: code,
      usage: {
        input: result.usage?.input_tokens || 0,
        output: result.usage?.output_tokens || 0,
        total: (result.usage?.input_tokens || 0) + (result.usage?.output_tokens || 0),
      },
      statusMessage: 'success',
    });

    // Update trace with final result (production pattern)
    trace.update({
      output: {
        success: true,
        lessonId,
        codeLength: code.length,
        model: 'gpt-5',
      },
      metadata: {
        totalTokens: (result.usage?.input_tokens || 0) + (result.usage?.output_tokens || 0),
        inputTokens: result.usage?.input_tokens || 0,
        outputTokens: result.usage?.output_tokens || 0,
      },
    });

    return {
      code,
      usage: {
        input_tokens: result.usage?.input_tokens || 0,
        output_tokens: result.usage?.output_tokens || 0,
      },
      model: 'gpt-5',
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
 * Fix validation errors in generated code using OpenAI
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
    tags: ['openai', 'validation-fix', 'auto-fix'],
  });

  const prompt = createValidationPrompt(code, errors);

  // Start generation span
  const generation = trace.generation({
    name: 'openai-fix-validation',
    model: 'gpt-5',
    modelParameters: {
      reasoning_effort: 'high', // high reasoning for fixing errors accurately
      text_verbosity: 'low',
    },
    input: prompt,
  });

  try {
    const result = await openai.responses.create({
      model: 'gpt-5',
      input: prompt,
      reasoning: {
        effort: 'high', // high reasoning for accurate fixes
      },
      text: {
        verbosity: 'low', // just return the fixed code
      },
    });

    // Extract the fixed code from OpenAI's response
    const content = result.output_text;
    if (!content) {
      throw new Error('No content in OpenAI GPT-5 response');
    }

    let fixedCode = content.trim();

    // Clean up code fences if OpenAI added them
    if (fixedCode.startsWith('```')) {
      fixedCode = fixedCode.replace(/^```(?:typescript|tsx|ts|javascript|jsx|js)?\n/, '');
      fixedCode = fixedCode.replace(/\n```$/, '');
      fixedCode = fixedCode.trim();
    }

    // End generation span with success
    generation.end({
      output: fixedCode,
      usage: {
        input: result.usage?.input_tokens || 0,
        output: result.usage?.output_tokens || 0,
        total: (result.usage?.input_tokens || 0) + (result.usage?.output_tokens || 0),
      },
      statusMessage: 'success',
    });

    // Update trace with final result
    trace.update({
      output: {
        success: true,
        lessonId,
        codeLength: fixedCode.length,
        model: 'gpt-5',
      },
      metadata: {
        totalTokens: (result.usage?.input_tokens || 0) + (result.usage?.output_tokens || 0),
        inputTokens: result.usage?.input_tokens || 0,
        outputTokens: result.usage?.output_tokens || 0,
      },
    });

    return {
      code: fixedCode,
      usage: {
        input_tokens: result.usage?.input_tokens || 0,
        output_tokens: result.usage?.output_tokens || 0,
      },
      model: 'gpt-5',
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
