import TasksAPI from '@/services/tasks';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  TaskFilterOptions,
  TaskCreateData,
  FoundationAITaskData
} from '@/types/cases';

const QUERY_KEYS = {
  tasks: ['tasks'] as const,
  projects: ['projects'] as const,
  caseProjects: ['case-projects'] as const,
  aiInsights: ['ai-insights'] as const
};

// General project tasks (non-case specific)
export const useCaseTasks = (
  caseId: string,
  page: number,
  search: string,
  status: string,
  priority: string,
  view: string
) => {
  return useQuery({
    queryKey: [...QUERY_KEYS.tasks, caseId, page, search, status, priority, view],
    queryFn: () =>
      TasksAPI.getCaseTasks(caseId, page, search, status, priority, view),
    staleTime: 1000 * 60 * 5,
    retry: 2
  });
};

// Projects management
export const useProjects = () => {
  return useQuery({
    queryKey: [...QUERY_KEYS.projects],
    queryFn: () => TasksAPI.getProjects(),
    staleTime: 1000 * 60 * 5,
    retry: 2
  });
};

export const useCreateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectData: { name: string; description?: string }) =>
      TasksAPI.createProject(projectData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.projects] });
    }
  });
};

export const useCreateCaseTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      caseId,
      taskData
    }: {
      caseId: string;
      taskData: TaskCreateData;
    }) => TasksAPI.createCaseTask(caseId, taskData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.tasks] });
    }
  });
};
// Project tasks
export const useProjectTasks = (
  projectId: string,
  filters?: TaskFilterOptions
) => {
  return useQuery({
    queryKey: [...QUERY_KEYS.tasks, 'project', projectId, filters],
    queryFn: () => TasksAPI.getProjectTasks(projectId, filters),
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5,
    retry: 2
  });
};

export const useCreateProjectTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      taskData
    }: {
      projectId: string;
      taskData: TaskCreateData;
    }) => TasksAPI.createProjectTask(projectId, taskData),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({
        queryKey: [...QUERY_KEYS.tasks, 'project', projectId]
      });
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.tasks] });
    }
  });
};

// Case projects
export const useCaseProjects = (caseId: string) => {
  return useQuery({
    queryKey: [...QUERY_KEYS.caseProjects, caseId],
    queryFn: () => TasksAPI.getCaseProjects(caseId),
    enabled: !!caseId,
    staleTime: 1000 * 60 * 5,
    retry: 2
  });
};

export const useCreateCaseProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      caseId,
      projectData
    }: {
      caseId: string;
      projectData: { name: string; description?: string };
    }) => TasksAPI.createCaseProject(caseId, projectData),
    onSuccess: (_, { caseId }) => {
      queryClient.invalidateQueries({
        queryKey: [...QUERY_KEYS.caseProjects, caseId]
      });
    }
  });
};

// AI Integration hooks
export const useFoundationAITasks = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (aiTaskData: FoundationAITaskData) =>
      TasksAPI.processFoundationAITasks(aiTaskData),
    onSuccess: () => {
      // Invalidate relevant queries when AI tasks are processed
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.tasks] });
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.aiInsights] });
    }
  });
};

export const useAITaskInsights = (
  taskType: 'case_task' | 'project_task',
  taskId: string
) => {
  return useQuery({
    queryKey: [...QUERY_KEYS.aiInsights, taskType, taskId],
    queryFn: () => TasksAPI.getAITaskInsights(taskType, taskId),
    enabled: !!taskId,
    staleTime: 1000 * 60 * 10, // AI insights can be cached longer
    retry: 2
  });
};

// Chat integration hooks
export const useCreateTaskFromChat = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskData,
      caseId,
      projectId,
      chatMessageId
    }: {
      taskData: TaskCreateData;
      caseId?: string;
      projectId?: string;
      chatMessageId: string;
    }) => {
      const dataWithChat = {
        ...taskData,
        chat_message_id: chatMessageId,
        created_from_chat: true
      };

      if (caseId) {
        return TasksAPI.createCaseTaskFromChat(caseId, dataWithChat);
      } else if (projectId) {
        return TasksAPI.createProjectTask(projectId, dataWithChat);
      }
      throw new Error('Either caseId or projectId must be provided');
    },
    onSuccess: (_, { caseId, projectId }) => {
      if (caseId) {
        queryClient.invalidateQueries({ queryKey: ['cases', 'tasks', caseId] });
      }
      if (projectId) {
        queryClient.invalidateQueries({
          queryKey: [...QUERY_KEYS.tasks, 'project', projectId]
        });
      }
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.tasks] });
    }
  });
};

// Task operations
export const useUpdateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      taskData,
      taskType
    }: {
      taskId: string;
      taskData: Partial<TaskCreateData>;
      taskType: 'case_task' | 'project_task';
    }) => {
      return TasksAPI.updateTask(taskId, taskData, taskType);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.tasks] });
    }
  });
};

export const useCompleteTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      taskType,
      completed
    }: {
      taskId: string;
      taskType: 'case_task' | 'project_task';
      completed: boolean;
    }) => {
      return TasksAPI.completeTask(taskId, taskType, completed);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.tasks] });
    }
  });
};

export const useDeleteTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      taskType
    }: {
      taskId: string;
      taskType: 'case_task' | 'project_task';
    }) => {
      return TasksAPI.deleteTask(taskId, taskType);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.tasks] });
    }
  });
};
