import { useState, useEffect, useCallback } from 'react';
import { CallRecording } from '@/types/callcaps';
import { CallRecordingsAPI, Recording } from '@/services/call-recordings-api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';

interface UseCallRecordingsOptions {
  limit?: number;
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
  refresh: () => Promise<void>;
  uploadRecording: (data: {
    recordingBlob: string;
    mimeType: string;
    duration: number;
    startTime: string;
    endTime?: string;
    title: string;
    participants?: string[];
  }) => Promise<CallRecording>;
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
        limit: options.limit || 50,
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
        total: response.total
      };
    },
    enabled: !!orgId
  });

  const recordings = data?.recordings || [];
  const total = data?.total || 0;

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['call-recordings', orgId] });
  };

  const uploadRecording = useCallback(async (data: {
    recordingBlob: string;
    mimeType: string;
    duration: number;
    startTime: string;
    endTime?: string;
    title: string;
    participants?: string[];
  }): Promise<CallRecording> => {
    try {
      const response = await CallRecordingsAPI.uploadRecording(data);
      
      const newRecording: CallRecording = {
        id: response.recording.id,
        title: response.recording.title,
        date: new Date(data.startTime).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric'
        }),
        time: new Date(data.startTime).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit'
        }),
        duration: `${Math.round(data.duration / 1000 / 60)}min`,
        participants: data.participants || ['Current User'],
        status: 'processing',
        hasVideo: true,
        hasAudio: true,
        transcript: null,
        s3Key: response.recording.azure_video_url,
        transcriptS3Key: null,
        sharing_link: response.recording.azure_video_url,
        thumbnail: '/api/placeholder/300/200'
      };

      return newRecording;
    } catch (err) {
      console.error('Failed to upload recording:', err);
      throw err;
    }
  }, []);

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
    refresh,
    uploadRecording,
    processRecording,
    updateRecording
  };
} 