'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function LessonForm() {
  const [outline, setOutline] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!outline.trim()) {
      setError('Please enter a lesson outline');
      return;
    }

    if (outline.length < 10) {
      setError('Lesson outline should be at least 10 characters');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/lessons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ outline: outline.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create lesson');
      }

      setOutline('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create lesson');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="outline"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Lesson Outline
        </label>
        <textarea
          id="outline"
          value={outline}
          onChange={(e) => setOutline(e.target.value)}
          placeholder='e.g., "A 10 question pop quiz on Florida" or "A one-pager on how to divide with long division"'
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
          rows={4}
          disabled={isLoading}
        />
        {error && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>

      <Button
        type="submit"
        disabled={isLoading || !outline.trim()}
        className="w-full sm:w-auto"
      >
        {isLoading ? 'Generating...' : 'Generate Lesson'}
      </Button>

      <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
          Example lesson outlines:
        </p>
        <ul className="text-xs text-gray-500 dark:text-gray-500 space-y-1">
          <li>• A 10 question pop quiz on Florida</li>
          <li>• A one-pager on how to divide with long division</li>
          <li>• An explanation of how the Cartesian Grid works with examples</li>
          <li>• A test on counting numbers from 1 to 100</li>
        </ul>
      </div>
    </form>
  );
}
