/**
 * LLM-as-a-Judge evaluation for generated lessons
 * Uses Claude to evaluate lesson quality on multiple dimensions
 */

import Anthropic from '@anthropic-ai/sdk';
import { getLangfuse } from '@/lib/tracing/langfuse';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface JudgeEvaluation {
  educational_quality: number; // 1-5 scale
  age_appropriateness: number; // 1-5 scale
  engagement_level: number; // 1-5 scale
  accessibility_compliance: number; // 1-5 scale
  code_quality: number; // 1-5 scale
  overall_score: number; // Average of above
  reasoning: string;
}

/**
 * Create evaluation prompt for LLM judge
 */
function createJudgePrompt(code: string, outline: string): string {
  return `You are an expert educational content evaluator. Your task is to evaluate a React lesson component designed for students aged 8-14.

ORIGINAL LESSON OUTLINE:
"${outline}"

GENERATED CODE:
\`\`\`typescript
${code}
\`\`\`

Evaluate this lesson on the following dimensions (rate each 1-5, where 5 is excellent):

1. EDUCATIONAL QUALITY (1-5):
   - Is the content accurate and pedagogically sound?
   - Does it teach the concept effectively?
   - Are examples clear and relevant?

2. AGE APPROPRIATENESS (1-5):
   - Is the language suitable for 8-14 year olds?
   - Is the complexity appropriate?
   - Are explanations simple enough?

3. ENGAGEMENT LEVEL (1-5):
   - Is the lesson fun and interactive?
   - Does it use gamification effectively?
   - Are there emojis, colors, and visual elements?

4. ACCESSIBILITY COMPLIANCE (1-5):
   - Does it use semantic HTML (button, main, section)?
   - Are there aria-labels and ARIA attributes?
   - Is keyboard navigation supported?

5. CODE QUALITY (1-5):
   - Is the TypeScript code well-structured?
   - Are there proper type annotations?
   - Is it following React best practices?

RESPOND IN THIS EXACT JSON FORMAT (no other text):
{
  "educational_quality": <1-5>,
  "age_appropriateness": <1-5>,
  "engagement_level": <1-5>,
  "accessibility_compliance": <1-5>,
  "code_quality": <1-5>,
  "reasoning": "<2-3 sentence summary explaining the ratings>"
}`;
}

/**
 * Evaluate a generated lesson using Claude as a judge
 */
export async function evaluateLessonWithJudge(
  code: string,
  outline: string,
  lessonId: string,
  parentTraceId?: string
): Promise<JudgeEvaluation> {
  const langfuse = getLangfuse();

  // Create a new trace for the judge evaluation
  const trace = langfuse.trace({
    name: 'lesson-judge-evaluation',
    userId: 'system',
    input: {
      outline,
      codeLength: code.length,
      lessonId,
    },
    metadata: {
      lessonId,
      parentTraceId,
      evaluationType: 'llm-as-a-judge',
    },
    tags: ['evaluation', 'llm-judge', 'quality-check'],
  });

  const prompt = createJudgePrompt(code, outline);

  // Start generation span
  const generation = trace.generation({
    name: 'claude-judge-evaluation',
    model: 'claude-sonnet-4-20250514',
    modelParameters: {
      maxTokens: 1024,
      temperature: 0.2, // Low temperature for consistent evaluation
    },
    input: prompt,
  });

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      temperature: 0.2,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude judge');
    }

    // Parse JSON response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse JSON from judge response');
    }

    const evaluation = JSON.parse(jsonMatch[0]) as JudgeEvaluation;

    // Calculate overall score
    evaluation.overall_score = (
      evaluation.educational_quality +
      evaluation.age_appropriateness +
      evaluation.engagement_level +
      evaluation.accessibility_compliance +
      evaluation.code_quality
    ) / 5;

    // End generation span with success
    generation.end({
      output: evaluation,
      usage: {
        input: message.usage.input_tokens,
        output: message.usage.output_tokens,
        total: message.usage.input_tokens + message.usage.output_tokens,
      },
      statusMessage: 'success',
    });

    // Update trace with evaluation results
    trace.update({
      output: {
        success: true,
        evaluation,
      },
      metadata: {
        totalTokens: message.usage.input_tokens + message.usage.output_tokens,
        overallScore: evaluation.overall_score,
      },
    });

    return evaluation;
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
    });

    throw error;
  }
}
