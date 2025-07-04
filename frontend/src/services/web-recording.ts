import {
  WebRecording,
  RecordingOptions,
  RecordingStatus,
  ProcessingResult
} from '@/types/callcaps';

export class WebScreenRecordingService {
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private isRecording = false;
  private startTime: Date | null = null;
  private eventListeners = new Map<string, Function[]>();

  // Event handling
  on(event: string, callback: Function) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(event: string, data: any) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((callback) => callback(data));
    }
  }

  // Check browser capabilities
  isSupported(): boolean {
    return !!(
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getDisplayMedia === 'function' &&
      typeof window !== 'undefined' &&
      'MediaRecorder' in window
    );
  }

  // Start screen recording
  async startRecording(options: RecordingOptions = {}): Promise<any> {
    try {
      if (!this.isSupported()) {
        throw new Error('Screen recording is not supported in this browser');
      }

      if (this.isRecording) {
        throw new Error('Recording is already in progress');
      }

      // Request screen capture
      const displayConstraints = {
        video: {
          mediaSource: 'screen',
          ...options.video
        },
        audio: options.includeSystemAudio !== false
      };

      this.mediaStream =
        await navigator.mediaDevices.getDisplayMedia(displayConstraints);

      // Determine best recording format
      let mimeType = 'video/webm';
      if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
        mimeType = 'video/webm;codecs=vp9,opus';
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
        mimeType = 'video/webm;codecs=vp8,opus';
      }

      // Create MediaRecorder
      this.mediaRecorder = new MediaRecorder(this.mediaStream, {
        mimeType: mimeType,
        videoBitsPerSecond: options.videoBitsPerSecond || 2500000,
        audioBitsPerSecond: options.audioBitsPerSecond || 128000
      });

      this.recordedChunks = [];
      this.startTime = new Date();

      // Set up event handlers
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.handleRecordingStop();
      };

      this.mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event.error);
        this.emit('recordingError', event.error);
      };

      // Handle user stopping screen share
      this.mediaStream.getVideoTracks()[0].onended = () => {
        if (this.isRecording) {
          this.stopRecording();
        }
      };

      // Start recording
      this.mediaRecorder.start(1000);
      this.isRecording = true;

      const recordingInfo = {
        id: `web_recording_${Date.now()}`,
        startTime: this.startTime.toISOString(),
        mimeType: mimeType,
        constraints: displayConstraints
      };

      this.emit('recordingStarted', recordingInfo);
      return recordingInfo;
    } catch (error) {
      console.error('Failed to start recording:', error);
      this.cleanup();
      throw error;
    }
  }

  // Stop recording
  async stopRecording(): Promise<WebRecording | null> {
    try {
      if (!this.isRecording || !this.mediaRecorder) {
        throw new Error('No recording in progress');
      }

      this.mediaRecorder.stop();
      this.isRecording = false;

      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach((track) => track.stop());
      }

      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(this.getRecordingResult());
        }, 100);
      });
    } catch (error) {
      console.error('Failed to stop recording:', error);
      this.cleanup();
      throw error;
    }
  }

  // Handle recording stop
  private handleRecordingStop() {
    const endTime = new Date();
    const startTime = this.startTime || new Date();
    const duration = endTime.getTime() - startTime.getTime();
    const mimeType = this.mediaRecorder?.mimeType || 'video/webm';

    const blob = new Blob(this.recordedChunks, { type: mimeType });

    const recording: WebRecording = {
      id: `web_recording_${startTime.getTime()}`,
      blob: blob,
      url: URL.createObjectURL(blob),
      duration: duration,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      size: blob.size,
      mimeType: mimeType,
      filename: `recording_${startTime.getTime()}.webm`
    };

    this.emit('recordingStopped', recording);
    this.cleanup();
  }

  // Get recording result
  getRecordingResult(): WebRecording | null {
    if (this.recordedChunks.length === 0) {
      return null;
    }

    const startTime = this.startTime || new Date();
    const mimeType = this.mediaRecorder?.mimeType || 'video/webm';
    const blob = new Blob(this.recordedChunks, { type: mimeType });

    return {
      id: `web_recording_${startTime.getTime()}`,
      blob: blob,
      url: URL.createObjectURL(blob),
      duration: new Date().getTime() - startTime.getTime(),
      startTime: startTime.toISOString(),
      size: blob.size,
      mimeType: mimeType,
      filename: `recording_${startTime.getTime()}.webm`
    };
  }

  // Cleanup resources
  private cleanup() {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    this.mediaRecorder = null;
    this.isRecording = false;
    this.startTime = null;
  }

  // Get current recording status
  getStatus(): RecordingStatus {
    return {
      isRecording: this.isRecording,
      isSupported: this.isSupported(),
      state: this.mediaRecorder
        ? (this.mediaRecorder.state as 'inactive' | 'recording' | 'paused')
        : 'inactive',
      duration: this.startTime
        ? new Date().getTime() - this.startTime.getTime()
        : 0
    };
  }
}

// Web-based Call Caps Processor
export class WebCallCapsProcessor {
  private recordingService: WebScreenRecordingService;

  constructor(recordingService: WebScreenRecordingService) {
    this.recordingService = recordingService;
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.recordingService.on(
      'recordingStopped',
      async (recording: WebRecording) => {
        console.log('Processing web recording:', recording);
      }
    );
  }

  async extractAudio(videoBlob: Blob): Promise<Blob> {
    try {
      // Create a video element to load the video
      const video = document.createElement('video');
      const videoUrl = URL.createObjectURL(videoBlob);

      return new Promise((resolve, reject) => {
        video.onloadedmetadata = async () => {
          try {
            // Create audio context
            const audioContext = new (window.AudioContext ||
              (window as any).webkitAudioContext)();

            // Create media element source
            const source = audioContext.createMediaElementSource(video);
            const destination = audioContext.createMediaStreamDestination();

            // Connect source to destination
            source.connect(destination);

            // Create media recorder for audio stream
            const mediaRecorder = new MediaRecorder(destination.stream, {
              mimeType: 'audio/webm;codecs=opus'
            });

            const audioChunks: Blob[] = [];

            mediaRecorder.ondataavailable = (event) => {
              if (event.data.size > 0) {
                audioChunks.push(event.data);
              }
            };

            mediaRecorder.onstop = () => {
              const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
              URL.revokeObjectURL(videoUrl);
              resolve(audioBlob);
            };

            // Start recording and play video
            mediaRecorder.start();
            video.play();

            // Stop recording when video ends
            video.onended = () => {
              mediaRecorder.stop();
            };
          } catch (error) {
            URL.revokeObjectURL(videoUrl);
            reject(error);
          }
        };

        video.onerror = () => {
          URL.revokeObjectURL(videoUrl);
          reject(new Error('Failed to load video for audio extraction'));
        };

        video.src = videoUrl;
        video.load();
      });
    } catch (error) {
      console.error('Error extracting audio:', error);
      // Fallback: return the original blob if it's already audio
      if (videoBlob.type.startsWith('audio/')) {
        return videoBlob;
      }
      throw error;
    }
  }

  // Manual processing trigger
  async manualProcess(recording: WebRecording) {
    return await this.extractAudio(recording.blob);
  }
}

// Export singleton instances
export const webScreenRecorder = new WebScreenRecordingService();
export const webCallCapsProcessor = new WebCallCapsProcessor(webScreenRecorder);
