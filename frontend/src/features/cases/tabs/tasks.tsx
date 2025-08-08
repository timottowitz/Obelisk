import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Search, X } from 'lucide-react';
import TaskModal from './components/task-modal';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
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
import { useDebounce } from '@/hooks/use-debounce';
import queryString from 'query-string';

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

  // Filter states
  const [searchQuery, setSearchQuery] = useState(
    searchParams.get('search') || ''
  );

  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  const [queryParams, setQueryParams] = useState<{
    page: number;
    status: string;
    priority: string;
    view: string;
  }>({
    page: parseInt(searchParams.get('page') || '1'),
    status: searchParams.get('status') || 'all',
    priority: searchParams.get('priority') || 'all',
    view: searchParams.get('view') || 'my_tasks'
  });

  const { data: tasks, isLoading: isLoadingTasks } = useCaseTasks(
    caseId,
    currentPage,
    debouncedSearchQuery,
    queryParams.status,
    queryParams.priority,
    queryParams.view
  );

  const createCaseTask = useCreateCaseTask();
  const updateCaseTask = useUpdateTask();
  const deleteCaseTask = useDeleteTask();

  useEffect(() => {
    setCurrentPage(1);
  }, [
    debouncedSearchQuery,
    queryParams.status,
    queryParams.priority,
    queryParams.view
  ]);

  useEffect(() => {
    const url = queryString.stringifyUrl({
      url: pathname,
      query: { ...queryParams, search: debouncedSearchQuery }
    });
    router.push(url);
  }, [
    queryParams.page,
    debouncedSearchQuery,
    queryParams.status,
    queryParams.priority,
    queryParams.view,
    router,
    pathname
  ]);

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
      } finally {
        setIsLoading(false);
        setIsOpen(false);
        setSelectedTask(null);
      }
    },
    [caseId, createCaseTask]
  );

  const handleUpdateTask = useCallback(
    async (taskData: UploadTaskData) => {
      setIsLoading(true);
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
      } finally {
        setIsLoading(false);
        setIsOpen(false);
        setSelectedTask(null);
      }
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
      <div className='flex items-center justify-between'>
        <h3 className='text-sm font-semibold text-gray-900'>Case Tasks</h3>
        <Button
          size='lg'
          variant='outline'
          className='flex w-fit cursor-pointer items-center text-xs'
          onClick={() => {
            setIsOpen(true);
            setSelectedTask(null);
          }}
        >
          Create A Task
        </Button>
      </div>

      {/* Filters Section */}
      <div className='flex flex-row items-center gap-3 rounded-lg border bg-white p-4'>
        {/* Search Input */}
        <div className='relative'>
          <Search className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400' />
          <Input
            type='text'
            placeholder='Search tasks by name'
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
            }}
            className='pr-9 pl-9'
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
              }}
              className='absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600'
            >
              <X className='h-4 w-4' />
            </button>
          )}
        </div>

        {/* Status Filter */}
        <Select
          value={queryParams.status}
          onValueChange={(value) =>
            setQueryParams({ ...queryParams, status: value })
          }
        >
          <SelectTrigger className='w-[140px]'>
            <SelectValue placeholder='All Status' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All Status</SelectItem>
            <SelectItem value='pending'>Pending</SelectItem>
            <SelectItem value='in_progress'>In Progress</SelectItem>
            <SelectItem value='completed'>Completed</SelectItem>
            <SelectItem value='cancelled'>Cancelled</SelectItem>
          </SelectContent>
        </Select>

        {/* Priority Filter */}
        <Select
          value={queryParams.priority}
          onValueChange={(value) =>
            setQueryParams({ ...queryParams, priority: value })
          }
        >
          <SelectTrigger className='w-[140px]'>
            <SelectValue placeholder='All Priorities' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All Priorities</SelectItem>
            <SelectItem value='high'>
              <span className='flex items-center gap-2'>
                <span className='h-2 w-2 rounded-full bg-red-500'></span>
                High
              </span>
            </SelectItem>
            <SelectItem value='medium'>
              <span className='flex items-center gap-2'>
                <span className='h-2 w-2 rounded-full bg-yellow-500'></span>
                Medium
              </span>
            </SelectItem>
            <SelectItem value='low'>
              <span className='flex items-center gap-2'>
                <span className='h-2 w-2 rounded-full bg-green-500'></span>
                Low
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
        {/* View Filter */}
        <Select
          value={queryParams.view}
          onValueChange={(value) =>
            setQueryParams({ ...queryParams, view: value })
          }
        >
          <SelectTrigger className='w-[180px]'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='my_tasks'>My Tasks</SelectItem>
            <SelectItem value='assigned_by_me'>Assigned By Me</SelectItem>
          </SelectContent>
        </Select>
      </div>

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

      <TaskModal
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
