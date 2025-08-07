export type CaseAccess = 'admin_only' | 'public';

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
  case_tasks_count: number;
  documents_count: number;
  access: CaseAccess;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  name: string;
  description: string;
  status: string;
  due_date: string;
  priority: 'high' | 'medium' | 'low';
  assignee: string;
  assignee_id?: string;
  assigner_id?: string;
  category: string;
  category_id?: string;
  is_completed: boolean;
  completed_at?: string;
  completed_by_id?: string;
  // AI Integration Fields
  ai_generated: boolean;
  foundation_ai_task_id?: string;
  ai_confidence_score?: number;
  ai_suggested_assignee?: string;
  ai_reasoning?: string;
  source_document_id?: string;
  extracted_entities?: Record<string, any>;
  // Chat Integration
  chat_message_id?: string;
  created_from_chat: boolean;
  created_at: string;
  updated_at: string;
}

export interface CaseProject {
  id: string;
  case_id: string;
  name: string;
  description?: string;
  status: 'active' | 'completed' | 'on_hold';
  created_by_id: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'completed' | 'on_hold';
  created_by_id: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectTask {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  status: string;
  priority: 'high' | 'medium' | 'low';
  due_date?: string;
  assignee_id?: string;
  assigner_id?: string;
  category_id?: string;
  is_completed: boolean;
  completed_at?: string;
  completed_by_id?: string;
  // AI Integration Fields
  ai_generated: boolean;
  foundation_ai_task_id?: string;
  ai_confidence_score?: number;
  ai_suggested_assignee?: string;
  ai_reasoning?: string;
  // Chat Integration
  chat_message_id?: string;
  created_from_chat: boolean;
  created_at: string;
  updated_at: string;
  // Populated fields
  assignee?: string;
  assigner?: string;
  category?: string;
  project?: Project;
}

export interface AITaskInsight {
  id: string;
  task_type: 'case_task' | 'project_task';
  task_id: string;
  insight_type: 'deadline_risk' | 'workload_alert' | 'priority_suggestion' | 'assignment_recommendation';
  confidence_score: number;
  insight_data: Record<string, any>;
  foundation_ai_processed_at?: string;
  created_at: string;
}

export interface TaskCreateData {
  name: string;
  description?: string;
  priority: 'high' | 'medium' | 'low';
  due_date?: string;
  assignee_id?: string;
  case_project_id?: string; // For case tasks
  project_id?: string; // For general project tasks
  category_id?: string;
  // AI fields (when accepting Foundation AI suggestions)
  ai_generated?: boolean;
  foundation_ai_task_id?: string;
  ai_confidence_score?: number;
  ai_reasoning?: string;
  source_document_id?: string;
  extracted_entities?: Record<string, any>;
  // Chat integration
  chat_message_id?: string;
  created_from_chat?: boolean;
}

export interface TaskFilterOptions {
  view: 'my_tasks' | 'assigned_by_me' | 'all_tasks';
  status?: string;
  priority?: 'high' | 'medium' | 'low';
  assignee_id?: string;
  ai_generated?: boolean;
  completed?: boolean;
}

export interface FoundationAITaskData {
  foundation_ai_task_id: string;
  suggested_tasks: {
    name: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    suggested_assignee_id?: string;
    due_date?: string;
    category_suggestion?: string;
    confidence_score: number;
    reasoning: string;
    extracted_entities: Record<string, any>;
  }[];
  source_document_id: string;
  processed_at: string;
}

export interface CaseEvent {
  id: string;
  case_number: string;
  event_type: string;
  description: string;
  date: string;
  time: string;
  created_at: string;
  updated_at: string;
}
