/**
 * Suggestion Learning System
 * Tracks user feedback and improves suggestion algorithms over time
 */

import { createClient } from '@/lib/supabase';

export interface LearningEvent {
  id: string;
  tenantId: string;
  userId: string;
  emailAnalysisId: string;
  eventType: LearningEventType;
  eventData: any;
  timestamp: string;
}

export type LearningEventType =
  | 'suggestion_generated'
  | 'suggestion_accepted'
  | 'suggestion_rejected'
  | 'suggestion_ignored'
  | 'manual_assignment'
  | 'assignment_corrected';

export interface UserBehaviorPattern {
  userId: string;
  tenantId: string;
  patterns: {
    preferredCaseTypes: string[];
    frequentClients: string[];
    assignmentTiming: {
      avgTimeToAssign: number; // minutes
      preferredTimes: Array<{ hour: number; frequency: number }>;
    };
    suggestionPreferences: {
      preferredConfidenceThreshold: number;
      preferredSuggestionReasons: string[];
      rejectedReasons: string[];
    };
    searchBehavior: {
      commonSearchTerms: string[];
      searchPatterns: string[];
    };
  };
  lastUpdated: string;
}

export interface TenantLearningModel {
  tenantId: string;
  modelVersion: string;
  features: {
    clientNameMatching: {
      weight: number;
      threshold: number;
      fuzzyMatchEnabled: boolean;
    };
    contentSimilarity: {
      weight: number;
      vectorSimilarityThreshold: number;
      topicMatchingWeight: number;
    };
    patternMatching: {
      weight: number;
      recentActivityDays: number;
      userSpecificWeight: number;
    };
    entityMatching: {
      weight: number;
      organizationWeight: number;
      legalTermWeight: number;
      locationWeight: number;
    };
  };
  performanceMetrics: {
    overallAccuracy: number;
    rank1Accuracy: number;
    avgConfidenceAccepted: number;
    avgConfidenceRejected: number;
    totalFeedbackEvents: number;
  };
  lastTrained: string;
  createdAt: string;
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

/**
 * Suggestion Learning Service
 */
export class SuggestionLearningService {
  private supabase: ReturnType<typeof createClient>;

  constructor() {
    this.supabase = createClient();
  }

  /**
   * Track a learning event
   */
  async trackLearningEvent(
    eventType: LearningEventType,
    emailAnalysisId: string,
    eventData: any
  ): Promise<void> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: userTenant } = await this.supabase
        .from('user_tenant_access')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();
      
      if (!userTenant) throw new Error('User tenant not found');

      // Store learning event
      await this.supabase
        .from('learning_events')
        .insert({
          tenant_id: userTenant.tenant_id,
          user_id: user.id,
          email_analysis_id: emailAnalysisId,
          event_type: eventType,
          event_data: eventData,
          timestamp: new Date().toISOString(),
        });

      // Trigger pattern update if needed
      if (this.shouldUpdatePatterns(eventType)) {
        await this.updateUserBehaviorPatterns(user.id, userTenant.tenant_id);
      }

    } catch (error) {
      console.error('Failed to track learning event:', error);
      // Don't throw - learning is optional
    }
  }

  /**
   * Get user behavior patterns
   */
  async getUserBehaviorPatterns(userId?: string): Promise<UserBehaviorPattern | null> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      const targetUserId = userId || user?.id;
      
      if (!targetUserId) throw new Error('User not authenticated');

      const { data: userTenant } = await this.supabase
        .from('user_tenant_access')
        .select('tenant_id')
        .eq('user_id', targetUserId)
        .single();
      
      if (!userTenant) throw new Error('User tenant not found');

      // Get existing patterns or create default
      const { data: patterns } = await this.supabase
        .from('user_behavior_patterns')
        .select('*')
        .eq('tenant_id', userTenant.tenant_id)
        .eq('user_id', targetUserId)
        .single();

      if (patterns) {
        return patterns as UserBehaviorPattern;
      }

      // Generate patterns from historical data
      return await this.generateUserBehaviorPatterns(targetUserId, userTenant.tenant_id);

    } catch (error) {
      console.error('Failed to get user behavior patterns:', error);
      return null;
    }
  }

  /**
   * Generate user behavior patterns from historical data
   */
  private async generateUserBehaviorPatterns(userId: string, tenantId: string): Promise<UserBehaviorPattern> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Get recent assignments
    const { data: assignments } = await this.supabase
      .from('suggestion_learning_data')
      .select(`
        assigned_case_id,
        assignment_timestamp,
        suggestion_accepted,
        suggestion_rank_accepted,
        cases!inner(client_name, practice_area)
      `)
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .gte('assignment_timestamp', thirtyDaysAgo);

    // Get suggestion feedback
    const { data: feedback } = await this.supabase
      .from('case_suggestions')
      .select(`
        suggestion_reason,
        user_action,
        confidence_score,
        created_at
      `)
      .eq('tenant_id', tenantId)
      .not('user_action', 'is', null);

    const patterns: UserBehaviorPattern = {
      userId,
      tenantId,
      patterns: {
        preferredCaseTypes: this.extractPreferredCaseTypes(assignments || []),
        frequentClients: this.extractFrequentClients(assignments || []),
        assignmentTiming: this.analyzeAssignmentTiming(assignments || []),
        suggestionPreferences: this.analyzeSuggestionPreferences(feedback || []),
        searchBehavior: {
          commonSearchTerms: [],
          searchPatterns: [],
        },
      },
      lastUpdated: new Date().toISOString(),
    };

    // Store the generated patterns
    await this.supabase
      .from('user_behavior_patterns')
      .upsert({
        tenant_id: tenantId,
        user_id: userId,
        patterns: patterns.patterns,
        last_updated: patterns.lastUpdated,
      });

    return patterns;
  }

  /**
   * Extract preferred case types from assignments
   */
  private extractPreferredCaseTypes(assignments: any[]): string[] {
    const caseTypeCounts = new Map<string, number>();
    
    assignments.forEach(assignment => {
      const practiceArea = assignment.cases?.practice_area;
      if (practiceArea) {
        caseTypeCounts.set(practiceArea, (caseTypeCounts.get(practiceArea) || 0) + 1);
      }
    });

    return Array.from(caseTypeCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([type]) => type);
  }

  /**
   * Extract frequent clients from assignments
   */
  private extractFrequentClients(assignments: any[]): string[] {
    const clientCounts = new Map<string, number>();
    
    assignments.forEach(assignment => {
      const clientName = assignment.cases?.client_name;
      if (clientName) {
        clientCounts.set(clientName, (clientCounts.get(clientName) || 0) + 1);
      }
    });

    return Array.from(clientCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([client]) => client);
  }

  /**
   * Analyze assignment timing patterns
   */
  private analyzeAssignmentTiming(assignments: any[]) {
    if (assignments.length === 0) {
      return {
        avgTimeToAssign: 60, // Default 1 hour
        preferredTimes: [],
      };
    }

    const hours = assignments.map(assignment => {
      const date = new Date(assignment.assignment_timestamp);
      return date.getHours();
    });

    const hourCounts = new Map<number, number>();
    hours.forEach(hour => {
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    });

    const preferredTimes = Array.from(hourCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([hour, frequency]) => ({ hour, frequency }));

    return {
      avgTimeToAssign: 60, // This would need more detailed tracking
      preferredTimes,
    };
  }

  /**
   * Analyze suggestion preferences from feedback
   */
  private analyzeSuggestionPreferences(feedback: any[]) {
    const acceptedSuggestions = feedback.filter(f => f.user_action === 'accepted');
    const rejectedSuggestions = feedback.filter(f => f.user_action === 'rejected');

    const avgAcceptedConfidence = acceptedSuggestions.length > 0
      ? acceptedSuggestions.reduce((sum, f) => sum + f.confidence_score, 0) / acceptedSuggestions.length
      : 70;

    const preferredReasons = this.getMostCommonReasons(acceptedSuggestions);
    const rejectedReasons = this.getMostCommonReasons(rejectedSuggestions);

    return {
      preferredConfidenceThreshold: Math.max(50, avgAcceptedConfidence - 10),
      preferredSuggestionReasons: preferredReasons,
      rejectedReasons: rejectedReasons,
    };
  }

  /**
   * Get most common suggestion reasons
   */
  private getMostCommonReasons(suggestions: any[]): string[] {
    const reasonCounts = new Map<string, number>();
    
    suggestions.forEach(suggestion => {
      const reason = suggestion.suggestion_reason;
      reasonCounts.set(reason, (reasonCounts.get(reason) || 0) + 1);
    });

    return Array.from(reasonCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([reason]) => reason);
  }

  /**
   * Update user behavior patterns
   */
  private async updateUserBehaviorPatterns(userId: string, tenantId: string): Promise<void> {
    try {
      await this.generateUserBehaviorPatterns(userId, tenantId);
    } catch (error) {
      console.error('Failed to update user behavior patterns:', error);
    }
  }

  /**
   * Check if pattern update is needed for event type
   */
  private shouldUpdatePatterns(eventType: LearningEventType): boolean {
    const updateTriggers: LearningEventType[] = [
      'suggestion_accepted',
      'suggestion_rejected',
      'manual_assignment',
    ];
    
    return updateTriggers.includes(eventType);
  }

  /**
   * Get tenant learning model
   */
  async getTenantLearningModel(): Promise<TenantLearningModel | null> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: userTenant } = await this.supabase
        .from('user_tenant_access')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();
      
      if (!userTenant) throw new Error('User tenant not found');

      const { data: model } = await this.supabase
        .from('tenant_learning_models')
        .select('*')
        .eq('tenant_id', userTenant.tenant_id)
        .single();

      return model as TenantLearningModel | null;

    } catch (error) {
      console.error('Failed to get tenant learning model:', error);
      return null;
    }
  }

  /**
   * Train tenant learning model
   */
  async trainTenantModel(): Promise<boolean> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: userTenant } = await this.supabase
        .from('user_tenant_access')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();
      
      if (!userTenant) throw new Error('User tenant not found');

      // Get recent feedback data for training
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      
      const { data: feedbackData } = await this.supabase
        .from('case_suggestions')
        .select(`
          suggestion_reason,
          confidence_score,
          user_action,
          match_criteria,
          created_at
        `)
        .eq('tenant_id', userTenant.tenant_id)
        .gte('created_at', thirtyDaysAgo)
        .not('user_action', 'is', null);

      if (!feedbackData || feedbackData.length < 10) {
        console.log('Insufficient feedback data for training');
        return false;
      }

      // Calculate new model parameters
      const newModel = this.calculateModelParameters(feedbackData);

      // Store the updated model
      await this.supabase
        .from('tenant_learning_models')
        .upsert({
          tenant_id: userTenant.tenant_id,
          model_version: `v${Date.now()}`,
          features: newModel.features,
          performance_metrics: newModel.performanceMetrics,
          last_trained: new Date().toISOString(),
        });

      return true;

    } catch (error) {
      console.error('Failed to train tenant model:', error);
      return false;
    }
  }

  /**
   * Calculate model parameters from feedback data
   */
  private calculateModelParameters(feedbackData: any[]): Pick<TenantLearningModel, 'features' | 'performanceMetrics'> {
    const acceptedFeedback = feedbackData.filter(f => f.user_action === 'accepted');
    const rejectedFeedback = feedbackData.filter(f => f.user_action === 'rejected');

    // Calculate performance metrics
    const overallAccuracy = acceptedFeedback.length / feedbackData.length;
    const avgConfidenceAccepted = acceptedFeedback.length > 0
      ? acceptedFeedback.reduce((sum, f) => sum + f.confidence_score, 0) / acceptedFeedback.length
      : 0;
    const avgConfidenceRejected = rejectedFeedback.length > 0
      ? rejectedFeedback.reduce((sum, f) => sum + f.confidence_score, 0) / rejectedFeedback.length
      : 0;

    // Analyze which features perform best
    const reasonPerformance = this.analyzeReasonPerformance(feedbackData);

    return {
      features: {
        clientNameMatching: {
          weight: reasonPerformance.client_match || 0.8,
          threshold: 0.7,
          fuzzyMatchEnabled: true,
        },
        contentSimilarity: {
          weight: reasonPerformance.content_analysis || 0.6,
          vectorSimilarityThreshold: 0.3,
          topicMatchingWeight: 0.4,
        },
        patternMatching: {
          weight: reasonPerformance.pattern_match || 0.7,
          recentActivityDays: 30,
          userSpecificWeight: 0.8,
        },
        entityMatching: {
          weight: reasonPerformance.entity_match || 0.5,
          organizationWeight: 0.3,
          legalTermWeight: 0.4,
          locationWeight: 0.2,
        },
      },
      performanceMetrics: {
        overallAccuracy: overallAccuracy * 100,
        rank1Accuracy: 0, // Would need rank-specific data
        avgConfidenceAccepted,
        avgConfidenceRejected,
        totalFeedbackEvents: feedbackData.length,
      },
    };
  }

  /**
   * Analyze performance by suggestion reason
   */
  private analyzeReasonPerformance(feedbackData: any[]): Record<string, number> {
    const reasonStats = new Map<string, { total: number; accepted: number }>();

    feedbackData.forEach(feedback => {
      const reason = feedback.suggestion_reason;
      const stats = reasonStats.get(reason) || { total: 0, accepted: 0 };
      
      stats.total++;
      if (feedback.user_action === 'accepted') {
        stats.accepted++;
      }
      
      reasonStats.set(reason, stats);
    });

    const performance: Record<string, number> = {};
    reasonStats.forEach((stats, reason) => {
      performance[reason] = stats.total > 0 ? stats.accepted / stats.total : 0;
    });

    return performance;
  }

  /**
   * Generate learning insights
   */
  async generateLearningInsights(periodDays: number = 30): Promise<LearningInsight[]> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: userTenant } = await this.supabase
        .from('user_tenant_access')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();
      
      if (!userTenant) throw new Error('User tenant not found');

      const insights: LearningInsight[] = [];
      const startDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

      // Get recent performance data
      const { data: recentFeedback } = await this.supabase
        .from('case_suggestions')
        .select('*')
        .eq('tenant_id', userTenant.tenant_id)
        .gte('created_at', startDate.toISOString());

      if (recentFeedback && recentFeedback.length > 0) {
        // Analyze acceptance rates
        const acceptanceRate = recentFeedback.filter(f => f.user_action === 'accepted').length / recentFeedback.length;
        
        if (acceptanceRate < 0.3) {
          insights.push({
            type: 'improvement',
            title: 'Low Suggestion Acceptance Rate',
            description: `Only ${Math.round(acceptanceRate * 100)}% of suggestions are being accepted. Consider retraining the model.`,
            impact: 'high',
            actionable: true,
            data: { acceptanceRate, totalSuggestions: recentFeedback.length },
            generatedAt: new Date().toISOString(),
          });
        }

        // Analyze confidence vs acceptance correlation
        const confidenceInsight = this.analyzeConfidenceCorrelation(recentFeedback);
        if (confidenceInsight) {
          insights.push(confidenceInsight);
        }

        // Analyze reason performance
        const reasonInsight = this.analyzeReasonEffectiveness(recentFeedback);
        if (reasonInsight) {
          insights.push(reasonInsight);
        }
      }

      return insights;

    } catch (error) {
      console.error('Failed to generate learning insights:', error);
      return [];
    }
  }

  /**
   * Analyze confidence score vs acceptance correlation
   */
  private analyzeConfidenceCorrelation(feedback: any[]): LearningInsight | null {
    const accepted = feedback.filter(f => f.user_action === 'accepted');
    const rejected = feedback.filter(f => f.user_action === 'rejected');

    if (accepted.length === 0 || rejected.length === 0) return null;

    const avgAcceptedConfidence = accepted.reduce((sum, f) => sum + f.confidence_score, 0) / accepted.length;
    const avgRejectedConfidence = rejected.reduce((sum, f) => sum + f.confidence_score, 0) / rejected.length;

    const confidenceDiff = avgAcceptedConfidence - avgRejectedConfidence;

    if (confidenceDiff < 10) {
      return {
        type: 'performance',
        title: 'Confidence Scores Not Predictive',
        description: `Confidence scores are not effectively distinguishing good suggestions from bad ones (diff: ${confidenceDiff.toFixed(1)}).`,
        impact: 'medium',
        actionable: true,
        data: { avgAcceptedConfidence, avgRejectedConfidence, confidenceDiff },
        generatedAt: new Date().toISOString(),
      };
    }

    return null;
  }

  /**
   * Analyze suggestion reason effectiveness
   */
  private analyzeReasonEffectiveness(feedback: any[]): LearningInsight | null {
    const reasonStats = new Map<string, { total: number; accepted: number; rate: number }>();

    feedback.forEach(f => {
      const reason = f.suggestion_reason;
      const stats = reasonStats.get(reason) || { total: 0, accepted: 0, rate: 0 };
      
      stats.total++;
      if (f.user_action === 'accepted') stats.accepted++;
      stats.rate = stats.accepted / stats.total;
      
      reasonStats.set(reason, stats);
    });

    // Find the most and least effective reasons
    const sortedReasons = Array.from(reasonStats.entries())
      .filter(([, stats]) => stats.total >= 3) // Only consider reasons with enough data
      .sort(([, a], [, b]) => b.rate - a.rate);

    if (sortedReasons.length < 2) return null;

    const best = sortedReasons[0];
    const worst = sortedReasons[sortedReasons.length - 1];

    if (best[1].rate > worst[1].rate + 0.3) {
      return {
        type: 'pattern',
        title: 'Suggestion Reason Performance Varies',
        description: `'${best[0]}' suggestions have ${Math.round(best[1].rate * 100)}% acceptance rate while '${worst[0]}' has ${Math.round(worst[1].rate * 100)}%.`,
        impact: 'medium',
        actionable: true,
        data: { bestReason: best, worstReason: worst, allReasons: Object.fromEntries(reasonStats) },
        generatedAt: new Date().toISOString(),
      };
    }

    return null;
  }

  /**
   * Export learning data for analysis
   */
  async exportLearningData(periodDays: number = 90): Promise<any> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: userTenant } = await this.supabase
        .from('user_tenant_access')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();
      
      if (!userTenant) throw new Error('User tenant not found');

      const startDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

      // Get all relevant data for analysis
      const [suggestions, learningData, patterns] = await Promise.all([
        this.supabase
          .from('case_suggestions')
          .select('*')
          .eq('tenant_id', userTenant.tenant_id)
          .gte('created_at', startDate.toISOString()),
        
        this.supabase
          .from('suggestion_learning_data')
          .select('*')
          .eq('tenant_id', userTenant.tenant_id)
          .gte('assignment_timestamp', startDate.toISOString()),

        this.supabase
          .from('user_behavior_patterns')
          .select('*')
          .eq('tenant_id', userTenant.tenant_id),
      ]);

      return {
        suggestions: suggestions.data || [],
        learningData: learningData.data || [],
        behaviorPatterns: patterns.data || [],
        exportedAt: new Date().toISOString(),
        periodDays,
      };

    } catch (error) {
      console.error('Failed to export learning data:', error);
      throw error;
    }
  }
}

/**
 * Factory function to create a SuggestionLearningService
 */
export function createSuggestionLearningService(): SuggestionLearningService {
  return new SuggestionLearningService();
}

/**
 * Singleton instance
 */
let suggestionLearningServiceInstance: SuggestionLearningService | null = null;

export function getSuggestionLearningService(): SuggestionLearningService {
  if (!suggestionLearningServiceInstance) {
    suggestionLearningServiceInstance = createSuggestionLearningService();
  }
  return suggestionLearningServiceInstance;
}