import { API_CONFIG, getAuthHeaders, handleApiResponse } from '@/config/api';
import type {
  AITaskInsight,
  AITaskInsightWithDetails,
  ReviewAITaskRequest,
  BulkReviewRequest,
  AIInsightStats
} from '@/types/ai-insights';

const API_BASE_URL = API_CONFIG.AI_INSIGHTS_BASE_URL;

class AIInsightsService {
  /**
   * Get AI insights for a case
   */
  async getCaseInsights(caseId: string): Promise<AITaskInsightWithDetails[]> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/cases/${caseId}`, {
      method: 'GET',
      headers
    });
    return handleApiResponse<AITaskInsightWithDetails[]>(response);
  }

  /**
   * Get AI insights for a project
   */
  async getProjectInsights(
    projectId: string
  ): Promise<AITaskInsightWithDetails[]> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
      method: 'GET',
      headers
    });
    return handleApiResponse<AITaskInsightWithDetails[]>(response);
  }

  /**
   * Get all pending AI insights for the organization
   */
  async getPendingInsights(): Promise<AITaskInsightWithDetails[]> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/pending`, {
      method: 'GET',
      headers
    });
    return handleApiResponse<AITaskInsightWithDetails[]>(response);
  }

  /**
   * Get AI insight details by ID
   */
  async getInsightById(insightId: string): Promise<AITaskInsightWithDetails> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/${insightId}`, {
      method: 'GET',
      headers
    });
    return handleApiResponse<AITaskInsightWithDetails>(response);
  }

  /**
   * Get AI insights for a specific task
   */
  async getTaskInsights(taskId: string): Promise<AITaskInsight[]> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
      method: 'GET',
      headers
    });
    return handleApiResponse<AITaskInsight[]>(response);
  }

  /**
   * Review an AI task suggestion
   */
  async reviewInsight(
    request: ReviewAITaskRequest
  ): Promise<{ task_id?: string }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/review`, {
      method: 'POST',
      headers,
      body: JSON.stringify(request)
    });
    return handleApiResponse<{ task_id?: string }>(response);
  }

  /**
   * Bulk review AI suggestions
   */
  async bulkReview(
    request: BulkReviewRequest
  ): Promise<{ task_ids: string[] }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/bulk-review`, {
      method: 'POST',
      headers,
      body: JSON.stringify(request)
    });
    return handleApiResponse<{ task_ids: string[] }>(response);
  }

  /**
   * Get AI insights statistics
   */
  async getInsightStats(): Promise<AIInsightStats> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/stats`, {
      method: 'GET',
      headers
    });
    return handleApiResponse<AIInsightStats>(response);
  }

  /**
   * Accept an AI suggestion
   */
  async acceptSuggestion(insightId: string): Promise<{ task_id?: string }> {
    return this.reviewInsight({
      insight_id: insightId,
      decision: 'accept'
    });
  }

  /**
   * Reject an AI suggestion
   */
  async rejectSuggestion(insightId: string, reason?: string): Promise<void> {
    await this.reviewInsight({
      insight_id: insightId,
      decision: 'reject',
      reason
    });
  }
}

export const AiInsightsService = new AIInsightsService();
