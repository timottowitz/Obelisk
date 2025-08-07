import { apiClient } from '@/config/api';
import type {
  AITaskInsight,
  AITaskInsightWithDetails,
  ReviewAITaskRequest,
  BulkReviewRequest,
  AIInsightStats,
} from '@/types/ai-insights';

class AIInsightsService {
  /**
   * Get AI insights for a case
   */
  async getCaseInsights(caseId: string): Promise<AITaskInsightWithDetails[]> {
    const response = await apiClient.get(`/ai-insights/cases/${caseId}`);
    return response.data;
  }

  /**
   * Get AI insights for a project
   */
  async getProjectInsights(projectId: string): Promise<AITaskInsightWithDetails[]> {
    const response = await apiClient.get(`/ai-insights/projects/${projectId}`);
    return response.data;
  }

  /**
   * Get all pending AI insights for the organization
   */
  async getPendingInsights(): Promise<AITaskInsightWithDetails[]> {
    const response = await apiClient.get('/ai-insights/pending');
    return response.data;
  }

  /**
   * Get AI insight details by ID
   */
  async getInsightById(insightId: string): Promise<AITaskInsightWithDetails> {
    const response = await apiClient.get(`/ai-insights/${insightId}`);
    return response.data;
  }

  /**
   * Get AI insights for a specific task
   */
  async getTaskInsights(taskId: string): Promise<AITaskInsight[]> {
    const response = await apiClient.get(`/ai-insights/tasks/${taskId}`);
    return response.data;
  }

  /**
   * Review an AI task suggestion
   */
  async reviewInsight(request: ReviewAITaskRequest): Promise<{ task_id?: string }> {
    const response = await apiClient.post('/ai-insights/review', request);
    return response.data;
  }

  /**
   * Bulk review AI suggestions
   */
  async bulkReview(request: BulkReviewRequest): Promise<{ task_ids: string[] }> {
    const response = await apiClient.post('/ai-insights/bulk-review', request);
    return response.data;
  }

  /**
   * Get AI insights statistics
   */
  async getInsightStats(): Promise<AIInsightStats> {
    const response = await apiClient.get('/ai-insights/stats');
    return response.data;
  }

  /**
   * Accept an AI suggestion
   */
  async acceptSuggestion(insightId: string): Promise<{ task_id: string }> {
    return this.reviewInsight({
      insight_id: insightId,
      decision: 'accept',
    });
  }

  /**
   * Reject an AI suggestion
   */
  async rejectSuggestion(insightId: string, reason?: string): Promise<void> {
    await this.reviewInsight({
      insight_id: insightId,
      decision: 'reject',
      reason,
    });
  }
}

export const aiInsightsService = new AIInsightsService();