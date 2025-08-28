/**
 * React hook for managing suggestion feedback and analytics
 */

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';

export interface SuggestionAnalytics {
  totalSuggestions: number;
  acceptanceRate: number;
  avgConfidenceAccepted: number;
  rank1Accuracy: number;
  topReasons: string[];
  periodDays: number;
  trends: {
    daily: Array<{ date: string; suggestions: number; accepted: number; acceptanceRate: number }>;
    byReason: Array<{ reason: string; total: number; accepted: number; acceptanceRate: number; avgConfidence: number }>;
    byConfidence: Array<{ range: string; total: number; accepted: number; acceptanceRate: number }>;
    byRank: Array<{ rank: number; total: number; accepted: number; acceptanceRate: number }>;
    summary: {
      totalSuggestions: number;
      withFeedback: number;
      avgConfidence: number;
      mostCommonReason: { reason: string; count: number };
    };
  };
}

export interface LearningInsight {
  type: 'improvement' | 'performance' | 'pattern' | 'recommendation';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  actionable: boolean;
  data?: any;
  generatedAt: string;
}

export interface UseSuggestionFeedbackOptions {
  autoFetch?: boolean;
  periodDays?: number;
  onAnalyticsUpdated?: (analytics: SuggestionAnalytics) => void;
}

export interface UseSuggestionFeedbackReturn {
  analytics: SuggestionAnalytics | null;
  insights: LearningInsight[];
  isLoading: boolean;
  error: string | null;
  
  // Feedback actions
  submitFeedback: (suggestionId: string, action: 'accepted' | 'rejected' | 'ignored', feedback?: string, context?: any) => Promise<boolean>;
  
  // Analytics actions
  fetchAnalytics: (periodDays?: number, includeInsights?: boolean, includeTrends?: boolean) => Promise<void>;
  trainModel: () => Promise<boolean>;
  exportData: (periodDays?: number) => Promise<any>;
  generateReport: (params?: any) => Promise<any>;
  
  // Utility
  refreshAnalytics: () => Promise<void>;
  clearAnalytics: () => void;
}

export function useSuggestionFeedback(
  options: UseSuggestionFeedbackOptions = {}
): UseSuggestionFeedbackReturn {
  const { user } = useUser();
  const [analytics, setAnalytics] = useState<SuggestionAnalytics | null>(null);
  const [insights, setInsights] = useState<LearningInsight[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { periodDays = 30 } = options;

  // Submit feedback on a suggestion
  const submitFeedback = useCallback(async (
    suggestionId: string,
    action: 'accepted' | 'rejected' | 'ignored',
    feedback?: string,
    context?: any
  ): Promise<boolean> => {
    if (!user) {
      setError('User not authenticated');
      return false;
    }

    try {
      const response = await fetch('/api/suggestions/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          suggestionId,
          action,
          feedback,
          userComment: feedback,
          context,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit feedback');
      }

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Failed to submit feedback:', err);
      return false;
    }
  }, [user]);

  // Fetch analytics data
  const fetchAnalytics = useCallback(async (
    fetchPeriodDays = periodDays,
    includeInsights = true,
    includeTrends = true
  ) => {
    if (!user) {
      setError('User not authenticated');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        periodDays: fetchPeriodDays.toString(),
        insights: includeInsights.toString(),
        trends: includeTrends.toString(),
      });

      const response = await fetch(`/api/suggestions/analytics?${params}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch analytics');
      }

      const result = await response.json();
      const data = result.data;

      setAnalytics(data.analytics);
      
      if (data.insights) {
        setInsights(data.insights);
      }

      options.onAnalyticsUpdated?.(data.analytics);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Failed to fetch analytics:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user, periodDays, options]);

  // Train the suggestion model
  const trainModel = useCallback(async (): Promise<boolean> => {
    if (!user) {
      setError('User not authenticated');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/suggestions/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'train_model',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to train model');
      }

      const result = await response.json();
      return result.data.trained;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Failed to train model:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Export learning data
  const exportData = useCallback(async (exportPeriodDays = 90) => {
    if (!user) {
      setError('User not authenticated');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/suggestions/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'export_data',
          params: { periodDays: exportPeriodDays },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to export data');
      }

      const result = await response.json();
      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Failed to export data:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Generate analytics report
  const generateReport = useCallback(async (params = {}) => {
    if (!user) {
      setError('User not authenticated');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/suggestions/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'generate_report',
          params,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate report');
      }

      const result = await response.json();
      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Failed to generate report:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Refresh analytics
  const refreshAnalytics = useCallback(async () => {
    await fetchAnalytics();
  }, [fetchAnalytics]);

  // Clear analytics
  const clearAnalytics = useCallback(() => {
    setAnalytics(null);
    setInsights([]);
    setError(null);
  }, []);

  // Auto-fetch analytics on mount or when options change
  useEffect(() => {
    if (options.autoFetch && user) {
      fetchAnalytics();
    }
  }, [options.autoFetch, user, fetchAnalytics]);

  return {
    analytics,
    insights,
    isLoading,
    error,
    submitFeedback,
    fetchAnalytics,
    trainModel,
    exportData,
    generateReport,
    refreshAnalytics,
    clearAnalytics,
  };
}

/**
 * Hook for managing individual suggestion feedback
 */
export interface UseSuggestionItemOptions {
  suggestionId: string;
  onFeedbackSubmitted?: (action: string, success: boolean) => void;
}

export interface UseSuggestionItemReturn {
  isSubmitting: boolean;
  lastAction: string | null;
  error: string | null;
  
  accept: (context?: any) => Promise<boolean>;
  reject: (feedback?: string) => Promise<boolean>;
  ignore: () => Promise<boolean>;
  viewCase: () => void;
  findSimilar: () => void;
}

export function useSuggestionItem(
  options: UseSuggestionItemOptions
): UseSuggestionItemReturn {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { submitFeedback } = useSuggestionFeedback();

  const performAction = useCallback(async (
    action: 'accepted' | 'rejected' | 'ignored',
    feedback?: string,
    context?: any
  ) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const success = await submitFeedback(
        options.suggestionId,
        action,
        feedback,
        context
      );

      if (success) {
        setLastAction(action);
      }

      options.onFeedbackSubmitted?.(action, success);
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [submitFeedback, options]);

  const accept = useCallback(async (context?: any) => {
    return performAction('accepted', undefined, context);
  }, [performAction]);

  const reject = useCallback(async (feedback?: string) => {
    return performAction('rejected', feedback);
  }, [performAction]);

  const ignore = useCallback(async () => {
    return performAction('ignored');
  }, [performAction]);

  const viewCase = useCallback(() => {
    // This would typically navigate to the case details
    // Implementation depends on your routing setup
    console.log('View case clicked for suggestion:', options.suggestionId);
  }, [options.suggestionId]);

  const findSimilar = useCallback(() => {
    // This would typically open a search for similar cases
    // Implementation depends on your search functionality
    console.log('Find similar clicked for suggestion:', options.suggestionId);
  }, [options.suggestionId]);

  return {
    isSubmitting,
    lastAction,
    error,
    accept,
    reject,
    ignore,
    viewCase,
    findSimilar,
  };
}

/**
 * Hook for suggestion analytics dashboard
 */
export interface UseSuggestionDashboardOptions {
  refreshInterval?: number; // milliseconds
  autoRefresh?: boolean;
}

export interface UseSuggestionDashboardReturn {
  analytics: SuggestionAnalytics | null;
  insights: LearningInsight[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  
  refresh: () => Promise<void>;
  setRefreshInterval: (interval: number) => void;
  toggleAutoRefresh: (enabled: boolean) => void;
}

export function useSuggestionDashboard(
  options: UseSuggestionDashboardOptions = {}
): UseSuggestionDashboardReturn {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshInterval, setRefreshIntervalState] = useState(options.refreshInterval || 300000); // 5 minutes
  const [autoRefresh, setAutoRefresh] = useState(options.autoRefresh || false);

  const feedbackHook = useSuggestionFeedback({
    autoFetch: true,
    onAnalyticsUpdated: () => setLastUpdated(new Date()),
  });

  // Auto-refresh timer
  useEffect(() => {
    if (!autoRefresh) return;

    const timer = setInterval(() => {
      feedbackHook.refreshAnalytics();
    }, refreshInterval);

    return () => clearInterval(timer);
  }, [autoRefresh, refreshInterval, feedbackHook]);

  const refresh = useCallback(async () => {
    await feedbackHook.refreshAnalytics();
    setLastUpdated(new Date());
  }, [feedbackHook]);

  const setRefreshInterval = useCallback((interval: number) => {
    setRefreshIntervalState(interval);
  }, []);

  const toggleAutoRefresh = useCallback((enabled: boolean) => {
    setAutoRefresh(enabled);
  }, []);

  return {
    analytics: feedbackHook.analytics,
    insights: feedbackHook.insights,
    isLoading: feedbackHook.isLoading,
    error: feedbackHook.error,
    lastUpdated,
    refresh,
    setRefreshInterval,
    toggleAutoRefresh,
  };
}