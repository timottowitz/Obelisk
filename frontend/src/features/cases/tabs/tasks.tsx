import CaseDetailsTable from './table';
import { tasksColumns } from './columns';
import { Button } from '@/components/ui/button';
import CreateTaskModal from './components/create-task-modal';
import { useState } from 'react';

export default function Tasks() {
  const [isOpen, setIsOpen] = useState(false);

  const handleSave = (taskData: any) => {
    console.log(taskData);
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
      <CaseDetailsTable title='' columns={tasksColumns} data={[]} />
      <CreateTaskModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
}
