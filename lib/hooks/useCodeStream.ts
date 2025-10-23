'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

export interface StreamEvent {
  type: 'status' | 'code-chunk' | 'code-update' | 'complete' | 'error';
  status?: string;
  code?: string; // For code chunks or complete code
  message?: string;
  error?: string;
  error_message?: string;
  metadata?: Record<string, unknown>;
  lessonId?: string;
  timestamp?: number;
}

interface UseCodeStreamOptions {
  lessonId: string;
  enabled?: boolean;
  onUpdate?: (event: StreamEvent) => void;
}

export function useCodeStream({ lessonId, enabled = true, onUpdate }: UseCodeStreamOptions) {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'generating' | 'generated' | 'failed' | 'unknown'>('unknown');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (!enabled || eventSourceRef.current) {
      return;
    }

    try {
      setIsStreaming(true);
      const eventSource = new EventSource(`/api/lessons/${lessonId}/stream`);

      eventSource.onopen = () => {
        console.log('✅ Connected to code stream');
        setError(null);
        reconnectAttemptsRef.current = 0;
      };

      eventSource.onmessage = (event) => {
        try {
          const data: StreamEvent = JSON.parse(event.data);

          console.log('📨 Stream event received:', data.type, {
            codeLength: data.code?.length || 0,
            hasStatus: !!data.status,
            timestamp: data.timestamp,
          });

          // Handle different event types
          if (data.type === 'code-chunk') {
            // Real-time code chunks - append to existing code
            if (data.code) {
              setCode((prevCode) => prevCode + data.code);
            }
            setStatus('generating');
          } else if (data.type === 'code-update') {
            // Full code update (fallback)
            if (data.code) {
              setCode(data.code);
            }
          } else if (data.type === 'status') {
            // Status update
            if (data.status) {
              setStatus(data.status as 'generating' | 'generated' | 'failed' | 'unknown');
            }
          } else if (data.type === 'complete') {
            // Generation complete
            if (data.code) {
              setCode(data.code);
            }
            if (data.status) {
              setStatus(data.status as 'generating' | 'generated' | 'failed' | 'unknown');
            }
            eventSource.close();
            eventSourceRef.current = null;
            setIsStreaming(false);
          } else if (data.type === 'error') {
            // Error occurred
            setError(data.error || data.message || 'Unknown error');
            eventSource.close();
            eventSourceRef.current = null;
            setIsStreaming(false);
          }

          // Call the callback for parent component updates
          if (onUpdate) {
            onUpdate(data);
          }
        } catch (parseError) {
          console.error('Error parsing stream event:', parseError);
        }
      };

      eventSource.onerror = (event) => {
        console.error('❌ Stream error:', event);
        eventSource.close();
        eventSourceRef.current = null;
        setIsStreaming(false);

        // Attempt to reconnect
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          const backoffDelay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 30000);
          console.log(`🔄 Reconnecting in ${backoffDelay}ms (attempt ${reconnectAttemptsRef.current})`);

          setTimeout(() => {
            connect();
          }, backoffDelay);
        } else {
          setError('Failed to maintain connection. Please refresh the page.');
          console.error('Max reconnect attempts reached');
        }
      };

      eventSourceRef.current = eventSource;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error creating stream:', errorMsg);
      setError(errorMsg);
      setIsStreaming(false);
    }
  }, [lessonId, enabled, onUpdate]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsStreaming(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  return {
    code,
    status,
    isStreaming,
    error,
    reconnect: connect,
    disconnect,
  };
}
