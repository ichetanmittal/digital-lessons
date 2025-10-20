/**
 * Inngest function for generating lessons with Claude AI
 * This runs as a background job to avoid API route timeouts
 */

import { inngest } from "./client";
import { generateLesson, fixValidationErrors } from "@/lib/ai/claude";
import { validateTypeScriptCode } from "@/lib/ai/validator";
import { updateLesson } from "@/lib/supabase/queries";
import { getLangfuse } from "@/lib/tracing/langfuse";
import { evaluateLessonWithJudge } from "@/lib/ai/judge";

export const generateLessonFunction = inngest.createFunction(
  {
    id: "generate-lesson",
    name: "Generate Lesson with Claude AI",
    retries: 3,
    onFailure: async ({ event, error }) => {
      // Update lesson status to failed when all retries are exhausted
      const { lessonId } = event.data.event.data;

      try {
        await updateLesson(
          lessonId,
          {
            status: "failed",
            error_message: error.message || "Failed to generate lesson after multiple retries",
          },
          true
        );
      } catch (updateError) {
        console.error("Failed to update lesson status:", updateError);
      }
    },
  },
  { event: "lesson/generate" },
  async ({ event, step }) => {
    const { lessonId, outline } = event.data;

    try {
      // Step 1: Generate lesson with Claude AI
      const result = await step.run("generate-with-claude", async () => {
        return await generateLesson(outline, lessonId);
      });

      // Step 2: Validate the generated code
      const validation = await step.run("validate-code", async () => {
        return validateTypeScriptCode(result.code);
      });

      let finalCode = validation.code;
      let autoFixApplied = false;
      let fixResult = result;

      // Step 2b: Auto-fix validation errors if present
      if (!validation.isValid && validation.errors.length > 0) {
        try {
          const fixedResult = await step.run("auto-fix-validation-errors", async () => {
            return await fixValidationErrors(result.code, validation.errors, lessonId);
          });

          // Re-validate the fixed code
          const revalidation = await step.run("revalidate-fixed-code", async () => {
            return validateTypeScriptCode(fixedResult.code);
          });

          if (revalidation.isValid && revalidation.code) {
            // Auto-fix succeeded!
            finalCode = revalidation.code;
            autoFixApplied = true;
            fixResult = fixedResult;
          } else {
            // Auto-fix failed, mark lesson as failed
            const errorMessage = `Validation failed after auto-fix attempt: ${revalidation.errors.join(", ")}`;

            await updateLesson(
              lessonId,
              {
                status: "failed",
                error_message: errorMessage,
                metadata: {
                  prompt_tokens: result.usage.input_tokens + fixedResult.usage.input_tokens,
                  completion_tokens: result.usage.output_tokens + fixedResult.usage.output_tokens,
                  trace_id: result.traceId,
                  auto_fix_applied: false,
                },
              },
              true
            );

            throw new Error(errorMessage);
          }
        } catch (error) {
          // Auto-fix process failed entirely
          const errorMessage = `Validation failed: ${validation.errors.join(", ")}. Auto-fix attempt failed: ${error instanceof Error ? error.message : 'Unknown error'}`;

          await updateLesson(
            lessonId,
            {
              status: "failed",
              error_message: errorMessage,
            },
            true
          );

          throw new Error(errorMessage);
        }
      }

      // Ensure we have valid code before proceeding
      if (!finalCode) {
        const errorMessage = "No valid code generated";

        await updateLesson(
          lessonId,
          {
            status: "failed",
            error_message: errorMessage,
          },
          true
        );

        throw new Error(errorMessage);
      }

      // Step 3: Save to database
      await step.run("save-lesson", async () => {
        return await updateLesson(
          lessonId,
          {
            status: "generated",
            generated_code: finalCode!,
            metadata: {
              prompt_tokens: result.usage.input_tokens + (autoFixApplied ? fixResult.usage.input_tokens : 0),
              completion_tokens: result.usage.output_tokens + (autoFixApplied ? fixResult.usage.output_tokens : 0),
              trace_id: result.traceId,
              auto_fix_applied: autoFixApplied,
            },
          },
          true
        );
      });

      // Step 4: Add Langfuse scores for quality tracking
      await step.run("score-lesson-quality", async () => {
        if (!result.traceId) return;

        const langfuse = getLangfuse();
        const totalTokens = result.usage.input_tokens + result.usage.output_tokens +
                          (autoFixApplied ? fixResult.usage.input_tokens + fixResult.usage.output_tokens : 0);
        const linesOfCode = finalCode?.split('\n').length || 0;

        // Score 1: Validation Success (binary: 1 = passed first try, 0 = needed fix)
        langfuse.score({
          traceId: result.traceId,
          name: 'validation-first-try',
          value: autoFixApplied ? 0 : 1,
          comment: autoFixApplied
            ? `Required auto-fix. Original errors: ${validation.errors.slice(0, 3).join(', ')}`
            : 'Code passed validation on first generation attempt'
        });

        // Score 2: Auto-fix Applied (tracking for cost analysis)
        langfuse.score({
          traceId: result.traceId,
          name: 'auto-fix-applied',
          value: autoFixApplied ? 1 : 0,
          comment: autoFixApplied
            ? `Auto-fix succeeded after ${validation.errors.length} error(s)`
            : 'No auto-fix needed'
        });

        // Score 3: Generation Success (always 1 if we reach this point)
        langfuse.score({
          traceId: result.traceId,
          name: 'generation-success',
          value: 1,
          comment: 'Lesson successfully generated and saved'
        });

        // Score 4: Token Efficiency (tokens per line of code)
        const tokensPerLine = linesOfCode > 0 ? totalTokens / linesOfCode : 0;
        langfuse.score({
          traceId: result.traceId,
          name: 'token-efficiency',
          value: tokensPerLine,
          comment: `${totalTokens} total tokens for ${linesOfCode} lines (${tokensPerLine.toFixed(2)} tokens/line)`
        });

        // Score 5: Code Size (lines of code generated)
        langfuse.score({
          traceId: result.traceId,
          name: 'code-size-lines',
          value: linesOfCode,
          comment: `Generated ${linesOfCode} lines of TypeScript/React code`
        });

        // Score 6: Validation Error Count (0 if passed first try)
        langfuse.score({
          traceId: result.traceId,
          name: 'validation-error-count',
          value: validation.errors.length,
          comment: validation.errors.length > 0
            ? `Initial validation had ${validation.errors.length} error(s)`
            : 'No validation errors'
        });

        // Score 7: Total Cost Estimate (rough estimate in dollars)
        const inputCostPerMToken = 0.003; // $3 per 1M tokens for Sonnet
        const outputCostPerMToken = 0.015; // $15 per 1M tokens for Sonnet
        const totalInputTokens = result.usage.input_tokens + (autoFixApplied ? fixResult.usage.input_tokens : 0);
        const totalOutputTokens = result.usage.output_tokens + (autoFixApplied ? fixResult.usage.output_tokens : 0);
        const estimatedCost = (totalInputTokens / 1000000 * inputCostPerMToken) +
                             (totalOutputTokens / 1000000 * outputCostPerMToken);

        langfuse.score({
          traceId: result.traceId,
          name: 'estimated-cost-usd',
          value: estimatedCost,
          comment: `Estimated cost: $${estimatedCost.toFixed(4)} (${totalInputTokens} input + ${totalOutputTokens} output tokens)`
        });

        return { scoresAdded: 7 };
      });

      // Step 5: LLM-as-a-Judge evaluation (optional, runs async)
      await step.run("evaluate-with-llm-judge", async () => {
        if (!result.traceId || !finalCode) return { skipped: true };

        try {
          const langfuse = getLangfuse();

          // Run judge evaluation
          const judgeEval = await evaluateLessonWithJudge(
            finalCode,
            outline,
            lessonId,
            result.traceId
          );

          // Add judge scores to the original generation trace
          langfuse.score({
            traceId: result.traceId,
            name: 'judge-educational-quality',
            value: judgeEval.educational_quality,
            comment: `Educational quality rated ${judgeEval.educational_quality}/5 by LLM judge`
          });

          langfuse.score({
            traceId: result.traceId,
            name: 'judge-age-appropriateness',
            value: judgeEval.age_appropriateness,
            comment: `Age appropriateness rated ${judgeEval.age_appropriateness}/5 by LLM judge`
          });

          langfuse.score({
            traceId: result.traceId,
            name: 'judge-engagement-level',
            value: judgeEval.engagement_level,
            comment: `Engagement level rated ${judgeEval.engagement_level}/5 by LLM judge`
          });

          langfuse.score({
            traceId: result.traceId,
            name: 'judge-accessibility',
            value: judgeEval.accessibility_compliance,
            comment: `Accessibility compliance rated ${judgeEval.accessibility_compliance}/5 by LLM judge`
          });

          langfuse.score({
            traceId: result.traceId,
            name: 'judge-code-quality',
            value: judgeEval.code_quality,
            comment: `Code quality rated ${judgeEval.code_quality}/5 by LLM judge`
          });

          langfuse.score({
            traceId: result.traceId,
            name: 'judge-overall-score',
            value: judgeEval.overall_score,
            comment: `Overall score: ${judgeEval.overall_score.toFixed(2)}/5. Reasoning: ${judgeEval.reasoning}`
          });

          return {
            evaluated: true,
            overallScore: judgeEval.overall_score,
            judgeScoresAdded: 6
          };
        } catch (error) {
          console.error('Judge evaluation failed:', error);
          // Don't fail the whole job if judge evaluation fails
          return {
            evaluated: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      });

      return {
        success: true,
        lessonId,
        traceId: result.traceId,
      };
    } catch (error) {
      // Mark as failed for any unexpected errors
      await updateLesson(
        lessonId,
        {
          status: "failed",
          error_message: error instanceof Error ? error.message : "Unknown error occurred",
        },
        true
      );

      throw error; // Re-throw to trigger retries
    }
  }
);
