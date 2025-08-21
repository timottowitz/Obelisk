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
  expense_type: string;
  amount: number;
  payee_id: string;
  payee: {
    id: string;
    full_name: string;
    phones: {
      id: string;
      number: string;
      phoneLabel: {
        icon: string;
        name: string;
      };
    }[];
    emails: {
      id: string;
      address: string;
    }[];
    addresses: {
      id: string;
      fullAddress: string;
      addressLabel: string;
    }[];
  } | null;
  attachment: {
    name: string;
  } | null;
  copy_of_check: {
    name: string;
  } | null;
  status: string;
  type: string;
  invoice_number: string | null;
  invoice_date: string | null;
  due_date: string | null;
  description: string | null;
  memo: string | null;
  notes: string | null;
  create_checking_quickbooks: boolean;
  create_billing_item: string | null;
  last_update_from_quickbooks: string | null;
  bill_no: string | null;
  date_of_check: string | null;
  check_number: string | null;
  copy_of_check_id: string | null;
  notify_admin_of_check_payment: string | null;
  qb_sync_status?: 'not_synced' | 'synced' | 'error';
  qb_id?: string;
  qb_entity_type?: 'Purchase' | 'Bill' | 'Invoice' | 'Expense';
  qb_sync_error?: string;
  qb_last_sync_at?: string;
  created_at: string;
  updated_at: string;
}
