/**
 * Inngest function for generating lessons with Claude AI
 * This runs as a background job to avoid API route timeouts
 */

import { inngest } from "./client";
import { generateLesson } from "@/lib/ai/claude";
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

      if (!validation.isValid || !validation.code) {
        const errorMessage = `Validation failed: ${validation.errors.join(", ")}`;

        // Mark as failed in database
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
            generated_code: validation.code!,
            metadata: {
              prompt_tokens: result.usage.input_tokens,
              completion_tokens: result.usage.output_tokens,
              trace_id: result.traceId,
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
