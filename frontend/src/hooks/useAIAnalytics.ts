import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { aiInsightsService } from '@/services/ai-insights';

interface AIAnalyticsData {
  acceptanceRate: number;
  rejectionRate: number;
  averageConfidence: number;
  totalSuggestions: number;
  acceptedCount: number;
  rejectedCount: number;
  pendingCount: number;
  bySource: {
    document: number;
    transcript: number;
    email: number;
    chat: number;
    manual: number;
  };
  byPriority: {
    urgent: number;
    high: number;
    medium: number;
    low: number;
  };
  timeToReview: {
    average: number;
    median: number;
  };
  topUsers: Array<{
    userId: string;
    name: string;
    acceptedCount: number;
    rejectedCount: number;
  }>;
}

/**
 * Track AI insight analytics events
 */
export function trackAIEvent(
  event: 'view' | 'accept' | 'reject' | 'bulk_accept' | 'bulk_reject',
  data: {
    insightId?: string;
    insightIds?: string[];
    confidence?: number;
    source?: string;
    priority?: string;
    timeToReview?: number;
  }
) {
  // Send to analytics service (e.g., Mixpanel, Segment, PostHog)
  if (typeof window !== 'undefined' && (window as any).analytics) {
    (window as any).analytics.track(`ai_insight_${event}`, {
      ...data,
      timestamp: new Date().toISOString(),
      userId: getCurrentUserId(),
      organizationId: getCurrentOrgId(),
    });
  }

  // Also log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[AI Analytics] ${event}:`, data);
  }

  // Store in local analytics cache for dashboard
  storeLocalAnalytics(event, data);
}

/**
 * Get AI analytics data
 */
export function useAIAnalytics(timeRange: '7d' | '30d' | '90d' = '30d') {
  return useQuery({
    queryKey: ['ai-analytics', timeRange],
    queryFn: async () => {
      // Get stats from API
      const stats = await aiInsightsService.getInsightStats();
      
      // Calculate analytics
      const total = stats.total || 1; // Avoid division by zero
      const accepted = stats.accepted || 0;
      const rejected = stats.rejected || 0;
      const pending = stats.pending || 0;
      
      const analytics: AIAnalyticsData = {
        acceptanceRate: total > 0 ? (accepted / (accepted + rejected)) * 100 : 0,
        rejectionRate: total > 0 ? (rejected / (accepted + rejected)) * 100 : 0,
        averageConfidence: stats.high_confidence ? (stats.high_confidence / total) * 100 : 0,
        totalSuggestions: total,
        acceptedCount: accepted,
        rejectedCount: rejected,
        pendingCount: pending,
        bySource: {
          document: stats.by_source?.document || 0,
          transcript: stats.by_source?.transcript || 0,
          email: stats.by_source?.email || 0,
          chat: stats.by_source?.chat || 0,
          manual: stats.by_source?.manual || 0,
        },
        byPriority: getLocalAnalyticsByPriority(),
        timeToReview: getTimeToReviewStats(),
        topUsers: getTopReviewers(),
      };
      
      return analytics;
    },
    refetchInterval: 60000, // Refresh every minute
  });
}

/**
 * Hook to track acceptance rate over time
 */
export function useAcceptanceRateTrend(days: number = 30) {
  return useQuery({
    queryKey: ['ai-acceptance-trend', days],
    queryFn: async () => {
      // This would fetch historical data from the API
      // For now, return mock trend data
      const trend = [];
      const now = new Date();
      
      for (let i = days; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        
        trend.push({
          date: date.toISOString().split('T')[0],
          acceptanceRate: 65 + Math.random() * 20,
          totalReviewed: Math.floor(Math.random() * 50),
        });
      }
      
      return trend;
    },
  });
}

/**
 * Hook to track AI suggestion performance metrics
 */
export function useAISuggestionMetrics() {
  useEffect(() => {
    // Track page view
    trackAIEvent('view', {});
    
    // Set up performance observer for interaction tracking
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'measure' && entry.name.startsWith('ai-review-')) {
            const timeToReview = entry.duration;
            const [, , action, insightId] = entry.name.split('-');
            
            trackAIEvent(action as any, {
              insightId,
              timeToReview,
            });
          }
        }
      });
      
      observer.observe({ entryTypes: ['measure'] });
      
      return () => observer.disconnect();
    }
  }, []);
}

// Helper functions

function getCurrentUserId(): string {
  // Get from auth context or session
  return 'current-user-id';
}

function getCurrentOrgId(): string {
  // Get from auth context or session
  return 'current-org-id';
}

function storeLocalAnalytics(event: string, data: any) {
  if (typeof window === 'undefined') return;
  
  const key = `ai_analytics_${new Date().toISOString().split('T')[0]}`;
  const existing = localStorage.getItem(key);
  const analytics = existing ? JSON.parse(existing) : {};
  
  if (!analytics[event]) {
    analytics[event] = [];
  }
  
  analytics[event].push({
    ...data,
    timestamp: Date.now(),
  });
  
  localStorage.setItem(key, JSON.stringify(analytics));
  
  // Clean up old data (keep last 90 days)
  cleanupOldAnalytics();
}

function cleanupOldAnalytics() {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 90);
  const cutoffKey = `ai_analytics_${cutoffDate.toISOString().split('T')[0]}`;
  
  Object.keys(localStorage)
    .filter(key => key.startsWith('ai_analytics_') && key < cutoffKey)
    .forEach(key => localStorage.removeItem(key));
}

function getLocalAnalyticsByPriority(): AIAnalyticsData['byPriority'] {
  // Aggregate from local storage
  const priorities = { urgent: 0, high: 0, medium: 0, low: 0 };
  
  Object.keys(localStorage)
    .filter(key => key.startsWith('ai_analytics_'))
    .forEach(key => {
      const data = JSON.parse(localStorage.getItem(key) || '{}');
      ['accept', 'reject'].forEach(event => {
        if (data[event]) {
          data[event].forEach((item: any) => {
            if (item.priority && priorities.hasOwnProperty(item.priority)) {
              priorities[item.priority as keyof typeof priorities]++;
            }
          });
        }
      });
    });
  
  return priorities;
}

function getTimeToReviewStats(): AIAnalyticsData['timeToReview'] {
  const times: number[] = [];
  
  Object.keys(localStorage)
    .filter(key => key.startsWith('ai_analytics_'))
    .forEach(key => {
      const data = JSON.parse(localStorage.getItem(key) || '{}');
      ['accept', 'reject'].forEach(event => {
        if (data[event]) {
          data[event].forEach((item: any) => {
            if (item.timeToReview) {
              times.push(item.timeToReview);
            }
          });
        }
      });
    });
  
  if (times.length === 0) {
    return { average: 0, median: 0 };
  }
  
  const average = times.reduce((a, b) => a + b, 0) / times.length;
  const sorted = times.sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  
  return { average, median };
}

function getTopReviewers(): AIAnalyticsData['topUsers'] {
  // This would be fetched from the API
  // For now, return mock data
  return [
    {
      userId: 'user-1',
      name: 'John Doe',
      acceptedCount: 45,
      rejectedCount: 12,
    },
    {
      userId: 'user-2',
      name: 'Jane Smith',
      acceptedCount: 38,
      rejectedCount: 8,
    },
    {
      userId: 'user-3',
      name: 'Bob Johnson',
      acceptedCount: 29,
      rejectedCount: 15,
    },
  ];
}

/**
 * Dashboard component hook for AI analytics
 */
export function useAIDashboard() {
  const analytics = useAIAnalytics('30d');
  const trend = useAcceptanceRateTrend(30);
  
  useAISuggestionMetrics();
  
  return {
    analytics: analytics.data,
    trend: trend.data,
    isLoading: analytics.isLoading || trend.isLoading,
    error: analytics.error || trend.error,
  };
}