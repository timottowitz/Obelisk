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

  static async getExpenses(
    caseId: string,
    filterBy: string,
    filterValue: string,
    sortBy: string,
    sortDir: string,
    page: number
  ) {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${BASE_URL}/cases/${caseId}?filterBy=${filterBy}&filterValue=${filterValue}&sortBy=${sortBy}&sortDir=${sortDir}&page=${page}`,
      {
        method: 'GET',
        headers
      }
    );
    return handleApiResponse<{
      data: Expense[];
      total: number;
      limit: number;
      page: number;
      totalAmount: number;
    }>(response);
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

  static async updateExpense(caseId: string, expenseId: string, payload: FormData) {
    const headers = await getAuthHeaders();
    const uploadHeaders: Record<string, string> = {};
    if (typeof headers === 'object' && headers !== null) {
      Object.entries(headers).forEach(([key, value]) => {
        if (key.toLowerCase() !== 'content-type') {
          uploadHeaders[key] = value as string;
        }
      });
    }
    const response = await fetch(`${BASE_URL}/cases/${caseId}/${expenseId}`, {
      method: 'PUT',
      headers: uploadHeaders,
      body: payload
    });
    return handleApiResponse<Expense>(response);
  }
}
