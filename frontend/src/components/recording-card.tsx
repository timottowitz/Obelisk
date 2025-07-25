import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Calendar,
  Clock,
  Users,
  Download,
  Share2,
  MoreVertical,
  CheckCircle,
  AlertCircle,
  Video,
  Mic,
  X
} from 'lucide-react';
import { CallRecording, OrganizationMember } from '@/types/callcaps';
import { useQuery } from '@tanstack/react-query';
import { getAuthHeaders } from '@/config/api';
import { ShareRecordingDialog } from './share-recording-dialog';

const statusColors = {
  processed:
    'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  processing:
    'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
};

// Custom hook to fetch and cache organization members
function useOrganizationMembers() {
  return useQuery<OrganizationMember[]>({
    queryKey: ['organization-members'],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `https://rnmjwdxqtsvsbelcftzg.supabase.co/functions/v1/members`,
        { headers }
      );
      if (!response.ok) throw new Error('Failed to fetch members');
      const data = await response.json();
      return data.members;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1
  });
}

const RecordingCard = ({
  recording,
  onClick,
  onRecordingUpdated
}: {
  recording: CallRecording;
  onClick: (recording: CallRecording) => void;
  onRecordingUpdated?: () => void;
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const {
    data: members = [],
    isLoading: membersLoading,
    error: membersError
  } = useOrganizationMembers();

  const handleCloseModal = () => {
    setIsModalOpen(false);
    if (videoUrl && videoUrl.startsWith('blob:')) {
      URL.revokeObjectURL(videoUrl); // Clean up blob URL
    }
    setVideoUrl(null);
  };

  const handleShareClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsShareDialogOpen(true);
  };

  const handleShareSuccess = () => {
    if (onRecordingUpdated) {
      onRecordingUpdated();
    }
  };

  const handlePlayClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!recording.s3_key) {
      console.log('No video URL available for recording');
      return;
    }

    // For local development, construct the proxy URL
    const proxyUrl = `https://rnmjwdxqtsvsbelcftzg.supabase.co/functions/v1/call-recordings/${recording.id}/video`;

    console.log('=== Starting video load process ===');
    console.log('Recording ID:', recording.id);
    console.log('Recording s3_key:', recording.s3_key);
    console.log('Proxy URL:', proxyUrl);

    try {
      // Test URL accessibility with authentication headers
      console.log('=== Step 1: Testing URL accessibility ===');
      const headers = await getAuthHeaders();
      console.log('Auth headers:', headers);

      const filteredHeaders = Object.fromEntries(
        Object.entries(headers).filter(
          ([key]) => key.toLowerCase() !== 'content-type'
        )
      );
      console.log('Filtered headers for HEAD request:', filteredHeaders);

      const testResponse = await fetch(proxyUrl, {
        method: 'HEAD',
        headers: filteredHeaders
      });

      console.log('HEAD response status:', testResponse.status);
      console.log(
        'HEAD response headers:',
        Object.fromEntries(testResponse.headers.entries())
      );

      if (!testResponse.ok) {
        throw new Error(
          `HTTP ${testResponse.status}: ${testResponse.statusText}`
        );
      }

      console.log('✓ URL is accessible');
    } catch (error) {
      console.error('❌ URL accessibility test failed:', error);
      alert(
        `Cannot access video: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return;
    }

    // Check WebM support
    console.log('=== Step 2: Checking WebM support ===');
    const video = document.createElement('video');
    const canPlayWebM =
      video.canPlayType('video/webm; codecs="vp8, vorbis"') !== '';
    const canPlayWebMVP9 =
      video.canPlayType('video/webm; codecs="vp9, opus"') !== '';

    console.log('Browser WebM support:', {
      vp8: canPlayWebM,
      vp9: canPlayWebMVP9,
      general: video.canPlayType('video/webm')
    });

    if (!canPlayWebM && !canPlayWebMVP9) {
      console.warn('⚠️ Limited WebM support detected');
    }

    // Create authenticated blob URL for video element
    console.log('=== Step 3: Fetching video data ===');
    try {
      const headers = await getAuthHeaders();
      const filteredHeaders = Object.fromEntries(
        Object.entries(headers).filter(
          ([key]) => key.toLowerCase() !== 'content-type'
        )
      );

      console.log('Making GET request to:', proxyUrl);
      console.log('With headers:', filteredHeaders);

      const videoResponse = await fetch(proxyUrl, {
        headers: filteredHeaders
      });

      console.log('GET response status:', videoResponse.status);
      console.log(
        'GET response headers:',
        Object.fromEntries(videoResponse.headers.entries())
      );

      if (!videoResponse.ok) {
        throw new Error(`Failed to load video: ${videoResponse.status}`);
      }

      console.log('=== Step 4: Creating blob URL ===');
      const videoBlob = await videoResponse.blob();
      console.log('Video blob details:', {
        size: videoBlob.size,
        type: videoBlob.type,
        sizeInMB: (videoBlob.size / (1024 * 1024)).toFixed(2) + ' MB'
      });

      if (videoBlob.size === 0) {
        throw new Error('Received empty video blob');
      }

      const blobUrl = URL.createObjectURL(videoBlob);
      console.log('Created blob URL:', blobUrl);

      console.log('=== Step 5: Opening modal ===');
      setVideoUrl(blobUrl);
      setIsModalOpen(true);

      console.log('✓ Video load process completed successfully');
    } catch (error) {
      console.error('❌ Failed to load video:', error);
      alert(
        `Failed to load video: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  };

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isModalOpen) {
        handleCloseModal();
      }
    };

    if (isModalOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isModalOpen]);

  // Handle click outside modal
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        handleCloseModal();
      }
    };

    if (isModalOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isModalOpen]);

  return (
    <div
      className='bg-card cursor-pointer rounded-lg border p-4 shadow-sm transition-shadow hover:shadow-md'
      onClick={(e) => {
        e.stopPropagation();
        onClick(recording);
      }}
    >
      {/* Recording Card */}
      <div className='flex space-x-4'>
        {/* Video Thumbnail */}
        <div className='bg-muted relative h-20 w-32 flex-shrink-0 overflow-hidden rounded-[var(--radius)]'>
          <div className='absolute inset-0 flex items-center justify-center'>
            <button
              onClick={handlePlayClick}
              disabled={recording.status !== 'processed' || !recording.id}
              className={`rounded-full p-2 transition-all ${
                recording.status === 'processed' && recording.id
                  ? 'bg-opacity-50 hover:bg-opacity-70 cursor-pointer bg-black text-white'
                  : 'text-muted-foreground cursor-not-allowed'
              }`}
            >
              <Play className='h-6 w-6' />
            </button>
          </div>
          <div className='bg-opacity-75 absolute right-1 bottom-1 rounded bg-black px-1 text-xs text-white'>
            {recording.duration}
          </div>
        </div>

        {/* Content */}
        <div className='min-w-0 flex-1'>
          <div className='flex items-start justify-between'>
            <div className='min-w-0 flex-1'>
              <h3 className='text-foreground truncate text-lg font-semibold'>
                {recording.title}
              </h3>
              <div className='text-muted-foreground mt-1 flex items-center space-x-4 text-sm'>
                <span className='flex items-center'>
                  <Calendar className='mr-1 h-4 w-4' />
                  {recording.date}
                </span>
                <span className='flex items-center'>
                  <Clock className='mr-1 h-4 w-4' />
                  {recording.time}
                </span>
                <span className='flex items-center'>
                  <Users className='mr-1 h-4 w-4' />
                  {recording.participants.length} participants
                </span>
                {recording.accessType === 'shared' &&
                  recording.shareInfo?.sharedBy && (
                    <span className='flex items-center text-blue-600 dark:text-blue-400'>
                      <Share2 className='mr-1 h-4 w-4' />
                      Shared by{' '}
                      {(() => {
                        const sharedById = recording.shareInfo?.sharedBy;
                        if (!sharedById) return 'Unknown';
                        return (
                          members.find((m) => m.id === sharedById)?.fullName ||
                          sharedById
                        );
                      })()}
                    </span>
                  )}
              </div>
              <div className='mt-2 flex items-center space-x-2'>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[recording.status]}`}
                >
                  {recording.status === 'processed' && (
                    <CheckCircle className='mr-1 h-3 w-3' />
                  )}
                  {recording.status === 'processing' && (
                    <AlertCircle className='mr-1 h-3 w-3' />
                  )}
                  {recording.status.charAt(0).toUpperCase() +
                    recording.status.slice(1)}
                </span>
                {recording.accessType === 'shared' && (
                  <span className='inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200'>
                    <Share2 className='mr-1 h-3 w-3' />
                    Shared
                  </span>
                )}
                {recording.isShared && recording.accessType === 'owner' && (
                  <span className='inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800 dark:bg-purple-900 dark:text-purple-200'>
                    <Users className='mr-1 h-3 w-3' />
                    Shared by me
                  </span>
                )}
                {recording.hasVideo && (
                  <span className='text-muted-foreground inline-flex items-center text-xs'>
                    <Video className='mr-1 h-3 w-3' />
                    Video
                  </span>
                )}
                {recording.hasAudio && (
                  <span className='text-muted-foreground inline-flex items-center text-xs'>
                    <Mic className='mr-1 h-3 w-3' />
                    Audio
                  </span>
                )}
              </div>

              {/* Transcript Summary Preview */}
              {recording.transcript && (
                <div className='bg-muted mt-3 rounded-[var(--radius)] p-3'>
                  <p className='text-foreground/80 line-clamp-2 text-sm'>
                    {recording.transcript.summary}
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className='ml-4 flex items-center space-x-2'>
              <button className='text-muted-foreground hover:text-foreground hover:bg-muted rounded-[calc(var(--radius)-2px)] p-2'>
                <Download className='h-4 w-4' />
              </button>
              <button
                onClick={handleShareClick}
                className='text-muted-foreground hover:text-foreground hover:bg-muted rounded-[calc(var(--radius)-2px)] p-2'
              >
                <Share2 className='h-4 w-4' />
              </button>
              <button className='text-muted-foreground hover:text-foreground hover:bg-muted rounded-[calc(var(--radius)-2px)] p-2'>
                <MoreVertical className='h-4 w-4' />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Video Modal */}
      {isModalOpen && recording.id && (
        <div
          ref={modalRef}
          onClick={(e) => {
            if (e.target === modalRef.current) {
              handleCloseModal();
            }
          }}
          className='fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm'
        >
          <div
            className='relative mx-4 aspect-video w-full max-w-6xl overflow-hidden rounded-lg bg-black'
            onClick={(e) => {
              e.stopPropagation(); // Prevent triggering the background click
            }}
          >
            {/* Video Player */}
            <video
              ref={videoRef}
              src={videoUrl || undefined}
              className='h-full w-full object-contain'
              controls
              preload='metadata'
              playsInline
              autoPlay
              muted
              onLoadStart={() => {
                console.log('=== Video Events ===');
                console.log('📹 Video load started');
                console.log('Video src:', videoRef.current?.src);
                console.log('Video currentSrc:', videoRef.current?.currentSrc);
              }}
              onLoadedMetadata={() => {
                console.log('📹 Video metadata loaded');
                console.log('Video details:', {
                  duration: videoRef.current?.duration,
                  videoWidth: videoRef.current?.videoWidth,
                  videoHeight: videoRef.current?.videoHeight,
                  readyState: videoRef.current?.readyState,
                  networkState: videoRef.current?.networkState
                });
              }}
              onCanPlay={() => {
                console.log('📹 Video can play');
                console.log('Video readyState:', videoRef.current?.readyState);
                // Try to play automatically
                if (videoRef.current) {
                  videoRef.current.play().catch((error) => {
                    console.error('Auto-play failed:', error);
                  });
                }
              }}
              onCanPlayThrough={() => {
                console.log('📹 Video can play through');
              }}
              onPlay={() => {
                console.log('📹 Video started playing');
              }}
              onPause={() => {
                console.log('📹 Video paused');
              }}
              onWaiting={() => {
                console.log('📹 Video waiting for data');
              }}
              onStalled={() => {
                console.log('📹 Video stalled');
              }}
              onSuspend={() => {
                console.log('📹 Video suspended');
              }}
              onAbort={() => {
                console.log('📹 Video aborted');
              }}
              onEnded={() => {
                console.log('📹 Video ended');
              }}
              onError={(e) => {
                console.error('📹 Video error:', e);
                const video = e.target as HTMLVideoElement;
                console.error('Video error details:', {
                  error: video.error,
                  code: video.error?.code,
                  message: video.error?.message,
                  networkState: video.networkState,
                  readyState: video.readyState,
                  currentSrc: video.currentSrc,
                  src: video.src
                });
              }}
            />

            {/* Close Button */}
            <button
              onClick={handleCloseModal}
              className='absolute top-4 right-4 z-10 rounded-full bg-black/50 p-2 text-white transition-all hover:scale-110 hover:bg-black/70'
            >
              <X className='h-6 w-6' />
            </button>

            {/* Video Info */}
            <div className='absolute bottom-4 left-4 z-10 text-white'>
              <h3 className='mb-1 text-lg font-semibold'>{recording.title}</h3>
              <div className='flex items-center space-x-4 text-sm text-gray-300'>
                <span>{recording.date}</span>
                <span>{recording.time}</span>
                <span>{recording.duration}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Dialog */}
      <ShareRecordingDialog
        recording={recording}
        isOpen={isShareDialogOpen}
        onClose={() => setIsShareDialogOpen(false)}
        onSuccess={handleShareSuccess}
      />
    </div>
  );
};

export default RecordingCard;
