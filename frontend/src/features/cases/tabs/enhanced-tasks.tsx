'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Plus, 
  Filter, 
  Search, 
  Users, 
  UserCheck, 
  Brain,
  FolderPlus,
  CheckCircle,
  Circle
} from 'lucide-react';
import { useCaseOperations, useCasesOperations } from '@/hooks/useCases';
import { useCaseProjects, useCreateCaseProject } from '@/hooks/useTasks';
import { toast } from 'sonner';
import { Task, CaseProject, TaskFilterOptions, TaskCreateData } from '@/types/cases';
import { AlertModal } from '@/components/modal/alert-modal';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import EnhancedCaseTasksTable from './components/enhanced-case-tasks-table';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: TaskCreateData) => void;
  initialData?: Task;
  loading: boolean;
  caseProjects: CaseProject[];
}

function TaskModal({ 
  isOpen, 
  onClose, 
  onSave, 
  initialData, 
  loading,
  caseProjects 
}: TaskModalProps) {
  const [formData, setFormData] = useState<TaskCreateData>({
    name: '',
    description: '',
    priority: 'medium',
    due_date: '',
    assignee_id: '',
    case_project_id: '',
    category_id: ''
  });

  const [showNewProjectForm, setShowNewProjectForm] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        description: initialData.description || '',
        priority: initialData.priority || 'medium',
        due_date: initialData.due_date ? new Date(initialData.due_date).toISOString().split('T')[0] : '',
        assignee_id: initialData.assignee_id || '',
        case_project_id: '', // This would need to be populated based on task data
        category_id: initialData.category_id || ''
      });
    } else {
      setFormData({
        name: '',
        description: '',
        priority: 'medium',
        due_date: '',
        assignee_id: '',
        case_project_id: '',
        category_id: ''
      });
    }
  }, [initialData, isOpen]);

  const handleInputChange = useCallback((field: keyof TaskCreateData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData: TaskCreateData = {
      ...formData,
      case_project_id: formData.case_project_id === 'new' ? undefined : formData.case_project_id
    };

    onSave(submitData);
  }, [formData, onSave]);

  const handleNewProject = useCallback(() => {
    if (newProjectName.trim()) {
      // This would trigger project creation and then set the project ID
      setFormData(prev => ({ ...prev, case_project_id: 'new-project-temp' }));
      setShowNewProjectForm(false);
      setNewProjectName('');
    }
  }, [newProjectName]);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            {initialData ? (
              <>
                <CheckCircle className="h-5 w-5 text-blue-600" />
                <span>Edit Task</span>
              </>
            ) : (
              <>
                <Plus className="h-5 w-5 text-green-600" />
                <span>Create New Task</span>
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          {/* Task Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
              Task Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              type="text"
              placeholder="Enter task description..."
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              required
              className="w-full"
            />
          </div>

          {/* Project Selection */}
          <div className="space-y-2">
            <Label htmlFor="project" className="text-sm font-medium">
              Project
            </Label>
            <div className="flex space-x-2">
              <Select 
                value={formData.case_project_id} 
                onValueChange={(value) => {
                  if (value === 'new') {
                    setShowNewProjectForm(true);
                  } else {
                    handleInputChange('case_project_id', value);
                  }
                }}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select or create project..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No Project</SelectItem>
                  {caseProjects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="new">
                    <div className="flex items-center">
                      <FolderPlus className="mr-2 h-4 w-4" />
                      Create New Project
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* New Project Form */}
            {showNewProjectForm && (
              <div className="mt-2 p-3 border rounded-lg bg-gray-50">
                <Label htmlFor="newProject" className="text-sm font-medium">
                  New Project Name
                </Label>
                <div className="flex space-x-2 mt-1">
                  <Input
                    id="newProject"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="e.g., Discovery, Pleadings..."
                    className="flex-1"
                  />
                  <Button 
                    type="button" 
                    size="sm" 
                    onClick={handleNewProject}
                    disabled={!newProjectName.trim()}
                  >
                    Create
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowNewProjectForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Priority and Assignee Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority" className="text-sm font-medium">
                Priority
              </Label>
              <Select 
                value={formData.priority} 
                onValueChange={(value) => handleInputChange('priority', value as 'high' | 'medium' | 'low')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">
                    <div className="flex items-center">
                      <div className="mr-2 h-2 w-2 rounded-full bg-red-500" />
                      High
                    </div>
                  </SelectItem>
                  <SelectItem value="medium">
                    <div className="flex items-center">
                      <div className="mr-2 h-2 w-2 rounded-full bg-yellow-500" />
                      Medium
                    </div>
                  </SelectItem>
                  <SelectItem value="low">
                    <div className="flex items-center">
                      <div className="mr-2 h-2 w-2 rounded-full bg-green-500" />
                      Low
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignee" className="text-sm font-medium">
                Assignee
              </Label>
              <Select 
                value={formData.assignee_id} 
                onValueChange={(value) => handleInputChange('assignee_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select team member..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unassigned</SelectItem>
                  {/* This would be populated with team members */}
                  <SelectItem value="user-1">John Doe</SelectItem>
                  <SelectItem value="user-2">Jane Smith</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label htmlFor="due_date" className="text-sm font-medium">
              Due Date
            </Label>
            <Input
              id="due_date"
              type="date"
              value={formData.due_date}
              onChange={(e) => handleInputChange('due_date', e.target.value)}
              className="w-full"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Description (Optional)
            </Label>
            <Textarea
              id="description"
              placeholder="Additional details about this task..."
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className="w-full resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.name.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? 'Saving...' : initialData ? 'Update Task' : 'Create Task'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function EnhancedCaseTasks({ caseId }: { caseId: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // State management
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page') || '1'));
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<TaskFilterOptions>({
    view: 'my_tasks',
    priority: undefined,
    completed: undefined
  });

  // Data hooks
  const { data: tasks, isLoading: isLoadingTasks } = useCaseOperations(caseId).getCaseTasks;
  const { data: caseProjects = [] } = useCaseProjects(caseId);
  const { createCaseTask, updateCaseTask, deleteCaseTask } = useCasesOperations();

  // Update URL when page changes
  useEffect(() => {
    router.push(`${pathname}?page=${currentPage}`);
  }, [currentPage, router, pathname]);

  // Task operations
  const handleCreateTask = useCallback(async (taskData: TaskCreateData) => {
    setLoading(true);
    try {
      await createCaseTask.mutateAsync({
        caseId,
        formData: taskData
      });
      toast.success('Task created successfully');
      setIsTaskModalOpen(false);
      setSelectedTask(null);
    } catch (error) {
      toast.error('Failed to create task');
    } finally {
      setLoading(false);
    }
  }, [caseId, createCaseTask]);

  const handleUpdateTask = useCallback(async (taskData: TaskCreateData) => {
    if (!selectedTask) return;
    
    setLoading(true);
    try {
      await updateCaseTask.mutateAsync({
        caseId,
        taskId: selectedTask.id,
        formData: taskData
      });
      toast.success('Task updated successfully');
      setIsTaskModalOpen(false);
      setSelectedTask(null);
    } catch (error) {
      toast.error('Failed to update task');
    } finally {
      setLoading(false);
    }
  }, [caseId, selectedTask, updateCaseTask]);

  const handleDeleteTask = useCallback(async (task: Task) => {
    setLoading(true);
    try {
      await deleteCaseTask.mutateAsync({
        caseId,
        taskId: task.id
      });
      toast.success('Task deleted successfully');
      setIsDeleteModalOpen(false);
      setSelectedTask(null);
    } catch (error) {
      toast.error('Failed to delete task');
    } finally {
      setLoading(false);
    }
  }, [caseId, deleteCaseTask]);

  // Modal handlers
  const openTaskModal = useCallback((task: Task | null = null) => {
    setSelectedTask(task);
    setIsTaskModalOpen(true);
  }, []);

  const closeTaskModal = useCallback(() => {
    setIsTaskModalOpen(false);
    setSelectedTask(null);
  }, []);

  const openDeleteModal = useCallback((task: Task) => {
    setSelectedTask(task);
    setIsDeleteModalOpen(true);
  }, []);

  const closeDeleteModal = useCallback(() => {
    setIsDeleteModalOpen(false);
    setSelectedTask(null);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleFilterChange = useCallback((newFilters: Partial<TaskFilterOptions>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  return (
    <div className="flex flex-col space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Case Tasks</h3>
          <p className="text-sm text-gray-500">
            Manage tasks and track progress for this case
          </p>
        </div>
        <Button onClick={() => openTaskModal()}>
          <Plus className="mr-2 h-4 w-4" />
          Create Task
        </Button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div className="flex items-center space-x-4">
          {/* View Toggle */}
          <div className="flex rounded-lg border p-1">
            <Button
              variant={filters.view === 'my_tasks' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleFilterChange({ view: 'my_tasks' })}
            >
              <UserCheck className="mr-1 h-4 w-4" />
              My Tasks
            </Button>
            <Button
              variant={filters.view === 'assigned_by_me' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleFilterChange({ view: 'assigned_by_me' })}
            >
              <Users className="mr-1 h-4 w-4" />
              Assigned by Me
            </Button>
            <Button
              variant={filters.view === 'all_tasks' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleFilterChange({ view: 'all_tasks' })}
            >
              All Tasks
            </Button>
          </div>

          {/* Priority Filter */}
          <Select 
            value={filters.priority || 'all'} 
            onValueChange={(value) => handleFilterChange({ 
              priority: value === 'all' ? undefined : value as 'high' | 'medium' | 'low' 
            })}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 w-64"
          />
        </div>
      </div>

      {/* Tasks Table */}
      <EnhancedCaseTasksTable
        tasks={tasks?.tasks || []}
        isLoading={isLoadingTasks}
        count={tasks?.count || 0}
        currentPage={currentPage}
        searchQuery={searchQuery}
        filters={filters}
        caseId={caseId}
        onPageChange={handlePageChange}
        onEditTask={openTaskModal}
        onDeleteTask={openDeleteModal}
      />

      {/* Task Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={closeTaskModal}
        onSave={selectedTask ? handleUpdateTask : handleCreateTask}
        initialData={selectedTask || undefined}
        loading={loading}
        caseProjects={caseProjects}
      />

      {/* Delete Confirmation Modal */}
      {selectedTask && (
        <AlertModal
          isOpen={isDeleteModalOpen}
          onClose={closeDeleteModal}
          onConfirm={() => handleDeleteTask(selectedTask)}
          deleteTargetType="task"
          loading={loading}
        />
      )}
    </div>
  );
}
