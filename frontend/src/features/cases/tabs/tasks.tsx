import CaseDetailsTable from './table';
import { tasksColumns } from './columns';
import { Button } from '@/components/ui/button';
import CreateTaskModal from './components/create-task-modal';
import { useState } from 'react';
import { useCaseOperations, useCasesOperations } from '@/hooks/useCases';
import { toast } from 'sonner';

export default function Tasks({ caseId }: { caseId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const { getCaseTasks } = useCaseOperations(caseId);
  const { createCaseTask } = useCasesOperations();
  const { data: tasks, isLoading, error } = getCaseTasks;

  const handleSave = async (taskData: any) => {
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
  };

  return (
    <div className='flex flex-col gap-4'>
      <h3 className='text-sm font-semibold text-gray-900'>Case Tasks</h3>
      <Button
        size='lg'
        variant='outline'
        className='ml-auto flex w-fit items-center justify-end text-xs'
        onClick={() => setIsOpen(true)}
      >
        Create A Task
      </Button>
      <CaseDetailsTable
        title='Tasks'
        columns={tasksColumns}
        data={tasks || []}
        isLoading={isLoading}
        error={error}
      />
      <CreateTaskModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
}
