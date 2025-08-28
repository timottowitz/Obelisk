/**
 * Email Analysis Service
 * Coordinates email content analysis and case suggestions
 */

import { createClient } from '@/lib/supabase';
import { EmailAnalyzer, EmailAnalysisRequest, EmailAnalysisResult, createEmailAnalyzer } from '../ai/email-analyzer';
import { CaseMatcher, CaseMatchRequest, CaseMatchResult, createCaseMatcher } from '../ai/case-matcher';
import { EmailRetrievalResult } from './types/email-storage';

export interface EmailAnalysisConfig {
  aiProvider: 'openai' | 'anthropic';
  model: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface StoredEmailAnalysis {
  id: string;
  tenantId: string;
  emailId: string;
  caseId?: string;
  analysisVersion: string;
  summary: string;
  intent: string;
  urgencyLevel: string;
  topicClassification: string[];
  extractedEntities: any;
  detectedLanguage: string;
  contentHash: string;
  hasAttachments: boolean;
  attachmentTypes: string[];
  analysisStatus: 'pending' | 'processing' | 'completed' | 'failed';
  analysisProvider: string;
  analysisModel: string;
  processingTimeMs?: number;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmailSuggestionRequest {
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
  forceReanalysis?: boolean;
  userId?: string;
}

export interface EmailSuggestionResult {
  emailAnalysis: StoredEmailAnalysis;
  caseSuggestions: CaseSuggestionWithDetails[];
  totalProcessingTimeMs: number;
  fromCache: boolean;
}

export interface CaseSuggestionWithDetails {
  id: string;
  caseId: string;
  caseNumber: string;
  caseTitle: string;
  clientName: string;
  confidenceScore: number;
  suggestionReason: string;
  matchCriteria: any;
  rank: number;
  explanation: string;
}

/**
 * Main email analysis service class
 */
export class EmailAnalysisService {
  private analyzer: EmailAnalyzer;
  private matcher: CaseMatcher;
  private supabase: ReturnType<typeof createClient>;

  constructor(config: EmailAnalysisConfig) {
    this.analyzer = createEmailAnalyzer({
      provider: config.aiProvider,
      model: config.model,
      apiKey: config.apiKey,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
    });
    this.matcher = createCaseMatcher();
    this.supabase = createClient();
  }

  /**
   * Get case suggestions for an email
   */
  async getEmailSuggestions(request: EmailSuggestionRequest): Promise<EmailSuggestionResult> {
    const startTime = Date.now();
    let fromCache = false;

    try {
      // Get tenant ID from user context
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: userTenant } = await this.supabase
        .from('user_tenant_access')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();
      
      if (!userTenant) throw new Error('User tenant not found');
      const tenantId = userTenant.tenant_id;

      // Check if we have existing analysis
      let emailAnalysis = await this.getExistingAnalysis(tenantId, request.emailId);

      if (!emailAnalysis || request.forceReanalysis) {
        // Need to analyze the email content
        if (!request.emailContent) {
          throw new Error('Email content is required for analysis');
        }

        emailAnalysis = await this.analyzeAndStoreEmail(tenantId, request.emailId, request.emailContent);
      } else {
        fromCache = true;
      }

      // Generate case suggestions
      const caseSuggestions = await this.generateCaseSuggestions(
        tenantId,
        emailAnalysis,
        request.emailContent || this.buildEmailContentFromAnalysis(emailAnalysis),
        request.userId
      );

      return {
        emailAnalysis,
        caseSuggestions,
        totalProcessingTimeMs: Date.now() - startTime,
        fromCache
      };

    } catch (error) {
      console.error('Email suggestions failed:', error);
      throw new Error(`Failed to get email suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get existing analysis from database
   */
  private async getExistingAnalysis(tenantId: string, emailId: string): Promise<StoredEmailAnalysis | null> {
    const { data, error } = await this.supabase
      .from('email_analysis')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('email_id', emailId)
      .eq('analysis_status', 'completed')
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error fetching existing analysis:', error);
      return null;
    }

    return data as StoredEmailAnalysis | null;
  }

  /**
   * Analyze email content and store results
   */
  private async analyzeAndStoreEmail(
    tenantId: string, 
    emailId: string, 
    emailContent: NonNullable<EmailSuggestionRequest['emailContent']>
  ): Promise<StoredEmailAnalysis> {
    
    // Create analysis request
    const analysisRequest: EmailAnalysisRequest = {
      emailId,
      subject: emailContent.subject,
      fromName: emailContent.fromName,
      fromEmail: emailContent.fromEmail,
      htmlBody: emailContent.htmlBody,
      textBody: emailContent.textBody,
      receivedAt: emailContent.receivedAt,
      hasAttachments: emailContent.hasAttachments,
      attachmentTypes: emailContent.attachmentTypes,
    };

    // Store initial analysis record
    const contentHash = await this.generateContentHash(
      emailContent.subject + (emailContent.htmlBody || emailContent.textBody || '')
    );

    const { data: analysisRecord, error: insertError } = await this.supabase
      .from('email_analysis')
      .insert({
        tenant_id: tenantId,
        email_id: emailId,
        analysis_version: '1.0',
        content_hash: contentHash,
        has_attachments: emailContent.hasAttachments,
        attachment_types: emailContent.attachmentTypes || [],
        analysis_status: 'processing',
        analysis_provider: this.analyzer['config'].provider,
        analysis_model: this.analyzer['config'].model,
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to create analysis record: ${insertError.message}`);
    }

    try {
      // Perform AI analysis
      const analysisResult = await this.analyzer.analyzeEmail(analysisRequest);

      // Update the analysis record with results
      const { data: updatedRecord, error: updateError } = await this.supabase
        .from('email_analysis')
        .update({
          summary: analysisResult.summary,
          intent: analysisResult.intent,
          urgency_level: analysisResult.urgencyLevel,
          topic_classification: analysisResult.topicClassification,
          extracted_entities: analysisResult.extractedEntities,
          detected_language: analysisResult.detectedLanguage,
          analysis_status: 'completed',
          processing_time_ms: analysisResult.processingTimeMs,
          updated_at: new Date().toISOString(),
        })
        .eq('id', analysisRecord.id)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to update analysis record: ${updateError.message}`);
      }

      return updatedRecord as StoredEmailAnalysis;

    } catch (error) {
      // Update record with error status
      await this.supabase
        .from('email_analysis')
        .update({
          analysis_status: 'failed',
          error_message: error instanceof Error ? error.message : 'Analysis failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', analysisRecord.id);

      throw error;
    }
  }

  /**
   * Generate case suggestions based on email analysis
   */
  private async generateCaseSuggestions(
    tenantId: string,
    emailAnalysis: StoredEmailAnalysis,
    emailContent: NonNullable<EmailSuggestionRequest['emailContent']>,
    userId?: string
  ): Promise<CaseSuggestionWithDetails[]> {

    // Get available cases for the tenant
    const { data: cases, error: casesError } = await this.supabase
      .from('cases')
      .select(`
        id,
        case_number,
        title,
        client_name,
        status,
        practice_area,
        created_at,
        updated_at
      `)
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .limit(100); // Limit to most recent 100 cases

    if (casesError) {
      throw new Error(`Failed to fetch cases: ${casesError.message}`);
    }

    if (!cases || cases.length === 0) {
      return [];
    }

    // Get user context if userId provided
    let userContext;
    if (userId) {
      userContext = await this.getUserAssignmentContext(tenantId, userId);
    }

    // Prepare case matching request
    const matchRequest: CaseMatchRequest = {
      emailAnalysis: {
        summary: emailAnalysis.summary,
        intent: emailAnalysis.intent as any,
        urgencyLevel: emailAnalysis.urgencyLevel as any,
        topicClassification: emailAnalysis.topicClassification,
        extractedEntities: emailAnalysis.extractedEntities,
        detectedLanguage: emailAnalysis.detectedLanguage,
        confidenceScore: 85, // Default confidence
        processingTimeMs: emailAnalysis.processingTimeMs || 0,
        analysisProvider: emailAnalysis.analysisProvider,
        analysisModel: emailAnalysis.analysisModel,
      },
      emailMetadata: {
        emailId: emailAnalysis.emailId,
        subject: emailContent.subject,
        fromEmail: emailContent.fromEmail,
        fromName: emailContent.fromName,
        receivedAt: emailContent.receivedAt,
      },
      availableCases: cases.map(c => ({
        id: c.id,
        caseNumber: c.case_number,
        title: c.title,
        clientName: c.client_name,
        status: c.status,
        practiceArea: c.practice_area,
        lastActivity: c.updated_at,
        createdAt: c.created_at,
      })),
      userContext,
    };

    // Generate suggestions
    const matchResult = await this.matcher.findMatchingCases(matchRequest);

    // Store suggestions in database
    const suggestionPromises = matchResult.suggestions.map(async (suggestion, index) => {
      const { data: storedSuggestion, error } = await this.supabase
        .from('case_suggestions')
        .insert({
          tenant_id: tenantId,
          email_analysis_id: emailAnalysis.id,
          suggested_case_id: suggestion.caseId,
          confidence_score: suggestion.confidenceScore,
          suggestion_reason: suggestion.suggestionReason,
          match_criteria: suggestion.matchCriteria,
          rank_position: index + 1,
          algorithm_version: matchResult.algorithmVersion,
        })
        .select(`
          id,
          suggested_case_id,
          confidence_score,
          suggestion_reason,
          match_criteria,
          rank_position
        `)
        .single();

      if (error) {
        console.error('Failed to store suggestion:', error);
        return null;
      }

      // Get case details
      const caseDetails = cases.find(c => c.id === suggestion.caseId);
      if (!caseDetails) return null;

      return {
        id: storedSuggestion.id,
        caseId: storedSuggestion.suggested_case_id,
        caseNumber: caseDetails.case_number,
        caseTitle: caseDetails.title,
        clientName: caseDetails.client_name,
        confidenceScore: storedSuggestion.confidence_score,
        suggestionReason: storedSuggestion.suggestion_reason,
        matchCriteria: storedSuggestion.match_criteria,
        rank: storedSuggestion.rank_position,
        explanation: suggestion.explanation,
      };
    });

    const suggestions = await Promise.all(suggestionPromises);
    return suggestions.filter(Boolean) as CaseSuggestionWithDetails[];
  }

  /**
   * Get user assignment context for pattern matching
   */
  private async getUserAssignmentContext(tenantId: string, userId: string) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: recentAssignments } = await this.supabase
      .from('suggestion_learning_data')
      .select('assigned_case_id, assignment_timestamp')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .gte('assignment_timestamp', thirtyDaysAgo)
      .order('assignment_timestamp', { ascending: false });

    if (!recentAssignments) return undefined;

    // Group by case and count emails
    const caseEmailCounts = new Map<string, { caseId: string; assignedAt: string; emailCount: number }>();
    
    recentAssignments.forEach(assignment => {
      const existing = caseEmailCounts.get(assignment.assigned_case_id);
      if (existing) {
        existing.emailCount++;
      } else {
        caseEmailCounts.set(assignment.assigned_case_id, {
          caseId: assignment.assigned_case_id,
          assignedAt: assignment.assignment_timestamp,
          emailCount: 1,
        });
      }
    });

    return {
      userId,
      recentAssignments: Array.from(caseEmailCounts.values()),
    };
  }

  /**
   * Build email content from stored analysis (for cached results)
   */
  private buildEmailContentFromAnalysis(analysis: StoredEmailAnalysis): NonNullable<EmailSuggestionRequest['emailContent']> {
    // This is a fallback when we have cached analysis but no email content
    // In practice, we should try to get the actual email content from storage
    return {
      subject: 'Email subject not available',
      fromEmail: 'unknown@example.com',
      receivedAt: analysis.createdAt,
      hasAttachments: analysis.hasAttachments,
      attachmentTypes: analysis.attachmentTypes,
    };
  }

  /**
   * Generate content hash for deduplication
   */
  private async generateContentHash(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Record user feedback on suggestions
   */
  async recordSuggestionFeedback(
    suggestionId: string,
    action: 'accepted' | 'rejected' | 'ignored',
    feedback?: string
  ): Promise<boolean> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: userTenant } = await this.supabase
        .from('user_tenant_access')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();
      
      if (!userTenant) throw new Error('User tenant not found');

      const { data, error } = await this.supabase
        .rpc('record_suggestion_feedback', {
          p_tenant_id: userTenant.tenant_id,
          p_user_id: user.id,
          p_suggestion_id: suggestionId,
          p_action: action,
          p_feedback: feedback || null,
        });

      if (error) {
        console.error('Failed to record feedback:', error);
        return false;
      }

      return data === true;
    } catch (error) {
      console.error('Error recording suggestion feedback:', error);
      return false;
    }
  }

  /**
   * Record email assignment for learning
   */
  async recordEmailAssignment(
    emailId: string,
    assignedCaseId: string,
    suggestionAccepted: boolean = false,
    acceptedSuggestionRank?: number
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

      // Get the email analysis
      const { data: analysis } = await this.supabase
        .from('email_analysis')
        .select('id')
        .eq('tenant_id', userTenant.tenant_id)
        .eq('email_id', emailId)
        .single();

      if (!analysis) {
        console.warn('No analysis found for email assignment');
        return;
      }

      // Get top suggestion if available
      const { data: topSuggestion } = await this.supabase
        .from('case_suggestions')
        .select('id')
        .eq('email_analysis_id', analysis.id)
        .eq('rank_position', 1)
        .single();

      // Record learning data
      await this.supabase
        .from('suggestion_learning_data')
        .insert({
          tenant_id: userTenant.tenant_id,
          user_id: user.id,
          email_analysis_id: analysis.id,
          assigned_case_id: assignedCaseId,
          top_suggestion_id: topSuggestion?.id || null,
          suggestion_accepted: suggestionAccepted,
          suggestion_rank_accepted: acceptedSuggestionRank || null,
          assignment_timestamp: new Date().toISOString(),
        });

    } catch (error) {
      console.error('Error recording email assignment:', error);
      // Don't throw - this is for learning purposes and shouldn't break the assignment
    }
  }

  /**
   * Get suggestion analytics for the tenant
   */
  async getSuggestionAnalytics(periodDays: number = 30) {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: userTenant } = await this.supabase
        .from('user_tenant_access')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();
      
      if (!userTenant) throw new Error('User tenant not found');

      const { data, error } = await this.supabase
        .rpc('get_suggestion_analytics', {
          p_tenant_id: userTenant.tenant_id,
          p_period_days: periodDays,
        });

      if (error) {
        throw new Error(`Failed to get analytics: ${error.message}`);
      }

      return data[0] || {
        total_suggestions: 0,
        acceptance_rate: 0,
        avg_confidence_accepted: 0,
        rank_1_accuracy: 0,
        top_suggestion_reasons: [],
      };
    } catch (error) {
      console.error('Error getting suggestion analytics:', error);
      throw error;
    }
  }
}

/**
 * Factory function to create an EmailAnalysisService
 */
export function createEmailAnalysisService(config?: Partial<EmailAnalysisConfig>): EmailAnalysisService {
  const defaultConfig: EmailAnalysisConfig = {
    aiProvider: 'openai',
    model: 'gpt-4-0125-preview',
    temperature: 0.1,
    maxTokens: 2000,
  };

  const finalConfig = { ...defaultConfig, ...config };

  // Get API key from environment if not provided
  if (!finalConfig.apiKey) {
    if (finalConfig.aiProvider === 'openai') {
      finalConfig.apiKey = process.env.OPENAI_API_KEY;
    } else if (finalConfig.aiProvider === 'anthropic') {
      finalConfig.apiKey = process.env.ANTHROPIC_API_KEY;
    }
  }

  return new EmailAnalysisService(finalConfig);
}