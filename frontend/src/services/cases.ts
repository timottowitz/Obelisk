import { API_CONFIG, getAuthHeaders, handleApiResponse } from '@/config/api';
import { Case, Task } from '@/types/cases';

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

  static async createCaseType(formData: any) {
    const headers = await getAuthHeaders();

    const uploadHeaders: Record<string, string> = {};
    if (typeof headers === 'object' && headers !== null) {
      Object.entries(headers).forEach(([key, value]) => {
        if (key.toLowerCase() !== 'content-type') {
          uploadHeaders[key] = value as string;
        }
      });
    }
    const response = await fetch(`${API_BASE_URL}/types`, {
      method: 'POST',
      headers: uploadHeaders,
      body: JSON.stringify(formData)
    });
    return handleApiResponse(response);
  }

  static async createCase(caseData: Case) {
    const headers = await getAuthHeaders();

    const uploadHeaders: Record<string, string> = {};
    if (typeof headers === 'object' && headers !== null) {
      Object.entries(headers).forEach(([key, value]) => {
        if (key.toLowerCase() !== 'content-type') {
          uploadHeaders[key] = value as string;
        }
      });
    }
    const response = await fetch(`${API_BASE_URL}`, {
      method: 'POST',
      headers: uploadHeaders,
      body: JSON.stringify(caseData)
    });
    return handleApiResponse(response);
  }

  static async updateCase(caseId: string, caseData: Case) {
    const headers = await getAuthHeaders();

    const uploadHeaders: Record<string, string> = {};
    if (typeof headers === 'object' && headers !== null) {
      Object.entries(headers).forEach(([key, value]) => {
        if (key.toLowerCase() !== 'content-type') {
          uploadHeaders[key] = value as string;
        }
      });
    }

    const response = await fetch(`${API_BASE_URL}/${caseId}`, {
      method: 'PUT',
      headers: uploadHeaders,
      body: JSON.stringify(caseData)
    });
    return handleApiResponse(response);
  }

  static async getCases() {
    const headers = await getAuthHeaders();

    const uploadHeaders: Record<string, string> = {};
    if (typeof headers === 'object' && headers !== null) {
      Object.entries(headers).forEach(([key, value]) => {
        if (key.toLowerCase() !== 'content-type') {
          uploadHeaders[key] = value as string;
        }
      });
    }

    const response = await fetch(`${API_BASE_URL}`, {
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

    const uploadHeaders: Record<string, string> = {};
    if (typeof headers === 'object' && headers !== null) {
      Object.entries(headers).forEach(([key, value]) => {
        if (key.toLowerCase() !== 'content-type') {
          uploadHeaders[key] = value as string;
        }
      });
    }

    const response = await fetch(`${API_BASE_URL}/${caseId}`, {
      method: 'DELETE',
      headers: uploadHeaders
    });
    return handleApiResponse(response);
  }

  static async getCase(caseId: string) {
    const headers = await getAuthHeaders();

    const uploadHeaders: Record<string, string> = {};
    if (typeof headers === 'object' && headers !== null) {
      Object.entries(headers).forEach(([key, value]) => {
        if (key.toLowerCase() !== 'content-type') {
          uploadHeaders[key] = value as string;
        }
      });
    }
    const response = await fetch(`${API_BASE_URL}/${caseId}`, {
      method: 'GET',
      headers: uploadHeaders
    });
    return handleApiResponse<Case>(response);
  }

  static async getCaseTasks(caseId: string) {
    const headers = await getAuthHeaders();

    const uploadHeaders: Record<string, string> = {};
    if (typeof headers === 'object' && headers !== null) {
      Object.entries(headers).forEach(([key, value]) => {
        if (key.toLowerCase() !== 'content-type') {
          uploadHeaders[key] = value as string;
        }
      });
    }

    const response = await fetch(`${API_BASE_URL}/${caseId}/tasks`, {
      method: 'GET',
      headers: uploadHeaders
    });
    return handleApiResponse<Task[]>(response);
  }

  static async createCaseTask(caseId: string, formData: any) {
    const headers = await getAuthHeaders();

    const uploadHeaders: Record<string, string> = {};
    if (typeof headers === 'object' && headers !== null) {
      Object.entries(headers).forEach(([key, value]) => {
        if (key.toLowerCase() !== 'content-type') {
          uploadHeaders[key] = value as string;
        }
      });
    }

    const response = await fetch(`${API_BASE_URL}/${caseId}/tasks`, {
      method: 'POST',
      headers: uploadHeaders,
      body: JSON.stringify(formData)
    });
    return handleApiResponse<Task>(response);
  }

  static async updateCaseType(caseTypeId: string, caseType: any) {
    const headers = await getAuthHeaders();

    const uploadHeaders: Record<string, string> = {};
    if (typeof headers === 'object' && headers !== null) {
      Object.entries(headers).forEach(([key, value]) => {
        if (key.toLowerCase() !== 'content-type') {
          uploadHeaders[key] = value as string;
        }
      });
    }
    const response = await fetch(`${API_BASE_URL}/types/${caseTypeId}`, {
      method: 'PUT',
      headers: uploadHeaders,
      body: JSON.stringify(caseType)
    });
    return handleApiResponse(response);
  }

  static async deleteCaseType(caseTypeId: string) {
    const headers = await getAuthHeaders();

    const uploadHeaders: Record<string, string> = {};
    if (typeof headers === 'object' && headers !== null) {
      Object.entries(headers).forEach(([key, value]) => {
        if (key.toLowerCase() !== 'content-type') {
          uploadHeaders[key] = value as string;
        }
      });
    }
    const response = await fetch(`${API_BASE_URL}/types/${caseTypeId}`, {
      method: 'DELETE',
      headers: uploadHeaders
    });
    return handleApiResponse(response);
  }
}
