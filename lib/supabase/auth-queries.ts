/**
 * Supabase queries that require authentication
 * These queries automatically filter by user_id from the authenticated session
 */

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createBrowserClient } from '@/lib/supabase/client';
import type { Lesson, CreateLessonInput, UpdateLessonInput } from '@/lib/types';

/**
 * Get all lessons for the authenticated user
 * @param isServer - Whether this is called from server or client
 */
export async function getUserLessons(isServer = true) {
  const supabase = isServer ? await createServerClient() : createBrowserClient();

  // Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('User not authenticated');
  }

  // Fetch lessons for this user only (RLS policy will enforce this)
  const { data, error } = await supabase
    .from('lessons')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user lessons:', error);
    throw error;
  }

  return data as Lesson[];
}

/**
 * Get a single lesson for the authenticated user
 * @param id - Lesson UUID
 * @param isServer - Whether this is called from server or client
 */
export async function getUserLessonById(id: string, isServer = true) {
  const supabase = isServer ? await createServerClient() : createBrowserClient();

  // Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('User not authenticated');
  }

  // Fetch lesson (RLS policy ensures it belongs to this user)
  const { data, error } = await supabase
    .from('lessons')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error) {
    console.error('Error fetching lesson:', error);
    throw error;
  }

  return data as Lesson;
}

/**
 * Create a new lesson for the authenticated user
 * @param input - Lesson outline from user
 * @param isServer - Whether this is called from server or client
 */
export async function createUserLesson(input: CreateLessonInput, isServer = true) {
  const supabase = isServer ? await createServerClient() : createBrowserClient();

  // Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('User not authenticated');
  }

  // Extract title from outline (first 50 chars)
  const title = input.outline.slice(0, 50) + (input.outline.length > 50 ? '...' : '');

  const { data, error } = await supabase
    .from('lessons')
    .insert({
      title,
      outline: input.outline,
      status: 'generating' as const,
      user_id: user.id,
      metadata: {},
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
 * Update a lesson for the authenticated user
 * @param id - Lesson UUID
 * @param input - Fields to update
 * @param isServer - Whether this is called from server or client
 */
export async function updateUserLesson(id: string, input: UpdateLessonInput, isServer = true) {
  const supabase = isServer ? await createServerClient() : createBrowserClient();

  // Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('User not authenticated');
  }

  // Update lesson (RLS policy ensures it belongs to this user)
  const { data, error } = await supabase
    .from('lessons')
    .update(input)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating lesson:', error);
    throw error;
  }

  return data as Lesson;
}

/**
 * Delete a lesson for the authenticated user
 * @param id - Lesson UUID
 * @param isServer - Whether this is called from server or client
 */
export async function deleteUserLesson(id: string, isServer = true) {
  const supabase = isServer ? await createServerClient() : createBrowserClient();

  // Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('User not authenticated');
  }

  // Delete lesson (RLS policy ensures it belongs to this user)
  const { error } = await supabase
    .from('lessons')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error deleting lesson:', error);
    throw error;
  }

  return { success: true };
}
