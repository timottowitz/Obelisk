'use client';

import { useState, useEffect } from 'react';
import { useAIInsightsRealtime, useAIInsightOpenListener } from '@/hooks/useAIInsightsRealtime';
import { useFeature } from '@/lib/feature-flags';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Bell, 
  Brain, 
  CheckCircle, 
  XCircle, 
  Clock,
  Calendar,
  User,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePendingAIInsights, useReviewAITask } from '@/hooks/useAIInsights';
import { AISuggestionBadge } from './ai-suggestion-badge';
import { AISuggestionPanel } from './ai-suggestion-panel';
import type { AITaskInsightWithDetails } from '@/types/ai-insights';
import { format } from 'date-fns';

interface AINotificationCenterProps {
  className?: string;
}

export function AINotificationCenter({ className }: AINotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState<AITaskInsightWithDetails | null>(null);
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);
  
  const aiSuggestionsEnabled = useFeature('aiSuggestions');
  const realtimeEnabled = useFeature('aiSuggestionsRealtime');
  const bulkReviewEnabled = useFeature('aiSuggestionsBulkReview');
  
  const { data: pendingInsights = [], isLoading } = usePendingAIInsights();
  const reviewMutation = useReviewAITask();
  
  // Enable real-time updates if feature flag is on
  // if (realtimeEnabled) {
  //   useAIInsightsRealtime();
  // }
  
  // // Listen for external open events
  // useAIInsightOpenListener((insight) => {
  //   setSelectedInsight(insight);
  //   setIsAIPanelOpen(true);
  //   setIsOpen(false);
  // });
  
  // Don't render if feature is disabled
  if (!aiSuggestionsEnabled) {
    return null;
  }

  const handleQuickAccept = async (insight: AITaskInsightWithDetails, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await reviewMutation.mutateAsync({
        insight_id: insight.id,
        decision: 'accept',
      });
    } catch (error) {
      console.error('Failed to accept AI suggestion:', error);
    }
  };

  const handleQuickReject = async (insight: AITaskInsightWithDetails, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await reviewMutation.mutateAsync({
        insight_id: insight.id,
        decision: 'reject',
      });
    } catch (error) {
      console.error('Failed to reject AI suggestion:', error);
    }
  };

  const handleViewInsight = (insight: AITaskInsightWithDetails) => {
    setSelectedInsight(insight);
    setIsAIPanelOpen(true);
    setIsOpen(false);
  };

  const getSourceIcon = (sourceType?: string) => {
    switch (sourceType) {
      case 'document': return <FileText className="h-4 w-4" />;
      case 'transcript': return <FileText className="h-4 w-4" />;
      case 'email': return <FileText className="h-4 w-4" />;
      case 'chat': return <FileText className="h-4 w-4" />;
      default: return <Brain className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'border-red-200 bg-red-50';
      case 'high': return 'border-orange-200 bg-orange-50';
      case 'medium': return 'border-yellow-200 bg-yellow-50';
      case 'low': return 'border-green-200 bg-green-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'relative flex items-center gap-2 px-3 py-2',
              className
            )}
          >
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">AI Insights</span>
            {pendingInsights.length > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs font-bold bg-blue-600 hover:bg-blue-700"
              >
                {pendingInsights.length > 99 ? '99+' : pendingInsights.length}
              </Badge>
            )}
          </Button>
        </SheetTrigger>

        <SheetContent className="w-[500px] sm:max-w-[500px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-blue-600" />
              AI Task Suggestions
              {pendingInsights.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {pendingInsights.length} pending
                </Badge>
              )}
            </SheetTitle>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-120px)] mt-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm text-gray-500">Loading suggestions...</span>
                </div>
              </div>
            ) : pendingInsights.length > 0 ? (
              <div className="space-y-3">
                {pendingInsights.map((insight) => (
                  <Card
                    key={insight.id}
                    className={cn(
                      'cursor-pointer transition-all hover:shadow-md',
                      getPriorityColor(insight.suggested_priority)
                    )}
                    onClick={() => handleViewInsight(insight)}
                  >
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            {getSourceIcon(insight.source_type)}
                            <AISuggestionBadge
                              status={insight.status}
                              confidence={insight.confidence_score}
                              size="sm"
                            />
                          </div>
                          <div className="text-xs text-gray-500">
                            {format(new Date(insight.created_at), 'MMM d, h:mm a')}
                          </div>
                        </div>

                        {/* Content */}
                        <div>
                          <h4 className="font-medium text-sm line-clamp-2">
                            {insight.suggested_title}
                          </h4>
                          {insight.suggested_description && (
                            <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                              {insight.suggested_description}
                            </p>
                          )}
                        </div>

                        {/* Meta Info */}
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          {insight.case && (
                            <div className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              <span>{insight.case.case_number}</span>
                            </div>
                          )}
                          {insight.suggested_due_date && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>
                                Due {format(new Date(insight.suggested_due_date), 'MMM d')}
                              </span>
                            </div>
                          )}
                          {insight.assignee && (
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              <span>{insight.assignee.name}</span>
                            </div>
                          )}
                        </div>

                        <Separator className="my-2" />

                        {/* Actions */}
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-gray-500">
                            {insight.confidence_score && (
                              <span>
                                {Math.round(insight.confidence_score * 100)}% confidence
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => handleQuickReject(insight, e)}
                              disabled={reviewMutation.isPending}
                              className="h-6 px-2 text-xs text-red-600 border-red-200 hover:bg-red-50"
                            >
                              <XCircle className="h-3 w-3 mr-1" />
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              onClick={(e) => handleQuickAccept(insight, e)}
                              disabled={reviewMutation.isPending}
                              className="h-6 px-2 text-xs bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Accept
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-gray-100 p-4 mb-4">
                  <Brain className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="font-medium text-gray-900 mb-2">
                  No AI suggestions
                </h3>
                <p className="text-sm text-gray-500 max-w-xs">
                  AI task suggestions will appear here when they&apos;are generated from your documents, transcripts, and other sources.
                </p>
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* AI Suggestion Panel */}
      {selectedInsight && (
        <AISuggestionPanel
          insight={selectedInsight}
          open={isAIPanelOpen}
          onOpenChange={(open) => {
            setIsAIPanelOpen(open);
            if (!open) {
              setSelectedInsight(null);
            }
          }}
        />
      )}
    </>
  );
}

interface AIInsightBadgeProps {
  className?: string;
}

export function AIInsightBadge({ className }: AIInsightBadgeProps) {
  const { data: pendingInsights = [] } = usePendingAIInsights();

  if (pendingInsights.length === 0) return null;

  return (
    <Badge
      variant="destructive"
      className={cn(
        'bg-blue-600 hover:bg-blue-700 text-white',
        className
      )}
    >
      {pendingInsights.length > 99 ? '99+' : pendingInsights.length}
    </Badge>
  );
}