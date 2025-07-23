/**
 * Meeting Data Table
 * Extends existing data table patterns for meeting intelligence
 * Built on top of existing recording table infrastructure
 */

'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { DataTable } from '@/components/ui/table/data-table';
import { useDataTable } from '@/hooks/use-data-table';
import { meetingColumns } from './meeting-columns';
import { MeetingFilters } from './meeting-filters';
import { useCallRecordings } from '@/hooks/useCallRecordings';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Download, Filter } from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface MeetingDataTableProps {
  meetingType: 'all' | 'meeting' | 'call' | 'interview' | 'consultation';
}

export function MeetingDataTable({ meetingType }: MeetingDataTableProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Extend existing call recordings hook to support meeting types
  const {
    recordings: meetings,
    isLoading,
    error,
    refetch,
    totalCount,
    pagination,
    setPagination,
    sorting,
    setSorting,
    filters,
    setFilters
  } = useCallRecordings({
    meetingType: meetingType === 'all' ? undefined : meetingType,
    enhanced: true // Flag to get enhanced meeting data
  });

  // State for enhanced filters
  const [showFilters, setShowFilters] = useState(false);
  const [selectedMeetings, setSelectedMeetings] = useState<string[]>([]);

  // Enhanced data table configuration
  const { table } = useDataTable({
    data: meetings || [],
    columns: meetingColumns,
    pagination,
    setPagination,
    sorting,
    setSorting,
    rowSelection: {},
    setRowSelection: () => {},
    enableRowSelection: true,
    getRowId: (row) => row.id,
  });

  // Meeting type badge configuration
  const getMeetingTypeBadge = (type: string) => {
    const config = {
      meeting: { variant: 'default' as const, label: 'Meeting' },
      call: { variant: 'secondary' as const, label: 'Legal Call' },
      interview: { variant: 'outline' as const, label: 'Interview' },
      consultation: { variant: 'destructive' as const, label: 'Consultation' }
    };
    
    return config[type as keyof typeof config] || config.meeting;
  };

  // Handle bulk actions
  const handleBulkExport = () => {
    // Implement bulk export functionality
    console.log('Exporting selected meetings:', selectedMeetings);
  };

  const handleBulkAnalysis = () => {
    // Implement bulk re-analysis functionality
    console.log('Re-analyzing selected meetings:', selectedMeetings);
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Failed to load meetings: {error.message}
          </p>
          <Button onClick={() => refetch()} variant="outline" className="mt-2">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Enhanced Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-medium">
            {meetingType === 'all' ? 'All Recordings' : 
             meetingType === 'call' ? 'Legal Calls' :
             `${meetingType.charAt(0).toUpperCase()}${meetingType.slice(1)}s`}
          </h3>
          {totalCount !== undefined && (
            <Badge variant="secondary">{totalCount} total</Badge>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* Filters Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>

          {/* Bulk Actions */}
          {selectedMeetings.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Actions ({selectedMeetings.length})
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Bulk Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleBulkExport}>
                  <Download className="mr-2 h-4 w-4" />
                  Export Selected
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleBulkAnalysis}>
                  Re-analyze Selected
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* New Recording Button */}
          <Button 
            onClick={() => router.push('/dashboard/meetings/new')}
            size="sm"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Recording
          </Button>
        </div>
      </div>

      {/* Enhanced Filters Panel */}
      {showFilters && (
        <MeetingFilters
          filters={filters}
          onFiltersChange={setFilters}
          meetingType={meetingType}
        />
      )}

      {/* Enhanced Data Table */}
      <DataTable
        table={table}
        columns={meetingColumns}
        searchKey="title"
        searchPlaceholder={`Search ${meetingType === 'all' ? 'recordings' : meetingType + 's'}...`}
        isLoading={isLoading}
        loadingComponent={
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded" />
            ))}
          </div>
        }
        emptyComponent={
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground mb-2">
              No {meetingType === 'all' ? 'recordings' : meetingType + 's'} found
            </p>
            <Button 
              onClick={() => router.push('/dashboard/meetings/new')}
              variant="outline"
              size="sm"
            >
              <Plus className="mr-2 h-4 w-4" />
              Record Your First {meetingType === 'all' ? 'Meeting' : meetingType}
            </Button>
          </div>
        }
      />

      {/* Meeting Type Summary */}
      {meetingType === 'all' && meetings && meetings.length > 0 && (
        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
          <span>Types:</span>
          {['meeting', 'call', 'interview', 'consultation'].map(type => {
            const count = meetings.filter(m => m.meetingType === type).length;
            if (count === 0) return null;
            
            const badge = getMeetingTypeBadge(type);
            return (
              <Badge key={type} variant={badge.variant} className="text-xs">
                {count} {badge.label}{count !== 1 ? 's' : ''}
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default MeetingDataTable;