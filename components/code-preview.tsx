'use client';

import { useState } from 'react';

interface CodePreviewProps {
  code: string;
  isStreaming: boolean;
  status: 'generating' | 'generated' | 'failed' | 'unknown';
  error?: string | null;
  title?: string;
}

export function CodePreview({ code, isStreaming, status, error, title }: CodePreviewProps) {
  const [hoveredCode, setHoveredCode] = useState(false);

  return (
    <div className="w-full h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {title || 'Code Preview'}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {isStreaming && (
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                  Generating code...
                </span>
              )}
              {status === 'generated' && !isStreaming && (
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  Generation complete
                </span>
              )}
              {status === 'failed' && (
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  Generation failed
                </span>
              )}
            </p>
          </div>

          {/* Hover Info */}
          <div className="text-right">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {code.length > 0 && `${code.length} characters`}
            </p>
            {isStreaming && (
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                Hover to see code
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto">
        {error && (
          <div className="m-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <h3 className="font-semibold text-red-900 dark:text-red-100 mb-1">
              Error
            </h3>
            <p className="text-sm text-red-700 dark:text-red-200">
              {error}
            </p>
          </div>
        )}

        {code && (
          <div
            onMouseEnter={() => isStreaming && setHoveredCode(true)}
            onMouseLeave={() => setHoveredCode(false)}
            className={`relative p-4 transition-all duration-200 ${
              isStreaming && hoveredCode ? 'ring-2 ring-blue-500 rounded-lg mx-4 my-4' : ''
            }`}
          >
            {/* Code Display */}
            <div
              className={`rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 ${
                isStreaming && hoveredCode ? 'ring-2 ring-blue-400' : ''
              }`}
            >
              <div className="bg-gray-900 p-4 overflow-x-auto">
                {hoveredCode || !isStreaming ? (
                  <pre className="text-sm font-mono text-gray-300 m-0 p-0">
                    <code>{code}</code>
                  </pre>
                ) : (
                  <div className="text-gray-400 text-sm font-mono">
                    <div className="text-center py-8">
                      <div className="inline-block">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
                        <p>Generating code...</p>
                        <p className="text-xs text-gray-500 mt-2">Hover to see what&apos;s generated so far</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Streaming indicator */}
            {isStreaming && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  <span className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-pulse mr-2"></span>
                  Code is being generated in real-time. {hoveredCode ? 'You can see the code above.' : 'Hover over the code area to preview.'}
                </p>
              </div>
            )}
          </div>
        )}

        {!code && !error && status === 'unknown' && (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <p className="text-gray-600 dark:text-gray-400">
                Waiting for lesson data...
              </p>
            </div>
          </div>
        )}

        {!code && isStreaming && (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400 font-medium">
                Generating your lesson...
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                This may take a moment. Code will appear below once generated.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
