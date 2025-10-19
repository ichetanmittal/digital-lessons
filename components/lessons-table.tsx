'use client';

import { useEffect, useState } from 'react';
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

export function LessonsTable({ initialLessons = [] }: LessonsTableProps) {
  const [lessons, setLessons] = useState<Lesson[]>(initialLessons);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [lessonToDelete, setLessonToDelete] = useState<Lesson | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const router = useRouter();
  const supabase = createClient();

  const totalPages = Math.ceil(lessons.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentLessons = lessons.slice(startIndex, endIndex);

  // Reset to page 1 if current page is out of bounds
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

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
      generating: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-200',
      generated: 'bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-200',
      failed: '',
    };

    return (
      <Badge variant={variants[status]} className={status !== 'failed' ? colors[status] : ''}>
        <span className="mr-1">{icons[status]}</span>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const handleRowClick = (lesson: Lesson) => {
    if (lesson.status === 'generated') {
      router.push(`/lessons/${lesson.id}`);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, lesson: Lesson) => {
    e.stopPropagation(); // Prevent row click
    setLessonToDelete(lesson);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!lessonToDelete) return;

    setDeletingId(lessonToDelete.id);

    try {
      const response = await fetch(`/api/lessons/${lessonToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete lesson');
      }

      // Optimistically remove from UI (real-time will handle it too)
      setLessons((prev) => prev.filter((l) => l.id !== lessonToDelete.id));
      setDeleteDialogOpen(false);
      toast.success('Lesson deleted successfully');
    } catch (error) {
      console.error('Error deleting lesson:', error);
      toast.error('Failed to delete lesson', {
        description: 'Please try again.',
      });
    } finally {
      setDeletingId(null);
      setLessonToDelete(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    // Less than 1 minute
    if (diffInSeconds < 60) {
      return 'Just now';
    }

    // Less than 1 hour
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
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={(e) => handleDeleteClick(e, lesson)}
                    disabled={deletingId === lesson.id}
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
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deletingId !== null}
            >
              {deletingId ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
