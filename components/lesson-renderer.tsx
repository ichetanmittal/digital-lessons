'use client';

import React, { memo, useState, useEffect } from 'react';
import { SandpackProvider, SandpackPreview } from '@codesandbox/sandpack-react';

interface LessonRendererProps {
  code: string;
  title: string;
}

const LessonRendererComponent = ({ code, title }: LessonRendererProps) => {
  const [renderError, setRenderError] = useState<string | null>(null);

  // Validate code before rendering
  useEffect(() => {
    try {
      if (!code || code.trim().length === 0) {
        setRenderError('No code content to display');
        return;
      }

      // Check for basic syntax errors
      if (!code.includes('export default')) {
        setRenderError('Invalid code: Missing default export');
        return;
      }

      setRenderError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setRenderError(`Error validating code: ${message}`);
      console.error('Code validation error:', error);
    }
  }, [code]);

  // Show error state if validation failed
  if (renderError) {
    return (
      <div className="w-full min-h-screen flex flex-col">
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {title}
          </h1>
        </div>

        <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="text-center max-w-md p-6">
            <div className="text-red-600 text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Unable to Render Lesson
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {renderError}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              There may be an issue with the generated code. Please try regenerating the lesson.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen flex flex-col">
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {title}
        </h1>
      </div>

      <div className="flex-1">
        <ErrorBoundary>
          <SandpackProvider
            template="react-ts"
            files={{
              '/App.tsx': `import './styles.css';\n${code}`,
              '/styles.css': `
                * {
                  font-family: 'Lexend', sans-serif !important;
                }
                body {
                  font-family: 'Lexend', sans-serif !important;
                }
              `,
            }}
            customSetup={{
              dependencies: {
                'react': '^18.0.0',
                'react-dom': '^18.0.0',
              },
            }}
            options={{
              externalResources: [
                'https://cdn.tailwindcss.com',
                'https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700&display=swap',
              ],
            }}
          >
            <SandpackPreview
              showOpenInCodeSandbox={true}
              showRefreshButton={true}
              style={{
                height: 'calc(100vh - 80px)',
                width: '100%',
              }}
            />
          </SandpackProvider>
        </ErrorBoundary>
      </div>
    </div>
  );
};

// Error boundary component to catch Sandpack rendering errors
interface ErrorBoundaryProps {
  children: React.ReactNode;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, { hasError: boolean; error: Error | null }> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    console.error('Sandpack rendering error:', error);
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center w-full h-full bg-gray-50 dark:bg-gray-900">
          <div className="text-center max-w-md p-6">
            <div className="text-red-600 text-5xl mb-4">🔴</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Rendering Error
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {this.state.error?.message || 'Failed to render the lesson code'}
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export const LessonRenderer = memo(LessonRendererComponent);
