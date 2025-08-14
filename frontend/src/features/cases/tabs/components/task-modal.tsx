'use client';

import { useCallback, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import dayjs from 'dayjs';
import {
  useCreateCaseProject,
  useCaseProjects,
  useCreateCaseTask
} from '@/hooks/useTasks';
import { toast } from 'sonner';
import { UploadTaskData } from '@/types/cases';
import { useMembers } from '@/hooks/useMembers';

const regExp = /^[A-Z][a-z0-9]*(\s[A-Z][a-z0-9]*)*$/;
interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: UploadTaskData | null;
  loading: boolean;
  caseId: string;
  onSave: (taskData: UploadTaskData) => void;
}

export default function TaskModal({
  isOpen,
  onClose,
  loading,
  caseId,
  onSave,
  initialData
}: TaskDetailModalProps) {
  const [formData, setFormData] = useState<UploadTaskData>({
    name: '',
    due_date: null,
    description: '',
    assignee_id: '',
    priority: 'medium',
    case_project_id: ''
  });

  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectData, setNewProjectData] = useState({
    name: '',
    description: ''
  });

  const createCaseProject = useCreateCaseProject();
  const { data: caseProjects } = useCaseProjects(caseId);
  const { data: teamMembers } = useMembers();

  // Update form data when initialData changes
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        due_date: dayjs(initialData.due_date).format('YYYY-MM-DD') || null,
        description: initialData.description || '',
        assignee_id: initialData.assignee_id || '',
        priority: initialData.priority || 'medium',
        case_project_id: initialData.case_project_id || ''
      });
    } else {
      // Reset form when no initial data
      setFormData({
        name: '',
        due_date: null,
        description: '',
        assignee_id: teamMembers?.[0]?.userId || '',
        priority: 'medium',
        case_project_id: caseProjects?.[0]?.id || ''
      });
    }
  }, [initialData, teamMembers, caseProjects]);

  const createTask = useCreateCaseTask();
  const handleInputChange = useCallback(
    (field: keyof UploadTaskData, value: string) => {
      setFormData((prev) => ({
        ...prev,
        [field]: value
      }));
    },
    []
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      if (!formData.case_project_id) {
        toast.error('Please select a project');
        return;
      }
      e.preventDefault();
      onSave(formData);
      setFormData({
        name: '',
        due_date: null,
        description: '',
        assignee_id: teamMembers?.[0]?.userId || '',
        priority: 'medium',
        case_project_id: caseProjects?.[0]?.id || ''
      });
    },
    [formData, createTask, caseId]
  );

  const handleCreateProject = useCallback(async () => {
    if (newProjectData.name) {
      // Call the parent's onCreateProject with the new project data
      try {
        await createCaseProject.mutateAsync({
          caseId,
          projectData: newProjectData
        });
        setShowNewProject(false);
        setNewProjectData({ name: '', description: '' });
        toast.success('Project created successfully');
      } catch (error) {
        console.error('Error creating project', error);
        toast.error('Error creating project');
      }
    }
  }, [newProjectData, createCaseProject, caseId]);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {initialData ? 'Update Task' : 'Create Task'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className='p-6'>
          <div className='space-y-4'>
            <div className='grid grid-cols-2 gap-4'>
              {/* Subject Field */}
              <div className='space-y-2'>
                <Label
                  htmlFor='name'
                  className='text-sm font-medium text-gray-700'
                >
                  Name <span className='text-red-500'>*</span>
                </Label>
                <Input
                  id='name'
                  type='text'
                  placeholder='Enter task name'
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                  className='w-full'
                />
              </div>

              {/* Priority Field */}
              <div className='space-y-2'>
                <Label
                  htmlFor='priority'
                  className='text-sm font-medium text-gray-700'
                >
                  Priority <span className='text-red-500'>*</span>
                </Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) =>
                    handleInputChange(
                      'priority',
                      value as 'high' | 'medium' | 'low'
                    )
                  }
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder='Select priority' />
                  </SelectTrigger>
                  <SelectContent>
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
              </div>
            </div>

            {/* Project Field with inline creation */}
            <div className='grid grid-cols-1 gap-4'>
              <div className='space-y-2'>
                <Label
                  htmlFor='project'
                  className='text-sm font-medium text-gray-700'
                >
                  Project <span className='text-red-500'>*</span>
                </Label>
                {!showNewProject ? (
                  <div className='flex gap-2'>
                    <Select
                      value={formData.case_project_id}
                      onValueChange={(value) =>
                        handleInputChange('case_project_id', value)
                      }
                    >
                      <SelectTrigger className='flex-1'>
                        <SelectValue placeholder='Select a project' />
                      </SelectTrigger>
                      <SelectContent>
                        {caseProjects?.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type='button'
                      variant='outline'
                      onClick={() => setShowNewProject(true)}
                      className='cursor-pointer px-3'
                    >
                      + New
                    </Button>
                  </div>
                ) : (
                  <div className='space-y-2 rounded-md border bg-gray-50 p-3'>
                    <Input
                      type='text'
                      placeholder='example: Discovery'
                      value={newProjectData.name}
                      onChange={(e) => {
                        setNewProjectData((prev) => ({
                          ...prev,
                          name: e.target.value
                        }));
                      }}
                      className='w-full'
                    />
                    <Textarea
                      placeholder='Project description (optional)'
                      value={newProjectData.description}
                      onChange={(e) =>
                        setNewProjectData((prev) => ({
                          ...prev,
                          description: e.target.value
                        }))
                      }
                      className='w-full resize-none'
                      rows={2}
                    />
                    <div className='flex justify-end gap-2'>
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        onClick={() => {
                          setShowNewProject(false);
                          setNewProjectData({ name: '', description: '' });
                        }}
                        className='cursor-pointer'
                      >
                        Cancel
                      </Button>
                      <Button
                        type='button'
                        size='sm'
                        onClick={handleCreateProject}
                        className='cursor-pointer'
                        disabled={!regExp.test(newProjectData.name)}
                      >
                        Create
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Due Date and Assignee Row */}
              <div className='grid grid-cols-2 gap-4'>
                {/* Due Date Field */}
                {initialData && (
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
                        value={formData.due_date || ''}
                        onChange={(e) =>
                          handleInputChange('due_date', e.target.value)
                        }
                        required
                        className='w-full pr-10'
                      />
                    </div>
                  </div>
                )}

                {/* Assignee Field */}
                <div className='space-y-2'>
                  <Label
                    htmlFor='assignee'
                    className='text-sm font-medium text-gray-700'
                  >
                    Assignee <span className='text-red-500'>*</span>
                  </Label>
                  <Select
                    value={formData.assignee_id}
                    onValueChange={(value) =>
                      handleInputChange('assignee_id', value)
                    }
                  >
                    <SelectTrigger className='w-full'>
                      <SelectValue placeholder='Select team member' />
                    </SelectTrigger>
                    <SelectContent>
                      {teamMembers?.map((member) => (
                        <SelectItem key={member.userId} value={member.userId}>
                          <div className='flex items-center gap-2'>
                            <span>{member.email}</span>
                            <span className='text-xs text-gray-500'>
                              ({member.role})
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Description Field */}
              <div className='space-y-2'>
                <Label
                  htmlFor='description'
                  className='text-sm font-medium text-gray-700'
                >
                  Description (Optional)
                </Label>
                <div className='relative'>
                  <Textarea
                    id='description'
                    placeholder='Enter description...'
                    value={formData.description}
                    onChange={(e) =>
                      handleInputChange('description', e.target.value)
                    }
                    className='w-full resize-none overflow-y-auto'
                    rows={2}
                    maxLength={1000}
                  />
                  <div className='absolute right-2 bottom-2 text-xs text-gray-400'>
                    {formData.description?.length || 0}/1000
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
                className='cursor-pointer border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50'
              >
                Cancel
              </Button>
              <Button
                type='submit'
                className='cursor-pointer bg-red-600 px-4 py-2 text-white hover:bg-red-700'
              >
                {loading ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
