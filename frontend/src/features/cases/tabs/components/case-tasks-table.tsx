'use client';

import { useCallback, useMemo, memo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Task } from '@/types/cases';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from '@/components/ui/pagination';
import { cn } from '@/lib/utils';
import { Calendar, FileText, Hash, Loader2 } from 'lucide-react';
import dayjs from 'dayjs';
import { Button } from '@/components/ui/button';

interface TasksTableProps {
  tasks: Task[];
  isLoading: boolean;
  count: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  onOpenDeleteModal: (task: Task) => void;
  onOpenEditModal: (task: Task) => void;
}

function TasksTable({
  tasks,
  isLoading,
  count,
  currentPage = 1,
  onPageChange,
  onOpenDeleteModal,
  onOpenEditModal
}: TasksTableProps) {
  const totalPages = Math.ceil(count / 5);

  const pageNumbers = useMemo(() => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 5; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  }, [totalPages, currentPage]);

  const handlePageChange = useCallback(
    (page: number) => {
      if (page < 1 || page > totalPages) return;
      onPageChange(page);
    },
    [onPageChange, totalPages]
  );

  return (
    <div className='space-y-4'>
      <div className='border-muted bg-card hidden overflow-hidden rounded-lg border shadow-sm sm:block'>
        <Table>
          <TableHeader>
            <TableRow className='bg-muted/50'>
              <TableHead className='text-center font-semibold'>Task</TableHead>
              <TableHead className='text-center font-semibold'>
                Description
              </TableHead>
              <TableHead className='text-center font-semibold'>
                Due Date
              </TableHead>
              <TableHead className='text-center font-semibold'>
                Status
              </TableHead>
              <TableHead className='text-center font-semibold'>
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={5} className='text-center'>
                  <Loader2 className='text-muted-foreground h-4 w-4 animate-spin' />
                </TableCell>
              </TableRow>
            )}
            {!isLoading &&
              tasks.map((task) => (
                <TableRow
                  key={task.id}
                  className='hover:bg-muted/50 text-center transition-colors duration-150'
                >
                  <TableCell>
                    <span className='inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200'>
                      {task.name}
                    </span>
                  </TableCell>
                  <TableCell>{task.description}</TableCell>
                  <TableCell>
                    {dayjs(task.due_date).format('DD/MM/YYYY')}
                  </TableCell>
                  <TableCell>
                    <span className='inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200'>
                      {task.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant='outline'
                      size='sm'
                      className='mr-2'
                      onClick={() => onOpenEditModal(task)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant='destructive'
                      size='sm'
                      onClick={() => onOpenDeleteModal(task)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            {!isLoading && tasks.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className='py-5 text-center'>
                  <p className='text-muted-foreground'>No tasks found</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className='mt-4 flex items-center justify-between'>
        {isLoading ? (
          <p>Loading...</p>
        ) : count && count > 0 ? (
          <p>
            <span className='text-muted-foreground text-sm'>
              Showing {`${(currentPage - 1) * 5 + 1}`} -{' '}
              {`${Math.min(currentPage * 5, count)}`} of {count} tasks
            </span>
          </p>
        ) : null}
        {totalPages > 1 && (
          <Pagination className='flex justify-end'>
            <PaginationContent className='flex items-center gap-1'>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => handlePageChange(currentPage - 1)}
                  className={cn(
                    'h-9 cursor-pointer rounded-lg border px-3 transition-all duration-200',
                    currentPage === 1
                      ? 'bg-muted pointer-events-none opacity-50'
                      : 'hover:bg-accent hover:text-accent-foreground'
                  )}
                />
              </PaginationItem>

              <div className='hidden items-center gap-1 sm:flex'>
                {pageNumbers.map((page, index) => (
                  <PaginationItem key={`${page}-${index}`}>
                    {page === '...' ? (
                      <span className='text-muted-foreground px-3'>...</span>
                    ) : (
                      <PaginationLink
                        onClick={() => handlePageChange(Number(page))}
                        className={cn(
                          'h-9 min-w-[36px] cursor-pointer rounded-lg border px-3 transition-all duration-200',
                          currentPage === Number(page)
                            ? 'bg-primary border-primary text-primary-foreground hover:bg-primary/90'
                            : 'hover:bg-accent hover:text-accent-foreground'
                        )}
                      >
                        {page}
                      </PaginationLink>
                    )}
                  </PaginationItem>
                ))}
              </div>
              <PaginationItem>
                <PaginationNext
                  onClick={() => handlePageChange(currentPage + 1)}
                  className={cn(
                    'h-9 cursor-pointer rounded-lg border px-3 transition-all duration-200',
                    currentPage === totalPages
                      ? 'bg-muted pointer-events-none opacity-50'
                      : 'hover:bg-accent hover:text-accent-foreground'
                  )}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </div>
  );
}

export default TasksTable;
