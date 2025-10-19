/**
 * Inngest function for generating lessons with Claude AI
 * This runs as a background job to avoid API route timeouts
 */

import { inngest } from "./client";
import { generateLesson } from "@/lib/ai/claude";
import { validateTypeScriptCode } from "@/lib/ai/validator";
import { updateLesson } from "@/lib/supabase/queries";
import { generateLessonImages } from "@/lib/ai/images";

export const generateLessonFunction = inngest.createFunction(
  {
    id: "generate-lesson",
    name: "Generate Lesson with Claude AI",
    retries: 3,
  },
  { event: "lesson/generate" },
  async ({ event, step }) => {
    const { lessonId, outline, generateImages } = event.data;

    // Step 1: Generate images (if enabled)
    const images = await step.run("generate-images", async () => {
      if (generateImages === false) {
        return [];
      }
      return await generateLessonImages(outline, 1);
    });

    // Step 2: Generate lesson with Claude AI
    const result = await step.run("generate-with-claude", async () => {
      return await generateLesson(outline, lessonId, images);
    });

    // Step 3: Validate the generated code
    const validation = await step.run("validate-code", async () => {
      return validateTypeScriptCode(result.code);
    });

    if (!validation.isValid || !validation.code) {
      throw new Error(
        `Validation failed: ${validation.errors.join(", ")}`
      );
    }

    // Step 4: Save to database
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
            generated_images: images.length > 0 ? images : undefined,
          },
        },
        true
      );
    });

    return {
      success: true,
      lessonId,
      traceId: result.traceId,
      imageCount: images.length,
    };
  }
);
