'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, X } from 'lucide-react';

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: TaskData) => void;
  initialData?: TaskData;
}

interface TaskData {
  subject: string;
  dueDate: string;
  comments: string;
}

export default function TaskDetailModal({ 
  isOpen, 
  onClose, 
  onSave, 
  initialData 
}: TaskDetailModalProps) {
  const [formData, setFormData] = useState<TaskData>({
    subject: initialData?.subject || '',
    dueDate: initialData?.dueDate || '',
    comments: initialData?.comments || ''
  });

  const handleInputChange = (field: keyof TaskData, value: string) => {
    setFormData(prev => ({
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
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Task Detail</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 hover:bg-gray-100"
          >
            <X className="h-4 w-4 text-gray-600" />
          </Button>
        </div>

        {/* Modal Content */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* Subject and Due Date Row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Subject Field */}
              <div className="space-y-2">
                <Label htmlFor="subject" className="text-sm font-medium text-gray-700">
                  Subject <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="subject"
                  type="text"
                  placeholder="Subject"
                  value={formData.subject}
                  onChange={(e) => handleInputChange('subject', e.target.value)}
                  required
                  className="w-full"
                />
              </div>

              {/* Due Date Field */}
              <div className="space-y-2">
                <Label htmlFor="dueDate" className="text-sm font-medium text-gray-700">
                  Due Date <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="dueDate"
                    type="text"
                    placeholder="mm/dd/yy"
                    value={formData.dueDate}
                    onChange={(e) => handleInputChange('dueDate', e.target.value)}
                    required
                    className="w-full pr-10"
                  />
                  <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </div>
            </div>

            {/* Comments Field */}
            <div className="space-y-2">
              <Label htmlFor="comments" className="text-sm font-medium text-gray-700">
                Comments (Optional)
              </Label>
              <div className="relative">
                <Textarea
                  id="comments"
                  placeholder="Enter comments..."
                  value={formData.comments}
                  onChange={(e) => handleInputChange('comments', e.target.value)}
                  className="w-full resize-none"
                  rows={4}
                  maxLength={1000}
                />
                <div className="absolute bottom-2 right-2 text-xs text-gray-400">
                  {formData.comments.length}/1000
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border-gray-300 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white"
            >
              Save
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
} 