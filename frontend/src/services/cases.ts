import { API_CONFIG, getAuthHeaders, handleApiResponse } from '@/config/api';
import { Case, CaseEvent, CaseType, Task } from '@/types/cases';

// Utility function to create upload headers
function createUploadHeaders(headers: HeadersInit): Record<string, string> {
  const uploadHeaders: Record<string, string> = {};
  if (typeof headers === 'object' && headers !== null) {
    Object.entries(headers).forEach(([key, value]) => {
      if (key.toLowerCase() !== 'content-type') {
        uploadHeaders[key] = value as string;
      }
    });
  }
  return uploadHeaders;
}

const API_BASE_URL = API_CONFIG.CASES_BASE_URL;
export default class CasesAPI {
  static async getCaseTypes() {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/types`, {
      method: 'GET',
      headers
    });
    return handleApiResponse(response);
  }

  static async getCaseType(caseTypeId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/types/${caseTypeId}`, {
      method: 'GET',
      headers
    });
    return handleApiResponse<CaseType>(response);
  }

  static async createCaseType(formData: any) {
    const headers = await getAuthHeaders();
    const uploadHeaders = createUploadHeaders(headers);

    const response = await fetch(`${API_BASE_URL}/types`, {
      method: 'POST',
      headers: uploadHeaders,
      body: JSON.stringify(formData)
    });
    return handleApiResponse(response);
  }

  static async createCase(caseData: Case) {
    const headers = await getAuthHeaders();
    const uploadHeaders = createUploadHeaders(headers);

    const response = await fetch(`${API_BASE_URL}`, {
      method: 'POST',
      headers: uploadHeaders,
      body: JSON.stringify(caseData)
    });
    return handleApiResponse(response);
  }

  static async updateCase(caseId: string, caseData: Case) {
    const headers = await getAuthHeaders();
    const uploadHeaders = createUploadHeaders(headers);

    const response = await fetch(`${API_BASE_URL}/${caseId}`, {
      method: 'PUT',
      headers: uploadHeaders,
      body: JSON.stringify(caseData)
    });
    return handleApiResponse(response);
  }

  static async getCases(type: string, page: number, search?: string, statusFilter?: string, sort?: string) {
    const headers = await getAuthHeaders();
    const uploadHeaders = createUploadHeaders(headers);

    const params = new URLSearchParams();
    params.append('page', page.toString());
    if (type) params.append('type', type);
    if (search) params.append('search', search);
    if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
    if (sort) params.append('sort', sort);

    const response = await fetch(`${API_BASE_URL}?${params.toString()}`, {
      method: 'GET',
      headers: uploadHeaders
    });
    return handleApiResponse<{
      cases: Case[];
      total: number;
      limit: number;
      offset: number;
    }>(response);
  }

  static async deleteCase(caseId: string) {
    const headers = await getAuthHeaders();
    const uploadHeaders = createUploadHeaders(headers);

    const response = await fetch(`${API_BASE_URL}/${caseId}`, {
      method: 'DELETE',
      headers: uploadHeaders
    });
    return handleApiResponse(response);
  }

  static async getCase(caseId: string) {
    const headers = await getAuthHeaders();
    const uploadHeaders = createUploadHeaders(headers);

    const response = await fetch(`${API_BASE_URL}/${caseId}`, {
      method: 'GET',
      headers: uploadHeaders
    });
    return handleApiResponse<Case>(response);
  }

  static async getCaseTasks(caseId: string) {
    const headers = await getAuthHeaders();
    const uploadHeaders = createUploadHeaders(headers);

    const response = await fetch(`${API_BASE_URL}/${caseId}/tasks`, {
      method: 'GET',
      headers: uploadHeaders
    });
    return handleApiResponse<Task[]>(response);
  }

  static async createCaseTask(caseId: string, formData: any) {
    const headers = await getAuthHeaders();
    const uploadHeaders = createUploadHeaders(headers);

    const response = await fetch(`${API_BASE_URL}/${caseId}/tasks`, {
      method: 'POST',
      headers: uploadHeaders,
      body: JSON.stringify(formData)
    });
    return handleApiResponse<Task>(response);
  }

  static async deleteCaseTask(caseId: string, taskId: string) {
    const headers = await getAuthHeaders();
    const uploadHeaders = createUploadHeaders(headers);

    const response = await fetch(`${API_BASE_URL}/${caseId}/tasks/${taskId}`, {
      method: 'DELETE',
      headers: uploadHeaders
    });
    return handleApiResponse(response);
  }

  static async updateCaseTask(caseId: string, taskId: string, formData: any) {
    const headers = await getAuthHeaders();
    const uploadHeaders = createUploadHeaders(headers);

    const response = await fetch(`${API_BASE_URL}/${caseId}/tasks/${taskId}`, {
      method: 'PUT',
      headers: uploadHeaders,
      body: JSON.stringify(formData)
    });
    return handleApiResponse(response);
  }

  static async updateCaseType(caseTypeId: string, caseType: any) {
    const headers = await getAuthHeaders();
    const uploadHeaders = createUploadHeaders(headers);

    const response = await fetch(`${API_BASE_URL}/types/${caseTypeId}`, {
      method: 'PUT',
      headers: uploadHeaders,
      body: JSON.stringify(caseType)
    });
    return handleApiResponse(response);
  }

  static async deleteCaseType(caseTypeId: string) {
    const headers = await getAuthHeaders();
    const uploadHeaders = createUploadHeaders(headers);

    const response = await fetch(`${API_BASE_URL}/types/${caseTypeId}`, {
      method: 'DELETE',
      headers: uploadHeaders
    });
    return handleApiResponse(response);
  }

  static async updateFolderTemplates(caseTypeId: string, formData: any) {
    const headers = await getAuthHeaders();
    const uploadHeaders = createUploadHeaders(headers);

    const response = await fetch(
      `${API_BASE_URL}/types/${caseTypeId}/templates`,
      {
        method: 'POST',
        headers: uploadHeaders,
        body: JSON.stringify(formData)
      }
    );
    return handleApiResponse(response);
  }

  static async deleteFolderTemplate(templateId: string) {
    const headers = await getAuthHeaders();
    const uploadHeaders = createUploadHeaders(headers);

    const response = await fetch(`${API_BASE_URL}/templates/${templateId}`, {
      method: 'DELETE',
      headers: uploadHeaders
    });
    return handleApiResponse(response);
  }

  static async getCaseEvents(caseId: string) {
    const headers = await getAuthHeaders();
    const uploadHeaders = createUploadHeaders(headers);

    const response = await fetch(`${API_BASE_URL}/${caseId}/events`, {
      method: 'GET',
      headers: uploadHeaders
    });
    return handleApiResponse<CaseEvent[]>(response);
  }
}
