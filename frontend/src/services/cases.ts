import { API_CONFIG, getAuthHeaders, handleApiResponse } from '@/config/api';

const API_BASE_URL = API_CONFIG.CASES_BASE_URL;

export interface Case {
  full_name: string;
  phone: string;
  email: string;
  case_type_id: string;
  special_notes: string;
  filing_fee: string;
  case_number: string;
}

export default class CasesAPI {
  static async getCaseTypes() {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/types`, {
      method: 'GET',
      headers
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
    return handleApiResponse(response);
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
    return handleApiResponse(response);
  }
 }
