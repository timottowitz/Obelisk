export interface ExpenseType {
  id: string;
  name: string;
}

export interface InitialDocument {
  id: string;
  name: string;
}

export interface Expense {
  id: string;
  case_id: string;
  name: string;
  expense_type_id: string;
  amount: number;
  payee_id: string;
  payee_name: string;
  type: string;
  invoice_number: string;
  invoice_date: string;
  expense_description: string;
}
