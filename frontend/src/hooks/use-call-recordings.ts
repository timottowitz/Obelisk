
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CallRecordingsAPI, Recording } from '@/services/call-recordings-api';
import { CallRecording, RecordingShare, ShareRecordingRequest, RecordingShareInfo, AccessibleRecordingsResponse, AccessibleRecordingsFilters } from '@/types/callcaps';

const QUERY_KEYS = {
  recordings: 'recordings',
  recording: 'recording',
  organizationMembers: 'organizationMembers',
  accessibleRecordings: 'accessibleRecordings',
  recordingShares: 'recordingShares',
};

export const useListRecordings = (params: any) => {
  return useQuery<any, Error>({
    queryKey: [QUERY_KEYS.recordings, params],
    queryFn: () => CallRecordingsAPI.listRecordings(params),
  });
};

export const useGetRecording = (recordingId: string) => {
  return useQuery<{ recording: Recording }, Error>({
    queryKey: [QUERY_KEYS.recording, recordingId],
    queryFn: () => CallRecordingsAPI.getRecording(recordingId),
    enabled: !!recordingId,
  });
};

export const useUploadRecording = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: { blob: Blob; metadata: any }) =>
      CallRecordingsAPI.uploadRecordingFile(variables.blob, variables.metadata),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.recordings] });
    },
  });
};

export const useProcessRecording = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: { recordingId: string; data: any }) =>
      CallRecordingsAPI.processRecording(variables.recordingId, variables.data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.recordings] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.recording, variables.recordingId] });
    },
  });
};

export const useGetOrganizationMembers = () => {
  return useQuery<{ members: any[] }, Error>({
    queryKey: [QUERY_KEYS.organizationMembers],
    queryFn: () => CallRecordingsAPI.getOrganizationMembers(),
  });
};

export const useGetAccessibleRecordings = (params: AccessibleRecordingsFilters) => {
  return useQuery<AccessibleRecordingsResponse, Error>({
    queryKey: [QUERY_KEYS.accessibleRecordings, params],
    queryFn: () => CallRecordingsAPI.getAccessibleRecordings(params),
  });
};

export const useShareRecording = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: { recordingId: string; shareData: ShareRecordingRequest }) =>
      CallRecordingsAPI.shareRecording(variables.recordingId, variables.shareData),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.recordingShares, variables.recordingId] });
    },
  });
};

export const useGetRecordingShares = (recordingId: string) => {
  return useQuery<RecordingShareInfo, Error>({
    queryKey: [QUERY_KEYS.recordingShares, recordingId],
    queryFn: () => CallRecordingsAPI.getRecordingShares(recordingId),
    enabled: !!recordingId,
  });
};

export const useRemoveRecordingShare = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: { recordingId: string; memberId: string }) =>
      CallRecordingsAPI.removeRecordingShare(variables.recordingId, variables.memberId),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.recordingShares, variables.recordingId] });
    },
  });
};
