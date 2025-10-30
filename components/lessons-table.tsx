'use client';

import { useEffect, useState, useCallback, useMemo, memo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { toast } from 'sonner';
import type { Lesson } from '@/lib/types';

interface LessonsTableProps {
  initialLessons?: Lesson[];
}

const ITEMS_PER_PAGE = 10;

const LessonsTableComponent = ({ initialLessons = [] }: LessonsTableProps) => {
  const [lessons, setLessons] = useState<Lesson[]>(initialLessons);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [lessonToDelete, setLessonToDelete] = useState<Lesson | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Memoize pagination calculations
  const { totalPages, currentLessons } = useMemo(() => {
    const total = Math.ceil(lessons.length / ITEMS_PER_PAGE);
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return {
      totalPages: total,
      currentLessons: lessons.slice(start, end),
    };
  }, [lessons, currentPage]);

  // Reset to page 1 if current page is out of bounds
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    const fetchLessons = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('lessons')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Database error fetching lessons:', error.message);
          toast.error('Failed to load lessons', {
            description: 'Unable to fetch lessons from database. Please refresh the page.',
          });
        } else if (data) {
          setLessons(data as Lesson[]);
        } else {
          console.warn('No data returned from lessons query');
          setLessons([]);
        }
      } catch (error) {
        console.error('Unexpected error fetching lessons:', error instanceof Error ? error.message : 'Unknown error');
        toast.error('Failed to load lessons', {
          description: 'An unexpected error occurred. Please refresh the page.',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchLessons();

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
    const variants = {
      generating: 'default' as const,
      generated: 'default' as const,
      failed: 'destructive' as const,
    };

    const icons = {
      generating: '⏳',
      generated: '✓',
      failed: '✗',
    };

    const colors = {
      generating: 'bg-gradient-to-r from-purple-600/40 to-purple-700/40 text-purple-700 dark:text-purple-300 border border-purple-500/50 dark:border-purple-500/40 animate-pulse',
      generated: 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-700/50',
      failed: '',
    };

    return (
      <Badge variant={variants[status]} className={status !== 'failed' ? colors[status] : ''}>
        <span className="mr-1">{icons[status]}</span>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const handleRowClick = useCallback((lesson: Lesson) => {
    router.push(`/lessons/${lesson.id}`);
  }, [router]);

  const handleDeleteClick = useCallback((e: React.MouseEvent, lesson: Lesson) => {
    e.stopPropagation();
    setLessonToDelete(lesson);
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!lessonToDelete) return;

    setDeletingId(lessonToDelete.id);

    try {
      const response = await fetch(`/api/lessons/${lessonToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        let errorMessage = 'Failed to delete lesson';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = response.statusText || errorMessage;
        }

        if (response.status === 404) {
          errorMessage = 'Lesson not found. It may have already been deleted.';
        } else if (response.status === 403) {
          errorMessage = 'You do not have permission to delete this lesson.';
        }

        throw new Error(errorMessage);
      }

      setLessons((prev) => prev.filter((l) => l.id !== lessonToDelete.id));
      setDeleteDialogOpen(false);
      toast.success('Lesson deleted successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      console.error('Error deleting lesson:', errorMessage);
      toast.error('Failed to delete lesson', {
        description: errorMessage,
      });
    } finally {
      setDeletingId(null);
      setLessonToDelete(null);
    }
  }, [lessonToDelete]);

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInSeconds < 60) {
      return 'Just now';
    }

    if (diffInMinutes < 60) {
      return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`;
    }

    // Less than 24 hours
    if (diffInHours < 24) {
      return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
    }

    // Less than 7 days
    if (diffInDays < 7) {
      return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
    }

    // More than 7 days - show actual date
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  }, []);

  if (isLoading && lessons.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
        <p className="text-gray-500 dark:text-gray-400 mt-4">Loading lessons...</p>
      </div>
    );
  }

  if (lessons.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <p className="text-gray-500 dark:text-gray-400">
          No lessons yet. Create your first lesson above!
        </p>
      </div>
    );
  }

  const renderPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is less than max visible
      for (let i = 1; i <= totalPages; i++) {
        pages.push(
          <PaginationItem key={i}>
            <PaginationLink
              onClick={() => setCurrentPage(i)}
              isActive={currentPage === i}
              className="cursor-pointer"
            >
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      }
    } else {
      // Show first page
      pages.push(
        <PaginationItem key={1}>
          <PaginationLink
            onClick={() => setCurrentPage(1)}
            isActive={currentPage === 1}
            className="cursor-pointer"
          >
            1
          </PaginationLink>
        </PaginationItem>
      );

      // Show ellipsis if needed
      if (currentPage > 3) {
        pages.push(
          <PaginationItem key="ellipsis-start">
            <PaginationEllipsis />
          </PaginationItem>
        );
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(
          <PaginationItem key={i}>
            <PaginationLink
              onClick={() => setCurrentPage(i)}
              isActive={currentPage === i}
              className="cursor-pointer"
            >
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      }

      // Show ellipsis if needed
      if (currentPage < totalPages - 2) {
        pages.push(
          <PaginationItem key="ellipsis-end">
            <PaginationEllipsis />
          </PaginationItem>
        );
      }

      // Show last page
      pages.push(
        <PaginationItem key={totalPages}>
          <PaginationLink
            onClick={() => setCurrentPage(totalPages)}
            isActive={currentPage === totalPages}
            className="cursor-pointer"
          >
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      );
    }

    return pages;
  };

  return (
    <div className="space-y-4">
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
              <th
                scope="col"
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {currentLessons.map((lesson) => (
              <tr
                key={lesson.id}
                onClick={() => handleRowClick(lesson)}
                className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
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
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Button
                    size="sm"
                    onClick={(e) => handleDeleteClick(e, lesson)}
                    disabled={deletingId === lesson.id}
                    className="bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-700/50 hover:bg-red-100 dark:hover:bg-red-900/30 dark:hover:border-red-600/70 rounded-md transition-all duration-300 hover:shadow-lg hover:shadow-red-600/10 dark:hover:shadow-red-500/5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deletingId === lesson.id ? 'Deleting...' : 'Delete'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>

            {renderPageNumbers()}

            <PaginationItem>
              <PaginationNext
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Lesson</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{lessonToDelete?.title}&rdquo;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deletingId !== null}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              disabled={deletingId !== null}
              className="bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-700/50 hover:bg-red-100 dark:hover:bg-red-900/30 dark:hover:border-red-600/70 transition-all duration-300"
            >
              {deletingId ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export const LessonsTable = memo(LessonsTableComponent);
