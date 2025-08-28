/**
 * Case Suggestions Service
 * Provides intelligent case suggestions and manages suggestion feedback
 */

import { createClient } from '@/lib/supabase';
import { EmailAnalysisService, createEmailAnalysisService, CaseSuggestionWithDetails } from './email-analysis';

export interface CaseSuggestionRequest {
  emailId: string;
  emailContent?: {
    subject: string;
    fromName?: string;
    fromEmail: string;
    htmlBody?: string;
    textBody?: string;
    receivedAt: string;
    hasAttachments: boolean;
    attachmentTypes?: string[];
  };
  userId?: string;
  forceReanalysis?: boolean;
}

export interface CaseSuggestionResponse {
  emailId: string;
  suggestions: EnrichedCaseSuggestion[];
  emailSummary: string;
  emailIntent: string;
  urgencyLevel: string;
  processingTimeMs: number;
  fromCache: boolean;
  confidence: 'high' | 'medium' | 'low';
}

export interface EnrichedCaseSuggestion extends CaseSuggestionWithDetails {
  caseStatus: string;
  lastActivity?: string;
  assignedAttorneys?: string[];
  practiceArea?: string;
  confidenceLabel: 'high' | 'medium' | 'low';
  matchReasonDescription: string;
  actions: SuggestionAction[];
}

export interface SuggestionAction {
  type: 'accept' | 'reject' | 'view_case' | 'similar_cases';
  label: string;
  description?: string;
  enabled: boolean;
}

export interface SuggestionFeedbackRequest {
  suggestionId: string;
  action: 'accepted' | 'rejected' | 'ignored';
  feedback?: string;
  userComment?: string;
}

export interface SuggestionAnalytics {
  totalSuggestions: number;
  acceptanceRate: number;
  avgConfidenceAccepted: number;
  rank1Accuracy: number;
  topReasons: string[];
  periodDays: number;
  trends: {
    daily: Array<{ date: string; suggestions: number; accepted: number }>;
    byReason: Array<{ reason: string; count: number; acceptanceRate: number }>;
    byConfidence: Array<{ range: string; count: number; acceptanceRate: number }>;
  };
}

/**
 * Case Suggestions Service
 */
export class CaseSuggestionsService {
  private emailAnalysisService: EmailAnalysisService;
  private supabase: ReturnType<typeof createClient>;

  constructor(emailAnalysisService?: EmailAnalysisService) {
    this.emailAnalysisService = emailAnalysisService || createEmailAnalysisService();
    this.supabase = createClient();
  }

  /**
   * Get case suggestions for an email
   */
  async getCaseSuggestions(request: CaseSuggestionRequest): Promise<CaseSuggestionResponse> {
    try {
      const result = await this.emailAnalysisService.getEmailSuggestions({
        emailId: request.emailId,
        emailContent: request.emailContent,
        forceReanalysis: request.forceReanalysis,
        userId: request.userId,
      });

      // Enrich suggestions with additional case data
      const enrichedSuggestions = await this.enrichSuggestions(result.caseSuggestions);

      // Determine overall confidence
      const overallConfidence = this.calculateOverallConfidence(enrichedSuggestions);

      return {
        emailId: request.emailId,
        suggestions: enrichedSuggestions,
        emailSummary: result.emailAnalysis.summary,
        emailIntent: result.emailAnalysis.intent,
        urgencyLevel: result.emailAnalysis.urgencyLevel,
        processingTimeMs: result.totalProcessingTimeMs,
        fromCache: result.fromCache,
        confidence: overallConfidence,
      };

    } catch (error) {
      console.error('Failed to get case suggestions:', error);
      throw new Error(`Case suggestions failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Enrich suggestions with additional case data and metadata
   */
  private async enrichSuggestions(suggestions: CaseSuggestionWithDetails[]): Promise<EnrichedCaseSuggestion[]> {
    if (suggestions.length === 0) return [];

    // Get additional case details
    const caseIds = suggestions.map(s => s.caseId);
    const { data: caseDetails, error } = await this.supabase
      .from('cases')
      .select(`
        id,
        status,
        practice_area,
        updated_at,
        assigned_attorneys
      `)
      .in('id', caseIds);

    if (error) {
      console.error('Failed to fetch case details:', error);
    }

    return suggestions.map(suggestion => {
      const caseInfo = caseDetails?.find(c => c.id === suggestion.caseId);
      
      return {
        ...suggestion,
        caseStatus: caseInfo?.status || 'unknown',
        lastActivity: caseInfo?.updated_at,
        assignedAttorneys: caseInfo?.assigned_attorneys || [],
        practiceArea: caseInfo?.practice_area,
        confidenceLabel: this.getConfidenceLabel(suggestion.confidenceScore),
        matchReasonDescription: this.getMatchReasonDescription(suggestion.suggestionReason),
        actions: this.generateSuggestionActions(suggestion),
      };
    });
  }

  /**
   * Calculate overall confidence for the suggestion set
   */
  private calculateOverallConfidence(suggestions: EnrichedCaseSuggestion[]): 'high' | 'medium' | 'low' {
    if (suggestions.length === 0) return 'low';

    const topSuggestion = suggestions[0];
    const avgConfidence = suggestions.reduce((sum, s) => sum + s.confidenceScore, 0) / suggestions.length;

    if (topSuggestion.confidenceScore >= 85 && avgConfidence >= 70) return 'high';
    if (topSuggestion.confidenceScore >= 70 && avgConfidence >= 50) return 'medium';
    return 'low';
  }

  /**
   * Get confidence label for a score
   */
  private getConfidenceLabel(score: number): 'high' | 'medium' | 'low' {
    if (score >= 80) return 'high';
    if (score >= 60) return 'medium';
    return 'low';
  }

  /**
   * Get human-readable description for match reason
   */
  private getMatchReasonDescription(reason: string): string {
    const descriptions: Record<string, string> = {
      'case_number_match': 'Case number found in email content',
      'client_match': 'Client name or email address matches',
      'content_analysis': 'Similar content and topics',
      'pattern_match': 'Based on your recent activity',
      'recent_activity': 'Recently active case',
      'contact_match': 'Contact information matches',
      'subject_similarity': 'Similar subject line',
      'entity_match': 'Related organizations or terms mentioned',
    };

    return descriptions[reason] || 'AI-suggested based on content analysis';
  }

  /**
   * Generate action buttons for a suggestion
   */
  private generateSuggestionActions(suggestion: CaseSuggestionWithDetails): SuggestionAction[] {
    const actions: SuggestionAction[] = [
      {
        type: 'accept',
        label: 'Assign to Case',
        description: 'Assign this email to the suggested case',
        enabled: true,
      },
      {
        type: 'view_case',
        label: 'View Case',
        description: 'Open case details in new tab',
        enabled: true,
      },
    ];

    // Add rejection option for low-confidence suggestions
    if (suggestion.confidenceScore < 70) {
      actions.push({
        type: 'reject',
        label: 'Not Relevant',
        description: 'This suggestion is not relevant',
        enabled: true,
      });
    }

    // Add similar cases option for content-based matches
    if (suggestion.suggestionReason === 'content_analysis') {
      actions.push({
        type: 'similar_cases',
        label: 'Find Similar',
        description: 'Find other cases with similar content',
        enabled: true,
      });
    }

    return actions;
  }

  /**
   * Submit feedback on a suggestion
   */
  async submitSuggestionFeedback(request: SuggestionFeedbackRequest): Promise<boolean> {
    try {
      const success = await this.emailAnalysisService.recordSuggestionFeedback(
        request.suggestionId,
        request.action,
        request.feedback || request.userComment
      );

      // Update suggestion analytics if feedback was recorded
      if (success) {
        await this.updateSuggestionAnalytics(request);
      }

      return success;
    } catch (error) {
      console.error('Failed to submit suggestion feedback:', error);
      return false;
    }
  }

  /**
   * Record email assignment and update learning data
   */
  async recordEmailAssignment(
    emailId: string,
    assignedCaseId: string,
    acceptedSuggestionId?: string,
    suggestionRank?: number
  ): Promise<void> {
    try {
      const suggestionAccepted = Boolean(acceptedSuggestionId);
      
      await this.emailAnalysisService.recordEmailAssignment(
        emailId,
        assignedCaseId,
        suggestionAccepted,
        suggestionRank
      );

      // If a suggestion was accepted, record positive feedback
      if (acceptedSuggestionId) {
        await this.submitSuggestionFeedback({
          suggestionId: acceptedSuggestionId,
          action: 'accepted',
          feedback: 'User selected this suggestion',
        });
      }
    } catch (error) {
      console.error('Failed to record email assignment:', error);
      // Don't throw - assignment can succeed even if learning fails
    }
  }

  /**
   * Get suggestion analytics for the current tenant
   */
  async getSuggestionAnalytics(periodDays: number = 30): Promise<SuggestionAnalytics> {
    try {
      const basicAnalytics = await this.emailAnalysisService.getSuggestionAnalytics(periodDays);
      
      // Get additional trend data
      const trends = await this.getSuggestionTrends(periodDays);

      return {
        totalSuggestions: basicAnalytics.total_suggestions || 0,
        acceptanceRate: basicAnalytics.acceptance_rate || 0,
        avgConfidenceAccepted: basicAnalytics.avg_confidence_accepted || 0,
        rank1Accuracy: basicAnalytics.rank_1_accuracy || 0,
        topReasons: basicAnalytics.top_suggestion_reasons || [],
        periodDays,
        trends,
      };
    } catch (error) {
      console.error('Failed to get suggestion analytics:', error);
      throw error;
    }
  }

  /**
   * Get detailed trend data for analytics
   */
  private async getSuggestionTrends(periodDays: number) {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: userTenant } = await this.supabase
      .from('user_tenant_access')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single();
    
    if (!userTenant) throw new Error('User tenant not found');

    const startDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

    // Get daily trends
    const { data: dailyTrends } = await this.supabase
      .rpc('get_daily_suggestion_trends', {
        p_tenant_id: userTenant.tenant_id,
        p_start_date: startDate.toISOString(),
      });

    // Get trends by reason
    const { data: reasonTrends } = await this.supabase
      .from('case_suggestions')
      .select(`
        suggestion_reason,
        user_action
      `)
      .eq('tenant_id', userTenant.tenant_id)
      .gte('created_at', startDate.toISOString());

    // Get trends by confidence
    const { data: confidenceTrends } = await this.supabase
      .from('case_suggestions')
      .select(`
        confidence_score,
        user_action
      `)
      .eq('tenant_id', userTenant.tenant_id)
      .gte('created_at', startDate.toISOString());

    return {
      daily: this.processDailyTrends(dailyTrends || []),
      byReason: this.processReasonTrends(reasonTrends || []),
      byConfidence: this.processConfidenceTrends(confidenceTrends || []),
    };
  }

  /**
   * Process daily trends data
   */
  private processDailyTrends(data: any[]): Array<{ date: string; suggestions: number; accepted: number }> {
    const trends = new Map<string, { suggestions: number; accepted: number }>();

    data.forEach(item => {
      const date = new Date(item.created_at).toISOString().split('T')[0];
      const existing = trends.get(date) || { suggestions: 0, accepted: 0 };
      
      existing.suggestions++;
      if (item.user_action === 'accepted') {
        existing.accepted++;
      }
      
      trends.set(date, existing);
    });

    return Array.from(trends.entries()).map(([date, stats]) => ({
      date,
      ...stats,
    }));
  }

  /**
   * Process suggestion reason trends
   */
  private processReasonTrends(data: any[]): Array<{ reason: string; count: number; acceptanceRate: number }> {
    const reasons = new Map<string, { count: number; accepted: number }>();

    data.forEach(item => {
      const existing = reasons.get(item.suggestion_reason) || { count: 0, accepted: 0 };
      existing.count++;
      if (item.user_action === 'accepted') {
        existing.accepted++;
      }
      reasons.set(item.suggestion_reason, existing);
    });

    return Array.from(reasons.entries()).map(([reason, stats]) => ({
      reason,
      count: stats.count,
      acceptanceRate: stats.count > 0 ? (stats.accepted / stats.count) * 100 : 0,
    }));
  }

  /**
   * Process confidence level trends
   */
  private processConfidenceTrends(data: any[]): Array<{ range: string; count: number; acceptanceRate: number }> {
    const ranges = new Map<string, { count: number; accepted: number }>();

    data.forEach(item => {
      let range: string;
      const score = item.confidence_score;
      
      if (score >= 80) range = '80-100';
      else if (score >= 60) range = '60-79';
      else if (score >= 40) range = '40-59';
      else range = '0-39';

      const existing = ranges.get(range) || { count: 0, accepted: 0 };
      existing.count++;
      if (item.user_action === 'accepted') {
        existing.accepted++;
      }
      ranges.set(range, existing);
    });

    return Array.from(ranges.entries()).map(([range, stats]) => ({
      range,
      count: stats.count,
      acceptanceRate: stats.count > 0 ? (stats.accepted / stats.count) * 100 : 0,
    }));
  }

  /**
   * Update suggestion analytics after feedback
   */
  private async updateSuggestionAnalytics(request: SuggestionFeedbackRequest): Promise<void> {
    // This could trigger periodic analytics aggregation
    // For now, we'll just log the event
    console.log('Suggestion feedback recorded:', {
      suggestionId: request.suggestionId,
      action: request.action,
      feedback: request.feedback,
    });
  }

  /**
   * Get suggestions for bulk assignment
   */
  async getBulkCaseSuggestions(emailIds: string[]): Promise<Map<string, CaseSuggestionResponse>> {
    const results = new Map<string, CaseSuggestionResponse>();
    
    // Process emails in batches to avoid overwhelming the AI service
    const batchSize = 5;
    for (let i = 0; i < emailIds.length; i += batchSize) {
      const batch = emailIds.slice(i, i + batchSize);
      const batchPromises = batch.map(async emailId => {
        try {
          const suggestions = await this.getCaseSuggestions({ emailId });
          return { emailId, suggestions };
        } catch (error) {
          console.error(`Failed to get suggestions for email ${emailId}:`, error);
          return { emailId, suggestions: null };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(result => {
        if (result.suggestions) {
          results.set(result.emailId, result.suggestions);
        }
      });

      // Add delay between batches
      if (i + batchSize < emailIds.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  /**
   * Clear suggestion cache for an email
   */
  async clearSuggestionCache(emailId: string): Promise<boolean> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) return false;

      const { data: userTenant } = await this.supabase
        .from('user_tenant_access')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();
      
      if (!userTenant) return false;

      // Delete the analysis record to force re-analysis
      const { error } = await this.supabase
        .from('email_analysis')
        .delete()
        .eq('tenant_id', userTenant.tenant_id)
        .eq('email_id', emailId);

      return !error;
    } catch (error) {
      console.error('Failed to clear suggestion cache:', error);
      return false;
    }
  }
}

/**
 * Factory function to create a CaseSuggestionsService
 */
export function createCaseSuggestionsService(emailAnalysisService?: EmailAnalysisService): CaseSuggestionsService {
  return new CaseSuggestionsService(emailAnalysisService);
}

/**
 * Singleton instance for global use
 */
let caseSuggestionsServiceInstance: CaseSuggestionsService | null = null;

export function getCaseSuggestionsService(): CaseSuggestionsService {
  if (!caseSuggestionsServiceInstance) {
    caseSuggestionsServiceInstance = createCaseSuggestionsService();
  }
  return caseSuggestionsServiceInstance;
}