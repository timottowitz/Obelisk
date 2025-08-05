'use client';

import { useCallback, useMemo, memo, ReactNode } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { CaseEvent } from '@/types/cases';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from '@/components/ui/pagination';
import { cn } from '@/lib/utils';
import { Calendar, Clock, FileText, Hash } from 'lucide-react';

interface EventsTableProps {
  events: CaseEvent[];
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
        className='animate-pulse rounded-lg border bg-card p-4 shadow-sm'
      >
        <div className='mb-3 h-4 w-3/4 rounded bg-muted'></div>
        <div className='mb-2 h-3 w-1/2 rounded bg-muted'></div>
        <div className='h-3 w-2/3 rounded bg-muted'></div>
      </div>
    ))}
  </div>
));
MobileLoadingState.displayName = 'MobileLoadingState';

const DesktopLoadingState = memo(() => (
  <TableRow>
    <TableCell colSpan={5} className='py-16 text-center'>
      <div className='flex flex-col items-center gap-3'>
        <div className='h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent'></div>
        <span className='text-muted-foreground'>Loading events...</span>
      </div>
    </TableCell>
  </TableRow>
));
DesktopLoadingState.displayName = 'DesktopLoadingState';

const MobileEmptyState = memo(() => (
  <div className='p-8 text-center'>
    <div className='mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted'>
      <FileText className='h-8 w-8 text-muted-foreground' />
    </div>
    <p className='text-muted-foreground'>No events found</p>
  </div>
));
MobileEmptyState.displayName = 'MobileEmptyState';

const DesktopEmptyState = memo(() => (
  <TableRow>
    <TableCell colSpan={5} className='py-16 text-center'>
      <div className='flex flex-col items-center gap-3'>
        <div className='inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted'>
          <FileText className='h-8 w-8 text-muted-foreground' />
        </div>
        <p className='text-muted-foreground'>No events found</p>
      </div>
    </TableCell>
  </TableRow>
));
DesktopEmptyState.displayName = 'DesktopEmptyState';

const MobileEventRow = memo(({ event }: { event: CaseEvent }) => (
  <div className='space-y-3 rounded-lg border bg-card p-4 shadow-sm transition-shadow duration-200 hover:shadow-md'>
    <div className='flex items-start justify-between'>
      <div className='flex items-center gap-2'>
        <Hash className='h-4 w-4 text-muted-foreground' />
        <span className='font-semibold text-foreground'>{event.case_number}</span>
      </div>
      <span className='inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200'>
        {event.event_type}
      </span>
    </div>

    {event.description && (
      <p className='line-clamp-2 text-sm text-muted-foreground'>{event.description}</p>
    )}

    <div className='flex items-center gap-4 text-xs text-muted-foreground'>
      <div className='flex items-center gap-1'>
        <Calendar className='h-3 w-3' />
        <span>{event.date}</span>
      </div>
      {event.time && (
        <div className='flex items-center gap-1'>
          <Clock className='h-3 w-3' />
          <span>{event.time}</span>
        </div>
      )}
    </div>
  </div>
));
MobileEventRow.displayName = 'MobileEventRow';

function EventsTable({
  events,
  isLoading,
  count,
  currentPage = 1,
  onPageChange
}: EventsTableProps) {
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
      {/* Mobile View */}
      <div className='space-y-3 sm:hidden'>
        {isLoading && <MobileLoadingState />}
        {events &&
          !isLoading &&
          events.map((event) => (
            <MobileEventRow key={event.id} event={event} />
          ))}
        {events && !isLoading && events.length === 0 && <MobileEmptyState />}
      </div>

      {/* Desktop View */}
      <div className='hidden overflow-hidden rounded-lg border bg-card shadow-sm sm:block'>
        <Table>
          <TableHeader>
            <TableRow className='bg-muted/50 hover:bg-muted/50'>
              <TableHead className='text-center font-semibold'>
                Case Number
              </TableHead>
              <TableHead className='text-center font-semibold'>
                Event Type
              </TableHead>
              <TableHead className='hidden text-center font-semibold lg:table-cell'>
                Description
              </TableHead>
              <TableHead className='text-center font-semibold'>
                Date
              </TableHead>
              <TableHead className='hidden text-center font-semibold md:table-cell'>
                Time
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <DesktopLoadingState />}
            {events &&
              !isLoading &&
              events.map((event) => (
                <TableRow
                  key={event.id}
                  className='text-center transition-colors duration-150 hover:bg-muted/50'
                >
                  <TableCell className='font-medium'>
                    {event.case_number}
                  </TableCell>
                  <TableCell>
                    <span className='inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200'>
                      {event.event_type}
                    </span>
                  </TableCell>
                  <TableCell className='hidden text-muted-foreground lg:table-cell'>
                    {event.description}
                  </TableCell>
                  <TableCell>{event.date}</TableCell>
                  <TableCell className='hidden text-muted-foreground md:table-cell'>
                    {event.time}
                  </TableCell>
                </TableRow>
              ))}
            {events && !isLoading && events.length === 0 && (
              <DesktopEmptyState />
            )}
          </TableBody>
        </Table>
      </div>
      <div className='mt-4 flex items-center justify-between'>
        {isLoading ? (
          <span className='text-sm text-muted-foreground'>Loading...</span>
        ) : (
          <span className='text-sm text-muted-foreground'>
            Showing {`${(currentPage - 1) * 5 + 1}`} -{' '}
            {`${Math.min(currentPage * 5, count)}`} of {count} events
          </span>
        )}
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
                      ? 'pointer-events-none bg-muted opacity-50'
                      : 'hover:bg-accent hover:text-accent-foreground'
                  )}
                />
              </PaginationItem>

              <div className='hidden items-center gap-1 sm:flex'>
                {pageNumbers.map((page, index) => (
                  <PaginationItem key={`${page}-${index}`}>
                    {page === '...' ? (
                      <span className='px-3 text-muted-foreground'>...</span>
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
                <span className='text-sm text-muted-foreground'>
                  Page {currentPage} of {totalPages}
                </span>
              </div>

              <PaginationItem>
                <PaginationNext
                  onClick={() => handlePageChange(currentPage + 1)}
                  className={cn(
                    'h-9 cursor-pointer rounded-lg border px-3 transition-all duration-200',
                    currentPage === totalPages
                      ? 'pointer-events-none bg-muted opacity-50'
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

export default EventsTable;
