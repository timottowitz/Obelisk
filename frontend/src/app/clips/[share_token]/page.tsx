'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { CallRecordingsAPI } from '@/services/call-recordings-api';
import { RecordingClip } from '@/types/callcaps';
import { Player } from '@cyntler/react-doc-viewer';

const ClipViewerPage = () => {
  const params = useParams();
  const shareToken = params.share_token as string;
  const [clip, setClip] = useState<RecordingClip | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (shareToken) {
      const fetchClip = async () => {
        try {
          // This is a placeholder for getting the schema name.
          // In a real app, this would need a more secure way to resolve the schema from the share token.
          const schemaName = 'public'; // This will not work with the current setup.
          const fetchedClip = await CallRecordingsAPI.getClip(shareToken, schemaName);
          setClip(fetchedClip);
        } catch (err) {
          setError('Failed to load clip.');
          console.error(err);
        }
      };
      fetchClip();
    }
  }, [shareToken]);

  useEffect(() => {
    if (clip && videoRef.current) {
      const video = videoRef.current;
      const handleLoadedMetadata = () => {
        video.currentTime = clip.start_time;
        video.play().catch(console.error);
      };
      video.addEventListener('loadedmetadata', handleLoadedMetadata);

      const handleTimeUpdate = () => {
        if (video.currentTime > clip.end_time) {
          video.pause();
          video.currentTime = clip.end_time;
        }
      };
      video.addEventListener('timeupdate', handleTimeUpdate);

      return () => {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('timeupdate', handleTimeUpdate);
      };
    }
  }, [clip]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  if (!clip) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div>Loading clip...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-4xl rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800">
        <h1 className="mb-4 text-2xl font-bold">{clip.title || 'Recording Clip'}</h1>
        <div className="aspect-video">
          <video
            ref={videoRef}
            src={clip.call_recordings.gcs_video_url}
            controls
            className="w-full h-full"
          />
        </div>
        <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          <p>This is a clip from the recording: {clip.call_recordings.title}</p>
          <p>Shared at: {new Date(clip.created_at).toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
};

export default ClipViewerPage;
