import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AiInsightsService } from '@/services/ai-insights';
import type {
  AITaskInsightWithDetails,
  ReviewAITaskRequest,
  BulkReviewRequest,
} from '@/types/ai-insights';
import { toast } from 'sonner';
import { trackAIEvent } from './useAIAnalytics';

/**
 * Hook to get AI insights for a case
 */
export function useAIInsightsForCase(caseId?: string) {
  return useQuery({
    queryKey: ['ai-insights', 'case', caseId],
    queryFn: () => AiInsightsService.getCaseInsights(caseId!),
    enabled: !!caseId,
  });
}

/**
 * Hook to get AI insights for a project
 */
export function useAIInsightsForProject(projectId?: string) {
  return useQuery({
    queryKey: ['ai-insights', 'project', projectId],
    queryFn: () => AiInsightsService.getProjectInsights(projectId!),
    enabled: !!projectId,
  });
}

/**
 * Hook to get all pending AI insights
 */
export function usePendingAIInsights() {
  return useQuery({
    queryKey: ['ai-insights', 'pending'],
    queryFn: () => AiInsightsService.getPendingInsights(),
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

/**
 * Hook to get specific AI insight details
 */
export function useAIInsightDetails(insightId?: string) {
  return useQuery({
    queryKey: ['ai-insights', 'detail', insightId],
    queryFn: () => AiInsightsService.getInsightById(insightId!),
    enabled: !!insightId,
  });
}

/**
 * Hook to get AI insights for a specific task
 */
export function useTaskInsights(taskId?: string) {
  return useQuery({
    queryKey: ['ai-insights', 'task', taskId],
    queryFn: () => AiInsightsService.getTaskInsights(taskId!),
    enabled: !!taskId,
  });
}

/**
 * Hook to get AI insights statistics
 */
export function useAIInsightStats() {
  return useQuery({
    queryKey: ['ai-insights', 'stats'],
    queryFn: () => AiInsightsService.getInsightStats(),
    refetchInterval: 60000, // Refetch every minute
  });
}

/**
 * Hook to review an AI task suggestion
 */
export function useReviewAITask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: ReviewAITaskRequest) =>
      AiInsightsService.reviewInsight(request),
    onSuccess: (data, variables) => {
      // Track analytics
      trackAIEvent(variables.decision === 'accept' ? 'accept' : 'reject', {
        insightId: variables.insight_id,
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['ai-insights'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });

      // Show success message
      const action = variables.decision === 'accept' ? 'accepted' : 'rejected';
      toast.success(`AI suggestion ${action} successfully`);

      // If task was created, we could navigate to it
      if (data.task_id && variables.decision === 'accept') {
        toast.success('New task created from AI suggestion');
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to review AI suggestion');
    },
  });
}

/**
 * Hook to bulk review AI suggestions
 */
export function useBulkReviewAITasks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: BulkReviewRequest) =>
      AiInsightsService.bulkReview(request),
    onSuccess: (data, variables) => {
      // Track analytics
      trackAIEvent(
        variables.decision === 'accept' ? 'bulk_accept' : 'bulk_reject',
        {
          insightIds: variables.insight_ids,
        }
      );
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['ai-insights'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });

      // Show success message
      const action = variables.decision === 'accept' ? 'accepted' : 'rejected';
      const count = variables.insight_ids.length;
      toast.success(`${count} AI suggestion${count > 1 ? 's' : ''} ${action} successfully`);

      if (data.task_ids?.length && variables.decision === 'accept') {
        toast.success(`${data.task_ids.length} new tasks created`);
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to bulk review AI suggestions');
    },
  });
}

/**
 * Hook to accept an AI suggestion
 */
export function useAcceptAISuggestion() {
  const reviewMutation = useReviewAITask();

  return useMutation({
    mutationFn: (insightId: string) =>
      reviewMutation.mutateAsync({
        insight_id: insightId,
        decision: 'accept',
      }),
    onSuccess: () => {
      toast.success('AI suggestion accepted and task created');
    },
  });
}

/**
 * Hook to reject an AI suggestion
 */
export function useRejectAISuggestion() {
  const reviewMutation = useReviewAITask();

  return useMutation({
    mutationFn: ({ insightId, reason }: { insightId: string; reason?: string }) =>
      reviewMutation.mutateAsync({
        insight_id: insightId,
        decision: 'reject',
        reason,
      }),
    onSuccess: () => {
      toast.success('AI suggestion rejected');
    },
  });
}

/**
 * Helper hook to get pending insight count for badge display
 */
export function usePendingInsightCount() {
  const { data: stats } = useAIInsightStats();
  return stats?.pending || 0;
}

/**
 * Helper hook to determine if a task has AI insights
 */
export function useTaskHasAIInsights(taskId?: string) {
  const { data: insights } = useTaskInsights(taskId);
  return insights && insights.length > 0;
}

/**
 * Combined hook for case/project insights based on context
 */
export function useAIInsights(type: 'case' | 'project', id?: string) {
  const caseQuery = useAIInsightsForCase(type === 'case' ? id : undefined);
  const projectQuery = useAIInsightsForProject(type === 'project' ? id : undefined);

  return type === 'case' ? caseQuery : projectQuery;
}