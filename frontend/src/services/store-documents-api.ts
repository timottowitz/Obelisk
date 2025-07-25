import { API_CONFIG, getAuthHeaders, handleApiResponse } from '@/config/api';

const API_BASE_URL = API_CONFIG.STORAGE_BASE_URL;

export default class StoreDocumentsAPI {
  static async uploadDocument(file: File, folderId: string) {
    const headers = await getAuthHeaders();

    // Create new headers without Content-Type for FormData
    const uploadHeaders: Record<string, string> = {};
    if (typeof headers === 'object' && headers !== null) {
      Object.entries(headers).forEach(([key, value]) => {
        if (key.toLowerCase() !== 'content-type') {
          uploadHeaders[key] = value as string;
        }
      });
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('folderId', folderId === 'root' ? '' : folderId);

    const response = await fetch(`${API_BASE_URL}/upload-direct`, {
      method: 'POST',
      headers: uploadHeaders,
      body: formData
    });

    return handleApiResponse(response);
  }

  static async getDocuments() {
    const headers = await getAuthHeaders();

    const uploadHeaders: Record<string, string> = {};
    if (typeof headers === 'object' && headers !== null) {
      Object.entries(headers).forEach(([key, value]) => {
        if (key.toLowerCase() !== 'content-type') {
          uploadHeaders[key] = value as string;
        }
      });
    }
    const response = await fetch(`${API_BASE_URL}/list`, {
      method: 'GET',
      headers: uploadHeaders
    });
    return handleApiResponse(response);
  }

  static async getFolders() {
    const headers = await getAuthHeaders();
    const uploadHeaders: Record<string, string> = {};
    if (typeof headers === 'object' && headers !== null) {
      Object.entries(headers).forEach(([key, value]) => {
        if (key.toLowerCase() !== 'content-type') {
          uploadHeaders[key] = value as string;
        }
      });
    }
    const response = await fetch(`${API_BASE_URL}/folders/tree`, {
      method: 'GET',
      headers: uploadHeaders
    });
    return handleApiResponse(response);
  }

  static async createFolder(folderName: string, parentId: string) {
    const headers = await getAuthHeaders();
    const uploadHeaders: Record<string, string> = {};
    if (typeof headers === 'object' && headers !== null) {
      Object.entries(headers).forEach(([key, value]) => {
        if (key.toLowerCase() !== 'content-type') {
          uploadHeaders[key] = value as string;
        }
      });
    }
    const response = await fetch(`${API_BASE_URL}/folders`, {
      method: 'POST',
      headers: uploadHeaders,
      body: JSON.stringify({
        folderName: folderName,
        folderId: parentId === 'root' ? null : parentId
      })
    });
    return handleApiResponse(response);
  }

  static async downloadFile(fileId: string) {
    const headers = await getAuthHeaders();
    const uploadHeaders: Record<string, string> = {};
    if (typeof headers === 'object' && headers !== null) {
      Object.entries(headers).forEach(([key, value]) => {
        if (key.toLowerCase() !== 'content-type') {
          uploadHeaders[key] = value as string;
        }
      });
    }

    const response = await fetch(`${API_BASE_URL}/download/${fileId}`, {
      method: 'GET',
      headers: uploadHeaders
    });
    return handleApiResponse(response);
  }

  static async deleteFile(fileId: string) {
    const headers = await getAuthHeaders();
    const uploadHeaders: Record<string, string> = {};
    if (typeof headers === 'object' && headers !== null) {
      Object.entries(headers).forEach(([key, value]) => {
        if (key.toLowerCase() !== 'content-type') {
          uploadHeaders[key] = value as string;
        }
      });
    }
    const response = await fetch(`${API_BASE_URL}/files/${fileId}`, {
      method: 'DELETE',
      headers: uploadHeaders
    });
    return handleApiResponse(response);
  }

  static async deleteFolder(folderId: string) {
    const headers = await getAuthHeaders();
    const uploadHeaders: Record<string, string> = {};
    if (typeof headers === 'object' && headers !== null) {
      Object.entries(headers).forEach(([key, value]) => {
        if (key.toLowerCase() !== 'content-type') {
          uploadHeaders[key] = value as string;
        }
      });
    }
    const response = await fetch(`${API_BASE_URL}/folders/${folderId}`, {
      method: 'DELETE',
      headers: uploadHeaders
    });
    return handleApiResponse(response);
  }

  static async createFolderCase(folderCaseName: string) {
    const headers = await getAuthHeaders();
    const uploadHeaders: Record<string, string> = {};
    if (typeof headers === 'object' && headers !== null) {
      Object.entries(headers).forEach(([key, value]) => {
        if (key.toLowerCase() !== 'content-type') {
          uploadHeaders[key] = value as string;
        }
      });
    }
    const response = await fetch(`${API_BASE_URL}/folder-cases`, {
      method: 'POST',
      headers: uploadHeaders,
      body: JSON.stringify({ folderCaseName })
    });   

    return handleApiResponse(response);
  }

  static async getFolderCases() {
    const headers = await getAuthHeaders();
    const uploadHeaders: Record<string, string> = {};
    if (typeof headers === 'object' && headers !== null) {
      Object.entries(headers).forEach(([key, value]) => {
        if (key.toLowerCase() !== 'content-type') {
          uploadHeaders[key] = value as string;
        }
      });
    }
    const response = await fetch(`${API_BASE_URL}/folder-cases`, {
      method: 'GET',
      headers: uploadHeaders
    });
    return handleApiResponse(response);
  }
}
