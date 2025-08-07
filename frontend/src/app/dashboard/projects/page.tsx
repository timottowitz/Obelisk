'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Filter, Search, Building2 } from 'lucide-react';
import { useProjects, useCreateProject } from '@/hooks/useTasks';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import { Project } from '@/types/cases';

interface CreateProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CreateProjectModal({ open, onOpenChange }: CreateProjectModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const createProject = useCreateProject();

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setLoading(true);
    try {
      await createProject.mutateAsync(formData);
      toast.success('Project created successfully');
      setFormData({ name: '', description: '' });
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to create project');
    } finally {
      setLoading(false);
    }
  }, [formData, createProject, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Project Name *</Label>
            <Input
              id="name"
              type="text"
              placeholder="e.g., Marketing Campaign Q1"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>
          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Brief description of the project..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.name.trim()}>
              {loading ? 'Creating...' : 'Create Project'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ProjectCard({ project }: { project: Project }) {
  return (
    <Link href={`/dashboard/projects/${project.id}`}>
      <div className="group cursor-pointer rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all duration-200 hover:border-blue-200 hover:shadow-md">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 group-hover:text-blue-600">
                {project.name}
              </h3>
              <p className="text-sm text-gray-500">
                Created {new Date(project.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
            project.status === 'active' 
              ? 'bg-green-100 text-green-800' 
              : project.status === 'completed'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
          </span>
        </div>
        {project.description && (
          <p className="mt-3 line-clamp-2 text-sm text-gray-600">
            {project.description}
          </p>
        )}
      </div>
    </Link>
  );
}

export default function ProjectsPage() {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  const { data: projects, isLoading } = useProjects();

  const filteredProjects = projects?.filter((project: Project) => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (project.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) ?? [];

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
            <p className="mt-2 text-gray-600">
              Manage internal projects, administrative tasks, and team initiatives
            </p>
          </div>
          <Button onClick={() => setCreateModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div className="flex flex-1 items-center space-x-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="on_hold">On Hold</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse rounded-lg border border-gray-200 bg-white p-6">
              <div className="flex items-start space-x-3">
                <div className="h-10 w-10 rounded-lg bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 rounded bg-gray-200" />
                  <div className="h-3 w-1/2 rounded bg-gray-200" />
                </div>
              </div>
              <div className="mt-3 space-y-2">
                <div className="h-3 w-full rounded bg-gray-200" />
                <div className="h-3 w-2/3 rounded bg-gray-200" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredProjects.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Building2 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            {searchQuery || statusFilter !== 'all' ? 'No projects found' : 'No projects yet'}
          </h3>
          <p className="mt-2 text-gray-600">
            {searchQuery || statusFilter !== 'all' 
              ? 'Try adjusting your search or filters'
              : 'Get started by creating your first project'
            }
          </p>
          {!searchQuery && statusFilter === 'all' && (
            <Button onClick={() => setCreateModalOpen(true)} className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Create Project
            </Button>
          )}
        </div>
      )}

      <CreateProjectModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
      />
    </div>
  );
}
