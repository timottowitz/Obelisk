export interface CallRecording {
  id: string;
  title: string;
  date: string;
  time: string;
  duration: string;
  participants: string[];
  status: 'processed' | 'processing' | 'failed';
  thumbnail: string;
  hasVideo: boolean;
  hasAudio: boolean;
  transcript: CallTranscript | null;
  transcript_text: string;
  transcript_segments: {
    speaker: string;
    transcription: string;
  }[];
  s3_key: string;
  transcript_s3_key: string | null;
  sharing_link?: string;
  webRecording?: WebRecording;
  isShared?: boolean;
  accessType?: 'owner' | 'shared';
  shareInfo?: {
    sharedBy?: string;
    permissionLevel?: 'view' | 'edit' | 'admin';
    expiresAt?: string;
  };
  ai_analysis?: any;
  ai_summary?: string;
  action_items?: any[];
  key_topics?: string[];
  risk_analysis?: any[];
  sentiment?: string;
  word_count?: number;
  created_at?: string;
  updated_at?: string;
  processed_at?: string;
  processing_error?: string;
  meeting_type?: string;
  participant_count?: number;
  action_item_count?: number;
  decision_count?: number;
  topic_count?: number;
  meeting_duration_minutes?: number;
  member_name?: string;
  speakers_metadata?: any;
  gcs_video_url?: string;
  gcs_video_blob_name?: string;
  start_time?: string;
  videoUrl?: string;
}

export interface CallTranscript {
  summary: string;
  actionItems: MeetingActionItem[];
  keyTopics: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
  wordCount: number;
}

export interface MeetingActionItem {
  task: string;
  assignee?: string;
  assigneeSpeakerLabel?: string;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  context?: string;
}

export interface WebRecording {
  id: string;
  blob: Blob;
  url: string;
  duration: number;
  startTime: string;
  endTime?: string;
  size: number;
  mimeType: string;
  filename: string;
}

export interface RecordingOptions {
  includeSystemAudio?: boolean;
  includeMicrophone?: boolean;
  videoBitsPerSecond?: number;
  audioBitsPerSecond?: number;
  video?: any;
}

export interface RecordingStatus {
  isRecording: boolean;
  isSupported: boolean;
  state: 'inactive' | 'recording' | 'paused';
  duration: number;
}

export interface ProcessingResult {
  recording: CallRecording;
  transcript: string;
  analysis: any;
  processedAt: string;
  processingTime: number;
}

export interface ConnectionTestResult {
  success: boolean;
  error: string | null;
  message?: string;
}

export interface OrganizationMember {
  id: string;
  userId: string;
  email: string;
  fullName: string;
  role: 'owner' | 'admin' | 'lawyer' | 'paralegal' | 'client';
  status: 'active' | 'invited' | 'suspended';
  joinedAt: string;
}

export interface RecordingShare {
  id: string;
  permissionLevel: 'view' | 'edit' | 'admin';
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
  sharedWith: {
    id: string;
    email: string;
    fullName: string;
    role: string;
  };
  sharedBy: {
    id: string;
    email: string;
    fullName: string;
    role: string;
  };
}

export interface ShareRecordingRequest {
  memberIds: string[];
  permissionLevel?: 'view' | 'edit' | 'admin';
  expiresAt?: string;
}

export interface RecordingShareInfo {
  recordingId: string;
  isOwner: boolean;
  shares: RecordingShare[];
}

export interface AccessibleRecordingsResponse {
  recordings: CallRecording[];
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
}

export interface AccessibleRecordingsFilters {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  search?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  accessType?: 'owned' | 'shared' | 'all';
}

export interface RecordingClip {
  id: string;
  recording_id: string;
  member_id: string;
  start_time: number;
  end_time: number;
  title?: string;
  share_token: string;
  created_at: string;
  call_recordings: CallRecording; // This will be populated when fetching a clip
}
