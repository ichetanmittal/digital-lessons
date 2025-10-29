/**
 * Image Storage Utility
 * Downloads DALL-E images and stores them permanently in Supabase Storage
 * This prevents URL expiration issues
 */

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createClient as createBrowserClient } from '@/lib/supabase/client';

const BUCKET_NAME = 'lesson-images';

export async function uploadImageToStorage(
  imageUrl: string,
  lessonId: string,
  isServer = true,
  useServiceRole = true
): Promise<string> {
  try {
    // Download image from DALL-E
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }

    // Convert to blob
    const imageBlob = await response.blob();
    const fileName = `${lessonId}-${Date.now()}.png`;
    const filePath = `${lessonId}/${fileName}`;

    // Get Supabase client
    // Use service role for Inngest/background jobs, regular client for browser/authenticated users
    let supabase;
    if (isServer && useServiceRole) {
      supabase = createServiceRoleClient();
    } else {
      supabase = isServer ? await createServerClient() : createBrowserClient();
    }

    // Check if bucket exists, if not create it
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some((b) => b.name === BUCKET_NAME);

    if (!bucketExists && isServer) {
      // Only create bucket on server side
      await supabase.storage.createBucket(BUCKET_NAME, {
        public: true, // Make images publicly accessible
      });
      console.log(`📁 Created storage bucket: ${BUCKET_NAME}`);
    }

    // Upload image to storage
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, imageBlob, {
        contentType: 'image/png',
        upsert: false,
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    const permanentUrl = publicUrlData?.publicUrl;
    if (!permanentUrl) {
      throw new Error('Failed to get public URL');
    }

    console.log(`✅ Image stored permanently: ${filePath}`);
    return permanentUrl;
  } catch (error) {
    console.error('Failed to upload image to storage:', error);
    // Fall back to temporary DALL-E URL if upload fails
    console.warn('Falling back to temporary DALL-E URL');
    return imageUrl;
  }
}

/**
 * Delete image from storage
 * @param filePath - Storage file path (lessonId/filename)
 * @param isServer - Whether this is server or client context
 */
export async function deleteImageFromStorage(
  filePath: string,
  isServer = true
): Promise<void> {
  try {
    const supabase = isServer ? await createServerClient() : createBrowserClient();

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      console.warn(`Failed to delete image: ${error.message}`);
      return;
    }

    console.log(`🗑️ Image deleted: ${filePath}`);
  } catch (error) {
    console.error('Error deleting image from storage:', error);
  }
}

/**
 * Get storage bucket name
 */
export function getImageBucketName(): string {
  return BUCKET_NAME;
}
