export interface FolderTemplate {
  id: string;
  name: string;
  sort_order: number;
}

export interface CaseType {
  id: string;
  name: string;
  icon: string;
  color: string;
  display_name: string;
  description: string;
  is_active: boolean;
  folder_templates: FolderTemplate[];
  created_at: string;
  updated_at: string;
}

export interface Case {
  id: string;
  case_number: string;
  status: string;
  full_name: string;
  phone: string;
  email: string;
  case_type: string;
  case_types: CaseType;
  special_notes: string;
  filing_fee: string;
  claimant: string;
  respondent: string;
  case_manager: string;
  adr_process: string;
  applicable_rules: string;
  track: string;
  claim_amount: string;
  hearing_locale: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  name: string;
  description: string;
  status: string;
  due_date: string;
  created_at: string;
  updated_at: string;
}

export interface CaseEvent {
  id: string;
  case_id: string;
  event_type: string;
  method: string;
  status: string;
  location: string;
  address: string;
  date: string;
  time: string;
  created_at: string;
  updated_at: string;
}
