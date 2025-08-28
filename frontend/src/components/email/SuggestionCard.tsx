/**
 * Suggestion Card Component
 * Individual case suggestion display with actions
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  X, 
  Eye, 
  Search, 
  ExternalLink,
  TrendingUp,
  User,
  Calendar,
  Building,
  Hash,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { EmailSuggestion } from '@/hooks/useEmailSuggestions';
import { useSuggestionItem } from '@/hooks/useSuggestionFeedback';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

export interface SuggestionCardProps {
  suggestion: EmailSuggestion;
  isSelected?: boolean;
  onSelect?: () => void;
  onAccept?: () => void;
  onReject?: (feedback?: string) => void;
  onViewCase?: () => void;
  onFindSimilar?: () => void;
  showRank?: boolean;
  compact?: boolean;
  className?: string;
}

export function SuggestionCard({
  suggestion,
  isSelected = false,
  onSelect,
  onAccept,
  onReject,
  onViewCase,
  onFindSimilar,
  showRank = true,
  compact = false,
  className,
}: SuggestionCardProps) {
  const [rejectionFeedback, setRejectionFeedback] = useState('');
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);

  const {
    isSubmitting,
    lastAction,
    accept,
    reject,
    viewCase,
    findSimilar,
  } = useSuggestionItem({
    suggestionId: suggestion.id,
    onFeedbackSubmitted: (action, success) => {
      if (success) {
        if (action === 'accepted' && onAccept) onAccept();
        if (action === 'rejected' && onReject) onReject(rejectionFeedback);
      }
    },
  });

  const handleAccept = async () => {
    await accept({ suggestionRank: suggestion.rank });
  };

  const handleRejectWithFeedback = async () => {
    await reject(rejectionFeedback);
    setShowRejectionDialog(false);
    setRejectionFeedback('');
  };

  const handleViewCase = () => {
    viewCase();
    onViewCase?.();
  };

  const handleFindSimilar = () => {
    findSimilar();
    onFindSimilar?.();
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getConfidenceIcon = (label: 'high' | 'medium' | 'low') => {
    switch (label) {
      case 'high': return '🎯';
      case 'medium': return '🔍';
      case 'low': return '❓';
    }
  };

  const getSuggestionReasonIcon = (reason: string) => {
    switch (reason) {
      case 'case_number_match': return <Hash className="h-3 w-3" />;
      case 'client_match': return <User className="h-3 w-3" />;
      case 'content_analysis': return <MessageSquare className="h-3 w-3" />;
      case 'pattern_match': return <TrendingUp className="h-3 w-3" />;
      case 'recent_activity': return <Clock className="h-3 w-3" />;
      case 'contact_match': return <User className="h-3 w-3" />;
      case 'subject_similarity': return <MessageSquare className="h-3 w-3" />;
      case 'entity_match': return <Building className="h-3 w-3" />;
      default: return <Search className="h-3 w-3" />;
    }
  };

  const formatLastActivity = (dateString?: string) => {
    if (!dateString) return null;
    
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  if (compact) {
    return (
      <Card 
        className={cn(
          'cursor-pointer transition-all hover:shadow-md',
          isSelected && 'ring-2 ring-primary',
          lastAction === 'accepted' && 'border-green-500 bg-green-50',
          lastAction === 'rejected' && 'border-red-500 bg-red-50',
          className
        )}
        onClick={onSelect}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {showRank && (
                  <Badge variant="outline" className="text-xs px-1 py-0">
                    #{suggestion.rank}
                  </Badge>
                )}
                <span className="font-medium text-sm truncate">
                  {suggestion.caseNumber}
                </span>
                <Badge className={cn("text-xs", getConfidenceColor(suggestion.confidenceScore))}>
                  {suggestion.confidenceScore}%
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {suggestion.clientName} • {suggestion.caseTitle}
              </p>
            </div>
            
            <div className="flex items-center gap-1 ml-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAccept();
                      }}
                      disabled={isSubmitting}
                      className="h-6 w-6 p-0"
                    >
                      <CheckCircle className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Accept suggestion</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className={cn(
        'cursor-pointer transition-all hover:shadow-md',
        isSelected && 'ring-2 ring-primary',
        lastAction === 'accepted' && 'border-green-500 bg-green-50',
        lastAction === 'rejected' && 'border-red-500 bg-red-50',
        className
      )}
      onClick={onSelect}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {showRank && (
              <Badge variant="outline" className="text-xs">
                #{suggestion.rank}
              </Badge>
            )}
            <div>
              <h4 className="font-semibold text-base">{suggestion.caseNumber}</h4>
              <p className="text-sm text-muted-foreground">{suggestion.caseTitle}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge className={cn("text-xs", getConfidenceColor(suggestion.confidenceScore))}>
              {getConfidenceIcon(suggestion.confidenceLabel)} {suggestion.confidenceScore}%
            </Badge>
            
            {lastAction && (
              <Badge 
                variant={lastAction === 'accepted' ? 'default' : 'destructive'}
                className="text-xs"
              >
                {lastAction === 'accepted' ? <ThumbsUp className="h-3 w-3" /> : <ThumbsDown className="h-3 w-3" />}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Case Details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Client:</span>
              <span className="font-medium">{suggestion.clientName}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge 
                variant={suggestion.caseStatus === 'active' ? 'default' : 'secondary'}
                className="text-xs"
              >
                {suggestion.caseStatus}
              </Badge>
              {suggestion.practiceArea && (
                <Badge variant="outline" className="text-xs">
                  {suggestion.practiceArea}
                </Badge>
              )}
            </div>
          </div>

          {/* Suggestion Reason */}
          <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
            {getSuggestionReasonIcon(suggestion.suggestionReason)}
            <span className="text-sm font-medium">{suggestion.matchReasonDescription}</span>
          </div>

          {/* Additional Info */}
          {(suggestion.lastActivity || suggestion.assignedAttorneys?.length) && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              {suggestion.lastActivity && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>Last activity: {formatLastActivity(suggestion.lastActivity)}</span>
                </div>
              )}
              
              {suggestion.assignedAttorneys && suggestion.assignedAttorneys.length > 0 && (
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span>{suggestion.assignedAttorneys.length} attorney{suggestion.assignedAttorneys.length !== 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewCase();
                }}
                variant="ghost"
                className="text-xs h-8"
              >
                <Eye className="h-3 w-3 mr-1" />
                View Case
              </Button>
              
              {suggestion.actions.some(a => a.type === 'similar_cases') && (
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFindSimilar();
                  }}
                  variant="ghost"
                  className="text-xs h-8"
                >
                  <Search className="h-3 w-3 mr-1" />
                  Similar
                </Button>
              )}
            </div>

            <div className="flex items-center gap-1">
              <Dialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => e.stopPropagation()}
                    disabled={isSubmitting || lastAction === 'rejected'}
                    className="text-xs h-8"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Reject
                  </Button>
                </DialogTrigger>
                <DialogContent onClick={(e) => e.stopPropagation()}>
                  <DialogHeader>
                    <DialogTitle>Reject Suggestion</DialogTitle>
                    <DialogDescription>
                      Help us improve by telling us why this suggestion isn't relevant.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Textarea
                      placeholder="Optional: Why isn't this case a good match?"
                      value={rejectionFeedback}
                      onChange={(e) => setRejectionFeedback(e.target.value)}
                      className="min-h-[100px]"
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowRejectionDialog(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleRejectWithFeedback}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? 'Submitting...' : 'Reject'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAccept();
                }}
                disabled={isSubmitting || lastAction === 'accepted'}
                className="text-xs h-8"
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                {isSubmitting ? 'Assigning...' : 'Assign'}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}