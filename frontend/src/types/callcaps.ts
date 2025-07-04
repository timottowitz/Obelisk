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
  s3Key: string;
  transcriptS3Key: string | null;
  sharing_link?: string;
  webRecording?: WebRecording;
}

export interface CallTranscript {
  summary: string;
  actionItems: {
    task: string;
    dueDate: string;
    assignee: string;
  }[];
  keyTopics: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
  wordCount: number;
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
