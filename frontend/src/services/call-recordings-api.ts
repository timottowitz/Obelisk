import { CallRecording, CallTranscript } from '@/types/callcaps';
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
  azure_video_url?: string;
  azure_video_blob_name?: string;
  azure_transcript_url?: string;
  azure_transcript_blob_name?: string;
  transcript_text?: string;
  transcript_segments?: any[];
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

export interface UploadRecordingRequest {
  recordingBlob: string;
  mimeType: string;
  duration: number;
  startTime: string;
  endTime?: string;
  title: string;
  participants?: string[];
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
  static async listRecordings(params: {
    limit?: number;
    offset?: number;
    orderBy?: string;
    orderDirection?: 'asc' | 'desc';
    search?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  } = {}): Promise<ListRecordingsResponse> {
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
  static async getRecording(recordingId: string): Promise<{ recording: Recording }> {
    const url = `${API_BASE_URL}/${recordingId}`;
    const headers = await getAuthHeaders();
    const response = await fetch(url, { headers });
    return handleApiResponse<{ recording: Recording }>(response);
  }

  // Upload Recording
  static async uploadRecording(data: UploadRecordingRequest): Promise<{
    success: boolean;
    recording: {
      id: string;
      title: string;
      status: 'uploaded';
      azure_video_url: string;
      duration: number;
      start_time: string;
      end_time: string;
    };
  }> {
    const headers = await getAuthHeaders();
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });
    return handleApiResponse(response);
  }

  // Upload Recording with FormData (for large files)
  static async uploadRecordingFile(
    blob: Blob,
    metadata: Omit<UploadRecordingRequest, 'recordingBlob'>
  ): Promise<{
    success: boolean;
    recording: {
      id: string;
      title: string;
      status: 'uploaded';
      azure_video_url: string;
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
    data: ProcessRecordingRequest = { taskType: 'all' }
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

  // Helper: Convert blob to base64
  static async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        try {
          const result = reader.result as string;
          if (!result) {
            reject(new Error('Failed to read blob data'));
            return;
          }
          
          // Check if it's a valid data URL
          if (!result.startsWith('data:')) {
            reject(new Error('Invalid data URL format - does not start with "data:"'));
            return;
          }
          
          // Extract base64 data (remove data URL prefix)
          const parts = result.split(',');
          if (parts.length < 2) {
            reject(new Error('Invalid data URL format - missing comma separator'));
            return;
          }
          
          const base64 = parts[1];
          if (!base64) {
            reject(new Error('Empty base64 data'));
            return;
          }
          
          // Validate base64 format
          const isValidBase64 = /^[A-Za-z0-9+/]*={0,2}$/.test(base64);
          if (!isValidBase64) {
            reject(new Error('Invalid base64 format'));
            return;
          }
          
          resolve(base64);
        } catch (error) {
          reject(new Error(`Error processing blob data: ${error}`));
        }
      };
      
      reader.onerror = (error) => {
        console.error('FileReader error:', error);
        reject(new Error(`FileReader error: ${error}`));
      };
      
      reader.onabort = () => {
        reject(new Error('FileReader aborted'));
      };
      
      // Read as data URL
      reader.readAsDataURL(blob);
    });
  }

  // Alternative: Convert blob to base64 using ArrayBuffer (better for video files)
  static async blobToBase64ArrayBuffer(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        try {
          const arrayBuffer = reader.result as ArrayBuffer;
          if (!arrayBuffer) {
            reject(new Error('Failed to read blob as ArrayBuffer'));
            return;
          }
          
          // Convert ArrayBuffer to base64
          const bytes = new Uint8Array(arrayBuffer);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          
          const base64 = btoa(binary);
          
          resolve(base64);
        } catch (error) {
          reject(new Error(`Error processing ArrayBuffer: ${error}`));
        }
      };
      
      reader.onerror = (error) => {
        console.error('FileReader ArrayBuffer error:', error);
        reject(new Error(`FileReader error: ${error}`));
      };
      
      // Read as ArrayBuffer
      reader.readAsArrayBuffer(blob);
    });
  }

  // Test function to verify blob conversion
  static async testBlobConversion(blob: Blob): Promise<{
    success: boolean;
    originalSize: number;
    base64Length: number;
    base64Preview: string;
    error?: string;
  }> {
    try {
      const base64 = await this.blobToBase64ArrayBuffer(blob);
      
      // Verify the base64 string
      const isValidBase64 = /^[A-Za-z0-9+/]*={0,2}$/.test(base64);
      
      return {
        success: true,
        originalSize: blob.size,
        base64Length: base64.length,
        base64Preview: base64.substring(0, 100)
      };
    } catch (error) {
      console.error('Blob conversion test failed:', error);
      return {
        success: false,
        originalSize: blob.size,
        base64Length: 0,
        base64Preview: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Helper: Convert API Recording to CallRecording type
  static convertToCallRecording(apiRecording: Recording): CallRecording {
    // Convert API transcript to CallTranscript type
    const transcript: CallTranscript | null = apiRecording.transcript ? {
      summary: apiRecording.transcript.summary,
      actionItems: apiRecording.transcript.actionItems || [],
      keyTopics: apiRecording.transcript.keyTopics || [],
      sentiment: (apiRecording.transcript.sentiment as 'positive' | 'negative' | 'neutral') || 'neutral',
      wordCount: apiRecording.transcript.wordCount || 0
    } : null;

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
      thumbnail: apiRecording.azure_video_url || '/api/placeholder/300/200',
      hasVideo: apiRecording.has_video,
      hasAudio: apiRecording.has_audio,
      transcript,
      s3Key: apiRecording.azure_video_blob_name || '',
      transcriptS3Key: apiRecording.azure_transcript_blob_name || null,
      sharing_link: apiRecording.azure_video_url
    };
  }
}

export const callRecordingsAPI = new CallRecordingsAPI(); 