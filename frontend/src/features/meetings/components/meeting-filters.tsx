/**
 * Meeting Filters Component
 * Enhanced filtering panel for meeting intelligence
 * Extends existing data table filter patterns
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  CalendarIcon, 
  X, 
  Filter, 
  Users, 
  Clock,
  FileText,
  Search
} from 'lucide-react';
import { format } from 'date-fns';

interface MeetingFiltersProps {
  filters: any; // Type based on your existing filter interface
  onFiltersChange: (filters: any) => void;
  meetingType: 'all' | 'meeting' | 'call' | 'interview' | 'consultation';
}

interface FilterState {
  dateRange: {
    from?: Date;
    to?: Date;
  };
  meetingTypes: string[];
  statuses: string[];
  participantRange: {
    min?: number;
    max?: number;
  };
  durationRange: {
    min?: number; // in minutes
    max?: number;
  };
  hasAIInsights: boolean;
  hasActionItems: boolean;
  hasDecisions: boolean;
  searchQuery: string;
  memberIds: string[];
}

const meetingTypeOptions = [
  { value: 'meeting', label: 'Meeting', icon: Users },
  { value: 'call', label: 'Legal Call', icon: FileText },
  { value: 'interview', label: 'Interview', icon: Users },
  { value: 'consultation', label: 'Consultation', icon: FileText },
];

const statusOptions = [
  { value: 'completed', label: 'Completed', color: 'green' },
  { value: 'processing', label: 'Processing', color: 'yellow' },
  { value: 'failed', label: 'Failed', color: 'red' },
  { value: 'in_progress', label: 'In Progress', color: 'blue' },
];

export function MeetingFilters({ 
  filters, 
  onFiltersChange, 
  meetingType 
}: MeetingFiltersProps) {
  const [localFilters, setLocalFilters] = useState<FilterState>({
    dateRange: {},
    meetingTypes: meetingType === 'all' ? [] : [meetingType],
    statuses: [],
    participantRange: {},
    durationRange: {},
    hasAIInsights: false,
    hasActionItems: false,
    hasDecisions: false,
    searchQuery: '',
    memberIds: [],
  });

  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  // Apply filters
  const applyFilters = () => {
    onFiltersChange(localFilters);
    updateActiveFiltersCount();
  };

  // Clear all filters
  const clearAllFilters = () => {
    const clearedFilters = {
      dateRange: {},
      meetingTypes: meetingType === 'all' ? [] : [meetingType],
      statuses: [],
      participantRange: {},
      durationRange: {},
      hasAIInsights: false,
      hasActionItems: false,
      hasDecisions: false,
      searchQuery: '',
      memberIds: [],
    };
    
    setLocalFilters(clearedFilters);
    onFiltersChange(clearedFilters);
    setActiveFiltersCount(0);
  };

  // Update active filters count
  const updateActiveFiltersCount = () => {
    let count = 0;
    
    if (localFilters.dateRange.from || localFilters.dateRange.to) count++;
    if (localFilters.meetingTypes.length > (meetingType === 'all' ? 0 : 1)) count++;
    if (localFilters.statuses.length > 0) count++;
    if (localFilters.participantRange.min || localFilters.participantRange.max) count++;
    if (localFilters.durationRange.min || localFilters.durationRange.max) count++;
    if (localFilters.hasAIInsights || localFilters.hasActionItems || localFilters.hasDecisions) count++;
    if (localFilters.searchQuery.trim()) count++;
    if (localFilters.memberIds.length > 0) count++;
    
    setActiveFiltersCount(count);
  };

  // Update local filter state
  const updateFilter = (key: keyof FilterState, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center space-x-2">
            <Filter className="h-4 w-4" />
            <span>Filters</span>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {activeFiltersCount} active
              </Badge>
            )}
          </CardTitle>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={clearAllFilters}
              disabled={activeFiltersCount === 0}
            >
              <X className="mr-2 h-3 w-3" />
              Clear All
            </Button>
            <Button size="sm" onClick={applyFilters}>
              Apply Filters
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search Query */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Search</Label>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search meetings by title, participant, or content..."
              value={localFilters.searchQuery}
              onChange={(e) => updateFilter('searchQuery', e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <Separator />

        {/* Date Range */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Date Range</Label>
          <div className="flex space-x-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={localFilters.dateRange.from ? "default" : "outline"}
                  size="sm"
                  className="justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {localFilters.dateRange.from ? (
                    format(localFilters.dateRange.from, "LLL dd, y")
                  ) : (
                    <span>From date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={localFilters.dateRange.from}
                  onSelect={(date) => 
                    updateFilter('dateRange', { 
                      ...localFilters.dateRange, 
                      from: date 
                    })
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={localFilters.dateRange.to ? "default" : "outline"}
                  size="sm"
                  className="justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {localFilters.dateRange.to ? (
                    format(localFilters.dateRange.to, "LLL dd, y")
                  ) : (
                    <span>To date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={localFilters.dateRange.to}
                  onSelect={(date) => 
                    updateFilter('dateRange', { 
                      ...localFilters.dateRange, 
                      to: date 
                    })
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <Separator />

        {/* Meeting Types (only show if viewing 'all') */}
        {meetingType === 'all' && (
          <>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Meeting Types</Label>
              <div className="grid grid-cols-2 gap-2">
                {meetingTypeOptions.map((option) => {
                  const Icon = option.icon;
                  const isSelected = localFilters.meetingTypes.includes(option.value);
                  
                  return (
                    <div key={option.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`type-${option.value}`}
                        checked={isSelected}
                        onCheckedChange={(checked) => {
                          const newTypes = checked
                            ? [...localFilters.meetingTypes, option.value]
                            : localFilters.meetingTypes.filter(t => t !== option.value);
                          updateFilter('meetingTypes', newTypes);
                        }}
                      />
                      <Label
                        htmlFor={`type-${option.value}`}
                        className="text-sm flex items-center space-x-1 cursor-pointer"
                      >
                        <Icon className="h-3 w-3" />
                        <span>{option.label}</span>
                      </Label>
                    </div>
                  );
                })}
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* Status */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Status</Label>
          <div className="grid grid-cols-2 gap-2">
            {statusOptions.map((status) => {
              const isSelected = localFilters.statuses.includes(status.value);
              
              return (
                <div key={status.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`status-${status.value}`}
                    checked={isSelected}
                    onCheckedChange={(checked) => {
                      const newStatuses = checked
                        ? [...localFilters.statuses, status.value]
                        : localFilters.statuses.filter(s => s !== status.value);
                      updateFilter('statuses', newStatuses);
                    }}
                  />
                  <Label
                    htmlFor={`status-${status.value}`}
                    className="text-sm cursor-pointer"
                  >
                    {status.label}
                  </Label>
                </div>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* Participant Count Range */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Participants</Label>
          <div className="flex space-x-2">
            <Input
              type="number"
              placeholder="Min"
              value={localFilters.participantRange.min || ''}
              onChange={(e) => updateFilter('participantRange', {
                ...localFilters.participantRange,
                min: parseInt(e.target.value) || undefined
              })}
              className="w-20"
            />
            <span className="text-sm text-muted-foreground self-center">to</span>
            <Input
              type="number"
              placeholder="Max"
              value={localFilters.participantRange.max || ''}
              onChange={(e) => updateFilter('participantRange', {
                ...localFilters.participantRange,
                max: parseInt(e.target.value) || undefined
              })}
              className="w-20"
            />
          </div>
        </div>

        {/* Duration Range */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Duration (minutes)</Label>
          <div className="flex space-x-2">
            <Input
              type="number"
              placeholder="Min"
              value={localFilters.durationRange.min || ''}
              onChange={(e) => updateFilter('durationRange', {
                ...localFilters.durationRange,
                min: parseInt(e.target.value) || undefined
              })}
              className="w-20"
            />
            <span className="text-sm text-muted-foreground self-center">to</span>
            <Input
              type="number"
              placeholder="Max"
              value={localFilters.durationRange.max || ''}
              onChange={(e) => updateFilter('durationRange', {
                ...localFilters.durationRange,
                max: parseInt(e.target.value) || undefined
              })}
              className="w-20"
            />
          </div>
        </div>

        <Separator />

        {/* AI Insights */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">AI Insights</Label>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="has-insights"
                checked={localFilters.hasAIInsights}
                onCheckedChange={(checked) => updateFilter('hasAIInsights', checked)}
              />
              <Label htmlFor="has-insights" className="text-sm cursor-pointer">
                Has AI Analysis
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="has-actions"
                checked={localFilters.hasActionItems}
                onCheckedChange={(checked) => updateFilter('hasActionItems', checked)}
              />
              <Label htmlFor="has-actions" className="text-sm cursor-pointer">
                Has Action Items
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="has-decisions"
                checked={localFilters.hasDecisions}
                onCheckedChange={(checked) => updateFilter('hasDecisions', checked)}
              />
              <Label htmlFor="has-decisions" className="text-sm cursor-pointer">
                Has Decisions
              </Label>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}