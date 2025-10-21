// Shared TypeScript types for the application

export type LessonStatus = 'generating' | 'generated' | 'failed';

export type LessonType = 'quiz' | 'tutorial' | 'test' | 'explanation' | 'auto';

export interface LessonMetadata {
  prompt_tokens?: number;
  completion_tokens?: number;
  generation_time_ms?: number;
  trace_id?: string;
  retry_count?: number;
  lesson_type?: LessonType;
  auto_fix_applied?: boolean;
  generated_images?: Array<{
    url: string;
    prompt: string;
    revisedPrompt?: string;
    size: string;
    generatedAt: string;
  }>;
  image_generation_enabled?: boolean;
}

export interface Lesson {
  id: string;
  title: string;
  outline: string;
  status: LessonStatus;
  generated_code: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  metadata: LessonMetadata;
}

export interface CreateLessonInput {
  outline: string;
}

export interface UpdateLessonInput {
  title?: string;
  status?: LessonStatus;
  generated_code?: string;
  error_message?: string;
  metadata?: LessonMetadata;
}
