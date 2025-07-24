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
import { meetingColumns, MeetingRecording } from './meeting-columns';
import { MeetingFilters } from './meeting-filters';
import {
  EnhancedCallRecording,
  useCallRecordings
} from '@/hooks/useCallRecordings';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Download, Filter } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { ColumnDef } from '@tanstack/react-table';
import { webScreenRecorder } from '@/services/web-recording';
import { CallRecordingsAPI } from '@/services/call-recordings-api';
import {
  RecordingProcessModal,
  RecordingProcessOptions
} from './RecordingProcessModal';
import RecordingDetailModal from '@/components/recording-detail-modal';

interface MeetingDataTableProps {
  meetingType: 'all' | 'meeting' | 'call' | 'interview' | 'consultation';
}

export function MeetingDataTable({ meetingType }: MeetingDataTableProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Get initial pagination from URL parameters
  const initialPage = parseInt(searchParams.get('page') || '1', 10);
  const initialPerPage = parseInt(searchParams.get('perPage') || '10', 10);

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
    enhanced: true, // Flag to get enhanced meeting data
    limit: initialPerPage, // Use URL-based pagination
    offset: (initialPage - 1) * initialPerPage // Calculate offset from URL
  });

  // State for enhanced filters
  const [showFilters, setShowFilters] = useState(false);
  const [selectedMeetings, setSelectedMeetings] = useState<string[]>([]);

  // State for process modal and pending recording
  const [processModalOpen, setProcessModalOpen] = useState(false);
  const [pendingRecording, setPendingRecording] = useState<any>(null);

  // State for detail modal
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedRecording, setSelectedRecording] =
    useState<EnhancedCallRecording | null>(null);

  // Handler to open detail modal
  const handleViewDetails = (recording: EnhancedCallRecording) => {
    setSelectedRecording(recording);
    setDetailModalOpen(true);
  };

  // Enhanced data table configuration
  const { table } = useDataTable<EnhancedCallRecording>({
    data: meetings || [],
    columns: meetingColumns(
      handleViewDetails
    ) as ColumnDef<EnhancedCallRecording>[],
    pageCount: Math.ceil((totalCount || 0) / initialPerPage),
    initialState: {
      pagination: {
        pageIndex: initialPage - 1,
        pageSize: initialPerPage
      }
    }
  });

  // Sync URL-based pagination with API calls
  useEffect(() => {
    const urlPage = parseInt(searchParams.get('page') || '1', 10);
    const urlPerPage = parseInt(searchParams.get('perPage') || '10', 10);
    
    // Update useCallRecordings pagination when URL changes
    setPagination({
      page: urlPage,
      limit: urlPerPage
    });
  }, [searchParams, setPagination]);

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

  // Add handleStartRecording for new meeting
  const handleStartRecording = async () => {
    try {
      await webScreenRecorder.startRecording({
        includeSystemAudio: true,
        includeMicrophone: true,
        videoBitsPerSecond: 2500000
      });
    } catch (error) {
      alert(
        'Failed to start recording: ' +
          (error instanceof Error ? error.message : 'Unknown error')
      );
    }
  };

  useEffect(() => {
    // Handler for when recording is stopped
    const handleRecordingStopped = (recording: any) => {
      setPendingRecording(recording);
      setProcessModalOpen(true);
    };
    webScreenRecorder.on('recordingStopped', handleRecordingStopped);
    return () => {
      webScreenRecorder.off('recordingStopped', handleRecordingStopped);
    };
  }, []);

  // Handle modal submit: upload and process
  const handleProcessSubmit = async (opts: RecordingProcessOptions) => {
    if (!pendingRecording) return;
    try {
      // Upload the recording
      const newRecording = await CallRecordingsAPI.uploadRecordingFile(
        pendingRecording.blob,
        {
          mimeType: pendingRecording.mimeType || pendingRecording.blob.type,
          duration: pendingRecording.duration,
          startTime: pendingRecording.startTime,
          endTime: pendingRecording.endTime,
          title: opts.title,
          participants: ['Current User']
        }
      );
      // Process the recording with modal options
      await CallRecordingsAPI.processRecording(newRecording.recording.id, {
        taskType: opts.taskType as 'all' | 'transcribe' | 'analyze' | undefined,
        meetingType: opts.meetingType as
          | 'meeting'
          | 'call'
          | 'interview'
          | 'consultation'
          | undefined,
        analysisType: opts.analysisType
      });
      refetch();
    } catch (error) {
      alert(
        'Failed to upload or process recording: ' +
          (error instanceof Error ? error.message : 'Unknown error')
      );
    } finally {
      setPendingRecording(null);
      setProcessModalOpen(false);
    }
  };

  if (error) {
    return (
      <div className='flex h-64 items-center justify-center'>
        <div className='text-center'>
          <p className='text-muted-foreground text-sm'>
            Failed to load meetings: {error}
          </p>
          <Button onClick={() => refetch()} variant='outline' className='mt-2'>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <RecordingProcessModal
        open={processModalOpen}
        onClose={() => {
          setProcessModalOpen(false);
          setPendingRecording(null);
        }}
        onSubmit={handleProcessSubmit}
      />
      {/* Recording Detail Modal */}
      {detailModalOpen && selectedRecording && (
        <RecordingDetailModal
          recording={selectedRecording}
          onClose={() => {
            setDetailModalOpen(false);
            setSelectedRecording(null);
          }}
        />
      )}
      <div className='space-y-4'>
        {/* Enhanced Toolbar */}
        <div className='flex items-center justify-between'>
          <div className='flex items-center space-x-2'>
            <h3 className='text-lg font-medium'>
              {meetingType === 'all'
                ? 'All Recordings'
                : meetingType === 'call'
                  ? 'Legal Calls'
                  : `${meetingType.charAt(0).toUpperCase()}${meetingType.slice(1)}s`}
            </h3>
            {totalCount !== undefined && (
              <Badge variant='secondary'>{totalCount} total</Badge>
            )}
          </div>

          <div className='flex items-center space-x-2'>
            {/* Filters Toggle */}
            <Button
              variant='outline'
              size='sm'
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className='mr-2 h-4 w-4' />
              Filters
            </Button>

            {/* Bulk Actions */}
            {selectedMeetings.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant='outline' size='sm'>
                    Actions ({selectedMeetings.length})
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end'>
                  <DropdownMenuLabel>Bulk Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleBulkExport}>
                    <Download className='mr-2 h-4 w-4' />
                    Export Selected
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleBulkAnalysis}>
                    Re-analyze Selected
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* New Recording Button */}
            <Button onClick={handleStartRecording} size='sm'>
              <Plus className='mr-2 h-4 w-4' />
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
        <DataTable table={table} />

        {/* Meeting Type Summary */}
        {meetingType === 'all' && meetings && meetings.length > 0 && (
          <div className='text-muted-foreground flex items-center space-x-4 text-sm'>
            <span>Types:</span>
            {['meeting', 'call', 'interview', 'consultation'].map((type) => {
              const count = meetings.filter(
                (m) => m.meetingType === type
              ).length;
              if (count === 0) return null;

              const badge = getMeetingTypeBadge(type);
              return (
                <Badge key={type} variant={badge.variant} className='text-xs'>
                  {count} {badge.label}
                  {count !== 1 ? 's' : ''}
                </Badge>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

export default MeetingDataTable;
