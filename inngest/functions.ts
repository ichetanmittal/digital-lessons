/**
 * Inngest function for generating lessons with Claude AI
 * This runs as a background job to avoid API route timeouts
 */

import { inngest } from "./client";
import { generateLesson, fixValidationErrors } from "@/lib/ai/claude";
import { validateTypeScriptCode } from "@/lib/ai/validator";
import { updateLesson } from "@/lib/supabase/queries";

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
