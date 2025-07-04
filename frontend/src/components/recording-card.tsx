import React from 'react';
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
  Mic
} from 'lucide-react';
import { CallRecording } from '@/types/callcaps';

const statusColors = {
  processed: 'bg-green-100 text-green-800',
  processing: 'bg-orange-100 text-orange-800',
  failed: 'bg-red-100 text-red-800'
};

const RecordingCard = ({
  recording,
  onClick
}: {
  recording: CallRecording;
  onClick: (recording: CallRecording) => void;
}) => {
  const statusColors = {
    processed: 'bg-green-100 text-green-800',
    processing: 'bg-orange-100 text-orange-800',
    failed: 'bg-red-100 text-red-800'
  };

  return (
    <div
      onClick={() => onClick(recording)}
      className='bg-card border-border cursor-pointer rounded-[var(--radius)] border p-4 shadow-sm transition-shadow hover:shadow-md'
    >
      <div className='flex space-x-4'>
        {/* Video Thumbnail */}
        <div className='bg-muted relative h-20 w-32 flex-shrink-0 overflow-hidden rounded-[var(--radius)]'>
          <div className='absolute inset-0 flex items-center justify-center'>
            <Play className='text-muted-foreground h-8 w-8' />
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
              <div className='mt-1 flex items-center space-x-4 text-sm text-gray-500'>
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
                {recording.hasVideo && (
                  <span className='inline-flex items-center text-xs text-gray-500'>
                    <Video className='mr-1 h-3 w-3' />
                    Video
                  </span>
                )}
                {recording.hasAudio && (
                  <span className='inline-flex items-center text-xs text-gray-500'>
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
              <button className='text-muted-foreground hover:text-foreground hover:bg-muted rounded-[calc(var(--radius)-2px)] p-2'>
                <Share2 className='h-4 w-4' />
              </button>
              <button className='text-muted-foreground hover:text-foreground hover:bg-muted rounded-[calc(var(--radius)-2px)] p-2'>
                <MoreVertical className='h-4 w-4' />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecordingCard;
