-- Migration: Rename azure_ columns to gcs_ in call_recordings
-- Use {{schema_name}} as the schema placeholder

ALTER TABLE {{schema_name}}.call_recordings
  RENAME COLUMN azure_video_url TO gcs_video_url;
ALTER TABLE {{schema_name}}.call_recordings
  RENAME COLUMN azure_video_blob_name TO gcs_video_blob_name;
ALTER TABLE {{schema_name}}.call_recordings
  RENAME COLUMN azure_transcript_url TO gcs_transcript_url;
ALTER TABLE {{schema_name}}.call_recordings
  RENAME COLUMN azure_transcript_blob_name TO gcs_transcript_blob_name; 