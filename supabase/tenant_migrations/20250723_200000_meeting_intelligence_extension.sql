-- Meeting Intelligence Extension Migration
-- Extends existing call_recordings table for meeting functionality
-- Maintains backward compatibility with legal SaaS features

-- Extend existing call_recordings table for meeting intelligence
ALTER TABLE {{schema_name}}.call_recordings 
ADD COLUMN IF NOT EXISTS meeting_type TEXT DEFAULT 'call' CHECK (meeting_type IN ('call', 'meeting', 'interview', 'consultation'));

ALTER TABLE {{schema_name}}.call_recordings 
ADD COLUMN IF NOT EXISTS participant_count INTEGER DEFAULT 2;

ALTER TABLE {{schema_name}}.call_recordings 
ADD COLUMN IF NOT EXISTS agenda_text TEXT;

ALTER TABLE {{schema_name}}.call_recordings 
ADD COLUMN IF NOT EXISTS speakers_metadata JSONB;

ALTER TABLE {{schema_name}}.call_recordings 
ADD COLUMN IF NOT EXISTS meeting_duration_minutes INTEGER;

ALTER TABLE {{schema_name}}.call_recordings 
ADD COLUMN IF NOT EXISTS scheduled_start_time TIMESTAMP WITH TIME ZONE;

-- Create meeting participants table
CREATE TABLE IF NOT EXISTS {{schema_name}}.meeting_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recording_id UUID NOT NULL REFERENCES {{schema_name}}.call_recordings(id) ON DELETE CASCADE,
    participant_name TEXT NOT NULL,
    participant_email TEXT,
    speaker_label TEXT, -- Links to transcript speaker IDs from Gemini
    role TEXT DEFAULT 'participant' CHECK (role IN ('host', 'participant', 'presenter', 'observer')),
    join_time TIMESTAMP WITH TIME ZONE,
    leave_time TIMESTAMP WITH TIME ZONE,
    talk_time_seconds INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create meeting action items table (extends concept from existing system)
CREATE TABLE IF NOT EXISTS {{schema_name}}.meeting_action_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recording_id UUID NOT NULL REFERENCES {{schema_name}}.call_recordings(id) ON DELETE CASCADE,
    assignee_speaker_label TEXT, -- Links to speaker from transcript
    assignee_participant_id UUID REFERENCES {{schema_name}}.meeting_participants(id),
    task_description TEXT NOT NULL,
    due_date DATE,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create meeting decisions table
CREATE TABLE IF NOT EXISTS {{schema_name}}.meeting_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recording_id UUID NOT NULL REFERENCES {{schema_name}}.call_recordings(id) ON DELETE CASCADE,
    decision_text TEXT NOT NULL,
    decision_maker_speaker_label TEXT,
    context TEXT,
    impact_level TEXT DEFAULT 'medium' CHECK (impact_level IN ('low', 'medium', 'high')),
    implementation_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create meeting topics table for better organization
CREATE TABLE IF NOT EXISTS {{schema_name}}.meeting_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recording_id UUID NOT NULL REFERENCES {{schema_name}}.call_recordings(id) ON DELETE CASCADE,
    topic_name TEXT NOT NULL,
    start_time_ms INTEGER,
    end_time_ms INTEGER,
    importance_score FLOAT DEFAULT 0.5,
    speaker_labels TEXT[], -- Array of speakers who discussed this topic
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_meeting_participants_recording_id ON {{schema_name}}.meeting_participants(recording_id);
CREATE INDEX IF NOT EXISTS idx_meeting_participants_speaker_label ON {{schema_name}}.meeting_participants(speaker_label);
CREATE INDEX IF NOT EXISTS idx_meeting_action_items_recording_id ON {{schema_name}}.meeting_action_items(recording_id);
CREATE INDEX IF NOT EXISTS idx_meeting_action_items_status ON {{schema_name}}.meeting_action_items(status);
CREATE INDEX IF NOT EXISTS idx_meeting_action_items_assignee ON {{schema_name}}.meeting_action_items(assignee_participant_id);
CREATE INDEX IF NOT EXISTS idx_meeting_decisions_recording_id ON {{schema_name}}.meeting_decisions(recording_id);
CREATE INDEX IF NOT EXISTS idx_meeting_topics_recording_id ON {{schema_name}}.meeting_topics(recording_id);
CREATE INDEX IF NOT EXISTS idx_call_recordings_meeting_type ON {{schema_name}}.call_recordings(meeting_type);

-- Add updated_at trigger for new tables
CREATE OR REPLACE FUNCTION {{schema_name}}.update_meeting_participants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION {{schema_name}}.update_meeting_action_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS update_meeting_participants_updated_at_trigger ON {{schema_name}}.meeting_participants;
CREATE TRIGGER update_meeting_participants_updated_at_trigger
    BEFORE UPDATE ON {{schema_name}}.meeting_participants
    FOR EACH ROW
    EXECUTE FUNCTION {{schema_name}}.update_meeting_participants_updated_at();

DROP TRIGGER IF EXISTS update_meeting_action_items_updated_at_trigger ON {{schema_name}}.meeting_action_items;
CREATE TRIGGER update_meeting_action_items_updated_at_trigger
    BEFORE UPDATE ON {{schema_name}}.meeting_action_items
    FOR EACH ROW
    EXECUTE FUNCTION {{schema_name}}.update_meeting_action_items_updated_at();

-- Add RLS policies for meeting tables (following existing patterns)
ALTER TABLE {{schema_name}}.meeting_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE {{schema_name}}.meeting_action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE {{schema_name}}.meeting_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE {{schema_name}}.meeting_topics ENABLE ROW LEVEL SECURITY;

-- Update existing views to include meeting data
DROP VIEW IF EXISTS {{schema_name}}.accessible_recordings;
CREATE VIEW {{schema_name}}.accessible_recordings AS
SELECT 
    cr.*,
    -- Meeting-specific fields
    CASE 
        WHEN cr.meeting_type = 'meeting' THEN 'Meeting'
        WHEN cr.meeting_type = 'interview' THEN 'Interview'
        WHEN cr.meeting_type = 'consultation' THEN 'Consultation'
        ELSE 'Call'
    END as recording_type_display,
    -- Existing fields
    'owned' as access_type,
    NULL as shared_by_member_id,
    NULL as permission_level,
    NULL as share_expires_at
FROM {{schema_name}}.call_recordings cr
WHERE cr.member_id IN (
    SELECT pom.id 
    FROM private.organization_members pom 
    WHERE pom.user_id = auth.uid()
)

UNION ALL

SELECT 
    cr.*,
    -- Meeting-specific fields  
    CASE 
        WHEN cr.meeting_type = 'meeting' THEN 'Meeting'
        WHEN cr.meeting_type = 'interview' THEN 'Interview'  
        WHEN cr.meeting_type = 'consultation' THEN 'Consultation'
        ELSE 'Call'
    END as recording_type_display,
    -- Shared recording fields
    'shared' as access_type,
    rs.shared_by_member_id,
    rs.permission_level,
    rs.expires_at as share_expires_at
FROM {{schema_name}}.call_recordings cr
JOIN {{schema_name}}.recording_shares rs ON cr.id = rs.recording_id
WHERE rs.shared_with_member_id IN (
    SELECT pom.id 
    FROM private.organization_members pom 
    WHERE pom.user_id = auth.uid()
)
AND (rs.expires_at IS NULL OR rs.expires_at > NOW());

-- Grant permissions following existing patterns
GRANT SELECT, INSERT, UPDATE, DELETE ON {{schema_name}}.meeting_participants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON {{schema_name}}.meeting_action_items TO authenticated;  
GRANT SELECT, INSERT, UPDATE, DELETE ON {{schema_name}}.meeting_decisions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON {{schema_name}}.meeting_topics TO authenticated;
GRANT SELECT ON {{schema_name}}.accessible_recordings TO authenticated;