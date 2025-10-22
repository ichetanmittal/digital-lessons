/**
 * LLM-as-a-Judge evaluation for generated lessons
 * Uses OpenAI GPT-4o to evaluate lesson quality on multiple dimensions
 */

import OpenAI from 'openai';
import { getLangfuse } from '@/lib/tracing/langfuse';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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
    name: 'openai-judge-evaluation',
    model: 'gpt-5',
    modelParameters: {
      reasoning_effort: 'minimal', // minimal reasoning for fast evaluation
      text_verbosity: 'low',
    },
    input: prompt,
  });

  try {
    const result = await openai.responses.create({
      model: 'gpt-5',
      input: prompt,
      reasoning: {
        effort: 'minimal', // minimal reasoning for fast evaluation
      },
      text: {
        verbosity: 'low', // just return JSON
      },
    });

    const content = result.output_text;
    if (!content) {
      throw new Error('No content in OpenAI GPT-5 judge response');
    }

    // Parse JSON response (extract JSON if wrapped in text)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const evaluation = JSON.parse(jsonMatch ? jsonMatch[0] : content) as JudgeEvaluation;

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
        input: result.usage?.input_tokens || 0,
        output: result.usage?.output_tokens || 0,
        total: (result.usage?.input_tokens || 0) + (result.usage?.output_tokens || 0),
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
        totalTokens: (result.usage?.input_tokens || 0) + (result.usage?.output_tokens || 0),
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
