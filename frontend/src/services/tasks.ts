import { API_CONFIG, getAuthHeaders, handleApiResponse } from '@/config/api';
import {
  Project,
  Task,
  TaskFilterOptions,
  TaskCreateData,
  FoundationAITaskData,
  CaseProject
} from '@/types/cases';

const API_BASE_URL = API_CONFIG.TASKS_BASE_URL;

export default class TasksAPI {
  // General tasks
  static async getCaseTasks(caseId: string, page: number, search: string, status: string, priority: string, view: string) {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams();
    params.append('page', page.toString());
    
    if (status) params.append('status', status);
    if (priority) params.append('priority', priority);
    if (search) params.append('search', search);
    if (view) params.append('view', view);
    
    const response = await fetch(`${API_BASE_URL}/cases/${caseId}?${params.toString()}`, {
      method: 'GET',
      headers
    });
    return handleApiResponse<{ data: Task[]; count: number }>(response);
  }

  // Projects management
  static async getProjects() {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/projects`, {
      method: 'GET',
      headers
    });
    return handleApiResponse<Project[]>(response);
  }

  static async createProject(projectData: {
    name: string;
    description?: string;
  }) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/projects`, {
      method: 'POST',
      headers,
      body: JSON.stringify(projectData)
    });
    return handleApiResponse<Project>(response);
  }

  // Project tasks
  static async getProjectTasks(projectId: string, filters?: TaskFilterOptions) {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.assignee_id) params.append('assignee_id', filters.assignee_id);

    const response = await fetch(
      `${API_BASE_URL}/projects/${projectId}/tasks?${params}`,
      {
        method: 'GET',
        headers
      }
    );
    return handleApiResponse<Task[]>(response);
  }

  static async createProjectTask(projectId: string, taskData: TaskCreateData) {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_BASE_URL}/projects/${projectId}/tasks`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(taskData)
      }
    );
    return handleApiResponse<Task>(response);
  }

  // Case projects
  static async getCaseProjects(caseId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/cases/${caseId}/projects`, {
      method: 'GET',
      headers
    });
    return handleApiResponse<CaseProject[]>(response);
  }

  static async createCaseProject(
    caseId: string,
    projectData: { name: string; description?: string }
  ) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/cases/${caseId}/projects`, {
      method: 'POST',
      headers,
      body: JSON.stringify(projectData)
    });
    return handleApiResponse<Project>(response);
  }

  static async createCaseTask(caseId: string, taskData: TaskCreateData) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/cases/${caseId}/tasks`, {
      method: 'POST',
      headers,
      body: JSON.stringify(taskData)
    });
    return handleApiResponse<Task>(response);
  }

  // AI Integration
  static async processFoundationAITasks(aiTaskData: FoundationAITaskData) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/ai/foundation-tasks`, {
      method: 'POST',
      headers,
      body: JSON.stringify(aiTaskData)
    });
    return handleApiResponse<{ tasks: Task[]; insights: any[] }>(response);
  }

  static async getAITaskInsights(
    taskType: 'case_task' | 'project_task',
    taskId: string
  ) {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_CONFIG.AI_INSIGHTS_BASE_URL}/tasks/${taskId}`,
      {
        method: 'GET',
        headers
      }
    );
    return handleApiResponse<any[]>(response);
  }

  // Chat integration
  static async createCaseTaskFromChat(
    caseId: string,
    taskData: TaskCreateData & {
      chat_message_id: string;
      created_from_chat: boolean;
    }
  ) {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_BASE_URL}/cases/${caseId}/tasks/from-chat`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(taskData)
      }
    );
    return handleApiResponse<Task>(response);
  }

  // Task operations
  static async updateTask(
    taskId: string,
    taskData: Partial<TaskCreateData>,
    taskType: 'case_task' | 'project_task'
  ) {
    const headers = await getAuthHeaders();
    const endpoint = taskType === 'case_task' ? 'case-tasks' : 'project-tasks';
    const response = await fetch(`${API_BASE_URL}/${endpoint}/${taskId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(taskData)
    });
    return handleApiResponse<Task>(response);
  }

  static async completeTask(
    taskId: string,
    taskType: 'case_task' | 'project_task',
    completed: boolean
  ) {
    const headers = await getAuthHeaders();
    const endpoint = taskType === 'case_task' ? 'case-tasks' : 'project-tasks';
    const response = await fetch(
      `${API_BASE_URL}/${endpoint}/${taskId}/complete`,
      {
        method: 'PUT',
        headers,
        body: JSON.stringify({ completed })
      }
    );
    return handleApiResponse<Task>(response);
  }

  static async deleteTask(
    taskId: string,
    taskType: 'case_task' | 'project_task'
  ) {
    const headers = await getAuthHeaders();
    const endpoint = taskType === 'case_task' ? 'case-tasks' : 'project-tasks';
    const response = await fetch(`${API_BASE_URL}/${endpoint}/${taskId}`, {
      method: 'DELETE',
      headers
    });
    return handleApiResponse<void>(response);
  }

  static async getTeamMembers() {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/team-members`, {
      method: 'GET',
      headers
    });
    return handleApiResponse<
      {
        id: string;
        full_name: string;
        email: string;
        role: string;
      }[]
    >(response);
  }

  static async getAITaskSuggestions(caseId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_CONFIG.AI_INSIGHTS_BASE_URL}/ai-task-suggester`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ case_id: caseId }),
    });
    return handleApiResponse<{ name: string; description: string }[]>(response);
  }
}
