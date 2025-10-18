/**
 * Claude AI integration for lesson generation
 */

import Anthropic from '@anthropic-ai/sdk';
import { createLessonPrompt } from './prompts';

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
}

/**
 * Generate a TypeScript React component from a lesson outline using Claude
 */
export async function generateLesson(outline: string): Promise<GenerationResult> {
  const prompt = createLessonPrompt(outline);

  const message = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4096,
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

  return {
    code,
    usage: {
      input_tokens: message.usage.input_tokens,
      output_tokens: message.usage.output_tokens,
    },
    model: message.model,
  };
}
