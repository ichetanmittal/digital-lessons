/**
 * LLM-as-a-Judge evaluation for generated lessons
 * Uses OpenAI GPT-4 JSON mode for guaranteed valid JSON responses
 * Uses Langfuse automatic instrumentation for tracing
 */

import OpenAI from 'openai';
import { observeOpenAI } from 'langfuse';

// Initialize OpenAI client with Langfuse automatic instrumentation
const baseOpenAI = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = observeOpenAI(baseOpenAI);

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
 * Note: Response format enforces JSON output from the model
 * Expected JSON fields: educational_quality, age_appropriateness, engagement_level, accessibility_compliance, code_quality, reasoning
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

Return a JSON object with the following exact field names and numeric ratings (1-5) for each dimension, plus a brief reasoning (2-3 sentences):
{
  "educational_quality": <number 1-5>,
  "age_appropriateness": <number 1-5>,
  "engagement_level": <number 1-5>,
  "accessibility_compliance": <number 1-5>,
  "code_quality": <number 1-5>,
  "reasoning": "<string with 2-3 sentences>"
}`;
}

/**
 * Evaluate a generated lesson using OpenAI JSON mode
 * Enforces JSON output format for guaranteed valid JSON responses
 */
export async function evaluateLessonWithJudge(
  code: string,
  outline: string,
  _lessonId?: string,
  _parentTraceId?: string
): Promise<JudgeEvaluation> {
  const prompt = createJudgePrompt(code, outline);

  try {
    // Use OpenAI's JSON mode to enforce valid JSON output - automatically instrumented by Langfuse wrapper
    const result = await openai.chat.completions.create({
      model: 'gpt-4.1',
      temperature: 0.3, // lower temperature for consistent evaluation
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: {
        type: 'json_object' as const,
      },
    });

    if (!result.choices[0].message.content) {
      throw new Error('No content in OpenAI evaluation response');
    }

    // Parse the guaranteed-valid JSON response
    const evaluation = JSON.parse(result.choices[0].message.content) as Omit<
      JudgeEvaluation,
      'overall_score'
    >;

    // Calculate overall score from the 5 dimensions
    const overallScore = (
      evaluation.educational_quality +
      evaluation.age_appropriateness +
      evaluation.engagement_level +
      evaluation.accessibility_compliance +
      evaluation.code_quality
    ) / 5;

    const completeEvaluation: JudgeEvaluation = {
      ...evaluation,
      overall_score: overallScore,
    };

    return completeEvaluation;
  } catch (error) {
    throw error;
  }
}
