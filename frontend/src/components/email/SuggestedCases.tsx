/**
 * Suggested Cases Component
 * Displays AI-powered case suggestions for email assignment
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Sparkles, 
  TrendingUp, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  X, 
  Eye,
  Search,
  RefreshCw,
  Brain,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEmailSuggestions, EmailSuggestion } from '@/hooks/useEmailSuggestions';
import { SuggestionCard } from './SuggestionCard';
import { SuggestionExplanation } from './SuggestionExplanation';

export interface SuggestedCasesProps {
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
  onCaseSelect: (suggestion: EmailSuggestion) => void;
  onManualSearch: () => void;
  className?: string;
  showEmailAnalysis?: boolean;
  autoFetch?: boolean;
}

export function SuggestedCases({
  emailId,
  emailContent,
  onCaseSelect,
  onManualSearch,
  className,
  showEmailAnalysis = true,
  autoFetch = true,
}: SuggestedCasesProps) {
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | null>(null);
  const [showExplanations, setShowExplanations] = useState(false);

  const {
    suggestions,
    emailAnalysis,
    isLoading,
    error,
    processingTime,
    fromCache,
    fetchSuggestions,
    reanalyzeSuggestions,
    acceptSuggestion,
    rejectSuggestion,
  } = useEmailSuggestions({
    emailId,
    autoFetch,
    onError: (error) => console.error('Suggestion error:', error),
  });

  // Fetch suggestions when component mounts or emailId changes
  useEffect(() => {
    if (emailId && !autoFetch) {
      fetchSuggestions(emailId);
    }
  }, [emailId, autoFetch, fetchSuggestions]);

  const handleSuggestionSelect = (suggestion: EmailSuggestion) => {
    setSelectedSuggestionId(suggestion.id);
    onCaseSelect(suggestion);
  };

  const handleSuggestionAccept = async (suggestionId: string, suggestion: EmailSuggestion) => {
    await acceptSuggestion(suggestionId, {
      suggestionRank: suggestion.rank,
      timeToDecision: Date.now() - (Date.now() - 10000), // Approximate
    });
    handleSuggestionSelect(suggestion);
  };

  const handleSuggestionReject = async (suggestionId: string, feedback?: string) => {
    await rejectSuggestion(suggestionId, feedback);
  };

  const handleReanalyze = async () => {
    if (emailContent) {
      await reanalyzeSuggestions(emailId, emailContent);
    }
  };

  const handleRefresh = () => {
    fetchSuggestions(emailId, true);
  };

  const getConfidenceColor = (confidence: 'high' | 'medium' | 'low') => {
    switch (confidence) {
      case 'high': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency?.toLowerCase()) {
      case 'urgent': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">AI Suggestions</h3>
          {fromCache && (
            <Badge variant="secondary" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              Cached
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowExplanations(!showExplanations)}
            className="text-xs"
          >
            <Brain className="h-4 w-4 mr-1" />
            {showExplanations ? 'Hide' : 'Show'} Logic
          </Button>
          
          {emailContent && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleReanalyze}
              disabled={isLoading}
              className="text-xs"
            >
              <RefreshCw className={cn("h-4 w-4 mr-1", isLoading && "animate-spin")} />
              Reanalyze
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            className="text-xs"
          >
            <RefreshCw className={cn("h-4 w-4 mr-1", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Email Analysis Summary */}
      {showEmailAnalysis && emailAnalysis && (
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Email Analysis
              </CardTitle>
              {processingTime > 0 && (
                <Badge variant="outline" className="text-xs">
                  {processingTime}ms
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge 
                  variant="outline" 
                  className={cn("text-xs", getConfidenceColor(emailAnalysis.confidence))}
                >
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {emailAnalysis.confidence.toUpperCase()} Confidence
                </Badge>
                
                <Badge 
                  variant="outline" 
                  className={cn("text-xs", getUrgencyColor(emailAnalysis.urgency))}
                >
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {emailAnalysis.urgency.toUpperCase()} Priority
                </Badge>
                
                <Badge variant="outline" className="text-xs">
                  {emailAnalysis.intent.replace(/_/g, ' ').toUpperCase()}
                </Badge>
              </div>
              
              <p className="text-sm text-muted-foreground">
                {emailAnalysis.summary}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-4 w-48" />
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-4 w-4" />
              <p className="text-sm font-medium">Failed to get suggestions</p>
            </div>
            <p className="text-sm text-red-600 mt-1">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="mt-3"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Suggestions List */}
      {!isLoading && !error && suggestions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''} found</span>
            {emailAnalysis?.confidence && (
              <span className={getConfidenceColor(emailAnalysis.confidence)}>
                {emailAnalysis.confidence.toUpperCase()} overall confidence
              </span>
            )}
          </div>

          {suggestions.map((suggestion, index) => (
            <div key={suggestion.id} className="space-y-2">
              <SuggestionCard
                suggestion={suggestion}
                isSelected={selectedSuggestionId === suggestion.id}
                onSelect={() => handleSuggestionSelect(suggestion)}
                onAccept={() => handleSuggestionAccept(suggestion.id, suggestion)}
                onReject={(feedback) => handleSuggestionReject(suggestion.id, feedback)}
                showRank={true}
              />
              
              {showExplanations && (
                <SuggestionExplanation
                  suggestion={suggestion}
                  className="ml-4"
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* No Suggestions State */}
      {!isLoading && !error && suggestions.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="pt-6 text-center">
            <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h4 className="font-medium mb-2">No suggestions found</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Our AI couldn't find any matching cases for this email. Try manual search or check if the email content provides enough context.
            </p>
            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                onClick={onManualSearch}
              >
                <Search className="h-4 w-4 mr-2" />
                Manual Search
              </Button>
              {emailContent && (
                <Button
                  variant="outline"
                  onClick={handleReanalyze}
                >
                  <Brain className="h-4 w-4 mr-2" />
                  Reanalyze
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fallback Manual Search */}
      {!isLoading && suggestions.length > 0 && (
        <div className="pt-2">
          <Separator className="mb-4" />
          <Button
            variant="ghost"
            onClick={onManualSearch}
            className="w-full text-muted-foreground hover:text-foreground"
          >
            <Search className="h-4 w-4 mr-2" />
            Can't find the right case? Search manually
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Compact version for smaller spaces
 */
export interface CompactSuggestedCasesProps extends Omit<SuggestedCasesProps, 'showEmailAnalysis'> {
  maxSuggestions?: number;
}

export function CompactSuggestedCases({
  maxSuggestions = 3,
  ...props
}: CompactSuggestedCasesProps) {
  return (
    <SuggestedCases 
      {...props} 
      showEmailAnalysis={false}
      className={cn("space-y-2", props.className)}
    />
  );
}