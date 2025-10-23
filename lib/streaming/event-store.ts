/**
 * In-memory event store for real-time streaming
 * Bridges Inngest background jobs to frontend SSE connections
 */

interface StreamListener {
  callback: (event: StreamEvent) => void;
  lessonId: string;
}

export interface StreamEvent {
  type: 'code-chunk' | 'status' | 'complete' | 'error';
  lessonId: string;
  code?: string;
  status?: string;
  message?: string;
  error?: string;
  timestamp: number;
}

class StreamEventStore {
  private listeners: Map<string, Set<StreamListener>> = new Map();
  private codeCache: Map<string, string> = new Map();

  /**
   * Subscribe to streaming events for a specific lesson
   */
  subscribe(lessonId: string, callback: (event: StreamEvent) => void): () => void {
    if (!this.listeners.has(lessonId)) {
      this.listeners.set(lessonId, new Set());
    }

    const listener: StreamListener = { callback, lessonId };
    this.listeners.get(lessonId)!.add(listener);

    // If we have cached code, send it immediately
    const cachedCode = this.codeCache.get(lessonId);
    if (cachedCode) {
      callback({
        type: 'code-chunk',
        lessonId,
        code: cachedCode,
        timestamp: Date.now(),
      });
    }

    // Return unsubscribe function
    return () => {
      this.listeners.get(lessonId)?.delete(listener);
    };
  }

  /**
   * Emit a streaming event to all subscribers
   */
  emit(event: StreamEvent): void {
    // Cache code chunks
    if (event.type === 'code-chunk' && event.code) {
      const existing = this.codeCache.get(event.lessonId) || '';
      this.codeCache.set(event.lessonId, existing + event.code);
    }

    // Send to all subscribers
    const listeners = this.listeners.get(event.lessonId);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener.callback(event);
        } catch (error) {
          console.error('Error in stream listener:', error);
        }
      });
    }

    // Clean up on completion
    if (event.type === 'complete') {
      setTimeout(() => {
        this.listeners.delete(event.lessonId);
        this.codeCache.delete(event.lessonId);
      }, 1000); // Keep for 1 second after completion for any stragglers
    }
  }

  /**
   * Get current code for a lesson
   */
  getCode(lessonId: string): string {
    return this.codeCache.get(lessonId) || '';
  }

  /**
   * Clear cache for a lesson (useful for testing)
   */
  clearCache(lessonId: string): void {
    this.codeCache.delete(lessonId);
    this.listeners.delete(lessonId);
  }
}

export const streamEventStore = new StreamEventStore();
