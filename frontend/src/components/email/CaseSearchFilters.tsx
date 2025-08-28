'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Filter, 
  X, 
  ChevronDown, 
  ChevronUp, 
  Calendar, 
  Users, 
  Briefcase,
  Clock,
  Star,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { EnhancedSearchParams } from '@/lib/services/case-search-enhancements';

export interface CaseType {
  id: string;
  name: string;
  display_name: string;
  count?: number;
}

export interface FilterOptions {
  caseTypes: CaseType[];
  statuses: Array<{ value: string; label: string; count?: number }>;
  attorneys: Array<{ id: string; name: string; count?: number }>;
}

export interface CaseSearchFiltersProps {
  currentFilters: Partial<EnhancedSearchParams>;
  onFiltersChange: (filters: Partial<EnhancedSearchParams>) => void;
  filterOptions: FilterOptions;
  isLoading?: boolean;
  className?: string;
  showAdvanced?: boolean;
  onToggleAdvanced?: () => void;
}

const QUICK_FILTERS = [
  {
    key: 'active',
    label: 'Active Cases',
    icon: TrendingUp,
    description: 'Only active cases',
    filters: { filter: 'active' as const }
  },
  {
    key: 'my_cases',
    label: 'My Cases',
    icon: Users,
    description: 'Cases I am assigned to',
    filters: { filter: 'my_cases' as const }
  },
  {
    key: 'recent',
    label: 'Recent',
    icon: Clock,
    description: 'Updated in last 30 days',
    filters: { filter: 'recent' as const }
  },
  {
    key: 'frequent',
    label: 'Frequent',
    icon: Star,
    description: 'Cases I use often',
    filters: { filter: 'frequent' as const }
  }
] as const;

const DATE_RANGE_OPTIONS = [
  { value: 'all', label: 'All Time' },
  { value: '30days', label: 'Last 30 Days' },
  { value: '3months', label: 'Last 3 Months' },
  { value: '6months', label: 'Last 6 Months' },
  { value: 'year', label: 'Last Year' }
] as const;

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'date', label: 'Last Updated' },
  { value: 'case_number', label: 'Case Number' },
  { value: 'client_name', label: 'Client Name' }
] as const;

export function CaseSearchFilters({
  currentFilters,
  onFiltersChange,
  filterOptions,
  isLoading = false,
  className,
  showAdvanced = false,
  onToggleAdvanced
}: CaseSearchFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(showAdvanced);

  // Update expanded state when prop changes
  useEffect(() => {
    setIsExpanded(showAdvanced);
  }, [showAdvanced]);

  const handleQuickFilter = useCallback((quickFilter: typeof QUICK_FILTERS[0]) => {
    const newFilters = {
      ...currentFilters,
      ...quickFilter.filters
    };
    onFiltersChange(newFilters);
  }, [currentFilters, onFiltersChange]);

  const handleFilterChange = useCallback((key: keyof EnhancedSearchParams, value: any) => {
    const newFilters = { ...currentFilters };
    
    if (value === '' || value === 'all' || value === null) {
      delete newFilters[key];
    } else {
      newFilters[key] = value;
    }
    
    onFiltersChange(newFilters);
  }, [currentFilters, onFiltersChange]);

  const handleClearFilters = useCallback(() => {
    onFiltersChange({ q: currentFilters.q || '' });
  }, [currentFilters.q, onFiltersChange]);

  const toggleExpanded = useCallback(() => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    onToggleAdvanced?.();
  }, [isExpanded, onToggleAdvanced]);

  // Count active filters
  const activeFilterCount = Object.entries(currentFilters).filter(
    ([key, value]) => key !== 'q' && key !== 'limit' && key !== 'offset' && value && value !== 'all'
  ).length;

  return (
    <Card className={cn('border-0 shadow-none', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <CardTitle className="text-base">Filters</CardTitle>
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="text-xs h-6 px-2"
                disabled={isLoading}
              >
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleExpanded}
              className="text-xs h-6 px-2"
            >
              {isExpanded ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-4">
          {/* Quick Filters */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Quick Filters</Label>
            <div className="flex flex-wrap gap-2">
              {QUICK_FILTERS.map((filter) => {
                const Icon = filter.icon;
                const isActive = currentFilters.filter === filter.filters.filter;
                
                return (
                  <Button
                    key={filter.key}
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleQuickFilter(filter)}
                    disabled={isLoading}
                    className="text-xs h-7"
                  >
                    <Icon className="h-3 w-3 mr-1" />
                    {filter.label}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Advanced Filters */}
          {isExpanded && (
            <>
              <Separator />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Date Range Filter */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Date Range
                  </Label>
                  <Select
                    value={currentFilters.date_range || 'all'}
                    onValueChange={(value) => handleFilterChange('date_range', value)}
                    disabled={isLoading}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DATE_RANGE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value} className="text-xs">
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Sort Order */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Sort By
                  </Label>
                  <Select
                    value={currentFilters.sort_by || 'relevance'}
                    onValueChange={(value) => handleFilterChange('sort_by', value)}
                    disabled={isLoading}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SORT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value} className="text-xs">
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Case Type Filter */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Briefcase className="h-3 w-3" />
                    Case Type
                  </Label>
                  <Select
                    value={currentFilters.case_type_id || 'all'}
                    onValueChange={(value) => handleFilterChange('case_type_id', value)}
                    disabled={isLoading}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">All Types</SelectItem>
                      {filterOptions.caseTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id} className="text-xs">
                          <div className="flex items-center justify-between w-full">
                            <span>{type.display_name || type.name}</span>
                            {type.count !== undefined && (
                              <Badge variant="outline" className="text-xs ml-2">
                                {type.count}
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status Filter */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Status
                  </Label>
                  <Select
                    value={currentFilters.status || 'all'}
                    onValueChange={(value) => handleFilterChange('status', value)}
                    disabled={isLoading}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
                      {filterOptions.statuses.map((status) => (
                        <SelectItem key={status.value} value={status.value} className="text-xs">
                          <div className="flex items-center justify-between w-full">
                            <span>{status.label}</span>
                            {status.count !== undefined && (
                              <Badge variant="outline" className="text-xs ml-2">
                                {status.count}
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Assigned Attorney Filter */}
                {filterOptions.attorneys.length > 0 && (
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      Assigned Attorney
                    </Label>
                    <Select
                      value={currentFilters.assigned_attorney_id || 'all'}
                      onValueChange={(value) => handleFilterChange('assigned_attorney_id', value)}
                      disabled={isLoading}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="All attorneys" />
                      </SelectTrigger>
                      <SelectContent>
                        <ScrollArea className="h-[200px]">
                          <SelectItem value="all" className="text-xs">All Attorneys</SelectItem>
                          {filterOptions.attorneys.map((attorney) => (
                            <SelectItem key={attorney.id} value={attorney.id} className="text-xs">
                              <div className="flex items-center justify-between w-full">
                                <span>{attorney.name}</span>
                                {attorney.count !== undefined && (
                                  <Badge variant="outline" className="text-xs ml-2">
                                    {attorney.count}
                                  </Badge>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </ScrollArea>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Active Filters Display */}
          {activeFilterCount > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Active Filters</Label>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(currentFilters).map(([key, value]) => {
                    if (!value || value === 'all' || key === 'q' || key === 'limit' || key === 'offset') {
                      return null;
                    }

                    let displayValue = String(value);
                    let displayKey = key;

                    // Format display values
                    switch (key) {
                      case 'case_type_id':
                        displayKey = 'Type';
                        const caseType = filterOptions.caseTypes.find(t => t.id === value);
                        displayValue = caseType?.display_name || caseType?.name || displayValue;
                        break;
                      case 'status':
                        displayKey = 'Status';
                        const status = filterOptions.statuses.find(s => s.value === value);
                        displayValue = status?.label || displayValue;
                        break;
                      case 'date_range':
                        displayKey = 'Date';
                        const dateRange = DATE_RANGE_OPTIONS.find(d => d.value === value);
                        displayValue = dateRange?.label || displayValue;
                        break;
                      case 'sort_by':
                        displayKey = 'Sort';
                        const sortOption = SORT_OPTIONS.find(s => s.value === value);
                        displayValue = sortOption?.label || displayValue;
                        break;
                      case 'filter':
                        const quickFilter = QUICK_FILTERS.find(f => f.filters.filter === value);
                        displayKey = 'Filter';
                        displayValue = quickFilter?.label || displayValue;
                        break;
                      case 'assigned_attorney_id':
                        displayKey = 'Attorney';
                        const attorney = filterOptions.attorneys.find(a => a.id === value);
                        displayValue = attorney?.name || displayValue;
                        break;
                    }

                    return (
                      <Badge
                        key={key}
                        variant="secondary"
                        className="text-xs flex items-center gap-1"
                      >
                        <span className="font-medium">{displayKey}:</span>
                        <span>{displayValue}</span>
                        <button
                          onClick={() => handleFilterChange(key as keyof EnhancedSearchParams, null)}
                          className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                          disabled={isLoading}
                        >
                          <X className="h-2 w-2" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}