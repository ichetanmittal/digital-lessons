'use client';

import { Sandpack } from '@codesandbox/sandpack-react';

interface LessonRendererProps {
  code: string;
  title: string;
}

export function LessonRenderer({ code, title }: LessonRendererProps) {
  return (
    <div className="w-full h-screen">
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {title}
        </h1>
      </div>

      <Sandpack
        template="react-ts"
        files={{
          '/App.tsx': code,
        }}
        options={{
          showNavigator: false,
          showTabs: false,
          showLineNumbers: true,
          editorHeight: 'calc(100vh - 80px)',
          externalResources: [
            'https://cdn.tailwindcss.com',
          ],
        }}
        theme="light"
        customSetup={{
          dependencies: {
            'react': 'latest',
            'react-dom': 'latest',
          },
        }}
      />
    </div>
  );
}
