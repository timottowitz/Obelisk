import { API_CONFIG, getAuthHeaders, handleApiResponse } from '@/config/api';
import { Task } from '@/types/cases';

const API_BASE_URL = API_CONFIG.TASKS_BASE_URL;

export default class TasksAPI {
  static async getTasks(page: number) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}?page=${page}`, {
      method: 'GET',
      headers
    });
    return handleApiResponse<{ data: Task[]; count: number }>(response);
  }
}
