import { API_CONFIG, getAuthHeaders, handleApiResponse } from '@/config/api';
import { Contact, ContactType } from '@/types/contacts';

const API_BASE_URL = API_CONFIG.CONTACTS_BASE_URL;

export default class ContactsAPI {
  static async getContacts(
    page: number,
    sortBy: string,
    typeFilter: string,
    archived: string,
    search: string
  ) {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_BASE_URL}?page=${page}&sortBy=${sortBy}&typeFilter=${typeFilter}&archived=${archived}&search=${search}`,
      {
        method: 'GET',
        headers
      }
    );
    return handleApiResponse<{ data: Contact[]; count: number }>(response);
  }

  static async getContactsBySearch(search: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/search?search=${search}`, {
      method: 'GET',
      headers
    });
    return handleApiResponse<Contact[]>(response);
  }

  static async getContactTypes() {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/types`, {
      method: 'GET',
      headers
    });
    return handleApiResponse<ContactType[]>(response);
  }

  static async createContact(contact: FormData) {
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
      body: contact
    });
    return handleApiResponse<Contact>(response);
  }

  static async updateContact(contactId: string, contact: FormData) {
    const headers = await getAuthHeaders();
    const uploadHeaders: Record<string, string> = {};
    if (typeof headers === 'object' && headers !== null) {
      Object.entries(headers).forEach(([key, value]) => {
        if (key.toLowerCase() !== 'content-type') {
          uploadHeaders[key] = value as string;
        }
      });
    }
    const response = await fetch(`${API_BASE_URL}/${contactId}`, {
      method: 'PUT',
      headers: uploadHeaders,
      body: contact
    });
    return handleApiResponse<Contact>(response);
  }

  static async deleteContact(contactId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/${contactId}`, {
      method: 'DELETE',
      headers
    });
    return handleApiResponse(response);
  }

  static async archiveContact(contactId: string) {
    const headers = await getAuthHeaders();
    const uploadHeaders: Record<string, string> = {};
    if (typeof headers === 'object' && headers !== null) {
      Object.entries(headers).forEach(([key, value]) => {
        if (key.toLowerCase() !== 'content-type') {
          uploadHeaders[key] = value as string;
        }
      });
    }
    const response = await fetch(`${API_BASE_URL}/${contactId}/archive`, {
      method: 'PUT',
      headers: uploadHeaders
    });
    return handleApiResponse(response);
  }
}
