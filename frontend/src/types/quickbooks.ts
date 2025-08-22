export interface AccountMapping {
  cost_type_id: string;
  cost_type_name: string;
  qb_account_id?: string;
  qb_account_name?: string;
  qb_class_id?: string;
  qb_class_name?: string;
}

export interface QuickBooksAccount {
  Id: string;
  Name: string;
  AccountType: string;
  AccountSubType?: string;
  Active: boolean;
}

export interface QuickBooksClass {
  Id: string;
  Name: string;
  Active: boolean;
}
