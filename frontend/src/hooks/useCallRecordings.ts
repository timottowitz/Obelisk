import { useState, useEffect, useCallback } from 'react';
import { CallRecording } from '@/types/callcaps';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { useOrganization } from '@clerk/nextjs';
import { CallRecordingsAPI } from '@/services/call-recordings-api';

// Enhanced interfaces for meeting intelligence
export interface EnhancedCallRecording extends CallRecording {
  meetingType: 'meeting' | 'call' | 'interview' | 'consultation';
  participantCount: number;
  actionItemCount: number;
  decisionCount: number;
  participantSummary?: string;
  hasAnalysis: boolean;
  hasTranscript: boolean;
  // Keep accessType compatible with CallRecording
  accessType: 'owner' | 'shared' | undefined;
  // Optionally, add enhancedAccessType for UI logic
  enhancedAccessType?: 'owner' | 'shared' | 'full' | 'view_only' | 'restricted';
  shareInfo?: {
    sharedBy: string;
    permission: string;
    expiresAt: string;
  };
}

interface UseCallRecordingsOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  search?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  // Enhanced options for meeting intelligence
  meetingType?: string;
  enhanced?: boolean;
  filters?: {
    status?: string[];
    dateRange?: { from?: Date; to?: Date };
    hasAIInsights?: boolean;
    participantRange?: { min?: number; max?: number };
  };
}

interface UseCallRecordingsReturn {
  recordings: EnhancedCallRecording[];
  loading: boolean;
  error: string | null;
  total: number;
  limit: number;
  offset: number;
  refresh: () => Promise<void>;
  processRecording: (
    recordingId: string,
    options?: ProcessingOptions
  ) => Promise<void>;
  updateRecording: (
    recordingId: string,
    updates: Partial<EnhancedCallRecording>
  ) => void;
  // Enhanced functionality
  totalCount: number;
  isLoading: boolean;
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
  };
  setPagination: (pagination: { page?: number; limit?: number }) => void;
  sorting: {
    field: string;
    order: 'asc' | 'desc';
  };
  setSorting: (sorting: { field: string; order: 'asc' | 'desc' }) => void;
  filters: any;
  setFilters: (filters: any) => void;
  refetch: () => Promise<void>;
  exportRecording: (id: string, format?: 'json' | 'csv') => Promise<any>;
  deleteRecording: (id: string) => Promise<void>;
}

export interface ProcessingOptions {
  taskType?: 'transcribe' | 'analyze' | 'all';
  meetingType?: string;
  analysisType?: string;
}

export function useCallRecordings(
  options: UseCallRecordingsOptions = {}
): UseCallRecordingsReturn {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const { organization } = useOrganization();

  // Enhanced state management
  const [pagination, setPaginationState] = useState({
    page: Math.floor((options.offset || 0) / (options.limit || 20)) + 1,
    limit: options.limit || 20,
    totalPages: 1
  });

  // Keep options.limit and options.offset in sync with pagination
  useEffect(() => {
    if (options.limit !== pagination.limit || options.offset !== (pagination.page - 1) * pagination.limit) {
      if (typeof options === 'object') {
        options.limit = pagination.limit;
        options.offset = (pagination.page - 1) * pagination.limit;
      }
    }
  }, [pagination.limit, pagination.page]);

  const [sorting, setSortingState] = useState({
    field: options.orderBy || 'start_time',
    order: options.orderDirection || ('desc' as 'asc' | 'desc')
  });

  const [filters, setFiltersState] = useState(options.filters || {});

  // Fetch recordings using react-query with enhanced parameters
  const {
    data,
    isLoading: loading,
    error
  } = useQuery({
    queryKey: [
      'call-recordings',
      organization?.id,
      { ...options, limit: pagination.limit, offset: (pagination.page - 1) * pagination.limit },
      pagination,
      sorting,
      filters
    ],
    queryFn: async () => {
      if (!organization) throw new Error('No organization');
      // The API class handles authentication headers
      // Build parameters for the API
      const apiParams: any = {
        ...options,
        limit: pagination.limit,
        offset: (pagination.page - 1) * pagination.limit,
        orderBy: sorting.field,
        orderDirection: sorting.order,
        search: options.search,
        status: options.status,
        startDate: options.startDate,
        endDate: options.endDate
      };
      // Add enhanced/meetingType if present
      if (options.meetingType && options.meetingType !== 'all') {
        apiParams.meetingType = options.meetingType;
      }
      // Add filter params if present
      if (filters.status && filters.status.length > 0) {
        apiParams.statusFilter = filters.status.join(',');
      }
      if (filters.dateRange?.from) {
        apiParams.dateFrom = filters.dateRange.from.toISOString();
      }
      if (filters.dateRange?.to) {
        apiParams.dateTo = filters.dateRange.to.toISOString();
      }
      if (filters.hasAIInsights) {
        apiParams.hasAIInsights = 'true';
      }
      if (filters.participantRange?.min) {
        apiParams.minParticipants = filters.participantRange.min.toString();
      }
      if (filters.participantRange?.max) {
        apiParams.maxParticipants = filters.participantRange.max.toString();
      }
      // Call the API
      const result = await CallRecordingsAPI.listRecordings(apiParams);
      // Map to EnhancedCallRecording if needed (add defaults for enhanced fields)
      const enhancedRecordings = (result.recordings || []).map(
        (recording: any): EnhancedCallRecording => ({
          ...recording,
          transcript: {
            text: recording.transcriptText,
            segments: recording.transcript_segments,
            fullTranscript: recording.transcriptText,
            summary: recording.ai_summary,
            topics: recording.key_topics || [],
            keyTopics: recording.key_topics || [],
            actionItems: recording.action_items || [],
            decisions: recording.decisions || [],
            participants: recording.participants || [],
            duration: recording.meeting_duration_minutes,
            meetingType: recording.meeting_type,
            wordCount: recording.word_count || 0
          },
          meetingType: recording.meetingType || 'call',
          participantCount: recording.participantCount || 2,
          actionItemCount: recording.actionItemCount || 0,
          decisionCount: recording.decisionCount || 0,
          participantSummary: recording.participantSummary,
          hasAnalysis: recording.hasAnalysis || false,
          hasTranscript: recording.hasTranscript || false,
          shareInfo: recording.shareInfo,
          accessType:
            recording.accessType === 'owner' ||
            recording.accessType === 'shared'
              ? recording.accessType
              : undefined,
          enhancedAccessType: recording.accessType
        })
      );
      return {
        recordings: enhancedRecordings,
        total: result.total || enhancedRecordings.length,
        limit: pagination.limit,
        offset: (pagination.page - 1) * pagination.limit,
        totalCount: result.total || enhancedRecordings.length
      };
    },
    enabled: !!organization
  });

  const recordings = data?.recordings || [];
  const total = data?.total || 0;
  const totalCount = data?.totalCount || total;
  const limit = data?.limit || 20;
  const offset = data?.offset || 0;

  // Update pagination when data changes
  useEffect(() => {
    if (totalCount > 0) {
      setPaginationState((prev) => ({
        ...prev,
        totalPages: Math.ceil(totalCount / prev.limit)
      }));
    }
  }, [totalCount]);

  const refresh = async () => {
    await queryClient.invalidateQueries({
      queryKey: ['call-recordings', organization?.id]
    });
  };

  // Enhanced process recording with meeting intelligence options
  const processRecording = useCallback(
    async (
      recordingId: string,
      processingOptions: ProcessingOptions = {}
    ): Promise<void> => {
      try {
        if (!organization) throw new Error('No organization');
        await CallRecordingsAPI.processRecording(recordingId, {
          taskType: processingOptions.taskType || 'all'
        });
        // Refresh data after processing
        await refresh();
      } catch (err) {
        console.error('Failed to process recording:', err);
        throw err;
      }
    },
    [organization, refresh]
  );

  // Export recording functionality
  const exportRecording = useCallback(
    async (id: string, format: 'json' | 'csv' = 'json') => {
      if (!organization) throw new Error('No organization');
      // If you have a CallRecordingsAPI.exportRecording, use it. Otherwise, keep the fetch for now.
      // Placeholder: keep fetch for /api/meetings/{id}/export if not in API class
      // TODO: Move to CallRecordingsAPI if/when implemented
      throw new Error('Export not implemented in CallRecordingsAPI');
    },
    [organization]
  );

  // Delete recording functionality
  const deleteRecording = useCallback(
    async (id: string) => {
      if (!organization) throw new Error('No organization');
      // If you have a CallRecordingsAPI.deleteRecording, use it. Otherwise, keep the fetch for now.
      // TODO: Move to CallRecordingsAPI if/when implemented
      throw new Error('Delete not implemented in CallRecordingsAPI');
    },
    [organization, refresh]
  );

  const updateRecording = useCallback(
    (recordingId: string, updates: Partial<EnhancedCallRecording>) => {
      // Implementation for optimistic updates
      queryClient.setQueryData(
        [
          'call-recordings',
          organization?.id,
          options,
          pagination,
          sorting,
          filters
        ],
        (oldData: any) => {
          if (!oldData) return oldData;

          return {
            ...oldData,
            recordings: oldData.recordings.map(
              (recording: EnhancedCallRecording) =>
                recording.id === recordingId
                  ? { ...recording, ...updates }
                  : recording
            )
          };
        }
      );
    },
    [queryClient, organization?.id, options, pagination, sorting, filters]
  );

  // Enhanced state setters
  const setPagination = useCallback(
    (newPagination: { page?: number; limit?: number }) => {
      setPaginationState((prev) => ({
        ...prev,
        ...newPagination
      }));
    },
    []
  );

  const setSorting = useCallback(
    (newSorting: { field: string; order: 'asc' | 'desc' }) => {
      setSortingState(newSorting);
    },
    []
  );

  const setFilters = useCallback((newFilters: any) => {
    setFiltersState(newFilters);
    // Reset to first page when filters change
    setPaginationState((prev) => ({ ...prev, page: 1 }));
  }, []);

  return {
    // Legacy interface
    recordings,
    loading,
    error: error
      ? error instanceof Error
        ? error.message
        : String(error)
      : null,
    total,
    limit,
    offset,
    refresh,
    processRecording,
    updateRecording,

    // Enhanced interface
    totalCount,
    isLoading: loading,
    pagination: {
      ...pagination,
      totalPages: Math.ceil(totalCount / pagination.limit)
    },
    setPagination,
    sorting,
    setSorting,
    filters,
    setFilters,
    refetch: refresh,
    exportRecording,
    deleteRecording
  };
}

/**
 * Hook for getting meeting analytics
 */
export function useMeetingAnalytics() {
  const { getToken } = useAuth();
  const { organization } = useOrganization();

  const {
    data: analytics,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['meeting-analytics', organization?.id],
    queryFn: async () => {
      if (!organization) throw new Error('No organization');

      const token = await getToken();
      if (!token) throw new Error('No authentication token');

      const response = await fetch('/api/meetings/analytics', {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Org-Id': organization.id
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch analytics: ${response.statusText}`);
      }

      return await response.json();
    },
    enabled: !!organization && !!getToken
  });

  return {
    analytics,
    isLoading,
    error: error
      ? error instanceof Error
        ? error.message
        : String(error)
      : null,
    refetch
  };
}
