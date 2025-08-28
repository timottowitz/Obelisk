'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, Search, X, History, Sparkles, Star, Building } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import { cn } from '@/lib/utils';
import type { CaseSearchResult } from './CaseAssignmentModal';
import { caseSearchService, EnhancedSearchParams, SearchSuggestion } from '@/lib/services/case-search-enhancements';
import { useCaseSearchHistory } from '@/hooks/useCaseSearchHistory';

export interface CaseSearchInputProps {
  onSearch: (query: string, results: CaseSearchResult[]) => void;
  onLoading: (isLoading: boolean) => void;
  onError: (error: string | null) => void;
  onFiltersChange?: (filters: Partial<EnhancedSearchParams>) => void;
  currentFilters?: Partial<EnhancedSearchParams>;
  emailContent?: {
    subject?: string;
    fromName?: string;
    fromEmail?: string;
    body?: string;
  };
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  disabled?: boolean;
  showSuggestions?: boolean;
}

export function CaseSearchInput({
  onSearch,
  onLoading,
  onError,
  onFiltersChange,
  currentFilters = {},
  emailContent,
  placeholder = 'Search cases by name, number, or client...',
  autoFocus = false,
  className,
  disabled = false,
  showSuggestions = true
}: CaseSearchInputProps) {
  const [query, setQuery] = useState(currentFilters.q || '');
  const [isLoading, setIsLoading] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestionsPopover, setShowSuggestionsPopover] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  
  const { recordSearch, getSearchSuggestions } = useCaseSearchHistory();

  // Debounce the search query by 300ms
  const debouncedQuery = useDebounce(query, 300);

  // Enhanced search function using the service
  const searchCases = useCallback(async (searchQuery: string, signal: AbortSignal) => {
    try {
      const searchParams: EnhancedSearchParams = {
        q: searchQuery,
        limit: 20,
        ...currentFilters,
        client_domain: currentFilters.client_domain || caseSearchService.extractClientDomain(emailContent?.fromEmail || '')
      };

      const response = await caseSearchService.searchCases(searchParams);
      return response.cases;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return [];
      }
      throw error;
    }
  }, [currentFilters, emailContent]);

  // Effect to handle debounced search
  useEffect(() => {
    if (debouncedQuery.length < 2) {
      // Clear results for short queries
      onSearch(debouncedQuery, []);
      onError(null);
      return;
    }

    // Cancel previous request if it exists
    if (abortController) {
      abortController.abort();
    }

    const newAbortController = new AbortController();
    setAbortController(newAbortController);

    const performSearch = async () => {
      setIsLoading(true);
      onLoading(true);
      onError(null);

      try {
        const results = await searchCases(debouncedQuery, newAbortController.signal);
        
        if (!newAbortController.signal.aborted) {
          onSearch(debouncedQuery, results);
          // Record search in history
          recordSearch(debouncedQuery, results.length);
        }
      } catch (error) {
        if (!newAbortController.signal.aborted) {
          const errorMessage = error instanceof Error ? error.message : 'Search failed. Please try again.';
          onError(errorMessage);
          onSearch(debouncedQuery, []);
        }
      } finally {
        if (!newAbortController.signal.aborted) {
          setIsLoading(false);
          onLoading(false);
        }
      }
    };

    performSearch();

    // Cleanup function
    return () => {
      newAbortController.abort();
    };
  }, [debouncedQuery, onSearch, onLoading, onError, searchCases]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortController) {
        abortController.abort();
      }
    };
  }, [abortController]);

  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = event.target.value;
    setQuery(newQuery);
    
    // Update filters if onFiltersChange is provided
    if (onFiltersChange) {
      onFiltersChange({ ...currentFilters, q: newQuery });
    }
  }, [currentFilters, onFiltersChange]);

  const handleClear = useCallback(() => {
    setQuery('');
    onSearch('', []);
    onError(null);
    setSuggestions([]);
    setShowSuggestionsPopover(false);
    
    if (onFiltersChange) {
      onFiltersChange({ ...currentFilters, q: '' });
    }
  }, [onSearch, onError, currentFilters, onFiltersChange]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      if (showSuggestionsPopover) {
        setShowSuggestionsPopover(false);
      } else {
        handleClear();
      }
    } else if (event.key === 'ArrowDown' && showSuggestionsPopover && suggestions.length > 0) {
      event.preventDefault();
      // Focus first suggestion item
    }
  }, [handleClear, showSuggestionsPopover, suggestions]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    if (showSuggestions && query.length === 0) {
      loadSuggestions();
    }
  }, [query, showSuggestions]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    // Delay hiding suggestions to allow clicks
    setTimeout(() => setShowSuggestionsPopover(false), 200);
  }, []);

  const loadSuggestions = useCallback(() => {
    const allSuggestions: SearchSuggestion[] = [];
    
    // Add email-based suggestions
    if (emailContent) {
      allSuggestions.push(...caseSearchService.getEmailBasedSuggestions(emailContent));
    }
    
    // Add search history suggestions
    allSuggestions.push(...getSearchSuggestions(query));
    
    // Add quick filter suggestions
    if (query.length === 0) {
      allSuggestions.push(...caseSearchService.getQuickFilters());
    }
    
    setSuggestions(allSuggestions.slice(0, 8));
    setShowSuggestionsPopover(allSuggestions.length > 0);
  }, [emailContent, getSearchSuggestions, query]);

  const handleSuggestionSelect = useCallback((suggestion: SearchSuggestion) => {
    if (suggestion.filters) {
      const newFilters = { ...currentFilters, ...suggestion.filters };
      setQuery(suggestion.filters.q || '');
      
      if (onFiltersChange) {
        onFiltersChange(newFilters);
      }
      
      // Trigger search immediately
      if (suggestion.filters.q) {
        onSearch(suggestion.filters.q, []);
      }
    }
    setShowSuggestionsPopover(false);
  }, [currentFilters, onFiltersChange, onSearch]);

  return (
    <div className={cn('relative', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        
        <Popover open={showSuggestionsPopover && showSuggestions} onOpenChange={setShowSuggestionsPopover}>
          <PopoverTrigger asChild>
            <Input
              type="text"
              value={query}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder={placeholder}
              autoFocus={autoFocus}
              disabled={disabled}
              className="pl-10 pr-10"
              aria-label="Search cases"
              aria-describedby="search-help"
            />
          </PopoverTrigger>
          
          {showSuggestions && suggestions.length > 0 && (
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
              <Command>
                <CommandList>
                  <CommandEmpty>No suggestions found.</CommandEmpty>
                  <CommandGroup heading="Suggestions">
                    {suggestions.map((suggestion, index) => (
                      <CommandItem
                        key={`${suggestion.type}-${index}`}
                        onSelect={() => handleSuggestionSelect(suggestion)}
                        className="flex items-center gap-2 text-sm"
                      >
                        {suggestion.type === 'recent' && <History className="h-3 w-3 text-muted-foreground" />}
                        {suggestion.type === 'frequent' && <Star className="h-3 w-3 text-yellow-500" />}
                        {suggestion.type === 'domain_match' && <Building className="h-3 w-3 text-blue-500" />}
                        {suggestion.type === 'keyword' && <Sparkles className="h-3 w-3 text-purple-500" />}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{suggestion.text}</div>
                          <div className="text-xs text-muted-foreground truncate">{suggestion.description}</div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          )}
        </Popover>

        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          
          {query && !isLoading && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-transparent"
              onClick={handleClear}
              aria-label="Clear search"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Enhanced search help text with filter indicators */}
      <div id="search-help" className="flex items-center justify-between mt-1">
        <p className="text-xs text-muted-foreground">
          {query.length === 0 && !isFocused
            ? 'Enter at least 1 character to search'
            : query.length === 0 && isFocused
            ? 'Start typing or select a suggestion'
            : query.length === 1
            ? 'Continue typing for better results'
            : isLoading
            ? 'Searching...'
            : ''
          }
        </p>
        
        {/* Active filters indicator */}
        {Object.keys(currentFilters).filter(key => key !== 'q' && currentFilters[key as keyof EnhancedSearchParams]).length > 0 && (
          <Badge variant="outline" className="text-xs">
            Filters active
          </Badge>
        )}
      </div>
    </div>
  );
}