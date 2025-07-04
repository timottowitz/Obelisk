'use client';
import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Mic,
  Circle,
  Square,
  Monitor,
  Video
} from 'lucide-react';
import { CallRecording } from '@/types/callcaps';
import { webScreenRecorder } from '@/services/web-recording';
import { CallRecordingsAPI } from '@/services/call-recordings-api';
import { useCallRecordings } from '@/hooks/useCallRecordings';
import RecordingDetailModal from './recording-detail-modal';
import RecordingCard from './recording-card';

const CallCaps = () => {
  const [selectedRecording, setSelectedRecording] =
    useState<CallRecording | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [zoomConnected, setZoomConnected] = useState(false);

  // Use the custom hook for recordings management
  const {
    recordings,
    loading,
    error,
    total,
    refresh,
    uploadRecording,
    processRecording,
    updateRecording
  } = useCallRecordings({
    limit: 50,
    orderBy: 'start_time',
    orderDirection: 'desc'
  });

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [currentRecording, setCurrentRecording] = useState<any>(null);
  const [recordingStatus, setRecordingStatus] = useState('idle'); // idle, recording, processing

  // Initialize Web Recording service
  useEffect(() => {
    // Check if browser supports screen recording
    if (!webScreenRecorder.isSupported()) {
      console.warn('Screen recording not supported in this browser');
      return;
    }

    // Define event handler functions
    const handleRecordingStarted = (recording: any) => {
      console.log('Web recording started:', recording);
      setIsRecording(true);
      setCurrentRecording(recording);
      setRecordingStatus('recording');
    };

    const handleRecordingStopped = async (recording: any) => {
      console.log('Web recording stopped:', recording);
      console.log('Recording blob details:', {
        size: recording.blob.size,
        type: recording.blob.type,
        lastModified: recording.blob.lastModified
      });
      
      setIsRecording(false);
      setCurrentRecording(null);
      setRecordingStatus('processing');

      try {
        // Choose upload method based on file size
        const useFormData = recording.blob.size > 10 * 1024 * 1024; // Use FormData for files > 10MB
        
        if (useFormData) {
          console.log('Using FormData upload for large file...');
          const newRecording = await CallRecordingsAPI.uploadRecordingFile(
            recording.blob,
            {
              mimeType: recording.mimeType || recording.blob.type,
              duration: recording.duration,
              startTime: recording.startTime,
              endTime: recording.endTime,
              title: `Screen Recording - ${new Date(recording.startTime).toLocaleTimeString()}`,
              participants: ['Current User']
            }
          );
          
          // Start processing the recording
          try {
            await processRecording(newRecording.recording.id);
          } catch (processError) {
            console.error('Failed to process recording:', processError);
          }
        } else {
          console.log('Starting blob to base64 conversion...');
          
          // Use ArrayBuffer method for better video file handling
          const base64Data = await CallRecordingsAPI.blobToBase64ArrayBuffer(recording.blob);
          console.log('Base64 conversion completed. Length:', base64Data.length);
          console.log('Base64 preview (first 100 chars):', base64Data.substring(0, 100));

          // Upload to API using the hook with file data
          const newRecording = await uploadRecording({
            recordingBlob: base64Data,
            mimeType: recording.mimeType || recording.blob.type,
            duration: recording.duration,
            startTime: recording.startTime,
            endTime: recording.endTime,
            title: `Screen Recording - ${new Date(recording.startTime).toLocaleTimeString()}`,
            participants: ['Current User']
          });

          // Start processing the recording
          try {
            await processRecording(newRecording.id);
          } catch (processError) {
            console.error('Failed to process recording:', processError);
            // The hook will handle updating the status to failed
          }
        }
      } catch (uploadError) {
        console.error('Failed to upload recording:', uploadError);
        alert(
          `Failed to upload recording: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`
        );
      }

      setRecordingStatus('idle');
    };

    const handleRecordingProcessed = ({ recording, analysis }: any) => {
      console.log('Web recording processed:', recording, analysis);
      setRecordingStatus('idle');

      // Update the recording with processed analysis
      updateRecording(recording.id, {
        status: 'processed',
        transcript: analysis
      });
    };

    const handleRecordingError = (error: any) => {
      console.error('Recording error:', error);
      setRecordingStatus('idle');
      setIsRecording(false);
      setCurrentRecording(null);
      alert(`Recording error: ${error.message}`);
    };

    // Set up event listeners for web recording events
    webScreenRecorder.on('recordingStarted', handleRecordingStarted);
    webScreenRecorder.on('recordingStopped', handleRecordingStopped);
    webScreenRecorder.on('recordingProcessed', handleRecordingProcessed);
    webScreenRecorder.on('recordingError', handleRecordingError);

    return () => {
      // Cleanup event listeners with the actual handler functions
      webScreenRecorder.off('recordingStarted', handleRecordingStarted);
      webScreenRecorder.off('recordingStopped', handleRecordingStopped);
      webScreenRecorder.off('recordingProcessed', handleRecordingProcessed);
      webScreenRecorder.off('recordingError', handleRecordingError);
    };
  }, [uploadRecording, processRecording, updateRecording]);

  const handleConnectZoom = async () => {
    console.log('Connecting to Zoom...');
    setZoomConnected(true);
  };

  const handleStartRecording = async (
    options: { includeMicrophone?: boolean } = {}
  ) => {
    try {
      await webScreenRecorder.startRecording({
        includeSystemAudio: true,
        includeMicrophone: options.includeMicrophone || false,
        videoBitsPerSecond: 2500000,
        ...options
      });
    } catch (error) {
      console.error('Failed to start web recording:', error);
      alert(
        `Failed to start recording: ${error instanceof Error ? error.message : 'Unknown error'}\n\nMake sure to allow screen sharing when prompted.`
      );
    }
  };

  const handleStopRecording = async () => {
    try {
      const recording = await webScreenRecorder.stopRecording();
      console.log('Recording stopped:', recording);
    } catch (error) {
      console.error('Failed to stop web recording:', error);
      alert(
        `Failed to stop recording: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  };

  const handleRecordingClick = (recording: CallRecording) => {
    setSelectedRecording(recording);
  };

  const handleRefreshRecordings = () => {
    refresh();
  };

  const filteredRecordings = recordings.filter(
    (recording) =>
      recording.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recording.participants.some((p) =>
        p.toLowerCase().includes(searchQuery.toLowerCase())
      )
  );

  const groupedRecordings = filteredRecordings.reduce(
    (groups, recording) => {
      const date = recording.date;
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(recording);
      return groups;
    },
    {} as Record<string, CallRecording[]>
  );

  // Show loading state
  if (loading) {
    return (
      <div className='flex min-h-screen items-center justify-center'>
        <div className='bg-card w-full max-w-lg rounded-[var(--radius)] p-8 text-center shadow-sm'>
          <div className='bg-primary/10 mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full'>
            <Video className='text-primary h-10 w-10' />
          </div>
          <h2 className='text-foreground mb-3 text-2xl font-semibold'>
            Loading Recordings...
          </h2>
          <p className='text-muted-foreground'>
            Please wait while we load your call recordings.
          </p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className='flex min-h-screen items-center justify-center'>
        <div className='bg-card w-full max-w-lg rounded-[var(--radius)] p-8 text-center shadow-sm'>
          <div className='bg-destructive/10 mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full'>
            <Video className='text-destructive h-10 w-10' />
          </div>
          <h2 className='text-foreground mb-3 text-2xl font-semibold'>
            Error Loading Recordings
          </h2>
          <p className='text-muted-foreground mb-4'>{error}</p>
          <button
            onClick={handleRefreshRecordings}
            className='bg-primary text-primary-foreground hover:bg-primary/90 rounded-[var(--radius)] px-4 py-2 text-sm font-medium transition-colors'
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Enhanced Connect Zoom screen with Web Recording integration
  if (!zoomConnected && recordings.length === 0) {
    const isSupported = webScreenRecorder.isSupported();
    return (
      <div className='flex min-h-screen items-center justify-center'>
        <div className='bg-card w-full max-w-lg rounded-[var(--radius)] p-8 text-center shadow-sm'>
          <div className='bg-primary/10 mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full'>
            <Video className='text-primary h-10 w-10' />
          </div>
          <h2 className='text-foreground mb-3 text-2xl font-semibold'>
            Welcome to CallCaps
          </h2>
          <p className='text-muted-foreground mb-6'>
            Record and analyze your legal meetings with AI-powered insights.
          </p>

          <div className='space-y-4'>
            {isSupported && (
              <button
                onClick={() =>
                  handleStartRecording({ includeMicrophone: true })
                }
                className='bg-primary text-primary-foreground hover:bg-primary/90 flex w-full items-center justify-center gap-2 rounded-[var(--radius)] px-4 py-3 text-sm font-medium transition-colors'
              >
                <Monitor className='h-4 w-4' />
                Start Screen Recording
              </button>
            )}

            <button
              onClick={handleConnectZoom}
              className='bg-secondary text-secondary-foreground hover:bg-secondary/80 flex w-full items-center justify-center gap-2 rounded-[var(--radius)] px-4 py-3 text-sm font-medium transition-colors'
            >
              <Video className='h-4 w-4' />
              Connect Zoom Account
            </button>
          </div>

          {!isSupported && (
            <p className='text-muted-foreground mt-4 text-xs'>
              Screen recording is not supported in your browser. Please use
              Chrome, Firefox, or Edge.
            </p>
          )}
        </div>
      </div>
    );
  }

  // Main UI rendering (recordings list, filters, modal, etc.)
  return (
    <div className='bg-background'>
      {/* Filters Bar with Recording Controls */}
      <div className='bg-card border-border border-b'>
        <div className='mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center space-x-4'>
              <div className='relative'>
                <input
                  type='text'
                  placeholder='Search recordings...'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className='block w-80 rounded-md border-gray-300 py-2 pr-4 pl-10 text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none'
                />
                <Search className='absolute top-2.5 left-3 h-4 w-4 text-gray-400' />
              </div>
              <button className='inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50'>
                <Filter className='mr-2 h-4 w-4' />
                Filter
              </button>
            </div>
            <div className='flex items-center space-x-4'>
              {/* Recording Status */}
              {recordingStatus !== 'idle' && (
                <div className='flex items-center space-x-2'>
                  <div
                    className={`h-3 w-3 rounded-full ${
                      recordingStatus === 'recording'
                        ? 'animate-pulse bg-red-500'
                        : recordingStatus === 'processing'
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                    }`}
                  ></div>
                  <span className='text-sm text-gray-600 capitalize'>
                    {recordingStatus}
                  </span>
                </div>
              )}
              {/* Recording Controls */}
              {!isRecording ? (
                <div className='flex items-center space-x-2'>
                  <button
                    onClick={() => handleStartRecording()}
                    disabled={recordingStatus === 'processing'}
                    className='inline-flex items-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50'
                  >
                    <Circle className='mr-2 h-4 w-4 fill-current' />
                    Record Screen
                  </button>
                  <button
                    onClick={() =>
                      handleStartRecording({ includeMicrophone: true })
                    }
                    disabled={recordingStatus === 'processing'}
                    className='inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50'
                  >
                    <Mic className='mr-2 h-4 w-4' />+ Microphone
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleStopRecording}
                  className='inline-flex items-center rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-900'
                >
                  <Square className='mr-2 h-4 w-4' />
                  Stop Recording
                </button>
              )}
              <span className='text-sm text-gray-500'>
                {filteredRecordings.length} recordings
              </span>
            </div>
          </div>
        </div>
      </div>
      {/* Main Content */}
      <div className='mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8'>
        {Object.entries(groupedRecordings).map(([date, dateRecordings]) => (
          <div key={date} className='mb-8'>
            <h2 className='mb-4 text-lg font-semibold text-gray-900'>{date}</h2>
            <div className='space-y-4'>
              {dateRecordings.map((recording) => (
                <RecordingCard
                  key={recording.id}
                  recording={recording}
                  onClick={handleRecordingClick}
                />
              ))}
            </div>
          </div>
        ))}
        {filteredRecordings.length === 0 && (
          <div className='py-12 text-center'>
            <Video className='mx-auto h-12 w-12 text-gray-400' />
            <h3 className='mt-2 text-sm font-medium text-gray-900'>
              No recordings found
            </h3>
            <p className='mt-1 text-sm text-gray-500'>
              {searchQuery
                ? 'Try adjusting your search terms.'
                : 'Start a Zoom meeting to create your first recording.'}
            </p>
          </div>
        )}
      </div>
      {/* Recording Detail Modal */}
      {selectedRecording && (
        <RecordingDetailModal
          recording={selectedRecording}
          onClose={() => setSelectedRecording(null)}
        />
      )}
    </div>
  );
};

export default CallCaps;
