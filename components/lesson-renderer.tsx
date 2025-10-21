'use client';

import { SandpackProvider, SandpackPreview } from '@codesandbox/sandpack-react';

interface LessonRendererProps {
  code: string;
  title: string;
}

export function LessonRenderer({ code, title }: LessonRendererProps) {
  return (
    <div className="w-full min-h-screen flex flex-col">
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {title}
        </h1>
      </div>

      <div className="flex-1">
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
      </div>
    </div>
  );
}
