// Reusable Supabase query functions for lessons
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createBrowserClient } from '@/lib/supabase/client';
import type { Lesson, CreateLessonInput, UpdateLessonInput } from '@/lib/types';

/**
 * Get all lessons ordered by creation date (newest first)
 * @param isServer - Whether this is called from server or client
 */
export async function getLessons(isServer = true) {
  const supabase = isServer ? await createServerClient() : createBrowserClient();

  const { data, error } = await supabase
    .from('lessons')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching lessons:', error);
    throw error;
  }

  return data as Lesson[];
}

/**
 * Get a single lesson by ID
 * @param id - Lesson UUID
 * @param isServer - Whether this is called from server or client
 */
export async function getLessonById(id: string, isServer = true) {
  const supabase = isServer ? await createServerClient() : createBrowserClient();

  const { data, error } = await supabase
    .from('lessons')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching lesson:', error);
    throw error;
  }

  return data as Lesson;
}

/**
 * Create a new lesson with 'generating' status
 * @param input - Lesson outline from user
 * @param isServer - Whether this is called from server or client
 */
export async function createLesson(input: CreateLessonInput, isServer = true) {
  const supabase = isServer ? await createServerClient() : createBrowserClient();

  // Extract title from outline (first 50 chars)
  const title = input.outline.slice(0, 50) + (input.outline.length > 50 ? '...' : '');

  const { data, error } = await supabase
    .from('lessons')
    .insert({
      title,
      outline: input.outline,
      status: 'generating' as const,
      metadata: {}
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating lesson:', error);
    throw error;
  }

  return data as Lesson;
}

/**
 * Update an existing lesson
 * @param id - Lesson UUID
 * @param input - Fields to update
 * @param isServer - Whether this is called from server or client
 */
export async function updateLesson(
  id: string,
  input: UpdateLessonInput,
  isServer = true
) {
  const supabase = isServer ? await createServerClient() : createBrowserClient();

  const { data, error } = await supabase
    .from('lessons')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating lesson:', error);
    throw error;
  }

  return data as Lesson;
}

/**
 * Delete a lesson (optional - for cleanup)
 * @param id - Lesson UUID
 * @param isServer - Whether this is called from server or client
 */
export async function deleteLesson(id: string, isServer = true) {
  const supabase = isServer ? await createServerClient() : createBrowserClient();

  const { error } = await supabase
    .from('lessons')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting lesson:', error);
    throw error;
  }

  return { success: true };
}
