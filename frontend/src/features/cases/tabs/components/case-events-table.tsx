'use client';

import { memo, useCallback, useMemo } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Calendar, FileText, Clock } from 'lucide-react';
import dayjs from 'dayjs';

interface EventsTableProps {
  events: CaseEvent[];
  isLoading: boolean;
  count: number;
  currentPage: number;
  onPageChange: (page: number) => void;
}

// Utility functions
const formatDate = (dateString: string): string => {
  if (!dateString) return '-';
  try {
    return dayjs(dateString).format('MMM DD, YYYY');
  } catch {
    return dateString;
  }
};

const formatTime = (timeString: string): string => {
  if (!timeString) return '-';
  try {
    // Handle both time-only strings and full datetime strings
    if (timeString.includes('T') || timeString.includes(' ')) {
      return dayjs(timeString).format('HH:mm A');
    } else {
      return dayjs(`2000-01-01T${timeString}`).format('HH:mm A');
    }
  } catch {
    return timeString;
  }
};

// Loading skeleton component
const LoadingSkeleton = memo(() => (
  <div className='space-y-4'>
    {Array.from({ length: 5 }, (_, i) => (
      <div
        key={i}
        className='border-border flex items-center space-x-4 border-b p-4'
      >
        <div className='bg-muted h-10 w-10 animate-pulse rounded-full' />
        <div className='flex-1 space-y-2'>
          <div className='bg-muted h-4 w-3/4 animate-pulse rounded' />
          <div className='bg-muted h-3 w-1/2 animate-pulse rounded' />
        </div>
        <div className='bg-muted h-6 w-20 animate-pulse rounded-full' />
        <div className='flex space-x-2'>
          <div className='bg-muted h-8 w-8 animate-pulse rounded' />
          <div className='bg-muted h-8 w-8 animate-pulse rounded' />
        </div>
      </div>
    ))}
  </div>
));
LoadingSkeleton.displayName = 'LoadingSkeleton';

// Mobile card component
const MobileEventCard = memo(({ event }: { event: CaseEvent }) => (
  <Card className='border-border transition-all duration-200 hover:shadow-md'>
    <CardContent className='p-4'>
      <div className='space-y-3'>
        <div className='flex items-start justify-between'>
          <h3 className='text-foreground font-semibold'>
            {event.name || event.event_type || 'Unnamed Event'}
          </h3>
        </div>

        {event.description && (
          <p className='text-muted-foreground line-clamp-2 text-sm'>
            {event.description}
          </p>
        )}

        <div className='text-muted-foreground flex items-center justify-between text-xs'>
          <div className='flex items-center space-x-4'>
            <div className='flex items-center space-x-1'>
              <Calendar className='h-3 w-3' />
              <span>{formatDate(event.date)}</span>
            </div>
            <div className='flex items-center space-x-1'>
              <Clock className='h-3 w-3' />
              <span>{formatTime(event.time)}</span>
            </div>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
));
MobileEventCard.displayName = 'MobileEventCard';

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
        if (totalPages > 5) {
          pages.push('...');
          pages.push(totalPages);
        }
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
    <div className='space-y-6'>
      <Card className='border-border shadow-sm'>
        <CardHeader className='pb-4'>
          <CardTitle className='text-foreground flex items-center space-x-2'>
            <Calendar className='text-primary h-5 w-5' />
            <span>Case Events</span>
          </CardTitle>
        </CardHeader>
        <CardContent className='p-0'>
          {isLoading ? (
            <LoadingSkeleton />
          ) : (
            <>
              {/* Desktop Table */}
              <div className='hidden md:block'>
                <Table>
                  <TableHeader>
                    <TableRow className='bg-muted/50 border-border'>
                      <TableHead className='text-foreground px-6 py-4 font-semibold'>
                        Name
                      </TableHead>
                      <TableHead className='text-foreground px-6 py-4 font-semibold'>
                        Description
                      </TableHead>
                      <TableHead className='text-foreground px-6 py-4 font-semibold'>
                        Date
                      </TableHead>
                      <TableHead className='text-foreground px-6 py-4 font-semibold'>
                        Time
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.length > 0 ? (
                      events.map((event) => (
                        <TableRow
                          key={event.id}
                          className='border-border hover:bg-muted/50 transition-colors duration-150'
                        >
                          <TableCell className='px-6 py-4'>
                            <span className='text-foreground font-medium'>
                              {event.name ||
                                event.event_type ||
                                'Unnamed Event'}
                            </span>
                          </TableCell>
                          <TableCell className='max-w-xs px-6 py-4'>
                            <div
                              className='text-muted-foreground truncate'
                              title={event.description}
                            >
                              {event.description || '-'}
                            </div>
                          </TableCell>
                          <TableCell className='px-6 py-4'>
                            <div className='text-muted-foreground flex items-center space-x-2'>
                              <Calendar className='h-4 w-4' />
                              <span>{formatDate(event.date)}</span>
                            </div>
                          </TableCell>
                          <TableCell className='px-6 py-4'>
                            <div className='text-muted-foreground flex items-center space-x-2'>
                              <Clock className='h-4 w-4' />
                              <span>{formatTime(event.time)}</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className='py-16'>
                          <div className='flex flex-col items-center space-y-3'>
                            <FileText className='text-muted-foreground h-12 w-12 opacity-50' />
                            <p className='text-muted-foreground'>
                              No events found
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className='space-y-4 p-4 md:hidden'>
                {events.length > 0 ? (
                  events.map((event) => (
                    <MobileEventCard key={event.id} event={event} />
                  ))
                ) : (
                  <div className='py-16'>
                    <div className='flex flex-col items-center space-y-3'>
                      <FileText className='text-muted-foreground h-12 w-12 opacity-50' />
                      <p className='text-muted-foreground'>No events found</p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {count > 0 && (
        <div className='flex items-center justify-between'>
          <p className='text-muted-foreground text-sm'>
            Showing {(currentPage - 1) * 5 + 1}-
            {Math.min(currentPage * 5, count)} of {count} events
          </p>
          <div className='flex items-center gap-2'>
            {totalPages > 1 && (
              <Pagination>
                <PaginationContent className='flex items-center gap-1'>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => handlePageChange(currentPage - 1)}
                      className={cn(
                        'h-9 cursor-pointer rounded-lg px-3 transition-all duration-200',
                        currentPage === 1
                          ? 'pointer-events-none opacity-50'
                          : 'hover:bg-accent hover:text-accent-foreground'
                      )}
                    />
                  </PaginationItem>

                  <div className='hidden items-center gap-1 sm:flex'>
                    {pageNumbers.map((page, index) => (
                      <PaginationItem key={`${page}-${index}`}>
                        {page === '...' ? (
                          <span className='text-muted-foreground px-3'>
                            ...
                          </span>
                        ) : (
                          <PaginationLink
                            onClick={() => handlePageChange(Number(page))}
                            className={cn(
                              'h-9 min-w-[36px] cursor-pointer rounded-lg px-3 transition-all duration-200',
                              currentPage === Number(page)
                                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
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
                        'h-9 cursor-pointer rounded-lg px-3 transition-all duration-200',
                        currentPage === totalPages
                          ? 'pointer-events-none opacity-50'
                          : 'hover:bg-accent hover:text-accent-foreground'
                      )}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default EventsTable;
