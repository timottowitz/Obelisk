import { API_CONFIG } from '@/config/api';
import { getAuthHeaders } from '@/config/api';
import { handleApiResponse } from '@/config/api';
import { ExpenseType, InitialDocument } from '@/types/expenses';

const BASE_URL = API_CONFIG.EXPENSES_BASE_URL;

export class ExpensesService {
  static async getExpenseTypes() {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/types`, {
      method: 'GET',
      headers
    });
    return handleApiResponse<ExpenseType[]>(response);
  }

  static async getInitialDocuments(caseId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${BASE_URL}/cases/${caseId}/initial-documents`,
      {
        method: 'GET',
        headers
      }
    );
    return handleApiResponse<InitialDocument[]>(response);
  }
}
