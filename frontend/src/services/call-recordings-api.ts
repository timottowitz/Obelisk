import {
  CallRecording,
  CallTranscript,
  OrganizationMember,
  RecordingShare,
  ShareRecordingRequest,
  RecordingShareInfo,
  AccessibleRecordingsResponse,
  AccessibleRecordingsFilters,
  RecordingClip
} from '@/types/callcaps';
import { API_CONFIG, getAuthHeaders, handleApiResponse } from '@/config/api';

// API Configuration
const API_BASE_URL = API_CONFIG.CALL_RECORDINGS_BASE_URL;

// Types from API documentation
export interface Recording {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  duration_ms: number; // API returns duration in milliseconds
  participants: string[];
  status: 'uploading' | 'uploaded' | 'processing' | 'processed' | 'failed';
  mime_type: string;
  file_size: number;
  has_video: boolean;
  has_audio: boolean;
  gcs_video_url?: string;
  gcs_video_blob_name?: string;
  gcs_transcript_url?: string;
  gcs_transcript_blob_name?: string;
  transcript_text?: string;
  transcript_segments?: {
    speaker: string;
    transcription: string;
  }[];
  ai_analysis?: any;
  ai_summary?: string;
  action_items?: any[];
  key_topics?: string[];
  risk_analysis?: any[];
  sentiment?: string;
  word_count?: number;
  created_at: string;
  updated_at: string;
  processed_at?: string;
  processing_error?: string;
  date: string;
  time: string;
  duration: string;
  transcript?: {
    summary: string;
    actionItems: any[];
    keyTopics: string[];
    sentiment: string;
    wordCount: number;
  };
}

export interface ListRecordingsResponse {
  recordings: Recording[];
  total: number;
  limit: number;
  offset: number;
}

export interface ProcessRecordingRequest {
  taskType?: 'transcribe' | 'analyze' | 'all';
}

export interface ErrorResponse {
  error: string;
  details?: string;
}

// API Service Class
export class CallRecordingsAPI {
  // List Recordings
  static async listRecordings(
    params: {
      limit?: number;
      offset?: number;
      orderBy?: string;
      orderDirection?: 'asc' | 'desc';
      search?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
    } = {}
  ): Promise<ListRecordingsResponse> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, value.toString());
      }
    });

    const url = `${API_BASE_URL}?${searchParams.toString()}`;
    const headers = await getAuthHeaders();
    const response = await fetch(url, { headers });
    return handleApiResponse<ListRecordingsResponse>(response);
  }

  // Get Single Recording
  static async getRecording(
    recordingId: string
  ): Promise<{ recording: Recording }> {
    const url = `${API_BASE_URL}/${recordingId}`;
    const headers = await getAuthHeaders();
    const response = await fetch(url, { headers });
    return handleApiResponse<{ recording: Recording }>(response);
  }

  // Upload Recording with FormData (for large files)
  static async uploadRecordingFile(
    blob: Blob,
    metadata: {
      mimeType: string;
      duration: number;
      startTime: string;
      endTime?: string;
      title: string;
      participants?: string[];
      meetingTypeId?: string;
      taskType?: string
    }
  ): Promise<{
    success: boolean;
    recording: {
      id: string;
      title: string;
      status: 'uploaded';
      gcs_video_url: string;
      duration: number;
      start_time: string;
      end_time: string;
    };
  }> {
    const headers = await getAuthHeaders();

    // Create new headers without Content-Type for FormData
    const uploadHeaders: Record<string, string> = {};
    if (typeof headers === 'object' && headers !== null) {
      Object.entries(headers).forEach(([key, value]) => {
        if (key.toLowerCase() !== 'content-type') {
          uploadHeaders[key] = value as string;
        }
      });
    }

    const formData = new FormData();
    formData.append('file', blob, 'recording.webm');
    formData.append('metadata', JSON.stringify(metadata));

    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      headers: uploadHeaders,
      body: formData
    });

    return handleApiResponse(response);
  }

  // Process Recording
  static async processRecording(
    recordingId: string,
    data: ProcessRecordingRequest = {
      taskType: 'all'
    }
  ): Promise<{
    success: boolean;
    recording: {
      id: string;
      title: string;
      status: 'processed';
      transcript_text?: string;
      ai_analysis?: any;
      ai_summary?: string;
    };
  }> {
    const url = `${API_BASE_URL}/${recordingId}/process`;
    const headers = await getAuthHeaders();
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });
    return handleApiResponse(response);
  }

  // Get Organization Members
  static async getOrganizationMembers(): Promise<{
    members: OrganizationMember[];
  }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/organization-members`, {
      headers
    });
    return handleApiResponse<{ members: OrganizationMember[] }>(response);
  }

  // Get all accessible recordings for current user (owned + shared)
  static async getAccessibleRecordings(
    params: AccessibleRecordingsFilters = {}
  ): Promise<AccessibleRecordingsResponse> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, value.toString());
      }
    });

    const url = `${API_BASE_URL}/accessible?${searchParams.toString()}`;
    const headers = await getAuthHeaders();
    const response = await fetch(url, { headers });
    const data = (await handleApiResponse(response)) as {
      recordings: Recording[];
      summary: {
        total: number;
        owned: number;
        shared: number;
      };
      pagination: {
        limit: number;
        offset: number;
        total: number;
        hasMore: boolean;
      };
      filters: {
        orderBy: string;
        orderDirection: string;
        search?: string;
        status?: string;
        startDate?: string;
        endDate?: string;
        accessType?: string;
      };
    };

    // Convert API recordings to CallRecording format
    const convertedRecordings = data.recordings.map((recording: Recording) =>
      this.convertToCallRecording(recording)
    );

    return {
      recordings: convertedRecordings,
      summary: data.summary,
      pagination: data.pagination,
      filters: data.filters
    };
  }

  // Share Recording
  static async shareRecording(
    recordingId: string,
    shareData: ShareRecordingRequest
  ): Promise<{
    success: boolean;
    message: string;
    shares: RecordingShare[];
  }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/${recordingId}/share`, {
      method: 'POST',
      headers,
      body: JSON.stringify(shareData)
    });
    return handleApiResponse(response);
  }

  // Get Recording Shares
  static async getRecordingShares(
    recordingId: string
  ): Promise<RecordingShareInfo> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/${recordingId}/shares`, {
      headers
    });
    return handleApiResponse<RecordingShareInfo>(response);
  }

  // Remove Recording Share
  static async removeRecordingShare(
    recordingId: string,
    memberId: string
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_BASE_URL}/${recordingId}/share/${memberId}`,
      {
        method: 'DELETE',
        headers
      }
    );
    return handleApiResponse(response);
  }

  // Helper: Convert API Recording to CallRecording type
  static convertToCallRecording(apiRecording: Recording): CallRecording {
    // Convert API transcript to CallTranscript type
    const transcript: CallTranscript | null = apiRecording.transcript
      ? {
          summary: apiRecording.transcript.summary,
          actionItems: apiRecording.transcript.actionItems || [],
          keyTopics: apiRecording.transcript.keyTopics || [],
          sentiment:
            (apiRecording.transcript.sentiment as
              | 'positive'
              | 'negative'
              | 'neutral') || 'neutral',
          wordCount: apiRecording.transcript.wordCount || 0
        }
      : null;

    // Convert status to match CallRecording type
    const status: 'processed' | 'processing' | 'failed' =
      apiRecording.status === 'uploading' || apiRecording.status === 'uploaded'
        ? 'processing'
        : apiRecording.status === 'processed'
          ? 'processed'
          : 'failed';

    return {
      id: apiRecording.id,
      title: apiRecording.title,
      date: apiRecording.date,
      time: apiRecording.time,
      duration: apiRecording.duration, // API already provides formatted duration
      participants: apiRecording.participants,
      status,
      thumbnail: apiRecording.gcs_video_url || '/api/placeholder/300/200',
      hasVideo: apiRecording.has_video,
      hasAudio: apiRecording.has_audio,
      transcript,
      sharing_link: apiRecording.gcs_video_url,
      shareInfo: undefined, // Sharing functionality not implemented
      transcript_text: apiRecording.transcript_text || '',
      transcript_segments: apiRecording.transcript_segments || [],
      ai_analysis: apiRecording.ai_analysis,
      ai_summary: apiRecording.ai_summary,
      action_items: apiRecording.action_items,
      key_topics: apiRecording.key_topics,
      risk_analysis: apiRecording.risk_analysis,
      sentiment: apiRecording.sentiment,
      word_count: apiRecording.word_count,
      created_at: apiRecording.created_at,
      updated_at: apiRecording.updated_at,
      processed_at: apiRecording.processed_at,
      processing_error: apiRecording.processing_error,
      // Add missing properties with fallback values
      s3_key: apiRecording.gcs_video_blob_name || '',
      transcript_s3_key: apiRecording.gcs_transcript_blob_name || null,
      gcs_video_url: apiRecording.gcs_video_url,
      start_time: apiRecording.start_time
      // Add other fields as needed
    };
  }

  // Clips
  static async createClip(
    recordingId: string,
    startTime: number,
    endTime: number,
    title?: string
  ): Promise<RecordingClip> {
    const headers = await getAuthHeaders();
    const response = await fetch(API_CONFIG.RECORDING_CLIPS_BASE_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        recording_id: recordingId,
        start_time: startTime,
        end_time: endTime,
        title: title
      })
    });
    return handleApiResponse<RecordingClip>(response);
  }

  static async getClip(
    shareToken: string,
    schemaName: string
  ): Promise<RecordingClip> {
    const headers = {
      'Content-Type': 'application/json',
      'X-Schema-Name': schemaName
    };
    const response = await fetch(
      `${API_CONFIG.RECORDING_CLIPS_BASE_URL}/${shareToken}`,
      {
        headers
      }
    );
    return handleApiResponse<RecordingClip>(response);
  }
}

export const callRecordingsAPI = new CallRecordingsAPI();
