import { useState, useEffect, useCallback } from 'react';
import { CallRecording } from '@/types/callcaps';
import { CallRecordingsAPI, Recording } from '@/services/call-recordings-api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';

interface UseCallRecordingsOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  search?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

interface UseCallRecordingsReturn {
  recordings: CallRecording[];
  loading: boolean;
  error: string | null;
  total: number;
  limit: number;
  offset: number;
  refresh: () => Promise<void>;
  processRecording: (recordingId: string) => Promise<void>;
  updateRecording: (recordingId: string, updates: Partial<CallRecording>) => void;
}

export function useCallRecordings(options: UseCallRecordingsOptions = {}): UseCallRecordingsReturn {
  const queryClient = useQueryClient();
  const { orgId } = useAuth();

  // Fetch recordings using react-query
  const {
    data,
    isLoading: loading,
    error,
    refetch
  } = useQuery({
    queryKey: ['call-recordings', orgId, options],
    queryFn: async () => {
      const response = await CallRecordingsAPI.listRecordings({
        limit: options.limit || 20,
        offset: options.offset || 0,
        orderBy: options.orderBy || 'start_time',
        orderDirection: options.orderDirection || 'desc',
        search: options.search,
        status: options.status,
        startDate: options.startDate,
        endDate: options.endDate
      });
      return {
        recordings: response.recordings.map((recording: Recording) =>
          CallRecordingsAPI.convertToCallRecording(recording)
        ),
        total: response.total,
        limit: response.limit,
        offset: response.offset
      };
    },
    enabled: !!orgId
  });

  const recordings = data?.recordings || [];
  const total = data?.total || 0;
  const limit = data?.limit || 20;
  const offset = data?.offset || 0;

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['call-recordings', orgId] });
  };

  const processRecording = useCallback(async (recordingId: string): Promise<void> => {
    try {
      await CallRecordingsAPI.processRecording(recordingId);
    } catch (err) {
      console.error('Failed to process recording:', err);
      throw err;
    }
  }, []);

  const updateRecording = useCallback((recordingId: string, updates: Partial<CallRecording>) => {
    // Implementation needed
  }, []);

  return {
    recordings,
    loading,
    error: error ? (error instanceof Error ? error.message : String(error)) : null,
    total,
    limit,
    offset,
    refresh,
    processRecording,
    updateRecording
  };
} 