import { API_CONFIG, getAuthHeaders, handleApiResponse } from '@/config/api';
import { AccountMapping, QuickBooksAccount, QuickBooksClass } from '@/types/quickbooks';

export const QuickbooksService = {
  getAuthUrl: async () => {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_CONFIG.QUICKBOOKS_CONNECT_BASE_URL}/connect`,
      {
        method: 'GET',
        headers
      }
    );
    return handleApiResponse<{ authUrl: string }>(response);
  },

  getCallbackUrl: async (
    code: string,
    state: string,
    realmId: string,
    error: string
  ) => {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_CONFIG.QUICKBOOKS_CONNECT_BASE_URL}/callback?code=${code}&state=${state}&realmId=${realmId}&error=${error}`,
      {
        method: 'GET',
        headers
      }
    );
    return handleApiResponse(response);
  },
  getStatus: async () => {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_CONFIG.QUICKBOOKS_CONNECT_BASE_URL}/status`,
      {
        method: 'GET',
        headers
      }
    );
    return handleApiResponse(response);
  },
  refreshToken: async () => {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_CONFIG.QUICKBOOKS_CONNECT_BASE_URL}/refresh`,
      {
        method: 'POST',
        headers
      }
    );
    return handleApiResponse(response);
  },
  disconnect: async () => {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_CONFIG.QUICKBOOKS_CONNECT_BASE_URL}/disconnect`,
      {
        method: 'DELETE',
        headers
      }
    );
    return handleApiResponse(response);
  },
  syncExpense: async (expenseId: string) => {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_CONFIG.QUICKBOOKS_SYNC_BASE_URL}/expense/${expenseId}`,
      {
        method: 'POST',
        headers
      }
    );
    return handleApiResponse<{
      success: boolean;
      qb_id: string;
      entity_type: string;
    }>(response);
  },
  syncExpenseBatch: async (expenseIds: string[]) => {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_CONFIG.QUICKBOOKS_SYNC_BASE_URL}/expense/batch`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ expenseIds })
      }
    );
    return handleApiResponse(response);
  },
  syncCustomer: async (caseId: string) => {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_CONFIG.QUICKBOOKS_SYNC_BASE_URL}/customer/${caseId}`,
      {
        method: 'POST',
        headers
      }
    );
    return handleApiResponse(response);
  },
  getAccounts: async () => {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_CONFIG.QUICKBOOKS_SYNC_BASE_URL}/accounts`,
      {
        method: 'GET',
        headers
      }
    );
    return handleApiResponse<{ accounts: QuickBooksAccount[] }>(response);
  },
  getClasses: async () => {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_CONFIG.QUICKBOOKS_SYNC_BASE_URL}/classes`,
      {
        method: 'GET',
        headers
      }
    );
    return handleApiResponse<{ classes: QuickBooksClass[] }>(response);
  },
  saveMapping: async (mapping: AccountMapping) => {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_CONFIG.QUICKBOOKS_SYNC_BASE_URL}/save-mapping`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(mapping)
      }
    );
    return handleApiResponse(response);
  }
};
