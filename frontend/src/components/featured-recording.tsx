import React, { useState, useRef, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Users,
  Download,
  Share2,
  Trash2,
  Play,
  Pause,
  CheckCircle,
  AlertCircle,
  FileText,
  Target,
  MessageSquare,
  Brain
} from 'lucide-react';
import { CallRecording, MeetingActionItem } from '@/types/callcaps';
import { getAuthHeaders } from '@/config/api';
import { ShareRecordingDialog } from './share-recording-dialog';
import { ActionPointProposal } from '@/components/ai/action-point-proposal';
import { CallRecordingsAPI } from '@/services/call-recordings-api';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useCreateCaseTask } from '@/hooks/useTasks';

const FeaturedRecording = ({
  recording,
  onClose
}: {
  recording: CallRecording;
  onClose: () => void;
}) => {
  const [activeTab, setActiveTab] = useState('summary');
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [clipStartTime, setClipStartTime] = useState<number | null>(null);
  const [clipEndTime, setClipEndTime] = useState<number | null>(null);
  const createCaseTask = useCreateCaseTask();
  // Reset video when recording changes
  useEffect(() => {
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
      setVideoUrl(null);
    }
    setIsPlaying(false);
    setVideoLoading(false);
    if (videoRef.current) {
      videoRef.current.src = '';
      videoRef.current.load();
    }
  }, [recording]);

  // Format date, time, and duration from start_date and duration (ms)
  const formattedDate = recording.start_time
    ? format(new Date(recording.start_time), 'PPP')
    : '';
  const formattedTime = recording.start_time
    ? format(new Date(recording.start_time), 'p')
    : '';
  const formattedDuration =
    typeof recording.duration === 'number'
      ? `${Math.floor(recording.duration / 60000)}:${String(Math.floor((recording.duration % 60000) / 1000)).padStart(2, '0')}`
      : '';

  const tabs = [
    { id: 'summary', label: 'Summary', icon: FileText },
    { id: 'transcript', label: 'Transcript', icon: MessageSquare },
    { id: 'action-points', label: 'Action Points', icon: Target },
    { id: 'analysis', label: 'Risk Analysis', icon: AlertCircle },
    { id: 'insights', label: 'Insights', icon: Brain }
  ];

  const handlePlayVideo = async () => {
    if (videoUrl) {
      // Video is already loaded, just play/pause
      if (videoRef.current) {
        if (isPlaying) {
          videoRef.current.pause();
        } else {
          videoRef.current.play().catch(console.error);
        }
      }
      return;
    }

    // Support both legacy and enhanced fields
    const hasGcsBlob = recording.gcs_video_blob_name || recording.videoUrl;
    if (!recording.id || !hasGcsBlob) {
      console.log('No video file available for recording');
      alert('No video file available for this recording.');
      return;
    }

    setVideoLoading(true);

    try {
      // If the backend provides a direct videoUrl (GCS signed URL), use it directly
      if (recording.videoUrl) {
        setVideoUrl(recording.videoUrl);
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.play().catch(console.error);
          }
        }, 100);
        setVideoLoading(false);
        return;
      }

      // Otherwise, use the proxy endpoint
      const proxyUrl = `https://rnmjwdxqtsvsbelcftzg.supabase.co/functions/v1/call-recordings/${recording.id}/video`;
      const headers = await getAuthHeaders();
      const filteredHeaders = Object.fromEntries(
        Object.entries(headers).filter(
          ([key]) => key.toLowerCase() !== 'content-type'
        )
      );
      const videoResponse = await fetch(proxyUrl, {
        headers: filteredHeaders
      });
      if (!videoResponse.ok) {
        throw new Error(`Failed to load video: ${videoResponse.status}`);
      }
      const videoBlob = await videoResponse.blob();
      const blobUrl = URL.createObjectURL(videoBlob);
      setVideoUrl(blobUrl);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.play().catch(console.error);
        }
      }, 100);
    } catch (error) {
      console.error('Failed to load video:', error);
      alert(
        `Failed to load video: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setVideoLoading(false);
    }
  };

  const handleVideoPlay = () => {
    setIsPlaying(true);
  };

  const handleVideoPause = () => {
    setIsPlaying(false);
  };

  const handleShareClick = () => {
    setIsShareDialogOpen(true);
  };

  const handleTaskCreated = async (
    actionItem: MeetingActionItem,
    caseId: string,
    assigneeId: string
  ) => {
    try {
      await createCaseTask.mutateAsync({
        caseId,
        taskData: {
          name: actionItem.task,
          description: actionItem.context || '',
          priority: actionItem.priority,
          due_date: actionItem.dueDate,
          assignee_id: assigneeId
        }
      });
      toast.success('Task created successfully!');
    } catch (error) {
      console.error('Failed to create task:', error);
      toast.error('Failed to create task.');
    }
  };

  const handleSegmentClick = (startTime: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = startTime;
      if (videoRef.current.paused) {
        videoRef.current.play().catch(console.error);
      }
    }
  };

  const handleCreateClip = async () => {
    if (clipStartTime === null || clipEndTime === null) {
      toast.error('Please set both start and end times for the clip.');
      return;
    }
    if (clipStartTime >= clipEndTime) {
      toast.error('Start time must be before end time.');
      return;
    }

    try {
      const newClip = await CallRecordingsAPI.createClip(
        recording.id,
        clipStartTime,
        clipEndTime,
        `Clip from ${recording.title}`
      );
      toast.success('Clip created successfully! You can now share it.');
      // Optionally, you could open the share dialog here for the new clip
      // or display the shareable link.
      console.log('New clip created:', newClip);
      setClipStartTime(null);
      setClipEndTime(null);
    } catch (error) {
      console.error('Failed to create clip:', error);
      toast.error('Failed to create clip.');
    }
  };

  return (
    <div className='bg-card mb-6 w-full rounded-[var(--radius)] border p-0'>
      {/* Header */}
      <div className='border-border flex items-center justify-between border-b p-6'>
        <div className='flex-1'>
          <h2 className='text-foreground text-2xl font-semibold'>
            {recording.title}
          </h2>
          <div className='text-muted-foreground mt-2 flex items-center space-x-4 text-sm'>
            <span className='flex items-center'>
              <Calendar className='mr-1 h-4 w-4' />
              {formattedDate} at {formattedTime}
            </span>
            <span className='flex items-center'>
              <Clock className='mr-1 h-4 w-4' />
              {formattedDuration}
            </span>
            <span className='flex items-center'>
              <Users className='mr-1 h-4 w-4' />
              {recording.participants.join(', ')}
            </span>
          </div>
        </div>
        <div className='flex items-center space-x-2'>
          <button className='text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer rounded-[calc(var(--radius)-2px)] p-2'>
            <Download className='h-5 w-5' />
          </button>
          <button
            onClick={handleShareClick}
            className='text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer rounded-[calc(var(--radius)-2px)] p-2'
          >
            <Share2 className='h-5 w-5' />
          </button>
          <button className='text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer rounded-[calc(var(--radius)-2px)] p-2'>
            <Trash2 className='h-5 w-5' />
          </button>
          {/* Add process/analysis button if not processed */}
          {recording.status !== 'processed' && (
            <button
              onClick={async () => {
                try {
                  // Call process API
                  await import('@/services/call-recordings-api').then(
                    ({ CallRecordingsAPI }) =>
                      CallRecordingsAPI.processRecording(recording.id)
                  );
                } catch (err) {
                  alert(
                    'Failed to process recording: ' +
                      (err instanceof Error ? err.message : err)
                  );
                }
              }}
              className='bg-primary text-primary-foreground hover:bg-primary/90 ml-2 rounded-[calc(var(--radius)-2px)] p-2 text-xs font-semibold'
            >
              <Brain className='mr-1 inline-block h-4 w-4' /> Analyze
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className='flex flex-1 overflow-hidden p-6'>
        {/* Video Player Sidebar */}
        <div className='w-1/3 border-r pr-6'>
          {/* Video Player and sidebar content here */}
          <div
            className='relative mb-4 min-h-[150px] overflow-hidden rounded-[var(--radius)] bg-black'
            style={{ aspectRatio: '16/9' }}
          >
            {videoUrl ? (
              <video
                ref={videoRef}
                src={videoUrl}
                className='h-full w-full object-contain'
                controls
                preload='metadata'
                playsInline
                onPlay={handleVideoPlay}
                onPause={handleVideoPause}
                onError={(e) => {
                  console.error('Video error:', e);
                  const video = e.target as HTMLVideoElement;
                  console.error('Video error details:', {
                    error: video.error,
                    networkState: video.networkState,
                    readyState: video.readyState,
                    currentSrc: video.currentSrc
                  });
                }}
              />
            ) : (
              <>
                <div className='absolute inset-0 flex items-center justify-center'>
                  <button
                    onClick={handlePlayVideo}
                    disabled={videoLoading}
                    className='bg-opacity-20 hover:bg-opacity-30 flex h-16 w-16 items-center justify-center rounded-full bg-white disabled:opacity-50'
                  >
                    {videoLoading ? (
                      <div className='border-primary h-8 w-8 animate-spin rounded-full border-t-4 border-b-4'></div>
                    ) : (
                      <Play className='ml-1 h-8 w-8 text-white' />
                    )}
                  </button>
                </div>
                <div className='bg-opacity-75 absolute right-4 bottom-4 rounded bg-black px-2 py-1 text-xs text-white'>
                  {formattedDuration}
                </div>
              </>
            )}
          </div>

          {/* Clipping UI */}
          <div className='space-y-2 border-t pt-4'>
            <h4 className='text-foreground/80 text-sm font-medium'>
              Create Clip
            </h4>
            <div className='flex items-center space-x-2'>
              <Button
                onClick={() =>
                  setClipStartTime(videoRef.current?.currentTime ?? 0)
                }
                size='sm'
                variant='outline'
              >
                Set Start
              </Button>
              <Button
                onClick={() =>
                  setClipEndTime(videoRef.current?.currentTime ?? 0)
                }
                size='sm'
                variant='outline'
              >
                Set End
              </Button>
              <Button
                onClick={handleCreateClip}
                size='sm'
                disabled={clipStartTime === null || clipEndTime === null}
              >
                Create Clip
              </Button>
            </div>
            {(clipStartTime !== null || clipEndTime !== null) && (
              <div className='text-muted-foreground text-xs'>
                <p>Start: {clipStartTime?.toFixed(2) ?? 'Not set'}</p>
                <p>End: {clipEndTime?.toFixed(2) ?? 'Not set'}</p>
              </div>
            )}
          </div>

          {/* Recording Stats */}
          <div className='space-y-4'>
            <div>
              <h4 className='text-foreground/80 mb-2 text-sm font-medium'>
                Meeting Stats
              </h4>
              <div className='space-y-2'>
                {recording.transcript && (
                  <>
                    <div className='flex justify-between text-sm'>
                      <span className='text-muted-foreground'>Words</span>
                      <span className='font-medium'>
                        {recording.transcript.wordCount.toLocaleString()}
                      </span>
                    </div>
                    <div className='flex justify-between text-sm'>
                      <span className='text-muted-foreground'>
                        Action Items
                      </span>
                      <span className='font-medium'>
                        {recording.transcript.actionItems.length}
                      </span>
                    </div>
                    <div className='flex justify-between text-sm'>
                      <span className='text-muted-foreground'>Key Topics</span>
                      <span className='font-medium'>
                        {recording.transcript.keyTopics.length}
                      </span>
                    </div>
                    <div className='flex justify-between text-sm'>
                      <span className='text-muted-foreground'>Sentiment</span>
                      <span
                        className={`font-medium capitalize ${
                          recording.transcript.sentiment === 'positive'
                            ? 'text-green-600'
                            : recording.transcript.sentiment === 'negative'
                              ? 'text-red-600'
                              : 'text-yellow-600'
                        }`}
                      >
                        {recording.transcript.sentiment}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Participants */}
            <div>
              <h4 className='text-foreground/80 mb-2 text-sm font-medium'>
                Participants
              </h4>
              <div className='space-y-2'>
                {recording.participants.map((participant, index) => (
                  <div key={index} className='flex items-center space-x-2'>
                    <div className='bg-primary/10 text-primary flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium'>
                      {participant
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </div>
                    <span className='text-foreground/80 text-sm'>
                      {participant}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Key Topics */}
            {recording.transcript && (
              <div>
                <h4 className='text-foreground/80 mb-2 text-sm font-medium'>
                  Key Topics
                </h4>
                <div className='flex flex-wrap gap-1'>
                  {recording.transcript.keyTopics.map((topic, index) => (
                    <span
                      key={index}
                      className='bg-primary/10 text-primary inline-flex items-center rounded-full px-2 py-1 text-xs font-medium'
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        {/* Main Tabs Content */}
        <div className='w-2/3 pl-6'>
          <div className='flex h-full flex-col'>
            {/* Tabs */}
            <div className='border-border border-b'>
              <nav className='flex space-x-8'>
                {tabs.map((tab) => {
                  const IconComponent = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center border-b-2 px-1 py-4 text-sm font-medium ${
                        activeTab === tab.id
                          ? 'border-primary text-primary'
                          : 'text-muted-foreground hover:text-foreground hover:border-border border-transparent'
                      }`}
                    >
                      <IconComponent className='mr-2 h-4 w-4' />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
              {/* Tab Content */}
              <div className='flex-1 overflow-auto p-6'>
                {activeTab === 'summary' && recording.transcript && (
                  <div className='space-y-6'>
                    <div>
                      <h3 className='text-foreground mb-3 text-lg font-semibold'>
                        Executive Summary
                      </h3>
                      <div className='prose prose-sm max-w-none'>
                        <p className='text-foreground/80 leading-relaxed'>
                          {recording.transcript.summary}
                        </p>
                      </div>
                    </div>

                    <div>
                      <h3 className='text-foreground mb-3 text-lg font-semibold'>
                        Quick Actions
                      </h3>
                      <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                        {recording.transcript.actionItems
                          .slice(0, 4)
                          .map((item, index) => (
                            <div
                              key={index}
                              className='bg-accent border-accent rounded-[var(--radius)] border p-4'
                            >
                              <div className='flex items-start space-x-2'>
                                <CheckCircle className='text-accent-foreground mt-0.5 h-5 w-5 flex-shrink-0' />
                                <div className='flex flex-col'>
                                  <p className='text-accent-foreground text-sm font-medium'>
                                    {item.task}
                                  </p>
                                  <div className='text-accent-foreground/80 mt-1 flex flex-wrap gap-2 text-xs'>
                                    <span>
                                      <span className='font-semibold'>
                                        Due:
                                      </span>{' '}
                                      {item.dueDate}
                                    </span>
                                    <span>
                                      <span className='font-semibold'>
                                        Assignee:
                                      </span>{' '}
                                      {item.assignee}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'transcript' && (
                  <div>
                    <div className='mb-4 flex items-center justify-between'>
                      <h3 className='text-foreground text-lg font-semibold'>
                        Full Transcript
                      </h3>
                      <button
                        onClick={(event) => {
                          const transcriptText = `Meeting: ${recording.title}
                              Date: ${formattedDate} at ${formattedTime}
                              Participants: ${recording.participants.join(', ')}
                              Duration: ${formattedDuration}

                              ${recording.transcript_text}

                              --- End of Transcript ---
                              Generated by Call Caps AI Processing System`;
                          navigator.clipboard
                            .writeText(transcriptText)
                            .then(() => {
                              // Show success feedback
                              const button = event.target as HTMLButtonElement;
                              const originalText = button.innerHTML;
                              button.innerHTML = `<svg class="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                        </svg>Copied!`;
                              button.className = button.className.replace(
                                'text-gray-700 bg-white hover:bg-gray-50',
                                'text-green-700 bg-green-50'
                              );
                              setTimeout(() => {
                                button.innerHTML = originalText;
                                button.className = button.className.replace(
                                  'text-green-700 bg-green-50',
                                  'text-gray-700 bg-white hover:bg-gray-50'
                                );
                              }, 2000);
                            })
                            .catch(() => {
                              alert('Failed to copy transcript to clipboard');
                            });
                        }}
                        className='inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:outline-none'
                      >
                        <svg
                          className='mr-2 h-4 w-4'
                          fill='none'
                          stroke='currentColor'
                          viewBox='0 0 24 24'
                        >
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z'
                          />
                        </svg>
                        Copy Transcript
                      </button>
                    </div>
                    <div className='bg-muted rounded-[var(--radius)] p-6'>
                      {Array.isArray(recording.transcript_segments) &&
                      recording.transcript_segments.length > 0 ? (
                        <div className='space-y-2'>
                          {recording.transcript_segments.map(
                            (segment: any, idx: number) => (
                              <div key={idx} className='flex'>
                                <p
                                  className='hover:bg-muted cursor-pointer rounded-md p-1'
                                  onClick={() =>
                                    handleSegmentClick(segment.startTime)
                                  }
                                >
                                  <span className='text-primary mr-2 font-semibold'>
                                    {segment.speaker}:
                                  </span>
                                  <span className='text-foreground/80'>
                                    {segment.transcription}
                                  </span>
                                </p>
                              </div>
                            )
                          )}
                        </div>
                      ) : (
                        <p className='text-foreground/80 whitespace-pre-line'>
                          {recording.transcript_text}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'action-points' &&
                  recording.action_items &&
                  recording.action_items.length > 0 && (
                    <ActionPointProposal
                      recording={recording}
                      actionItems={recording.action_items}
                      onTaskCreated={handleTaskCreated}
                    />
                  )}

                {activeTab === 'analysis' && (
                  <div>
                    <h3 className='text-foreground mb-4 text-lg font-semibold'>
                      Risk Analysis & Compliance
                    </h3>
                    <div className='space-y-6'>
                      <div className='bg-destructive/10 border-destructive/30 rounded-[var(--radius)] border p-4'>
                        <h4 className='text-destructive mb-2 font-medium'>
                          High Priority Risks
                        </h4>
                        <ul className='text-destructive space-y-2 text-sm'>
                          <li>
                            • Client deadline requirements need immediate
                            attention
                          </li>
                          <li>
                            • Resource allocation conflicts with existing
                            commitments
                          </li>
                        </ul>
                      </div>

                      <div className='bg-accent/10 border-accent/30 rounded-[var(--radius)] border p-4'>
                        <h4 className='text-accent-foreground mb-2 font-medium'>
                          Medium Priority Items
                        </h4>
                        <ul className='text-accent-foreground space-y-2 text-sm'>
                          <li>
                            • Technology integration timeline needs monitoring
                          </li>
                          <li>
                            • Staff training requirements for new processes
                          </li>
                        </ul>
                      </div>

                      <div className='bg-primary/10 border-primary/30 rounded-[var(--radius)] border p-4'>
                        <h4 className='text-primary mb-2 font-medium'>
                          Compliance Notes
                        </h4>
                        <ul className='text-primary space-y-2 text-sm'>
                          <li>
                            • Attorney-client privilege maintained throughout
                            discussion
                          </li>
                          <li>
                            • All documentation requirements noted for file
                            retention
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'insights' && (
                  <div>
                    <h3 className='text-foreground mb-4 text-lg font-semibold'>
                      AI-Generated Insights
                    </h3>
                    <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
                      <div className='bg-primary/10 rounded-[var(--radius)] p-4'>
                        <h4 className='text-primary mb-2 font-medium'>
                          Meeting Effectiveness
                        </h4>
                        <div className='text-primary text-2xl font-bold'>
                          8.5/10
                        </div>
                        <p className='text-primary mt-1 text-sm'>
                          Well-structured with clear outcomes
                        </p>
                      </div>

                      <div className='bg-success/10 rounded-[var(--radius)] p-4'>
                        <h4 className='text-success mb-2 font-medium'>
                          Action Clarity
                        </h4>
                        <div className='text-success text-2xl font-bold'>
                          92%
                        </div>
                        <p className='text-success mt-1 text-sm'>
                          Clear actionable items identified
                        </p>
                      </div>

                      <div className='bg-accent/10 rounded-[var(--radius)] p-4'>
                        <h4 className='text-accent-foreground mb-2 font-medium'>
                          Participation Balance
                        </h4>
                        <div className='text-accent-foreground text-2xl font-bold'>
                          Good
                        </div>
                        <p className='text-accent-foreground mt-1 text-sm'>
                          Balanced discussion among participants
                        </p>
                      </div>

                      <div className='bg-accent/10 rounded-[var(--radius)] p-4'>
                        <h4 className='text-accent-foreground mb-2 font-medium'>
                          Follow-up Required
                        </h4>
                        <div className='text-accent-foreground text-2xl font-bold'>
                          {recording.transcript?.actionItems.length || 0}
                        </div>
                        <p className='text-accent-foreground mt-1 text-sm'>
                          Items need follow-up
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Share Dialog */}
      <ShareRecordingDialog
        recording={recording}
        isOpen={isShareDialogOpen}
        onClose={() => setIsShareDialogOpen(false)}
      />
    </div>
  );
};

export default FeaturedRecording;
