'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTasks } from '@/hooks/useTasks';
import TasksTable from '@/features/tasks/tasks-table';

export default function TasksPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = searchParams.get('page') || 1;
  const [currentPage, setCurrentPage] = useState(Number(page));
  const { data: tasks, isLoading } = useTasks(currentPage);
  const tasksData = tasks?.data || [];
  const tasksCount = tasks?.count || 0;

  useEffect(() => {
    router.push(`/dashboard/tasks?page=${currentPage}`);
  }, [currentPage]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  return (
    <div className='container mx-auto flex w-[80%] flex-col gap-4 px-10 py-10'>
      <TasksTable
        tasks={tasksData || []}
        isLoading={isLoading}
        count={tasksCount}
        currentPage={currentPage}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
