import { useState, useEffect, useCallback } from 'react';
import { CallRecording } from '@/types/callcaps';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { useOrganization } from '@clerk/nextjs';

// Enhanced interfaces for meeting intelligence
export interface EnhancedCallRecording extends CallRecording {
  meetingType: 'meeting' | 'call' | 'interview' | 'consultation';
  participantCount: number;
  actionItemCount: number;
  decisionCount: number;
  participantSummary?: string;
  hasAnalysis: boolean;
  hasTranscript: boolean;
  // Override accessType to extend the original
  accessType: 'owner' | 'shared' | 'full' | 'view_only' | 'restricted';
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
  meetingType?: 'all' | 'meeting' | 'call' | 'interview' | 'consultation';
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
  processRecording: (recordingId: string, options?: ProcessingOptions) => Promise<void>;
  updateRecording: (recordingId: string, updates: Partial<EnhancedCallRecording>) => void;
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
  meetingType?: 'meeting' | 'call' | 'interview' | 'consultation';
  analysisType?: string;
}

export function useCallRecordings(options: UseCallRecordingsOptions = {}): UseCallRecordingsReturn {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const { organization } = useOrganization();
  
  // Enhanced state management
  const [pagination, setPaginationState] = useState({
    page: Math.floor((options.offset || 0) / (options.limit || 20)) + 1,
    limit: options.limit || 20,
    totalPages: 1,
  });
  
  const [sorting, setSortingState] = useState({
    field: options.orderBy || 'start_time',
    order: options.orderDirection || 'desc' as 'asc' | 'desc',
  });
  
  const [filters, setFiltersState] = useState(options.filters || {});

  // Fetch recordings using react-query with enhanced parameters
  const {
    data,
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ['call-recordings', organization?.id, options, pagination, sorting, filters],
    queryFn: async () => {
      if (!organization) throw new Error('No organization');
      
      const token = await getToken();
      if (!token) throw new Error('No authentication token');

      // Build enhanced query parameters
      const params = new URLSearchParams();
      
      // Basic parameters
      params.append('limit', pagination.limit.toString());
      params.append('offset', ((pagination.page - 1) * pagination.limit).toString());
      params.append('orderBy', sorting.field);
      params.append('orderDirection', sorting.order);
      
      // Legacy support
      if (options.search) params.append('search', options.search);
      if (options.status) params.append('status', options.status);
      if (options.startDate) params.append('startDate', options.startDate);
      if (options.endDate) params.append('endDate', options.endDate);
      
      // Enhanced parameters
      if (options.meetingType && options.meetingType !== 'all') {
        params.append('meetingType', options.meetingType);
      }
      if (options.enhanced) {
        params.append('enhanced', 'true');
      }
      
      // Filter parameters
      if (filters.status && filters.status.length > 0) {
        params.append('statusFilter', filters.status.join(','));
      }
      if (filters.dateRange?.from) {
        params.append('dateFrom', filters.dateRange.from.toISOString());
      }
      if (filters.dateRange?.to) {
        params.append('dateTo', filters.dateRange.to.toISOString());
      }
      if (filters.hasAIInsights) {
        params.append('hasAIInsights', 'true');
      }
      if (filters.participantRange?.min) {
        params.append('minParticipants', filters.participantRange.min.toString());
      }
      if (filters.participantRange?.max) {
        params.append('maxParticipants', filters.participantRange.max.toString());
      }

      const response = await fetch(`/api/call-recordings?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Org-Id': organization.id,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch recordings: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Enhanced mapping for meeting intelligence features
      const enhancedRecordings = (result.recordings || []).map((recording: any): EnhancedCallRecording => ({
        // Map all existing CallRecording fields
        id: recording.id,
        title: recording.title,
        date: recording.date,
        time: recording.time,
        duration: recording.duration,
        status: recording.status,
        transcript: recording.transcript,
        // Required CallRecording fields
        participants: recording.participants || [],
        thumbnail: recording.thumbnail || '',
        hasVideo: recording.hasVideo || false,
        hasAudio: recording.hasAudio || true,
        accessType: recording.accessType || 'owner',
        // Additional required fields from CallRecording
        transcript_text: recording.transcript_text || '',
        transcript_segments: recording.transcript_segments || [],
        s3Key: recording.s3Key || '',
        transcriptS3Key: recording.transcriptS3Key || '',
        // Add enhanced fields
        meetingType: recording.meetingType || 'call',
        participantCount: recording.participantCount || 2,
        actionItemCount: recording.actionItemCount || 0,
        decisionCount: recording.decisionCount || 0,
        participantSummary: recording.participantSummary,
        hasAnalysis: recording.hasAnalysis || false,
        hasTranscript: recording.hasTranscript || false,
        shareInfo: recording.shareInfo,
      }));
      
      return {
        recordings: enhancedRecordings,
        total: result.total || enhancedRecordings.length,
        limit: pagination.limit,
        offset: (pagination.page - 1) * pagination.limit,
        totalCount: result.totalCount || result.total || enhancedRecordings.length,
      };
    },
    enabled: !!organization && !!getToken
  });

  const recordings = data?.recordings || [];
  const total = data?.total || 0;
  const totalCount = data?.totalCount || total;
  const limit = data?.limit || 20;
  const offset = data?.offset || 0;

  // Update pagination when data changes
  useEffect(() => {
    if (totalCount > 0) {
      setPaginationState(prev => ({
        ...prev,
        totalPages: Math.ceil(totalCount / prev.limit),
      }));
    }
  }, [totalCount]);

  const refresh = async () => {
    await queryClient.invalidateQueries({ 
      queryKey: ['call-recordings', organization?.id] 
    });
  };

  // Enhanced process recording with meeting intelligence options
  const processRecording = useCallback(async (
    recordingId: string, 
    processingOptions: ProcessingOptions = {}
  ): Promise<void> => {
    try {
      if (!organization) throw new Error('No organization');
      
      const token = await getToken();
      if (!token) throw new Error('No authentication token');

      const response = await fetch(`/api/call-recordings/${recordingId}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Org-Id': organization.id,
        },
        body: JSON.stringify({
          taskType: processingOptions.taskType || 'all',
          meetingType: processingOptions.meetingType || 'call',
          analysisType: processingOptions.analysisType,
        }),
      });

      if (!response.ok) {
        throw new Error(`Processing failed: ${response.statusText}`);
      }

      // Refresh data after processing
      await refresh();
      
    } catch (err) {
      console.error('Failed to process recording:', err);
      throw err;
    }
  }, [getToken, organization, refresh]);

  // Export recording functionality
  const exportRecording = useCallback(async (id: string, format: 'json' | 'csv' = 'json') => {
    if (!organization) throw new Error('No organization');
    
    const token = await getToken();
    if (!token) throw new Error('No authentication token');

    const response = await fetch(`/api/meetings/${id}/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Org-Id': organization.id,
      },
      body: JSON.stringify({
        format,
        includeTranscript: true,
        includeAnalysis: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }

    return await response.json();
  }, [getToken, organization]);

  // Delete recording functionality
  const deleteRecording = useCallback(async (id: string) => {
    if (!organization) throw new Error('No organization');
    
    const token = await getToken();
    if (!token) throw new Error('No authentication token');

    const response = await fetch(`/api/call-recordings/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Org-Id': organization.id,
      },
    });

    if (!response.ok) {
      throw new Error(`Delete failed: ${response.statusText}`);
    }

    await refresh();
  }, [getToken, organization, refresh]);

  const updateRecording = useCallback((recordingId: string, updates: Partial<EnhancedCallRecording>) => {
    // Implementation for optimistic updates
    queryClient.setQueryData(
      ['call-recordings', organization?.id, options, pagination, sorting, filters],
      (oldData: any) => {
        if (!oldData) return oldData;
        
        return {
          ...oldData,
          recordings: oldData.recordings.map((recording: EnhancedCallRecording) =>
            recording.id === recordingId ? { ...recording, ...updates } : recording
          ),
        };
      }
    );
  }, [queryClient, organization?.id, options, pagination, sorting, filters]);

  // Enhanced state setters
  const setPagination = useCallback((newPagination: { page?: number; limit?: number }) => {
    setPaginationState(prev => ({
      ...prev,
      ...newPagination,
    }));
  }, []);

  const setSorting = useCallback((newSorting: { field: string; order: 'asc' | 'desc' }) => {
    setSortingState(newSorting);
  }, []);

  const setFilters = useCallback((newFilters: any) => {
    setFiltersState(newFilters);
    // Reset to first page when filters change
    setPaginationState(prev => ({ ...prev, page: 1 }));
  }, []);

  return {
    // Legacy interface
    recordings,
    loading,
    error: error ? (error instanceof Error ? error.message : String(error)) : null,
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
      totalPages: Math.ceil(totalCount / pagination.limit),
    },
    setPagination,
    sorting,
    setSorting,
    filters,
    setFilters,
    refetch: refresh,
    exportRecording,
    deleteRecording,
  };
}

/**
 * Hook for getting meeting analytics
 */
export function useMeetingAnalytics() {
  const { getToken } = useAuth();
  const { organization } = useOrganization();

  const { data: analytics, isLoading, error, refetch } = useQuery({
    queryKey: ['meeting-analytics', organization?.id],
    queryFn: async () => {
      if (!organization) throw new Error('No organization');
      
      const token = await getToken();
      if (!token) throw new Error('No authentication token');

      const response = await fetch('/api/meetings/analytics', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Org-Id': organization.id,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch analytics: ${response.statusText}`);
      }

      return await response.json();
    },
    enabled: !!organization && !!getToken,
  });

  return {
    analytics,
    isLoading,
    error: error ? (error instanceof Error ? error.message : String(error)) : null,
    refetch,
  };
} 