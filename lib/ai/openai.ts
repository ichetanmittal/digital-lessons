/**
 * OpenAI integration for lesson generation with Langfuse automatic instrumentation
 */

import OpenAI from 'openai';
import { observeOpenAI } from 'langfuse';
import { createLessonPrompt, createValidationPrompt } from './prompts';
import type { LessonType } from '@/lib/types';

// Initialize OpenAI client with Langfuse automatic instrumentation
const baseOpenAI = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = observeOpenAI(baseOpenAI);

export interface GenerationResult {
  code: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
  model: string;
  traceId?: string;
}

export interface ImageData {
  url: string;
  prompt: string;
  revisedPrompt?: string;
  size: string;
  generatedAt: string;
}

/**
 * Generate a TypeScript React component from a lesson outline using OpenAI
 * @param outline - The lesson outline from the user
 * @param lessonId - The lesson ID for tracing
 * @param lessonType - The type of lesson to generate (quiz, tutorial, test, explanation, auto)
 * @param generatedImages - Optional array of AI-generated images to include in the lesson
 */
export async function generateLesson(
  outline: string,
  lessonId?: string,
  lessonType: LessonType = 'auto',
  generatedImages?: ImageData[]
): Promise<GenerationResult> {
  const prompt = createLessonPrompt(outline, lessonType, generatedImages?.map((img) => ({
    url: img.url,
    prompt: img.prompt,
  })));

  try {
    // OpenAI call is automatically instrumented by Langfuse wrapper
    const result = await openai.responses.create({
      model: 'gpt-5',
      input: prompt,
      reasoning: {
        effort: 'low', // low reasoning for faster responses (still high quality)
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

    return {
      code,
      usage: {
        input_tokens: result.usage?.input_tokens || 0,
        output_tokens: result.usage?.output_tokens || 0,
      },
      model: 'gpt-5',
      traceId: `lesson-${lessonId}`, // For backward compatibility
    };
  } catch (error) {
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
  const prompt = createValidationPrompt(code, errors);

  try {
    // OpenAI call is automatically instrumented by Langfuse wrapper
    const result = await openai.responses.create({
      model: 'gpt-5',
      input: prompt,
      reasoning: {
        effort: 'low', // low reasoning for faster fixes
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

    return {
      code: fixedCode,
      usage: {
        input_tokens: result.usage?.input_tokens || 0,
        output_tokens: result.usage?.output_tokens || 0,
      },
      model: 'gpt-5',
      traceId: `validation-fix-${lessonId}`, // For backward compatibility
    };
  } catch (error) {
    throw error;
  }
}
