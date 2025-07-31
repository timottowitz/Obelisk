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
  subject: string;
  dueDate: string;
  comments: string;
}

export default function CreateTaskModal({
  isOpen,
  onClose,
  onSave
}: TaskDetailModalProps) {
  const [formData, setFormData] = useState<TaskData>({
    subject: '',
    dueDate: '',
    comments: ''
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
                  htmlFor='subject'
                  className='text-sm font-medium text-gray-700'
                >
                  Subject <span className='text-red-500'>*</span>
                </Label>
                <Input
                  id='subject'
                  type='text'
                  placeholder='Subject'
                  value={formData.subject}
                  onChange={(e) => handleInputChange('subject', e.target.value)}
                  required
                  className='w-full'
                />
              </div>

              {/* Due Date Field */}
              <div className='space-y-2'>
                <Label
                  htmlFor='dueDate'
                  className='text-sm font-medium text-gray-700'
                >
                  Due Date <span className='text-red-500'>*</span>
                </Label>
                <div className='relative'>
                  <Input
                    id='dueDate'
                    type='text'
                    placeholder='mm/dd/yy'
                    value={formData.dueDate}
                    onChange={(e) =>
                      handleInputChange('dueDate', e.target.value)
                    }
                    required
                    className='w-full pr-10'
                  />
                  <Calendar className='absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 transform text-gray-400' />
                </div>
              </div>
            </div>

            {/* Comments Field */}
            <div className='space-y-2'>
              <Label
                htmlFor='comments'
                className='text-sm font-medium text-gray-700'
              >
                Comments (Optional)
              </Label>
              <div className='relative'>
                <Textarea
                  id='comments'
                  placeholder='Enter comments...'
                  value={formData.comments}
                  onChange={(e) =>
                    handleInputChange('comments', e.target.value)
                  }
                  className='w-full resize-none'
                  rows={4}
                  maxLength={1000}
                />
                <div className='absolute right-2 bottom-2 text-xs text-gray-400'>
                  {formData.comments.length}/1000
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
