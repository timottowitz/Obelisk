/**
 * API endpoint for suggestion feedback
 * POST /api/suggestions/feedback - Submit feedback on case suggestions
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getCaseSuggestionsService } from '@/lib/services/case-suggestions';
import { getSuggestionLearningService } from '@/lib/services/suggestion-learning';

interface FeedbackRequest {
  suggestionId: string;
  action: 'accepted' | 'rejected' | 'ignored';
  feedback?: string;
  userComment?: string;
  context?: {
    emailId?: string;
    assignedCaseId?: string;
    suggestionRank?: number;
    timeToDecision?: number; // milliseconds
    alternativeAction?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: FeedbackRequest = await request.json();
    
    // Validate request body
    if (!body.suggestionId || !body.action) {
      return NextResponse.json(
        { error: 'suggestionId and action are required' },
        { status: 400 }
      );
    }

    if (!['accepted', 'rejected', 'ignored'].includes(body.action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be accepted, rejected, or ignored' },
        { status: 400 }
      );
    }

    const suggestionsService = getCaseSuggestionsService();
    const learningService = getSuggestionLearningService();

    // Submit feedback to suggestions service
    const feedbackSuccess = await suggestionsService.submitSuggestionFeedback({
      suggestionId: body.suggestionId,
      action: body.action,
      feedback: body.feedback,
      userComment: body.userComment,
    });

    if (!feedbackSuccess) {
      return NextResponse.json(
        { error: 'Failed to record feedback' },
        { status: 500 }
      );
    }

    // Track learning event if context provided
    if (body.context?.emailId) {
      try {
        await learningService.trackLearningEvent(
          body.action === 'accepted' ? 'suggestion_accepted' : 
          body.action === 'rejected' ? 'suggestion_rejected' : 'suggestion_ignored',
          body.context.emailId,
          {
            suggestionId: body.suggestionId,
            action: body.action,
            feedback: body.feedback,
            userComment: body.userComment,
            timeToDecision: body.context.timeToDecision,
            suggestionRank: body.context.suggestionRank,
            alternativeAction: body.context.alternativeAction,
          }
        );
      } catch (error) {
        console.error('Failed to track learning event:', error);
        // Don't fail the request if learning tracking fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Feedback recorded successfully',
    });

  } catch (error) {
    console.error('Error recording suggestion feedback:', error);
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Failed to record feedback';

    return NextResponse.json(
      { 
        success: false,
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/suggestions/feedback - Get feedback statistics
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const periodDays = parseInt(searchParams.get('periodDays') || '30');
    const suggestionId = searchParams.get('suggestionId');

    const suggestionsService = getCaseSuggestionsService();

    if (suggestionId) {
      // Get feedback for a specific suggestion
      const feedback = await getSuggestionFeedbackHistory(suggestionId, userId);
      
      return NextResponse.json({
        success: true,
        data: feedback,
      });
    } else {
      // Get overall feedback analytics
      const analytics = await suggestionsService.getSuggestionAnalytics(periodDays);
      
      return NextResponse.json({
        success: true,
        data: analytics,
      });
    }

  } catch (error) {
    console.error('Error getting suggestion feedback:', error);
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Failed to get feedback data';

    return NextResponse.json(
      { 
        success: false,
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * Helper function to get feedback history for a specific suggestion
 */
async function getSuggestionFeedbackHistory(suggestionId: string, userId: string) {
  try {
    const { createClient } = await import('@/lib/supabase');
    const supabase = createClient();

    // Get user's tenant
    const { data: userTenant } = await supabase
      .from('user_tenant_access')
      .select('tenant_id')
      .eq('user_id', userId)
      .single();

    if (!userTenant) {
      throw new Error('User tenant not found');
    }

    // Get suggestion details with feedback
    const { data: suggestion, error } = await supabase
      .from('case_suggestions')
      .select(`
        id,
        suggested_case_id,
        confidence_score,
        suggestion_reason,
        match_criteria,
        rank_position,
        user_action,
        user_feedback,
        interaction_timestamp,
        created_at,
        cases!inner(case_number, title, client_name)
      `)
      .eq('id', suggestionId)
      .eq('tenant_id', userTenant.tenant_id)
      .single();

    if (error || !suggestion) {
      throw new Error('Suggestion not found');
    }

    return {
      suggestion: {
        id: suggestion.id,
        caseId: suggestion.suggested_case_id,
        caseNumber: suggestion.cases.case_number,
        caseTitle: suggestion.cases.title,
        clientName: suggestion.cases.client_name,
        confidenceScore: suggestion.confidence_score,
        suggestionReason: suggestion.suggestion_reason,
        matchCriteria: suggestion.match_criteria,
        rank: suggestion.rank_position,
        createdAt: suggestion.created_at,
      },
      feedback: {
        action: suggestion.user_action,
        feedback: suggestion.user_feedback,
        timestamp: suggestion.interaction_timestamp,
      },
    };

  } catch (error) {
    console.error('Failed to get suggestion feedback history:', error);
    throw error;
  }
}