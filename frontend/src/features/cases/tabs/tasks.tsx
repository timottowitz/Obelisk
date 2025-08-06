import { Button } from '@/components/ui/button';
import TaskModel from './components/task-modal';
import { useEffect, useState } from 'react';
import { useCasesOperations, useGetCaseTasks } from '@/hooks/useCases';
import { toast } from 'sonner';
import { useCallback } from 'react';
import { Task } from '@/types/cases';
import { AlertModal } from '@/components/modal/alert-modal';
import TasksTable from './components/case-tasks-table';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

export default function Tasks({ caseId }: { caseId: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(
    parseInt(searchParams.get('page') || '1')
  );
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const { data: tasks, isLoading: isLoadingTasks } = useGetCaseTasks(
    caseId,
    currentPage
  );
  const { createCaseTask, deleteCaseTask, updateCaseTask } =
    useCasesOperations();

  useEffect(() => {
    router.push(`${pathname}?page=${currentPage}`);
  }, [currentPage, router, pathname]);

  const openTaskModal = useCallback((task: Task | null) => {
    setIsOpen(true);
    setSelectedTask(task);
  }, []);

  const openDeleteModal = useCallback((task: Task) => {
    setIsDeleteOpen(true);
    setSelectedTask(task);
  }, []);

  const closeTaskModal = useCallback(() => {
    setIsOpen(false);
    setSelectedTask(null);
  }, []);

  const closeDeleteModal = useCallback(() => {
    setIsDeleteOpen(false);
    setSelectedTask(null);
  }, []);

  const handleCreateTask = useCallback(
    async (taskData: any) => {
      try {
        const response = await createCaseTask.mutateAsync({
          caseId,
          formData: taskData
        });
        if (response) {
          toast.success('Task created successfully');
        } else {
          toast.error('Failed to create task');
        }
      } catch (error: any) {
        console.log(error);
        toast.error('Failed to create task');
      }
      setIsOpen(false);
    },
    [caseId, createCaseTask]
  );

  const handleUpdateTask = useCallback(
    async (taskData: any) => {
      try {
        const response = await updateCaseTask.mutateAsync({
          caseId,
          taskId: selectedTask!.id,
          formData: taskData
        });
        if (response) {
          toast.success('Task updated successfully');
        } else {
          toast.error('Failed to update task');
        }
      } catch (error: any) {
        console.log(error);
        toast.error('Failed to update task');
      }
      setIsOpen(false);
    },
    [caseId, updateCaseTask, selectedTask]
  );

  const handleDeleteTask = useCallback(
    async (task: Task) => {
      try {
        setIsLoading(true);
        await deleteCaseTask.mutateAsync({
          caseId,
          taskId: task.id
        });
        toast.success('Task deleted successfully');
      } catch (error: any) {
        toast.error('Failed to delete task');
      } finally {
        setIsLoading(false);
        setIsDeleteOpen(false);
      }
    },
    [caseId, deleteCaseTask]
  );

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  return (
    <div className='flex flex-col gap-4'>
      <h3 className='text-sm font-semibold text-gray-900'>Case Tasks</h3>
      <Button
        size='lg'
        variant='outline'
        className='ml-auto flex w-fit items-center justify-end text-xs'
        onClick={() => {
          setIsOpen(true);
          setSelectedTask(null);
        }}
      >
        Create A Task
      </Button>
      <TasksTable
        tasks={tasks?.tasks || []}
        isLoading={isLoadingTasks}
        count={tasks?.count || 0}
        currentPage={currentPage}
        onPageChange={handlePageChange}
        onOpenDeleteModal={openDeleteModal}
        onOpenEditModal={openTaskModal}
      />
      <TaskModel
        isOpen={isOpen}
        onClose={closeTaskModal}
        onSave={selectedTask ? handleUpdateTask : handleCreateTask}
        initialData={selectedTask || undefined}
        loading={isLoading}
      />
      {selectedTask && (
        <AlertModal
          isOpen={isDeleteOpen}
          onClose={closeDeleteModal}
          onConfirm={() => handleDeleteTask(selectedTask)}
          deleteTargetType='task'
          loading={isLoading}
        />
      )}
    </div>
  );
}
