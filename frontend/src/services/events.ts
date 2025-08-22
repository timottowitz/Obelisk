import { API_CONFIG, getAuthHeaders, handleApiResponse } from '@/config/api';
import { CaseEvent } from '@/types/cases';

const API_BASE_URL = API_CONFIG.EVENTS_BASE_URL;

export default class EventsAPI {
  static async getEvents(page: number) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}?page=${page}`, {
      method: 'GET',
      headers
    });
    return handleApiResponse<{ data: CaseEvent[]; count: number }>(response);
  }

  static async getCaseEvents(caseId: string, page: number) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/cases/${caseId}?page=${page}`, {
      method: 'GET',
      headers
    });
    return handleApiResponse<{ data: CaseEvent[]; count: number }>(response);
  }
}
