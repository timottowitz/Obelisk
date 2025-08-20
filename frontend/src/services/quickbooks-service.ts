import { API_CONFIG, getAuthHeaders, handleApiResponse } from '@/config/api';

// export interface QuickBooksStatus {
//   connected: boolean;
//   realm_id?: string;
//   is_sandbox?: boolean;
//   expired?: boolean;
//   expires_at?: string;
// }

// export interface QuickBooksAccount {
//   id: string;
//   name: string;
//   account_type: string;
//   account_sub_type?: string;
//   active: boolean;
// }

// export interface QuickBooksClass {
//   id: string;
//   name: string;
//   active: boolean;
//   parent_ref?: { value: string };
// }

export interface AccountMapping {
  cost_type: string;
  qb_account_id?: string;
  qb_account_name?: string;
  qb_class_id?: string;
  qb_class_name?: string;
}

// export interface FinanceSyncResult {
//   success: boolean;
//   qb_id?: string;
//   entity_type?: string;
//   error?: string;
// }

// export interface CustomerSyncResult {
//   success: boolean;
//   qb_customer_id?: string;
//   qb_sub_customer_id?: string;
//   error?: string;
// }

export const quickbooksService = {
  getAuthUrl: async () => {
    const response = await fetch(
      `${API_CONFIG.QUICKBOOKS_CONNECT_BASE_URL}/connect`,
      {
        method: 'GET',
        headers: await getAuthHeaders()
      }
    );
    return handleApiResponse<{ authUrl: string }>(response);
  },
  getStatus: async () => {
    const response = await fetch(
      `${API_CONFIG.QUICKBOOKS_CONNECT_BASE_URL}/status`,
      {
        method: 'GET',
        headers: await getAuthHeaders()
      }
    );
    return handleApiResponse(response);
  },
  refreshToken: async () => {
    const response = await fetch(
      `${API_CONFIG.QUICKBOOKS_CONNECT_BASE_URL}/refresh`,
      {
        method: 'POST',
        headers: await getAuthHeaders()
      }
    );
    return handleApiResponse(response);
  },
  disconnect: async () => {
    const response = await fetch(
      `${API_CONFIG.QUICKBOOKS_CONNECT_BASE_URL}/disconnect`,
      {
        method: 'DELETE',
        headers: await getAuthHeaders()
      }
    );
    return handleApiResponse(response);
  },
  syncExpense: async (expenseId: string) => {
    const response = await fetch(
      `${API_CONFIG.QUICKBOOKS_SYNC_BASE_URL}/expense/${expenseId}`,
      {
        method: 'POST',
        headers: await getAuthHeaders()
      }
    );
    return handleApiResponse<{
      success: boolean;
      qb_id: string;
      entity_type: string;
    }>(response);
  },
  syncExpenseBatch: async (expenseIds: string[]) => {
    const response = await fetch(
      `${API_CONFIG.QUICKBOOKS_SYNC_BASE_URL}/expense/batch`,
      {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ expenseIds })
      }
    );
    return handleApiResponse(response);
  },
  syncCustomer: async (caseId: string) => {
    const response = await fetch(
      `${API_CONFIG.QUICKBOOKS_SYNC_BASE_URL}/customer/${caseId}`,
      {
        method: 'POST',
        headers: await getAuthHeaders()
      }
    );
    return handleApiResponse(response);
  },
  getAccounts: async () => {
    const response = await fetch(
      `${API_CONFIG.QUICKBOOKS_SYNC_BASE_URL}/accounts`,
      {
        method: 'GET',
        headers: await getAuthHeaders()
      }
    );
    return handleApiResponse(response);
  },
  getClasses: async () => {
    const response = await fetch(
      `${API_CONFIG.QUICKBOOKS_SYNC_BASE_URL}/classes`,
      {
        method: 'GET',
        headers: await getAuthHeaders()
      }
    );
    return handleApiResponse(response);
  },
  saveMapping: async (mapping: AccountMapping) => {
    const response = await fetch(
      `${API_CONFIG.QUICKBOOKS_SYNC_BASE_URL}/mapping`,
      {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify(mapping)
      }
    );
    return handleApiResponse(response);
  }
};
