'use client';

import { useEffect, useState } from 'react';
import EventsTable from './components/case-events-table';
import { useGetCaseEvents } from '@/hooks/useCases';
import { useSearchParams, useRouter } from 'next/navigation';

export default function Events({ caseId }: { caseId: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(
    Number(searchParams.get('page')) || 1
  );

  useEffect(() => {
    router.push(`/dashboard/cases/${caseId}?page=${currentPage}`);
  }, [currentPage, router, caseId]);

  const { data: events, isLoading } = useGetCaseEvents(caseId, currentPage);
  console.log(events?.data);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <EventsTable
      events={events?.data || []}
      isLoading={isLoading}
      count={events?.count || 0}
      currentPage={currentPage}
      onPageChange={handlePageChange}
    />
  );
}
