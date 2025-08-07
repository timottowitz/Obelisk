'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Brain, 
  CheckCircle, 
  XCircle, 
  Calendar, 
  User, 
  AlertTriangle,
  FileText,
  MessageSquare,
  Mail,
  Mic,
  Edit3,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AITaskInsightWithDetails, ExtractedEntity } from '@/types/ai-insights';
import { AISuggestionBadge, AIConfidenceBar } from './ai-suggestion-badge';
import { useReviewAITask } from '@/hooks/useAIInsights';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface AISuggestionPanelProps {
  insight: AITaskInsightWithDetails;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AISuggestionPanel({ 
  insight, 
  trigger, 
  open, 
  onOpenChange 
}: AISuggestionPanelProps) {
  const [rejectionReason, setRejectionReason] = useState('');
  const reviewMutation = useReviewAITask();

  const handleAccept = async () => {
    try {
      await reviewMutation.mutateAsync({
        insight_id: insight.id,
        decision: 'accept',
      });
      onOpenChange?.(false);
    } catch (error) {
      console.error('Failed to accept AI suggestion:', error);
    }
  };

  const handleReject = async () => {
    try {
      await reviewMutation.mutateAsync({
        insight_id: insight.id,
        decision: 'reject',
        reason: rejectionReason || undefined,
      });
      onOpenChange?.(false);
    } catch (error) {
      console.error('Failed to reject AI suggestion:', error);
    }
  };

  const getSourceIcon = (sourceType?: string) => {
    switch (sourceType) {
      case 'document': return <FileText className="h-4 w-4" />;
      case 'transcript': return <Mic className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      case 'chat': return <MessageSquare className="h-4 w-4" />;
      default: return <Brain className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'person': return <User className="h-3 w-3" />;
      case 'date': return <Calendar className="h-3 w-3" />;
      case 'deadline': return <Clock className="h-3 w-3" />;
      default: return <FileText className="h-3 w-3" />;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}
      <SheetContent className="w-[600px] sm:max-w-[600px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-blue-600" />
            AI Task Suggestion
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] mt-6">
          <div className="space-y-6">
            {/* Status and Confidence */}
            <div className="flex items-center justify-between">
              <AISuggestionBadge
                status={insight.status}
                confidence={insight.confidence_score}
                size="md"
                showConfidence
              />
              {insight.confidence_score && (
                <AIConfidenceBar 
                  confidence={insight.confidence_score}
                  className="flex-1 ml-4"
                />
              )}
            </div>

            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="entities">Entities</TabsTrigger>
                <TabsTrigger value="raw">Raw Data</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                {/* Task Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Edit3 className="h-4 w-4" />
                      Suggested Task
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Title</label>
                      <p className="font-medium">{insight.suggested_title}</p>
                    </div>

                    {insight.suggested_description && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Description</label>
                        <p className="text-sm text-gray-700 mt-1">{insight.suggested_description}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Priority</label>
                        <Badge 
                          variant="outline" 
                          className={cn('mt-1', getPriorityColor(insight.suggested_priority))}
                        >
                          {insight.suggested_priority}
                        </Badge>
                      </div>

                      {insight.suggested_due_date && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Due Date</label>
                          <div className="flex items-center gap-1 mt-1">
                            <Calendar className="h-3 w-3 text-gray-500" />
                            <span className="text-sm">
                              {format(new Date(insight.suggested_due_date), 'MMM d, yyyy')}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {insight.assignee && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Suggested Assignee</label>
                        <div className="flex items-center gap-2 mt-1">
                          <User className="h-3 w-3 text-gray-500" />
                          <span className="text-sm">{insight.assignee.name}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Source Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {getSourceIcon(insight.source_type)}
                      Source Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {insight.source_type && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Source Type</label>
                        <p className="text-sm capitalize">{insight.source_type}</p>
                      </div>
                    )}

                    {insight.source_reference && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Reference</label>
                        <p className="text-sm text-gray-600">{insight.source_reference}</p>
                      </div>
                    )}

                    {insight.ai_reasoning && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">AI Reasoning</label>
                        <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md">
                          {insight.ai_reasoning}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Context Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Context</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {insight.case && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Case</label>
                        <p className="text-sm">{insight.case.case_number} - {insight.case.title}</p>
                      </div>
                    )}

                    {insight.project && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Project</label>
                        <p className="text-sm">{insight.project.name}</p>
                      </div>
                    )}

                    <div>
                      <label className="text-sm font-medium text-gray-500">Created</label>
                      <p className="text-sm text-gray-600">
                        {format(new Date(insight.created_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="entities" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Extracted Entities</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {insight.extracted_entities.length > 0 ? (
                      <div className="space-y-3">
                        {insight.extracted_entities.map((entity: ExtractedEntity, index: number) => (
                          <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-md">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              {getEntityIcon(entity.type)}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {entity.type}
                                  </Badge>
                                  <span className="text-sm font-medium">{entity.value}</span>
                                </div>
                                {entity.context && (
                                  <p className="text-xs text-gray-600 mt-1">{entity.context}</p>
                                )}
                              </div>
                              <div className="text-xs text-gray-500">
                                {Math.round(entity.confidence * 100)}%
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-4">
                        No entities extracted from the source
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="raw" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Raw AI Data</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-xs bg-gray-50 p-4 rounded-md overflow-auto max-h-96">
                      {JSON.stringify(insight, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Actions */}
            {insight.status === 'pending' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Review Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Button
                      onClick={handleAccept}
                      disabled={reviewMutation.isPending}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Accept & Create Task
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleReject}
                      disabled={reviewMutation.isPending}
                      className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Rejection Reason (Optional)
                    </label>
                    <Textarea
                      placeholder="Explain why you're rejecting this suggestion..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="mt-1"
                      rows={3}
                    />
                  </div>

                  {insight.confidence_score < 0.7 && (
                    <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
                      <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                      <div className="text-sm">
                        <p className="font-medium text-amber-800">Low Confidence Warning</p>
                        <p className="text-amber-700">
                          This suggestion has low confidence ({Math.round(insight.confidence_score * 100)}%). 
                          Please review carefully before accepting.
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Review History */}
            {insight.status !== 'pending' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Review History</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Status:</span>
                    <AISuggestionBadge status={insight.status} size="sm" />
                  </div>

                  {insight.reviewer && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Reviewed by:</span>
                      <span className="text-sm">{insight.reviewer.name}</span>
                    </div>
                  )}

                  {insight.reviewed_at && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Reviewed on:</span>
                      <span className="text-sm">
                        {format(new Date(insight.reviewed_at), 'MMM d, yyyy h:mm a')}
                      </span>
                    </div>
                  )}

                  {insight.review_notes && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Notes:</label>
                      <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md mt-1">
                        {insight.review_notes}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}