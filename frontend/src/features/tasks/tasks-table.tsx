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
import {
  AlertCircle,
  CheckCircle2,
  Calendar,
  Clock,
  FileText,
  Hash,
  User,
  Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@/components/ui/select';

interface TasksTableProps {
  tasks: Task[];
  isLoading: boolean;
  count: number;
  currentPage: number;
  onPageChange: (page: number) => void;
}

const MobileLoadingState = memo(() => (
  <div className='space-y-4 p-4'>
    {[1, 2, 3].map((i) => (
      <div
        key={i}
        className='border-muted bg-card animate-pulse rounded-lg border p-4 shadow-sm'
      >
        <div className='bg-muted mb-3 h-4 w-3/4 rounded'></div>
        <div className='bg-muted mb-2 h-3 w-1/2 rounded'></div>
        <div className='bg-muted h-3 w-2/3 rounded'></div>
      </div>
    ))}
  </div>
));
MobileLoadingState.displayName = 'MobileLoadingState';

const DesktopLoadingState = memo(() => (
  <TableRow>
    <TableCell colSpan={6} className='py-16 text-center'>
      <div className='flex flex-col items-center gap-3 justify-center'>
        <div className='border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent'></div>
        <span className='text-muted-foreground'>Loading tasks...</span>
      </div>
    </TableCell>
  </TableRow>
));
DesktopLoadingState.displayName = 'DesktopLoadingState';

const MobileEmptyState = memo(() => (
  <div className='p-8 text-center'>
    <div className='bg-muted mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full'>
      <FileText className='text-muted-foreground h-8 w-8' />
    </div>
    <p className='text-muted-foreground'>No tasks found</p>
  </div>
));
MobileEmptyState.displayName = 'MobileEmptyState';

const DesktopEmptyState = memo(() => (
  <TableRow>
    <TableCell
      colSpan={6}
      className='flex items-center justify-center py-16 text-center'
    >
      <div className='flex flex-col items-center gap-3'>
        <div className='bg-muted inline-flex h-16 w-16 items-center justify-center rounded-full'>
          <FileText className='text-muted-foreground h-8 w-8' />
        </div>
        <p className='text-muted-foreground'>No tasks found</p>
      </div>
    </TableCell>
  </TableRow>
));
DesktopEmptyState.displayName = 'DesktopEmptyState';

const MobileTaskRow = memo(({ task }: { task: Task }) => (
  <div className='border-muted bg-card space-y-3 rounded-lg border p-4 shadow-sm transition-shadow duration-200 hover:shadow-md'>
    <div className='flex items-start justify-between'>
      <div className='flex items-center gap-2'>
        <Hash className='text-muted-foreground h-4 w-4' />
        <span className='text-foreground font-semibold'>{task.name}</span>
      </div>
      <div className='flex flex-wrap gap-2'>
        <span className='inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200'>
          {task.assignee}
        </span>
        <span className='inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800 dark:bg-purple-900 dark:text-purple-200'>
          {task.priority}
        </span>
      </div>
    </div>

    {task.description && (
      <p className='text-muted-foreground line-clamp-2 text-sm'>
        {task.description}
      </p>
    )}

    <div className='text-muted-foreground flex items-center gap-4 text-xs'>
      <div className='flex items-center gap-1'>
        <Calendar className='h-3 w-3' />
        <span>{formatDate(task.due_date)}</span>
      </div>
    </div>
  </div>
));
MobileTaskRow.displayName = 'MobileTaskRow';

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className='h-4 w-4 text-green-600' />;
    case 'overdue':
      return <AlertCircle className='h-4 w-4 text-red-600' />;
    case 'in-progress':
      return <Clock className='h-4 w-4 text-blue-600' />;
    default:
      return <Clock className='h-4 w-4 text-gray-400' />;
  }
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'High':
      return 'text-red-600 bg-red-50 border-red-200';
    case 'Medium':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'Low':
      return 'text-green-600 bg-green-50 border-green-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
};

function TasksTable({
  tasks,
  isLoading,
  count,
  currentPage = 1,
  onPageChange
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
    <>
      <Card className='pb-0'>
        <CardHeader className='pb-0'>
          <CardTitle className='flex items-center justify-between'>
            <h1 className='text-2xl font-bold'>Case Tasks</h1>
            <div className='flex items-center gap-2'>
              <Select>
                <SelectTrigger>
                  <Filter className='h-4 w-4' />
                  <SelectValue placeholder='Filter' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All</SelectItem>
                  <SelectItem value='completed'>Completed</SelectItem>
                  <SelectItem value='in-progress'>In Progress</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardTitle>
        </CardHeader>
        {/* Mobile View */}
        <div className='space-y-3 sm:hidden'>
          {isLoading && <MobileLoadingState />}
          {tasks &&
            !isLoading &&
            tasks.map((task) => <MobileTaskRow key={task.id} task={task} />)}
          {tasks && !isLoading && tasks.length === 0 && <MobileEmptyState />}
        </div>

        {/* Desktop View */}
        <Table className='pb-0'>
          <TableHeader>
            <TableRow className='bg-muted/50 hover:bg-muted/50'>
              <TableHead className='text-center font-semibold'>TASK</TableHead>
              <TableHead className='text-center font-semibold'>
                DUE DATE
              </TableHead>
              <TableHead className='text-center font-semibold'>
                ASSIGNEE
              </TableHead>
              <TableHead className='text-center font-semibold'>
                PRIORITY
              </TableHead>
              <TableHead className='text-center font-semibold'>
                STATUS
              </TableHead>
              <TableHead className='text-center font-semibold'>
                CATEGORY
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <DesktopLoadingState />}
            {tasks &&
              !isLoading &&
              tasks.map((task) => (
                <TableRow
                  key={task.id}
                  className='hover:bg-muted/50 text-center transition-colors duration-150'
                >
                  <TableCell className='py-4 font-medium'>
                    {task.name}
                    {task.description && (
                      <p className='text-muted-foreground text-sm'>
                        {task.description}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className='py-4'>
                    <div className='flex items-center justify-center gap-1'>
                      <Calendar className='mr-1 h-4 w-4 text-gray-600' />
                      {formatDate(task.due_date)}
                    </div>
                  </TableCell>
                  <TableCell className='text-muted-foreground hidden py-4 lg:table-cell'>
                    <div className='flex items-center justify-center gap-2'>
                      <div className='flex h-6 w-6 items-center justify-center rounded-full bg-gray-200'>
                        <User className='h-3 w-3 text-gray-600' />
                      </div>
                      <span>{task.assignee}</span>
                    </div>
                  </TableCell>
                  <TableCell className='py-4'>
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full border-1 px-2.5 py-0.5 text-xs font-medium',
                        getPriorityColor(task.priority)
                      )}
                    >
                      {task.priority}
                    </span>
                  </TableCell>
                  <TableCell className='hidden py-4 md:table-cell'>
                    <div className='flex items-center justify-center gap-2'>
                      {getStatusIcon(task.status)}
                      <span className='text-sm capitalize'>
                        {task.status.replace('-', ' ')}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className='py-4'>{task.category}</TableCell>
                </TableRow>
              ))}
            {tasks && !isLoading && tasks.length === 0 && <DesktopEmptyState />}
          </TableBody>
        </Table>
      </Card>
      <div className='mt-4 flex items-center justify-between'>
        {isLoading ? (
          <p>Loading...</p>
        ) : count && count > 0 ? (
          <span className='text-muted-foreground flex w-full items-center gap-2 text-sm font-medium'>
            Showing{' '}
            {`${(currentPage - 1) * 5 + 1}-${Math.min(currentPage * 5, count)} of ${count} tasks`}
          </span>
        ) : null}
        {/* Pagination */}
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

              {/* Mobile Page Indicator */}
              <div className='flex items-center gap-2 px-3 sm:hidden'>
                <span className='text-muted-foreground text-sm'>
                  Page {currentPage} of {totalPages}
                </span>
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
    </>
  );
}

export default TasksTable;
