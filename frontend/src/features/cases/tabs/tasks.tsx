import { Button } from '@/components/ui/button';
import TaskModel from './components/task-modal';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useCallback } from 'react';
import { Task, UploadTaskData } from '@/types/cases';
import { AlertModal } from '@/components/modal/alert-modal';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import EnhancedCaseTasksTable from './components/enhanced-case-tasks-table';
import {
  useCaseTasks,
  useCreateCaseTask,
  useUpdateTask,
  useDeleteTask
} from '@/hooks/useTasks';

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
  const { data: tasks, isLoading: isLoadingTasks } = useCaseTasks(
    caseId,
    currentPage,
    { view: 'all_tasks' }
  );
  const createCaseTask = useCreateCaseTask();
  const updateCaseTask = useUpdateTask();
  const deleteCaseTask = useDeleteTask();

  useEffect(() => {
    router.push(`${pathname}?page=${currentPage}`);
  }, [currentPage, router, pathname]);

  const openTaskModal = useCallback((task: Task) => {
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
    async (taskData: UploadTaskData) => {
      try {
        const response = await createCaseTask.mutateAsync({
          caseId,
          taskData: taskData
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
      setSelectedTask(null);
    },
    [caseId, createCaseTask]
  );

  const handleUpdateTask = useCallback(
    async (taskData: UploadTaskData) => {
      try {
        const response = await updateCaseTask.mutateAsync({
          taskId: selectedTask!.id,
          taskData: taskData,
          taskType: 'case_task'
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
      setSelectedTask(null);
    },
    [caseId, updateCaseTask, selectedTask]
  );

  const handleDeleteTask = useCallback(
    async (task: Task) => {
      try {
        setIsLoading(true);
        await deleteCaseTask.mutateAsync({
          taskId: task.id,
          taskType: 'case_task'
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
      <EnhancedCaseTasksTable
        tasks={tasks?.data || []}
        isLoading={isLoadingTasks}
        count={tasks?.count || 0}
        currentPage={currentPage}
        caseId={caseId}
        onPageChange={handlePageChange}
        onEditTask={openTaskModal}
        onDeleteTask={openDeleteModal}
      />

      <TaskModel
        isOpen={isOpen}
        onClose={closeTaskModal}
        loading={isLoading}
        caseId={caseId}
        onSave={selectedTask ? handleUpdateTask : handleCreateTask}
        initialData={selectedTask}
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
