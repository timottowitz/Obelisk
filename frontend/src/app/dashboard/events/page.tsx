'use client';

import { useCallback, useEffect, useState } from 'react';
import EventsTable from '@/features/events/event-table';
import { useEvents } from '@/hooks/useEvents';
import { useSearchParams, useRouter } from 'next/navigation';

export default function EventsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = searchParams.get('page') || 1;
  const [currentPage, setCurrentPage] = useState(Number(page));
  const { data: events, isLoading } = useEvents(currentPage);
  const eventsData = events?.data || [];
  const eventsCount = events?.count || 0;

  useEffect(() => {
    router.push(`/dashboard/events?page=${currentPage}`);
  }, [currentPage]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  return (
    <div className='container mx-auto flex w-[80%] flex-col gap-4 px-10 py-10'>
      <h1 className='text-2xl font-bold'>Case Events</h1>
      <EventsTable
        events={eventsData || []}
        isLoading={isLoading}
        count={eventsCount}
        currentPage={currentPage}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
