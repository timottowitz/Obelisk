import { API_CONFIG } from '@/config/api';
import { getAuthHeaders } from '@/config/api';
import { handleApiResponse } from '@/config/api';
import { Expense, ExpenseType, InitialDocument } from '@/types/expenses';

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

  static async createExpense(caseId: string, payload: FormData) {
    const headers = await getAuthHeaders();
    const uploadHeaders: Record<string, string> = {};
    if (typeof headers === 'object' && headers !== null) {
      Object.entries(headers).forEach(([key, value]) => {
        if (key.toLowerCase() !== 'content-type') {
          uploadHeaders[key] = value as string;
        }
      });
    }
    const response = await fetch(`${BASE_URL}/cases/${caseId}`, {
      method: 'POST',
      headers: uploadHeaders,
      body: payload
    });
    return handleApiResponse<Expense>(response);
  }
}
