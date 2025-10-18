/**
 * Langfuse tracing integration for LLM observability
 */

import { Langfuse } from 'langfuse';

// Initialize Langfuse client
let langfuseInstance: Langfuse | null = null;

export function getLangfuse(): Langfuse {
  if (!langfuseInstance) {
    langfuseInstance = new Langfuse({
      secretKey: process.env.LANGFUSE_SECRET_KEY,
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      baseUrl: process.env.LANGFUSE_HOST || 'https://us.cloud.langfuse.com',
    });
  }
  return langfuseInstance;
}

/**
 * Flush all pending traces (call this at the end of API routes)
 */
export async function flushTraces(): Promise<void> {
  if (langfuseInstance) {
    await langfuseInstance.flushAsync();
  }
}
