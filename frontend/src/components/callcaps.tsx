'use client';
import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Mic,
  Circle,
  Square,
  Monitor,
  Video,
  Users,
  ChevronDown
} from 'lucide-react';
import { CallRecording } from '@/types/callcaps';
import { webScreenRecorder } from '@/services/web-recording';
import { CallRecordingsAPI } from '@/services/call-recordings-api';
import { useAccessibleRecordings } from '@/hooks/useAccessibleRecordings';
import RecordingDetailModal from './recording-detail-modal';
import RecordingCard from './recording-card';

const CallCaps = () => {
  const [selectedRecording, setSelectedRecording] =
    useState<CallRecording | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [zoomConnected, setZoomConnected] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [accessFilter, setAccessFilter] = useState<'all' | 'owned' | 'shared'>('all');

  // Calculate offset for pagination
  const offset = (currentPage - 1) * itemsPerPage;

  // Use the custom hook for recordings management
  const {
    recordings,
    isLoading: loading,
    isError: error,
    summary,
    refresh,
  } = useAccessibleRecordings({
    limit: itemsPerPage,
    offset: offset,
    orderBy: 'start_time',
    orderDirection: 'desc',
    search: searchQuery || undefined,
    accessType: accessFilter
  });

  // Get total from summary
  const total = summary?.total || 0;

  // Calculate pagination info
  const totalPages = Math.ceil(total / itemsPerPage);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  // Pagination handlers
  const handleNextPage = () => {
    if (hasNextPage) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (hasPrevPage) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handlePageClick = (page: number) => {
    setCurrentPage(page);
  };

  // Reset to page 1 when search changes
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  // Reset to page 1 when access filter changes
  const handleAccessFilterChange = (value: 'all' | 'owned' | 'shared') => {
    setAccessFilter(value);
    setCurrentPage(1);
  };

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
        // Always use FormData for all video recordings
        console.log('Using FormData upload for video recording...');
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
          await CallRecordingsAPI.processRecording(newRecording.recording.id);
        } catch (processError) {
          console.error('Failed to process recording:', processError);
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

      // Refresh recordings list and go to first page to see new recording
      setCurrentPage(1);
      refresh();
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
  }, []);

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

  // Group recordings by date for display
  const groupedRecordings = recordings.reduce(
    (groups: Record<string, CallRecording[]>, recording: CallRecording) => {
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
                  onChange={handleSearchChange}
                  className='block w-80 rounded-md border-border bg-background py-2 pr-4 pl-10 text-sm text-foreground focus:border-primary focus:ring-primary focus:outline-none'
                />
                <Search className='absolute top-2.5 left-3 h-4 w-4 text-muted-foreground' />
              </div>
              <div className='relative'>
                <select 
                  value={accessFilter} 
                  onChange={(e) => handleAccessFilterChange(e.target.value as 'all' | 'owned' | 'shared')}
                  className='inline-flex items-center rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary'
                >
                  <option value='all'>All Recordings</option>
                  <option value='owned'>My Recordings</option>
                  <option value='shared'>Shared with Me</option>
                </select>
              </div>
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
                  <span className='text-sm text-muted-foreground capitalize'>
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
                    className='inline-flex items-center rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-accent disabled:opacity-50'
                  >
                    <Mic className='mr-2 h-4 w-4' />+ Microphone
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleStopRecording}
                  className='inline-flex items-center rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90'
                >
                  <Square className='mr-2 h-4 w-4' />
                  Stop Recording
                </button>
              )}
              <div className='text-sm text-muted-foreground'>
                {summary ? (
                  <span>
                    {total} recordings total
                    {accessFilter === 'all' && summary.owned > 0 && summary.shared > 0 && (
                      <span className='ml-2 text-muted-foreground'>
                        ({summary.owned} owned, {summary.shared} shared)
                      </span>
                    )}
                  </span>
                ) : (
                  <span>{total} recordings total</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Main Content */}
      <div className='mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 flex flex-col h-[calc(100vh-200px)]'>
        {/* Recordings List - Scrollable */}
        <div className='flex-1 overflow-y-auto pr-2'>
          {Object.entries(groupedRecordings).map(([date, dateRecordings]) => (
            <div key={date} className='mb-8'>
              <h2 className='mb-4 text-lg font-semibold text-foreground'>{date}</h2>
              <div className='space-y-4'>
                {(dateRecordings as CallRecording[]).map((recording) => (
                  <RecordingCard
                    key={recording.id}
                    recording={recording}
                    onClick={handleRecordingClick}
                    onRecordingUpdated={refresh}
                  />
                ))}
              </div>
            </div>
          ))}
          {recordings.length === 0 && !loading && (
            <div className='py-12 text-center'>
              <Video className='mx-auto h-12 w-12 text-muted-foreground' />
              <h3 className='mt-2 text-sm font-medium text-foreground'>
                No recordings found
              </h3>
              <p className='mt-1 text-sm text-muted-foreground'>
                {searchQuery
                  ? 'Try adjusting your search terms.'
                  : 'Start a recording to create your first entry.'}
              </p>
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {total > 0 && (
          <div className='flex items-center justify-between border-t border-border bg-card px-4 py-3 sm:px-6 mt-6'>
            <div className='flex flex-1 justify-between sm:hidden'>
              <button
                onClick={handlePrevPage}
                disabled={!hasPrevPage}
                className='relative inline-flex items-center rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50'
              >
                Previous
              </button>
              <button
                onClick={handleNextPage}
                disabled={!hasNextPage}
                className='relative ml-3 inline-flex items-center rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50'
              >
                Next
              </button>
            </div>
            <div className='hidden sm:flex sm:flex-1 sm:items-center sm:justify-between'>
              <div>
                <p className='text-sm text-foreground'>
                  Showing <span className='font-medium'>{offset + 1}</span> to{' '}
                  <span className='font-medium'>
                    {Math.min(offset + itemsPerPage, total)}
                  </span>{' '}
                  of <span className='font-medium'>{total}</span> results
                </p>
              </div>
              <div>
                <nav className='isolate inline-flex -space-x-px rounded-md shadow-sm' aria-label='Pagination'>
                  <button
                    onClick={handlePrevPage}
                    disabled={!hasPrevPage}
                    className='relative inline-flex items-center rounded-l-md px-2 py-2 text-muted-foreground ring-1 ring-inset ring-border hover:bg-accent focus:z-20 focus:outline-offset-0 disabled:cursor-not-allowed disabled:opacity-50'
                  >
                    <span className='sr-only'>Previous</span>
                    <svg className='h-5 w-5' viewBox='0 0 20 20' fill='currentColor' aria-hidden='true'>
                      <path fillRule='evenodd' d='M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z' clipRule='evenodd' />
                    </svg>
                  </button>
                  
                  {/* Page Numbers */}
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    let pageNumber;
                    if (totalPages <= 7) {
                      pageNumber = i + 1;
                    } else if (currentPage <= 4) {
                      pageNumber = i + 1;
                    } else if (currentPage >= totalPages - 3) {
                      pageNumber = totalPages - 6 + i;
                    } else {
                      pageNumber = currentPage - 3 + i;
                    }
                    
                    const isCurrentPage = pageNumber === currentPage;
                    return (
                      <button
                        key={pageNumber}
                        onClick={() => handlePageClick(pageNumber)}
                        className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                          isCurrentPage
                            ? 'z-10 bg-primary text-primary-foreground focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'
                            : 'text-foreground ring-1 ring-inset ring-border hover:bg-accent focus:z-20 focus:outline-offset-0'
                        }`}
                      >
                        {pageNumber}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={handleNextPage}
                    disabled={!hasNextPage}
                    className='relative inline-flex items-center rounded-r-md px-2 py-2 text-muted-foreground ring-1 ring-inset ring-border hover:bg-accent focus:z-20 focus:outline-offset-0 disabled:cursor-not-allowed disabled:opacity-50'
                  >
                    <span className='sr-only'>Next</span>
                    <svg className='h-5 w-5' viewBox='0 0 20 20' fill='currentColor' aria-hidden='true'>
                      <path fillRule='evenodd' d='M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z' clipRule='evenodd' />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Recording Detail Modal */}
      {selectedRecording && (
        <RecordingDetailModal
          recording={selectedRecording}
          onClose={() => setSelectedRecording(null)}
          onRecordingUpdated={refresh}
        />
      )}
    </div>
  );
};

export default CallCaps;
