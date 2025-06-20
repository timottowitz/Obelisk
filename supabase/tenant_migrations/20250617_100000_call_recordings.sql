-- Tenant migration: call_recordings, processing_queue, user_settings
-- Use {{schema_name}} as the schema placeholder

-- Call Recordings Table
CREATE TABLE IF NOT EXISTS {{schema_name}}.call_recordings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID REFERENCES {{schema_name}}.members(id) ON DELETE CASCADE,
  meeting_id VARCHAR(255),
  title VARCHAR(500) NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration INTEGER, -- in milliseconds
  participants JSONB DEFAULT '[]'::jsonb,

  -- Azure Blob Storage references
  azure_video_url TEXT,
  azure_video_blob_name TEXT,
  azure_transcript_url TEXT,
  azure_transcript_blob_name TEXT,

  -- Recording metadata
  file_size BIGINT,
  mime_type VARCHAR(100),
  has_video BOOLEAN DEFAULT true,
  has_audio BOOLEAN DEFAULT true,

  -- Processing data
  transcript_text TEXT,
  transcript_segments JSONB,
  ai_analysis JSONB,
  ai_summary TEXT,
  action_items JSONB DEFAULT '[]'::jsonb,
  key_topics JSONB DEFAULT '[]'::jsonb,
  risk_analysis JSONB,
  sentiment VARCHAR(50),
  word_count INTEGER,

  -- Status tracking
  status VARCHAR(50) DEFAULT 'uploading' CHECK (status IN ('uploading', 'uploaded', 'processing', 'processed', 'failed')),
  processing_error TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,

  -- Search
  search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(transcript_text, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(ai_summary, '')), 'C')
  ) STORED
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_call_recordings_member_id ON {{schema_name}}.call_recordings(member_id);
CREATE INDEX IF NOT EXISTS idx_call_recordings_status ON {{schema_name}}.call_recordings(status);
CREATE INDEX IF NOT EXISTS idx_call_recordings_start_time ON {{schema_name}}.call_recordings(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_call_recordings_meeting_id ON {{schema_name}}.call_recordings(meeting_id);
CREATE INDEX IF NOT EXISTS idx_call_recordings_search ON {{schema_name}}.call_recordings USING GIN(search_vector);

-- Processing Queue Table
CREATE TABLE IF NOT EXISTS {{schema_name}}.processing_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recording_id UUID REFERENCES {{schema_name}}.call_recordings(id) ON DELETE CASCADE,
  task_type VARCHAR(50) NOT NULL CHECK (task_type IN ('transcribe', 'analyze', 'generate_summary')),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- User Settings Table
CREATE TABLE IF NOT EXISTS {{schema_name}}.user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID REFERENCES {{schema_name}}.members(id) ON DELETE CASCADE UNIQUE,

  -- API Keys (encrypted)
  openai_api_key TEXT,
  azure_connection_string TEXT,

  -- Preferences
  auto_transcribe BOOLEAN DEFAULT true,
  auto_analyze BOOLEAN DEFAULT true,
  default_language VARCHAR(10) DEFAULT 'en',

  -- AI Processing preferences
  ai_model VARCHAR(50) DEFAULT 'gpt-4o-mini',
  temperature DECIMAL(3,2) DEFAULT 0.3,
  custom_prompts JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE {{schema_name}}.call_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE {{schema_name}}.processing_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE {{schema_name}}.user_settings ENABLE ROW LEVEL SECURITY;

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION {{schema_name}}.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_call_recordings_updated_at
  BEFORE UPDATE ON {{schema_name}}.call_recordings
  FOR EACH ROW
  EXECUTE FUNCTION {{schema_name}}.handle_updated_at();

CREATE TRIGGER update_processing_queue_updated_at
  BEFORE UPDATE ON {{schema_name}}.processing_queue
  FOR EACH ROW
  EXECUTE FUNCTION {{schema_name}}.handle_updated_at();

CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON {{schema_name}}.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION {{schema_name}}.handle_updated_at();

-- View for recording statistics
CREATE OR REPLACE VIEW {{schema_name}}.recording_statistics AS
SELECT 
  member_id,
  COUNT(*) as total_recordings,
  COUNT(*) FILTER (WHERE status = 'processed') as processed_recordings,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_recordings,
  SUM(duration) / 1000 / 60 as total_minutes,
  SUM(word_count) as total_words,
  AVG(word_count) as avg_words_per_recording,
  MAX(start_time) as last_recording_date
FROM {{schema_name}}.call_recordings
GROUP BY member_id;

-- Grant permissions
GRANT ALL ON {{schema_name}}.recording_statistics TO authenticated; 