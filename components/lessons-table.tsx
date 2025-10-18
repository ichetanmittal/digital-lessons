'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Lesson } from '@/lib/types';

interface LessonsTableProps {
  initialLessons?: Lesson[];
}

export function LessonsTable({ initialLessons = [] }: LessonsTableProps) {
  const [lessons, setLessons] = useState<Lesson[]>(initialLessons);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Subscribe to real-time changes
    const channel = supabase
      .channel('lessons-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lessons',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setLessons((prev) => [payload.new as Lesson, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setLessons((prev) =>
              prev.map((lesson) =>
                lesson.id === (payload.new as Lesson).id
                  ? (payload.new as Lesson)
                  : lesson
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setLessons((prev) =>
              prev.filter((lesson) => lesson.id !== (payload.old as Lesson).id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const getStatusBadge = (status: Lesson['status']) => {
    const styles = {
      generating: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      generated: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };

    const icons = {
      generating: '⏳',
      generated: '✓',
      failed: '✗',
    };

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}
      >
        <span className="mr-1">{icons[status]}</span>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const handleRowClick = (lesson: Lesson) => {
    if (lesson.status === 'generated') {
      router.push(`/lessons/${lesson.id}`);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
      Math.ceil((date.getTime() - Date.now()) / (1000 * 60)),
      'minute'
    );
  };

  if (lessons.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <p className="text-gray-500 dark:text-gray-400">
          No lessons yet. Create your first lesson above!
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
            >
              Lesson Title
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
            >
              Status
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
            >
              Created
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
          {lessons.map((lesson) => (
            <tr
              key={lesson.id}
              onClick={() => handleRowClick(lesson)}
              className={`${
                lesson.status === 'generated'
                  ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors'
                  : 'cursor-not-allowed opacity-60'
              }`}
            >
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {lesson.title}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-md">
                  {lesson.outline}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {getStatusBadge(lesson.status)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                {formatDate(lesson.created_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
