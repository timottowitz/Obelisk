/**
 * Suggestion Explanation Component
 * Shows detailed explanation of why a case was suggested
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  ChevronDown, 
  ChevronRight, 
  Hash, 
  User, 
  MessageSquare, 
  TrendingUp, 
  Clock, 
  Building, 
  Search,
  Brain,
  Target,
  Zap,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { EmailSuggestion } from '@/hooks/useEmailSuggestions';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

export interface SuggestionExplanationProps {
  suggestion: EmailSuggestion;
  className?: string;
  defaultExpanded?: boolean;
}

export function SuggestionExplanation({
  suggestion,
  className,
  defaultExpanded = false,
}: SuggestionExplanationProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const getReasonIcon = (reason: string) => {
    switch (reason) {
      case 'case_number_match': return <Hash className="h-4 w-4" />;
      case 'client_match': return <User className="h-4 w-4" />;
      case 'content_analysis': return <MessageSquare className="h-4 w-4" />;
      case 'pattern_match': return <TrendingUp className="h-4 w-4" />;
      case 'recent_activity': return <Clock className="h-4 w-4" />;
      case 'contact_match': return <User className="h-4 w-4" />;
      case 'subject_similarity': return <MessageSquare className="h-4 w-4" />;
      case 'entity_match': return <Building className="h-4 w-4" />;
      default: return <Search className="h-4 w-4" />;
    }
  };

  const getReasonColor = (reason: string) => {
    switch (reason) {
      case 'case_number_match': return 'bg-green-50 text-green-700 border-green-200';
      case 'client_match': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'content_analysis': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'pattern_match': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'recent_activity': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'contact_match': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'subject_similarity': return 'bg-pink-50 text-pink-700 border-pink-200';
      case 'entity_match': return 'bg-teal-50 text-teal-700 border-teal-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const renderMatchCriteria = () => {
    const criteria = suggestion.matchCriteria;
    if (!criteria) return null;

    const renderCriteriaItem = (key: string, value: any) => {
      if (Array.isArray(value)) {
        return (
          <div key={key} className="flex flex-wrap gap-1">
            <span className="text-sm font-medium text-muted-foreground">{key}:</span>
            {value.map((item, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {typeof item === 'object' ? JSON.stringify(item) : String(item)}
              </Badge>
            ))}
          </div>
        );
      }

      if (typeof value === 'object' && value !== null) {
        return (
          <div key={key} className="space-y-1">
            <span className="text-sm font-medium text-muted-foreground">{key}:</span>
            <div className="ml-2 space-y-1">
              {Object.entries(value).map(([subKey, subValue]) => (
                <div key={subKey} className="text-xs">
                  <span className="font-medium">{subKey}:</span> {String(subValue)}
                </div>
              ))}
            </div>
          </div>
        );
      }

      return (
        <div key={key} className="text-sm">
          <span className="font-medium text-muted-foreground">{key}:</span>
          <span className="ml-1">{String(value)}</span>
        </div>
      );
    };

    return (
      <div className="space-y-2">
        {Object.entries(criteria).map(([key, value]) => renderCriteriaItem(key, value))}
      </div>
    );
  };

  const getConfidenceDescription = (score: number) => {
    if (score >= 90) return 'Very high confidence - Strong indicators suggest this is the correct case';
    if (score >= 80) return 'High confidence - Multiple factors align with this case';
    if (score >= 70) return 'Good confidence - Several matching elements found';
    if (score >= 60) return 'Medium confidence - Some relevant matches detected';
    if (score >= 40) return 'Low confidence - Limited but relevant connections';
    return 'Very low confidence - Weak correlation with this case';
  };

  const getScoreGradient = (score: number) => {
    if (score >= 80) return 'from-green-100 to-green-200';
    if (score >= 60) return 'from-yellow-100 to-yellow-200';
    return 'from-red-100 to-red-200';
  };

  return (
    <Card className={cn("border-l-4 border-l-muted", className)}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Brain className="h-4 w-4" />
                AI Reasoning
                <Badge variant="outline" className="text-xs">
                  Confidence: {suggestion.confidenceScore}%
                </Badge>
              </CardTitle>
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="space-y-4">
              {/* Confidence Score Visualization */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium flex items-center gap-1">
                    <Target className="h-3 w-3" />
                    Confidence Score
                  </span>
                  <span className={cn(
                    "font-bold",
                    suggestion.confidenceScore >= 80 ? "text-green-600" :
                    suggestion.confidenceScore >= 60 ? "text-yellow-600" : "text-red-600"
                  )}>
                    {suggestion.confidenceScore}%
                  </span>
                </div>
                
                <div className="relative">
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full bg-gradient-to-r transition-all duration-500",
                        getScoreGradient(suggestion.confidenceScore)
                      )}
                      style={{ width: `${suggestion.confidenceScore}%` }}
                    />
                  </div>
                </div>
                
                <p className="text-xs text-muted-foreground">
                  {getConfidenceDescription(suggestion.confidenceScore)}
                </p>
              </div>

              <Separator />

              {/* Suggestion Reason */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  Primary Reason
                </h4>
                <div className={cn(
                  "flex items-center gap-2 p-3 rounded-lg border",
                  getReasonColor(suggestion.suggestionReason)
                )}>
                  {getReasonIcon(suggestion.suggestionReason)}
                  <div>
                    <div className="font-medium text-sm">
                      {suggestion.matchReasonDescription}
                    </div>
                    <div className="text-xs opacity-75">
                      {suggestion.explanation}
                    </div>
                  </div>
                </div>
              </div>

              {/* Match Criteria */}
              {suggestion.matchCriteria && Object.keys(suggestion.matchCriteria).length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      Match Details
                    </h4>
                    <div className="bg-muted/50 p-3 rounded-lg">
                      {renderMatchCriteria()}
                    </div>
                  </div>
                </>
              )}

              {/* Case Information */}
              <Separator />
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="font-medium text-muted-foreground">Case Number:</span>
                  <div className="font-mono">{suggestion.caseNumber}</div>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Client:</span>
                  <div>{suggestion.clientName}</div>
                </div>
                <div className="col-span-2">
                  <span className="font-medium text-muted-foreground">Title:</span>
                  <div>{suggestion.caseTitle}</div>
                </div>
              </div>

              {/* Additional Context */}
              {(suggestion.practiceArea || suggestion.lastActivity) && (
                <>
                  <Separator />
                  <div className="flex flex-wrap gap-2">
                    {suggestion.practiceArea && (
                      <Badge variant="outline" className="text-xs">
                        {suggestion.practiceArea}
                      </Badge>
                    )}
                    {suggestion.lastActivity && (
                      <Badge variant="outline" className="text-xs">
                        <Clock className="h-2 w-2 mr-1" />
                        Last activity: {new Date(suggestion.lastActivity).toLocaleDateString()}
                      </Badge>
                    )}
                    {suggestion.caseStatus && (
                      <Badge 
                        variant={suggestion.caseStatus === 'active' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {suggestion.caseStatus}
                      </Badge>
                    )}
                  </div>
                </>
              )}

              {/* Rank Information */}
              {suggestion.rank && (
                <>
                  <Separator />
                  <div className="text-xs text-muted-foreground text-center">
                    Ranked #{suggestion.rank} out of all suggestions for this email
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

/**
 * Compact explanation tooltip version
 */
export interface SuggestionTooltipProps {
  suggestion: EmailSuggestion;
  children: React.ReactNode;
}

export function SuggestionTooltip({ suggestion, children }: SuggestionTooltipProps) {
  return (
    <div className="group relative">
      {children}
      <div className="absolute left-0 top-full mt-2 w-80 p-3 bg-white border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">AI Reasoning</span>
            <Badge variant="outline" className="text-xs">
              {suggestion.confidenceScore}%
            </Badge>
          </div>
          
          <div className="text-xs text-muted-foreground">
            {suggestion.matchReasonDescription}
          </div>
          
          <div className="text-xs">
            {suggestion.explanation}
          </div>
          
          {suggestion.matchCriteria?.matchedFields && (
            <div className="flex flex-wrap gap-1 pt-1 border-t">
              {suggestion.matchCriteria.matchedFields.map((field: string, index: number) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {field}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}