/**
 * API endpoint for suggestion analytics
 * GET /api/suggestions/analytics - Get suggestion performance analytics
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getCaseSuggestionsService } from '@/lib/services/case-suggestions';
import { getSuggestionLearningService } from '@/lib/services/suggestion-learning';

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
    const includeInsights = searchParams.get('insights') === 'true';
    const includeTrends = searchParams.get('trends') === 'true';

    const suggestionsService = getCaseSuggestionsService();
    const learningService = getSuggestionLearningService();

    // Get basic analytics
    const analytics = await suggestionsService.getSuggestionAnalytics(periodDays);

    const response: any = {
      success: true,
      data: {
        analytics,
        periodDays,
        generatedAt: new Date().toISOString(),
      },
    };

    // Add learning insights if requested
    if (includeInsights) {
      try {
        const insights = await learningService.generateLearningInsights(periodDays);
        response.data.insights = insights;
      } catch (error) {
        console.error('Failed to get learning insights:', error);
        response.data.insights = [];
      }
    }

    // Add trend data if requested
    if (includeTrends) {
      try {
        const trendData = await getDetailedTrends(periodDays, userId);
        response.data.trends = trendData;
      } catch (error) {
        console.error('Failed to get trend data:', error);
        response.data.trends = null;
      }
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error getting suggestion analytics:', error);
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Failed to get analytics';

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
 * POST /api/suggestions/analytics - Trigger analytics computation
 */
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

    const body = await request.json();
    const { action, params } = body;

    const learningService = getSuggestionLearningService();

    switch (action) {
      case 'train_model':
        const trainSuccess = await learningService.trainTenantModel();
        
        return NextResponse.json({
          success: true,
          message: trainSuccess ? 'Model training completed' : 'Insufficient data for training',
          data: { trained: trainSuccess },
        });

      case 'export_data':
        const periodDays = params?.periodDays || 90;
        const exportData = await learningService.exportLearningData(periodDays);
        
        return NextResponse.json({
          success: true,
          message: 'Learning data exported',
          data: exportData,
        });

      case 'generate_report':
        const reportData = await generateAnalyticsReport(userId, params);
        
        return NextResponse.json({
          success: true,
          message: 'Analytics report generated',
          data: reportData,
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error processing analytics request:', error);
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Failed to process request';

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
 * Helper function to get detailed trend data
 */
async function getDetailedTrends(periodDays: number, userId: string) {
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

  const startDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

  // Get suggestions with feedback over time
  const { data: suggestionsData } = await supabase
    .from('case_suggestions')
    .select(`
      id,
      confidence_score,
      suggestion_reason,
      user_action,
      created_at,
      interaction_timestamp,
      rank_position
    `)
    .eq('tenant_id', userTenant.tenant_id)
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: true });

  if (!suggestionsData) {
    return null;
  }

  // Process data into trend format
  const dailyTrends = processDailyTrends(suggestionsData);
  const reasonTrends = processReasonTrends(suggestionsData);
  const confidenceTrends = processConfidenceTrends(suggestionsData);
  const rankTrends = processRankTrends(suggestionsData);

  return {
    daily: dailyTrends,
    byReason: reasonTrends,
    byConfidence: confidenceTrends,
    byRank: rankTrends,
    summary: {
      totalSuggestions: suggestionsData.length,
      withFeedback: suggestionsData.filter(s => s.user_action).length,
      avgConfidence: suggestionsData.reduce((sum, s) => sum + s.confidence_score, 0) / suggestionsData.length,
      mostCommonReason: getMostCommonReason(suggestionsData),
    },
  };
}

/**
 * Process daily trend data
 */
function processDailyTrends(data: any[]) {
  const dailyMap = new Map<string, { suggestions: number; accepted: number; rejected: number; ignored: number }>();

  data.forEach(item => {
    const date = new Date(item.created_at).toISOString().split('T')[0];
    const existing = dailyMap.get(date) || { suggestions: 0, accepted: 0, rejected: 0, ignored: 0 };
    
    existing.suggestions++;
    
    if (item.user_action) {
      existing[item.user_action as keyof typeof existing]++;
    }
    
    dailyMap.set(date, existing);
  });

  return Array.from(dailyMap.entries())
    .map(([date, stats]) => ({
      date,
      ...stats,
      acceptanceRate: stats.suggestions > 0 ? (stats.accepted / stats.suggestions) * 100 : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Process suggestion reason trends
 */
function processReasonTrends(data: any[]) {
  const reasonMap = new Map<string, { total: number; accepted: number; rejected: number; avgConfidence: number }>();

  data.forEach(item => {
    const reason = item.suggestion_reason;
    const existing = reasonMap.get(reason) || { 
      total: 0, 
      accepted: 0, 
      rejected: 0, 
      avgConfidence: 0,
      confidenceSum: 0 
    };
    
    existing.total++;
    existing.confidenceSum = (existing.confidenceSum || 0) + item.confidence_score;
    
    if (item.user_action === 'accepted') existing.accepted++;
    if (item.user_action === 'rejected') existing.rejected++;
    
    existing.avgConfidence = existing.confidenceSum / existing.total;
    
    reasonMap.set(reason, existing);
  });

  return Array.from(reasonMap.entries()).map(([reason, stats]) => ({
    reason,
    total: stats.total,
    accepted: stats.accepted,
    rejected: stats.rejected,
    acceptanceRate: stats.total > 0 ? (stats.accepted / stats.total) * 100 : 0,
    avgConfidence: stats.avgConfidence,
  }));
}

/**
 * Process confidence level trends
 */
function processConfidenceTrends(data: any[]) {
  const confidenceRanges = [
    { min: 0, max: 40, label: '0-40' },
    { min: 40, max: 60, label: '40-60' },
    { min: 60, max: 80, label: '60-80' },
    { min: 80, max: 100, label: '80-100' },
  ];

  return confidenceRanges.map(range => {
    const inRange = data.filter(item => 
      item.confidence_score >= range.min && item.confidence_score < range.max
    );
    
    const accepted = inRange.filter(item => item.user_action === 'accepted').length;
    
    return {
      range: range.label,
      total: inRange.length,
      accepted,
      acceptanceRate: inRange.length > 0 ? (accepted / inRange.length) * 100 : 0,
    };
  });
}

/**
 * Process rank performance trends
 */
function processRankTrends(data: any[]) {
  const rankMap = new Map<number, { total: number; accepted: number }>();

  data.forEach(item => {
    const rank = item.rank_position;
    const existing = rankMap.get(rank) || { total: 0, accepted: 0 };
    
    existing.total++;
    if (item.user_action === 'accepted') existing.accepted++;
    
    rankMap.set(rank, existing);
  });

  return Array.from(rankMap.entries())
    .map(([rank, stats]) => ({
      rank,
      total: stats.total,
      accepted: stats.accepted,
      acceptanceRate: stats.total > 0 ? (stats.accepted / stats.total) * 100 : 0,
    }))
    .sort((a, b) => a.rank - b.rank);
}

/**
 * Get most common suggestion reason
 */
function getMostCommonReason(data: any[]) {
  const reasonCounts = new Map<string, number>();
  
  data.forEach(item => {
    const reason = item.suggestion_reason;
    reasonCounts.set(reason, (reasonCounts.get(reason) || 0) + 1);
  });

  let mostCommon = '';
  let maxCount = 0;
  
  reasonCounts.forEach((count, reason) => {
    if (count > maxCount) {
      maxCount = count;
      mostCommon = reason;
    }
  });

  return { reason: mostCommon, count: maxCount };
}

/**
 * Generate comprehensive analytics report
 */
async function generateAnalyticsReport(userId: string, params: any = {}) {
  const periodDays = params.periodDays || 30;
  const suggestionsService = getCaseSuggestionsService();
  const learningService = getSuggestionLearningService();

  try {
    const [analytics, insights, trendData] = await Promise.all([
      suggestionsService.getSuggestionAnalytics(periodDays),
      learningService.generateLearningInsights(periodDays),
      getDetailedTrends(periodDays, userId),
    ]);

    return {
      reportId: `report_${Date.now()}`,
      generatedAt: new Date().toISOString(),
      period: {
        days: periodDays,
        startDate: new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString(),
      },
      summary: {
        totalSuggestions: analytics.totalSuggestions,
        acceptanceRate: analytics.acceptanceRate,
        avgConfidenceAccepted: analytics.avgConfidenceAccepted,
        rank1Accuracy: analytics.rank1Accuracy,
        topReasons: analytics.topReasons,
      },
      insights,
      trends: trendData,
      recommendations: generateRecommendations(analytics, insights),
    };
  } catch (error) {
    console.error('Failed to generate analytics report:', error);
    throw error;
  }
}

/**
 * Generate recommendations based on analytics and insights
 */
function generateRecommendations(analytics: any, insights: any[]) {
  const recommendations: Array<{
    type: string;
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    action: string;
  }> = [];

  // Low acceptance rate recommendation
  if (analytics.acceptanceRate < 30) {
    recommendations.push({
      type: 'model_improvement',
      priority: 'high',
      title: 'Improve Suggestion Accuracy',
      description: `Current acceptance rate is ${analytics.acceptanceRate.toFixed(1)}%, which is below the recommended 50% threshold.`,
      action: 'Consider retraining the model with more recent data or adjusting confidence thresholds.',
    });
  }

  // Poor rank 1 performance
  if (analytics.rank1Accuracy < 40) {
    recommendations.push({
      type: 'ranking_improvement',
      priority: 'high',
      title: 'Improve Top Suggestion Quality',
      description: `Only ${analytics.rank1Accuracy.toFixed(1)}% of top suggestions are being accepted.`,
      action: 'Review and improve the ranking algorithm to prioritize higher-quality suggestions.',
    });
  }

  // Add insight-based recommendations
  insights.forEach(insight => {
    if (insight.actionable && insight.impact === 'high') {
      recommendations.push({
        type: 'insight_based',
        priority: insight.impact,
        title: insight.title,
        description: insight.description,
        action: 'Review the detailed insight data and implement suggested improvements.',
      });
    }
  });

  // Data volume recommendations
  if (analytics.totalSuggestions < 50) {
    recommendations.push({
      type: 'data_collection',
      priority: 'medium',
      title: 'Increase Data Collection',
      description: 'Limited suggestion data may impact learning accuracy.',
      action: 'Encourage more email assignments to gather training data for better suggestions.',
    });
  }

  return recommendations;
}