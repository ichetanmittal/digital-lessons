/**
 * Inngest function for generating lessons with OpenAI GPT-5
 * This runs as a background job to avoid API route timeouts
 * Includes SVG graphics and AI-generated images support
 * STREAMING: Emits code chunks in real-time to frontend
 */

import { inngest } from "./client";
import { generateLesson, fixValidationErrors } from "@/lib/ai/openai";
import { generateLessonWithStreaming } from "@/lib/ai/openai-streaming";
import { validateTypeScriptCode } from "@/lib/ai/validator";
import { updateLessonAsService } from "@/lib/supabase/auth-queries";
import { getLangfuse } from "@/lib/tracing/langfuse";
import { evaluateLessonWithJudge } from "@/lib/ai/judge";
import { generateLessonImages, type GeneratedImage } from "@/lib/ai/images";

export const generateLessonFunction = inngest.createFunction(
  {
    id: "generate-lesson",
    name: "Generate Lesson with Claude AI",
    retries: 3,
    onFailure: async ({ event, error }) => {
      // Update lesson status to failed when all retries are exhausted
      const { lessonId } = event.data.event.data;

      try {
        await updateLessonAsService(
          lessonId,
          {
            status: "failed",
            error_message: error.message || "Failed to generate lesson after multiple retries",
          }
        );
      } catch (updateError) {
        console.error("Failed to update lesson status:", updateError);
      }
    },
  },
  { event: "lesson/generate" },
  async ({ event, step }) => {
    const { lessonId, outline, generateImages = true } = event.data;

    let generatedImages: GeneratedImage[] = [];

    try {
      // Step 0: Generate AI images (optional, runs in parallel if enabled)
      if (generateImages) {
        generatedImages = await step.run("generate-images", async () => {
          try {
            // Pass lessonId to generate images so they're stored permanently
            const images = await generateLessonImages(outline, lessonId, 1);
            console.log(`✅ Generated ${images.length} image(s) for lesson ${lessonId}`);
            return images;
          } catch (error) {
            console.warn(`⚠️ Image generation failed for lesson ${lessonId}:`, error instanceof Error ? error.message : 'Unknown error');
            // Don't fail the entire lesson if images fail - continue without them
            return [];
          }
        });
      }

      // Step 1: Generate lesson with streaming (emits code chunks to frontend in real-time)
      const result = await step.run("generate-with-streaming", async () => {
        try {
          const streamResult = await generateLessonWithStreaming(outline, lessonId, 'auto', generatedImages);
          return {
            code: streamResult.code,
            usage: streamResult.usage,
            model: streamResult.model,
            traceId: streamResult.traceId,
          };
        } catch (streamError) {
          console.warn('Streaming failed, falling back to non-streaming:', streamError);
          // Fallback to non-streaming if streaming fails
          return await generateLesson(outline, lessonId, 'auto', generatedImages);
        }
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

            await updateLessonAsService(
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
              }
            );

            throw new Error(errorMessage);
          }
        } catch (error) {
          // Auto-fix process failed entirely
          const errorMessage = `Validation failed: ${validation.errors.join(", ")}. Auto-fix attempt failed: ${error instanceof Error ? error.message : 'Unknown error'}`;

          await updateLessonAsService(
            lessonId,
            {
              status: "failed",
              error_message: errorMessage,
            }
          );

          throw new Error(errorMessage);
        }
      }

      // Ensure we have valid code before proceeding
      if (!finalCode) {
        const errorMessage = "No valid code generated";

        await updateLessonAsService(
          lessonId,
          {
            status: "failed",
            error_message: errorMessage,
          }
        );

        throw new Error(errorMessage);
      }

      // Step 3: Save to database (with image metadata)
      await step.run("save-lesson", async () => {
        return await updateLessonAsService(
          lessonId,
          {
            status: "generated",
            generated_code: finalCode!,
            metadata: {
              prompt_tokens: result.usage.input_tokens + (autoFixApplied ? fixResult.usage.input_tokens : 0),
              completion_tokens: result.usage.output_tokens + (autoFixApplied ? fixResult.usage.output_tokens : 0),
              trace_id: result.traceId,
              auto_fix_applied: autoFixApplied,
              generated_images: generatedImages.map(img => ({
                url: img.url,
                prompt: img.prompt,
                revisedPrompt: img.revisedPrompt,
                size: img.size,
                generatedAt: img.generatedAt,
              })),
              image_generation_enabled: generateImages,
            },
          }
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
        const inputCostPerMToken = 0.010; // $10 per 1M tokens for GPT-5 (check OpenAI pricing)
        const outputCostPerMToken = 0.030; // $30 per 1M tokens for GPT-5 (check OpenAI pricing)
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

          const overallScore = typeof judgeEval.overall_score === 'number' && !isNaN(judgeEval.overall_score)
            ? judgeEval.overall_score
            : null;

          if (overallScore !== null) {
            langfuse.score({
              traceId: result.traceId,
              name: 'judge-overall-score',
              value: overallScore,
              comment: `Overall score: ${overallScore.toFixed(2)}/5. Reasoning: ${judgeEval.reasoning}`
            });
          }

          return {
            evaluated: true,
            overallScore,
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
      await updateLessonAsService(
        lessonId,
        {
          status: "failed",
          error_message: error instanceof Error ? error.message : "Unknown error occurred",
        }
      );

      throw error; // Re-throw to trigger retries
    }
  }
);
