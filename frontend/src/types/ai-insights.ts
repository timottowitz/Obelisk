export type AIInsightStatus = 'pending' | 'accepted' | 'rejected' | 'auto_applied';
export type AISourceType = 'document' | 'transcript' | 'email' | 'chat' | 'manual';
export type ReviewDecision = 'accepted' | 'rejected' | 'modified';

export interface ExtractedEntity {
  type: 'person' | 'organization' | 'date' | 'deadline' | 'location' | 'document' | 'amount';
  value: string;
  confidence: number;
  context?: string;
}

export interface AITaskInsight {
  id: string;
  task_id?: string;
  case_id?: string;
  project_id?: string;
  
  // AI Generated Data
  suggested_title: string;
  suggested_description?: string;
  suggested_priority: 'low' | 'medium' | 'high' | 'urgent';
  suggested_due_date?: string;
  suggested_assignee_id?: string;
  
  // AI Metadata
  confidence_score: number;
  extracted_entities: ExtractedEntity[];
  ai_reasoning?: string;
  source_type?: AISourceType;
  source_reference?: string;
  
  // Review Status
  status: AIInsightStatus;
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  
  // Audit
  created_at: string;
  created_by?: string;
  updated_at: string;
}

export interface AITaskInsightReview {
  id: string;
  insight_id: string;
  user_id: string;
  decision: ReviewDecision;
  modifications?: Record<string, any>;
  reason?: string;
  created_at: string;
}

export interface AITaskInsightWithDetails extends AITaskInsight {
  task?: {
    id: string;
    title: string;
    status: string;
  };
  case?: {
    id: string;
    case_number: string;
    title: string;
  };
  project?: {
    id: string;
    name: string;
  };
  assignee?: {
    id: string;
    name: string;
    email: string;
  };
  reviewer?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface ReviewAITaskRequest {
  insight_id: string;
  decision: 'accept' | 'reject';
  reason?: string;
  modifications?: Partial<{
    title: string;
    description: string;
    priority: string;
    due_date: string;
    assignee_id: string;
  }>;
}

export interface BulkReviewRequest {
  insight_ids: string[];
  decision: 'accept' | 'reject';
  reason?: string;
}

export interface AIInsightStats {
  total: number;
  pending: number;
  accepted: number;
  rejected: number;
  high_confidence: number;
  by_source: Record<AISourceType, number>;
}