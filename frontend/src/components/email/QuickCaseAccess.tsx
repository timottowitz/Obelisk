'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Clock, 
  Star, 
  User, 
  Mail,
  Calendar,
  ChevronRight,
  Zap,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CaseSearchResult } from './CaseAssignmentModal';
import { useCaseSearchHistory } from '@/hooks/useCaseSearchHistory';
import { caseSearchService, EnhancedSearchParams } from '@/lib/services/case-search-enhancements';

export interface QuickCaseAccessProps {
  onCaseSelect: (selectedCase: CaseSearchResult) => void;
  emailContent?: {
    subject?: string;
    fromName?: string;
    fromEmail?: string;
    body?: string;
  };
  className?: string;
}

interface QuickCaseItem {
  case: CaseSearchResult;
  reason: 'recent' | 'frequent' | 'suggested' | 'domain_match';
  subtitle: string;
  metadata?: {
    assignmentCount?: number;
    lastAssigned?: Date;
    emailCount?: number;
    confidence?: number;
  };
}

export function QuickCaseAccess({ 
  onCaseSelect, 
  emailContent,
  className 
}: QuickCaseAccessProps) {
  const [quickCases, setQuickCases] = useState<QuickCaseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  const { historyData, getRecentCases, getFrequentCases } = useCaseSearchHistory();

  // Load quick access cases
  const loadQuickCases = useCallback(async () => {
    setIsLoading(true);
    const cases: QuickCaseItem[] = [];

    try {
      // Get smart suggestions based on email content
      if (emailContent) {
        const suggestions = caseSearchService.getEmailBasedSuggestions(emailContent);
        
        for (const suggestion of suggestions) {
          try {
            if (suggestion.filters?.q || suggestion.filters?.client_domain) {
              const searchParams: EnhancedSearchParams = {
                q: suggestion.filters.q || '',
                limit: 2,
                client_domain: suggestion.filters.client_domain
              };
              
              const response = await caseSearchService.searchCases(searchParams);
              
              response.cases.forEach(caseItem => {
                cases.push({
                  case: caseItem,
                  reason: suggestion.type === 'domain_match' ? 'domain_match' : 'suggested',
                  subtitle: suggestion.description,
                  metadata: {
                    confidence: 85,
                    emailCount: caseItem.emailCount
                  }
                });
              });
            }
          } catch (error) {
            console.error('Error loading suggested cases:', error);
          }
        }
      }

      // Get recent cases from history
      const recentCases = getRecentCases(3);
      recentCases.forEach(recentCase => {
        // Avoid duplicates
        if (!cases.some(c => c.case.id === recentCase.caseId)) {
          cases.push({
            case: {
              id: recentCase.caseId,
              caseNumber: recentCase.caseNumber,
              title: recentCase.caseTitle,
              clientName: recentCase.clientName,
              status: 'active', // Assume active for recent cases
              emailCount: recentCase.emailCount,
              lastActivity: recentCase.assignedAt
            } as CaseSearchResult,
            reason: 'recent',
            subtitle: `Last used ${formatRelativeTime(recentCase.assignedAt)}`,
            metadata: {
              lastAssigned: recentCase.assignedAt,
              emailCount: recentCase.emailCount
            }
          });
        }
      });

      // Get frequent cases from history
      const frequentCases = getFrequentCases(2);
      frequentCases.forEach(frequentCase => {
        // Avoid duplicates
        if (!cases.some(c => c.case.id === frequentCase.caseId)) {
          cases.push({
            case: {
              id: frequentCase.caseId,
              caseNumber: '', // Will need to fetch full case details
              title: '',
              clientName: '',
              status: 'active',
              emailCount: frequentCase.assignmentCount
            } as CaseSearchResult,
            reason: 'frequent',
            subtitle: `${frequentCase.assignmentCount} emails assigned`,
            metadata: {
              assignmentCount: frequentCase.assignmentCount,
              lastAssigned: frequentCase.lastAssigned
            }
          });
        }
      });

      // Sort by priority: suggested > domain_match > recent > frequent
      cases.sort((a, b) => {
        const priority = { suggested: 4, domain_match: 3, recent: 2, frequent: 1 };
        return priority[b.reason] - priority[a.reason];
      });

      setQuickCases(cases.slice(0, 6)); // Limit to 6 cases
    } catch (error) {
      console.error('Error loading quick cases:', error);
    } finally {
      setIsLoading(false);
    }
  }, [emailContent, getRecentCases, getFrequentCases]);

  useEffect(() => {
    loadQuickCases();
  }, [loadQuickCases]);

  const handleCaseClick = useCallback((quickCase: QuickCaseItem) => {
    setSelectedId(quickCase.case.id);
    onCaseSelect(quickCase.case);
  }, [onCaseSelect]);

  const getReasonIcon = (reason: QuickCaseItem['reason']) => {
    switch (reason) {
      case 'suggested':
        return <Sparkles className="h-3 w-3 text-purple-500" />;
      case 'domain_match':
        return <Zap className="h-3 w-3 text-blue-500" />;
      case 'recent':
        return <Clock className="h-3 w-3 text-green-500" />;
      case 'frequent':
        return <Star className="h-3 w-3 text-yellow-500" />;
      default:
        return <Mail className="h-3 w-3 text-gray-500" />;
    }
  };

  const getReasonColor = (reason: QuickCaseItem['reason']) => {
    switch (reason) {
      case 'suggested':
        return 'border-purple-200 bg-purple-50 hover:bg-purple-100';
      case 'domain_match':
        return 'border-blue-200 bg-blue-50 hover:bg-blue-100';
      case 'recent':
        return 'border-green-200 bg-green-50 hover:bg-green-100';
      case 'frequent':
        return 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100';
      default:
        return 'border-gray-200 bg-gray-50 hover:bg-gray-100';
    }
  };

  if (isLoading) {
    return (
      <Card className={cn('', className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quick Access</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            {Array.from({ length: 4 }, (_, i) => (
              <QuickCaseSkeleton key={i} />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (quickCases.length === 0) {
    return (
      <Card className={cn('', className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quick Access</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-center py-6">
            <Mail className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No recent or suggested cases found
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Start assigning emails to see quick access suggestions
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="h-4 w-4" />
          Quick Access
          <Badge variant="outline" className="text-xs">
            {quickCases.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="max-h-80">
          <div className="space-y-2">
            {quickCases.map((quickCase) => (
              <QuickCaseItem
                key={quickCase.case.id}
                quickCase={quickCase}
                isSelected={selectedId === quickCase.case.id}
                onClick={() => handleCaseClick(quickCase)}
              />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// Individual quick case item
interface QuickCaseItemProps {
  quickCase: QuickCaseItem;
  isSelected: boolean;
  onClick: () => void;
}

function QuickCaseItem({ quickCase, isSelected, onClick }: QuickCaseItemProps) {
  const { case: caseItem, reason, subtitle, metadata } = quickCase;

  return (
    <Card 
      className={cn(
        'cursor-pointer transition-all duration-200',
        getReasonColor(reason),
        isSelected && 'ring-2 ring-primary'
      )}
    >
      <CardContent className="p-3">
        <button
          onClick={onClick}
          className="w-full text-left focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {getReasonIcon(reason)}
                <h4 className="font-medium text-sm text-foreground truncate">
                  {caseItem.caseNumber || caseItem.title}
                </h4>
                {metadata?.confidence && (
                  <Badge variant="outline" className="text-xs">
                    {metadata.confidence}%
                  </Badge>
                )}
              </div>
              
              <p className="text-sm text-foreground truncate mb-1">
                {caseItem.title}
              </p>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <User className="h-3 w-3" />
                  <span className="truncate">{caseItem.clientName}</span>
                </div>
                
                {metadata?.emailCount && metadata.emailCount > 0 && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    <span>{metadata.emailCount}</span>
                  </div>
                )}
              </div>
              
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {subtitle}
              </p>
            </div>
            
            <ChevronRight className="h-4 w-4 text-muted-foreground ml-2 flex-shrink-0" />
          </div>
        </button>
      </CardContent>
    </Card>
  );
}

// Helper function to get the reason-based styling
function getReasonColor(reason: QuickCaseItem['reason']) {
  switch (reason) {
    case 'suggested':
      return 'border-purple-200 bg-purple-50 hover:bg-purple-100';
    case 'domain_match':
      return 'border-blue-200 bg-blue-50 hover:bg-blue-100';
    case 'recent':
      return 'border-green-200 bg-green-50 hover:bg-green-100';
    case 'frequent':
      return 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100';
    default:
      return 'border-gray-200 bg-gray-50 hover:bg-gray-100';
  }
}

// Loading skeleton component
function QuickCaseSkeleton() {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-8" />
          </div>
          <Skeleton className="h-3 w-3/4" />
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-8" />
          </div>
          <Skeleton className="h-3 w-1/2" />
        </div>
      </CardContent>
    </Card>
  );
}

// Helper function to format relative time
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  } else if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  } else {
    return date.toLocaleDateString();
  }
}