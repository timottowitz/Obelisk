'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  FolderOpen, 
  Clock, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  Pause, 
  ChevronDown,
  Search,
  Mail,
  Calendar,
  Building,
  FileText,
  Star,
  Zap,
  Hash,
  Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CaseSearchResult } from './CaseAssignmentModal';

export interface CaseListProps {
  cases: CaseSearchResult[];
  selectedCaseId: string | null;
  onCaseSelect: (selectedCase: CaseSearchResult) => void;
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  emptyMessage?: string;
  query?: string;
  className?: string;
}

export interface CaseListItemProps {
  case: CaseSearchResult;
  isSelected: boolean;
  onClick: () => void;
  isHighlighted?: boolean;
}

export function CaseList({
  cases,
  selectedCaseId,
  onCaseSelect,
  isLoading,
  hasMore,
  onLoadMore,
  emptyMessage = 'No cases found',
  query = '',
  className
}: CaseListProps) {
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Reset highlighted index when cases change
  useEffect(() => {
    setHighlightedIndex(-1);
    itemRefs.current = itemRefs.current.slice(0, cases.length);
  }, [cases]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!listRef.current?.contains(document.activeElement)) return;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setHighlightedIndex(prev => 
            prev < cases.length - 1 ? prev + 1 : prev
          );
          break;
        
        case 'ArrowUp':
          event.preventDefault();
          setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
          break;
        
        case 'Enter':
          event.preventDefault();
          if (highlightedIndex >= 0 && cases[highlightedIndex]) {
            onCaseSelect(cases[highlightedIndex]);
          }
          break;
        
        case 'Escape':
          event.preventDefault();
          setHighlightedIndex(-1);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [cases, highlightedIndex, onCaseSelect]);

  // Focus highlighted item
  useEffect(() => {
    if (highlightedIndex >= 0 && itemRefs.current[highlightedIndex]) {
      itemRefs.current[highlightedIndex]?.focus();
    }
  }, [highlightedIndex]);

  const handleCaseClick = useCallback((selectedCase: CaseSearchResult, index: number) => {
    setHighlightedIndex(index);
    onCaseSelect(selectedCase);
  }, [onCaseSelect]);

  // Render loading skeleton
  if (isLoading && cases.length === 0) {
    return (
      <div className={cn('space-y-2', className)}>
        {Array.from({ length: 5 }, (_, i) => (
          <CaseListItemSkeleton key={i} />
        ))}
      </div>
    );
  }

  // Render empty state
  if (!isLoading && cases.length === 0) {
    return (
      <div className={cn('text-center py-12', className)}>
        <Search className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground mb-2">
          {query ? 'No Cases Found' : 'Start Searching'}
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          {query 
            ? `No cases match "${query}". Try a different search term or case number.`
            : 'Enter a case name, number, or client name to find cases.'
          }
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)} ref={listRef}>
      {/* Results count and metadata */}
      {cases.length > 0 && (
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-muted-foreground">
            Found {cases.length} case{cases.length !== 1 ? 's' : ''}
            {query && ` for "${query}"`}
          </div>
          {cases.some(c => c.suggestionReason) && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Star className="h-3 w-3 text-yellow-500" />
              <span>Smart suggestions included</span>
            </div>
          )}
        </div>
      )}

      {/* Cases list */}
      <ScrollArea className="max-h-96">
        <div className="space-y-2 pr-4">
          {cases.map((caseItem, index) => (
            <CaseListItem
              key={caseItem.id}
              case={caseItem}
              isSelected={selectedCaseId === caseItem.id}
              isHighlighted={highlightedIndex === index}
              onClick={() => handleCaseClick(caseItem, index)}
              ref={el => {
                itemRefs.current[index] = el;
              }}
            />
          ))}

          {/* Load more button */}
          {hasMore && (
            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onLoadMore}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                    Loading more...
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-2" />
                    Load More Cases
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// Individual case item component
const CaseListItem = React.forwardRef<HTMLButtonElement, CaseListItemProps>(
  ({ case: caseItem, isSelected, isHighlighted, onClick }, ref) => {
    const getStatusIcon = (status: string) => {
      switch (status.toLowerCase()) {
        case 'active':
          return <CheckCircle2 className="h-4 w-4 text-green-600" />;
        case 'pending':
          return <Pause className="h-4 w-4 text-yellow-600" />;
        case 'closed':
        case 'inactive':
          return <AlertCircle className="h-4 w-4 text-gray-600" />;
        default:
          return <FolderOpen className="h-4 w-4 text-blue-600" />;
      }
    };

    const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
      switch (status.toLowerCase()) {
        case 'active': return 'default';
        case 'pending': return 'outline';
        case 'closed': 
        case 'inactive': return 'secondary';
        case 'cancelled':
        case 'suspended': return 'destructive';
        default: return 'outline';
      }
    };

    const formatLastActivity = (date?: Date) => {
      if (!date) return '';
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      
      if (days === 0) return 'Today';
      if (days === 1) return 'Yesterday';
      if (days < 7) return `${days} days ago`;
      if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
      return date.toLocaleDateString();
    };

    return (
      <Card
        className={cn(
          'cursor-pointer transition-all duration-200 hover:shadow-md',
          isSelected && 'ring-2 ring-primary shadow-md',
          isHighlighted && 'bg-accent/50'
        )}
      >
        <CardContent className="p-4">
          <button
            ref={ref}
            onClick={onClick}
            className="w-full text-left focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
            aria-selected={isSelected}
            aria-label={`Select case ${caseItem.caseNumber}: ${caseItem.title}`}
          >
            <div className="space-y-2">
              {/* Case number and status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-base text-primary">
                    {caseItem.caseNumber}
                  </h3>
                  {caseItem.suggestionReason && (
                    <Badge variant="outline" className="text-xs">
                      Suggested
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(caseItem.status)}
                  <Badge variant={getStatusVariant(caseItem.status)} className="text-xs">
                    {caseItem.status}
                  </Badge>
                </div>
              </div>

              {/* Case title with enhanced display */}
              <div className="space-y-1">
                <h4 className="font-medium text-foreground line-clamp-2">
                  {caseItem.title}
                </h4>
                
                {/* Case description preview */}
                {caseItem.caseDescription && (
                  <p className="text-xs text-muted-foreground line-clamp-1 flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {caseItem.caseDescription}
                  </p>
                )}
              </div>

              {/* Enhanced client and metadata */}
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                {/* Client info */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span className="truncate">{caseItem.clientName}</span>
                  </div>
                  
                  {caseItem.clientOrganization && (
                    <div className="flex items-center gap-1">
                      <Building className="h-3 w-3" />
                      <span className="truncate">{caseItem.clientOrganization}</span>
                    </div>
                  )}
                  
                  {caseItem.caseType && (
                    <div className="flex items-center gap-1">
                      <Hash className="h-3 w-3" />
                      <span className="truncate">{caseItem.caseType}</span>
                    </div>
                  )}
                </div>
                
                {/* Activity and metrics */}
                <div className="space-y-1 text-right">
                  {caseItem.lastActivity && (
                    <div className="flex items-center justify-end gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{formatLastActivity(caseItem.lastActivity)}</span>
                    </div>
                  )}
                  
                  {caseItem.emailCount !== undefined && caseItem.emailCount > 0 && (
                    <div className="flex items-center justify-end gap-1">
                      <Mail className="h-3 w-3" />
                      <span>{caseItem.emailCount} emails</span>
                    </div>
                  )}
                  
                  {caseItem.created_at && (
                    <div className="flex items-center justify-end gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>Created {formatLastActivity(caseItem.created_at)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Enhanced relevance and match info */}
              {(caseItem.relevanceScore || caseItem.matchedFields || caseItem.suggestionReason) && (
                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <div className="flex items-center gap-2">
                    {caseItem.suggestionReason && (
                      <Badge variant="outline" className="text-xs flex items-center gap-1">
                        {getSuggestionIcon(caseItem.suggestionReason)}
                        {getSuggestionLabel(caseItem.suggestionReason)}
                      </Badge>
                    )}
                    
                    {caseItem.matchedFields && caseItem.matchedFields.length > 0 && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Eye className="h-3 w-3" />
                        <span>Matched: {caseItem.matchedFields.join(', ')}</span>
                      </div>
                    )}
                  </div>
                  
                  {caseItem.relevanceScore && caseItem.relevanceScore > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {(caseItem.relevanceScore * 100).toFixed(0)}% match
                    </div>
                  )}
                </div>
              )}

              {/* Assigned attorneys */}
              {caseItem.assignedAttorneys && caseItem.assignedAttorneys.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  <span>Attorneys: {caseItem.assignedAttorneys.join(', ')}</span>
                </div>
              )}
            </div>
          </button>
        </CardContent>
      </Card>
    );
  }
);

CaseListItem.displayName = 'CaseListItem';

// Helper function to get suggestion icon
function getSuggestionIcon(reason: string) {
  switch (reason) {
    case 'content-analysis':
      return <Zap className="h-3 w-3" />;
    case 'recent-assignment':
      return <Clock className="h-3 w-3" />;
    case 'pattern-match':
      return <Star className="h-3 w-3" />;
    case 'domain-match':
      return <Building className="h-3 w-3" />;
    case 'frequent-case':
      return <Star className="h-3 w-3" />;
    default:
      return <Zap className="h-3 w-3" />;
  }
}

// Helper function to get suggestion label
function getSuggestionLabel(reason: string) {
  switch (reason) {
    case 'content-analysis':
      return 'AI Match';
    case 'recent-assignment':
      return 'Recent';
    case 'pattern-match':
      return 'Pattern';
    case 'domain-match':
      return 'Domain';
    case 'frequent-case':
      return 'Frequent';
    default:
      return 'Suggested';
  }
}

// Enhanced loading skeleton component
function CaseListItemSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header with case number and status */}
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-16" />
          </div>
          
          {/* Title and description */}
          <div className="space-y-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          
          {/* Client and metadata grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-24" />
            </div>
            <div className="space-y-1">
              <Skeleton className="h-3 w-16 ml-auto" />
              <Skeleton className="h-3 w-12 ml-auto" />
            </div>
          </div>
          
          {/* Bottom relevance bar */}
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}