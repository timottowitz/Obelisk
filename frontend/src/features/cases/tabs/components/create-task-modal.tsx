'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { DialogDescription, DialogFooter } from '@/components/ui/dialog';

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: TaskData) => void;
}

interface TaskData {
  name: string;
  due_date: string;
  description: string;
}

export default function CreateTaskModal({
  isOpen,
  onClose,
  onSave
}: TaskDetailModalProps) {
  const [formData, setFormData] = useState<TaskData>({
    name: '',
    due_date: '',
    description: ''
  });

  const handleInputChange = (field: keyof TaskData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className='p-6'>
          <div className='space-y-4'>
            {/* Subject and Due Date Row */}
            <div className='grid grid-cols-2 gap-4'>
              {/* Subject Field */}
              <div className='space-y-2'>
                <Label
                  htmlFor='name'
                  className='text-sm font-medium text-gray-700'
                >
                  Subject <span className='text-red-500'>*</span>
                </Label>
                <Input
                  id='name'
                  type='text'
                  placeholder='Subject'
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                  className='w-full'
                />
              </div>

              {/* Due Date Field */}
              <div className='space-y-2'>
                <Label
                  htmlFor='due_date'
                  className='text-sm font-medium text-gray-700'
                >
                  Due Date <span className='text-red-500'>*</span>
                </Label>
                <div className='relative'>
                  <Input
                    id='due_date'
                    type='date'
                    placeholder='mm/dd/yy'
                    value={formData.due_date}
                    onChange={(e) =>
                      handleInputChange('due_date', e.target.value)
                    }
                    required
                    className='w-full pr-10'
                  />
                </div>
              </div>
            </div>

            {/* Comments Field */}
            <div className='space-y-2'>
              <Label
                htmlFor='description'
                className='text-sm font-medium text-gray-700'
              >
                Comments (Optional)
              </Label>
              <div className='relative'>
                <Textarea
                  id='description'
                  placeholder='Enter description...'
                  value={formData.description}
                  onChange={(e) =>
                    handleInputChange('description', e.target.value)
                  }
                  className='w-full resize-none'
                  rows={4}
                  maxLength={1000}
                />
                <div className='absolute right-2 bottom-2 text-xs text-gray-400'>
                  {formData.description.length}/1000
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className='mt-6 flex justify-end space-x-3 border-t border-gray-200 pt-4'>
            <Button
              type='button'
              variant='outline'
              onClick={onClose}
              className='border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50'
            >
              Cancel
            </Button>
            <Button
              type='submit'
              className='bg-red-600 px-4 py-2 text-white hover:bg-red-700'
            >
              Save
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
