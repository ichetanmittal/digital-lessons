'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

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
        // Handle Inngest not running error specifically
        if (response.status === 503) {
          setError(data.message || 'Inngest service not available');
          toast.error('Inngest not running!', {
            description: data.message || 'Please start Inngest dev server',
            duration: 10000,
          });
          return;
        }
        throw new Error(data.error || 'Failed to create lesson');
      }

      setOutline('');

      if (data.warning) {
        toast.warning('Inngest not running!', {
          description: data.warning,
          duration: 10000,
        });
      } else {
        toast.success('Lesson generation started!', {
          description: 'Your lesson is being generated. This may take a few moments.',
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create lesson';
      setError(errorMessage);
      toast.error('Failed to create lesson', {
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="outline">
          Lesson Outline
        </Label>
        <Textarea
          id="outline"
          value={outline}
          onChange={(e) => setOutline(e.target.value)}
          placeholder='e.g., "A 10 question pop quiz on Florida" or "A one-pager on how to divide with long division"'
          rows={4}
          disabled={isLoading}
          className="resize-none"
        />
        {error && (
          <p className="text-sm text-destructive">{error}</p>
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
