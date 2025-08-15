-- Complete schema migration for multi-tenant legal SaaS platform
-- Replace {{schema_name}} with the actual tenant schema name when running

CREATE SCHEMA IF NOT EXISTS {{schema_name}};
SET search_path TO {{schema_name}};

-- =============================================================================
-- CORE TABLES
-- =============================================================================

-- CONTACTS TABLE
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(255) NOT NULL,
    middle_name VARCHAR(255),
    last_name VARCHAR(255),
    abbreviation_name VARCHAR(50),
    full_name VARCHAR(255) NOT NULL,
    prefix VARCHAR(255),
    suffix VARCHAR(255),
    fullname_extended VARCHAR(300),
    is_individual BOOLEAN NOT NULL DEFAULT FALSE,
    is_deceased BOOLEAN DEFAULT FALSE,
    death_date DATE,
    birth_date DATE,
    age_in_years INTEGER,
    last_changed TIMESTAMP WITH TIME ZONE,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    is_protected BOOLEAN NOT NULL DEFAULT FALSE,
    score INTEGER,
    addresses JSONB DEFAULT '[]'::jsonb,
    emails JSONB DEFAULT '[]'::jsonb,
    phones JSONB DEFAULT '[]'::jsonb,
    contact_type_ids UUID[],
    tags_v2 TEXT[],
    hashtags TEXT[],
    flattened_hash_tags TEXT,
    group_by_first VARCHAR(255),
    sort_by_first VARCHAR(255),
    group_by_last VARCHAR(255),
    sort_by_last VARCHAR(255),
    picture_url TEXT,
    company VARCHAR(255),
    department VARCHAR(255),
    job_title VARCHAR(255),
    org_id INTEGER,
    org_name VARCHAR(255),
    team_ids TEXT[],
    picture_key VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_contacts_full_name ON contacts(full_name);
CREATE INDEX idx_contacts_first_name ON contacts(first_name);
CREATE INDEX idx_contacts_last_name ON contacts(last_name);
CREATE INDEX idx_contacts_company ON contacts(company);

-- CASE TYPES TABLE
CREATE TABLE IF NOT EXISTS case_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(10) DEFAULT '#3B82F6',
    icon VARCHAR(50) DEFAULT 'folder',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_case_types_name ON case_types(name);
CREATE INDEX idx_case_types_active ON case_types(is_active);

-- FOLDER TEMPLATES TABLE
CREATE TABLE IF NOT EXISTS folder_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_type_id UUID NOT NULL REFERENCES case_types(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    path VARCHAR(500) NOT NULL,
    parent_path VARCHAR(500),
    sort_order INTEGER DEFAULT 0,
    is_required BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_folder_templates_case_type ON folder_templates(case_type_id);
CREATE INDEX idx_folder_templates_path ON folder_templates(path);

-- CASES TABLE
CREATE TABLE IF NOT EXISTS cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_number VARCHAR(50) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    case_type_id UUID REFERENCES case_types(id) ON DELETE SET NULL,
    special_notes TEXT,
    filing_fee DECIMAL(10,2),
    case_manager VARCHAR(255),
    claimant_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    respondent_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    special_instructions TEXT,
    initial_task TEXT,
    next_event DATE,
    adr_process TEXT,
    applicable_rules TEXT,
    track TEXT,
    claim_amount DECIMAL(15,2),
    hearing_locale TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'inactive',
    access TEXT DEFAULT 'admin_only' CHECK (access IN ('admin_only', 'public')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cases_case_number ON cases(case_number);
CREATE INDEX idx_cases_status ON cases(status);
CREATE INDEX idx_cases_case_type_id ON cases(case_type_id);
CREATE INDEX idx_cases_claimant_id ON cases(claimant_id);
CREATE INDEX idx_cases_respondent_id ON cases(respondent_id);

-- CASE EVENTS TABLE
CREATE TABLE IF NOT EXISTS case_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    description TEXT,
    date DATE,
    time TIME,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_case_events_case_id ON case_events(case_id);
CREATE INDEX idx_case_events_date ON case_events(date);

-- =============================================================================
-- PROJECT AND TASK MANAGEMENT
-- =============================================================================

-- TASK CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS task_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_task_categories_name ON task_categories(name);

-- PROJECTS TABLE
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_by_id UUID REFERENCES private.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_by ON projects(created_by_id);

-- CASE PROJECTS TABLE
CREATE TABLE IF NOT EXISTS case_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_by_id UUID REFERENCES private.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_case_projects_case_id ON case_projects(case_id);
CREATE INDEX idx_case_projects_status ON case_projects(status);

-- CASE TASKS TABLE
CREATE TABLE IF NOT EXISTS case_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    assignee_id UUID REFERENCES private.users(id) ON DELETE SET NULL,
    assigner_id UUID REFERENCES private.users(id) ON DELETE SET NULL,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    category_id UUID REFERENCES task_categories(id) ON DELETE SET NULL,
    case_project_id UUID REFERENCES case_projects(id) ON DELETE SET NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    completed_by_id UUID REFERENCES private.users(id) ON DELETE SET NULL,
    -- AI Integration Fields
    ai_generated BOOLEAN DEFAULT FALSE,
    foundation_ai_task_id VARCHAR(255),
    ai_confidence_score DECIMAL(3,2),
    ai_suggested_assignee UUID REFERENCES private.users(id),
    ai_reasoning TEXT,
    source_document_id UUID,
    extracted_entities JSONB DEFAULT '{}'::jsonb,
    -- Chat Integration
    chat_message_id VARCHAR(255),
    created_from_chat BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    due_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_case_tasks_case_id ON case_tasks(case_id);
CREATE INDEX idx_case_tasks_assignee_id ON case_tasks(assignee_id);
CREATE INDEX idx_case_tasks_status ON case_tasks(status);
CREATE INDEX idx_case_tasks_due_date ON case_tasks(due_date);
CREATE INDEX idx_case_tasks_case_project_id ON case_tasks(case_project_id);
CREATE INDEX idx_case_tasks_ai_generated ON case_tasks(ai_generated);

-- PROJECT TASKS TABLE
CREATE TABLE IF NOT EXISTS project_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    priority VARCHAR(20) DEFAULT 'medium',
    due_date TIMESTAMP WITH TIME ZONE,
    assignee_id UUID REFERENCES private.users(id),
    assigner_id UUID REFERENCES private.users(id),
    category_id UUID REFERENCES task_categories(id),
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    completed_by_id UUID REFERENCES private.users(id),
    -- AI Integration Fields
    ai_generated BOOLEAN DEFAULT FALSE,
    foundation_ai_task_id VARCHAR(255),
    ai_confidence_score DECIMAL(3,2),
    ai_suggested_assignee UUID REFERENCES private.users(id),
    ai_reasoning TEXT,
    -- Chat Integration
    chat_message_id VARCHAR(255),
    created_from_chat BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_project_tasks_project_id ON project_tasks(project_id);
CREATE INDEX idx_project_tasks_assignee_id ON project_tasks(assignee_id);
CREATE INDEX idx_project_tasks_status ON project_tasks(status);

-- =============================================================================
-- MEETING AND RECORDING MANAGEMENT
-- =============================================================================

-- MEETING TYPES TABLE
CREATE TABLE IF NOT EXISTS meeting_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    system_prompt TEXT NOT NULL,
    output_format VARCHAR(20) DEFAULT 'json' CHECK (output_format IN ('json', 'text', 'markdown')),
    is_active BOOLEAN DEFAULT TRUE,
    member_id UUID NOT NULL,
    task_category VARCHAR(20) CHECK (task_category IN ('case', 'project')),
    context_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(member_id, name)
);

CREATE INDEX idx_meeting_types_member_active ON meeting_types(member_id, is_active);
CREATE INDEX idx_meeting_types_task_category ON meeting_types(task_category);

-- CALL RECORDINGS TABLE
CREATE TABLE IF NOT EXISTS call_recordings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id UUID REFERENCES private.organization_members(id) ON DELETE CASCADE,
    meeting_id VARCHAR(255),
    title VARCHAR(500) NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    duration INTEGER,
    participants JSONB DEFAULT '[]'::jsonb,
    
    -- GCS Storage references
    gcs_video_url TEXT,
    gcs_video_blob_name TEXT,
    gcs_transcript_url TEXT,
    gcs_transcript_blob_name TEXT,
    
    -- Recording metadata
    file_size BIGINT,
    mime_type VARCHAR(100),
    has_video BOOLEAN DEFAULT TRUE,
    has_audio BOOLEAN DEFAULT TRUE,
    
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
    
    -- Meeting intelligence fields
    meeting_type VARCHAR(50) DEFAULT 'call' CHECK (meeting_type IN ('call', 'meeting', 'interview', 'consultation')),
    meeting_type_id UUID REFERENCES meeting_types(id) ON DELETE SET NULL,
    participant_count INTEGER DEFAULT 2,
    agenda_text TEXT,
    speakers_metadata JSONB,
    meeting_duration_minutes INTEGER,
    scheduled_start_time TIMESTAMP WITH TIME ZONE,
    
    -- Sharing fields
    is_shared BOOLEAN DEFAULT FALSE,
    share_settings JSONB DEFAULT '{}'::jsonb,
    
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

CREATE INDEX idx_call_recordings_member_id ON call_recordings(member_id);
CREATE INDEX idx_call_recordings_status ON call_recordings(status);
CREATE INDEX idx_call_recordings_start_time ON call_recordings(start_time DESC);
CREATE INDEX idx_call_recordings_meeting_id ON call_recordings(meeting_id);
CREATE INDEX idx_call_recordings_meeting_type_id ON call_recordings(meeting_type_id);
CREATE INDEX idx_call_recordings_search ON call_recordings USING GIN(search_vector);

-- RECORDING SHARES TABLE
CREATE TABLE IF NOT EXISTS recording_shares (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    recording_id UUID REFERENCES call_recordings(id) ON DELETE CASCADE,
    shared_by_member_id UUID REFERENCES private.organization_members(id) ON DELETE CASCADE,
    shared_with_member_id UUID REFERENCES private.organization_members(id) ON DELETE CASCADE,
    permission_level VARCHAR(50) DEFAULT 'view' CHECK (permission_level IN ('view', 'edit', 'admin')),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(recording_id, shared_with_member_id)
);

CREATE INDEX idx_recording_shares_recording_id ON recording_shares(recording_id);
CREATE INDEX idx_recording_shares_shared_with_member_id ON recording_shares(shared_with_member_id);
CREATE INDEX idx_recording_shares_shared_by_member_id ON recording_shares(shared_by_member_id);
CREATE INDEX idx_recording_shares_expires_at ON recording_shares(expires_at);

-- RECORDING CLIPS TABLE
CREATE TABLE IF NOT EXISTS recording_clips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recording_id UUID NOT NULL REFERENCES call_recordings(id) ON DELETE CASCADE,
    start_time DOUBLE PRECISION NOT NULL,
    end_time DOUBLE PRECISION NOT NULL,
    title TEXT,
    member_id UUID NOT NULL REFERENCES private.organization_members(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_recording_clips_recording_id ON recording_clips(recording_id);
CREATE INDEX idx_recording_clips_member_id ON recording_clips(member_id);

-- PROCESSING QUEUE TABLE
CREATE TABLE IF NOT EXISTS processing_queue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    recording_id UUID REFERENCES call_recordings(id) ON DELETE CASCADE,
    task_type VARCHAR(50) NOT NULL CHECK (task_type IN ('transcribe', 'analyze', 'generate_summary')),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_processing_queue_recording_id ON processing_queue(recording_id);
CREATE INDEX idx_processing_queue_status ON processing_queue(status);

-- MEETING PARTICIPANTS TABLE
CREATE TABLE IF NOT EXISTS meeting_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recording_id UUID NOT NULL REFERENCES call_recordings(id) ON DELETE CASCADE,
    participant_name VARCHAR(255) NOT NULL,
    participant_email VARCHAR(255),
    speaker_label VARCHAR(100),
    role VARCHAR(50) DEFAULT 'participant' CHECK (role IN ('host', 'participant', 'presenter', 'observer')),
    join_time TIMESTAMP WITH TIME ZONE,
    leave_time TIMESTAMP WITH TIME ZONE,
    talk_time_seconds INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_meeting_participants_recording_id ON meeting_participants(recording_id);
CREATE INDEX idx_meeting_participants_speaker_label ON meeting_participants(speaker_label);

-- MEETING ACTION ITEMS TABLE
CREATE TABLE IF NOT EXISTS meeting_action_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recording_id UUID NOT NULL REFERENCES call_recordings(id) ON DELETE CASCADE,
    assignee_speaker_label VARCHAR(100),
    assignee_participant_id UUID REFERENCES meeting_participants(id),
    task_description TEXT NOT NULL,
    due_date DATE,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_meeting_action_items_recording_id ON meeting_action_items(recording_id);
CREATE INDEX idx_meeting_action_items_status ON meeting_action_items(status);
CREATE INDEX idx_meeting_action_items_assignee ON meeting_action_items(assignee_participant_id);

-- MEETING DECISIONS TABLE
CREATE TABLE IF NOT EXISTS meeting_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recording_id UUID NOT NULL REFERENCES call_recordings(id) ON DELETE CASCADE,
    decision_text TEXT NOT NULL,
    decision_maker_speaker_label VARCHAR(100),
    context TEXT,
    impact_level VARCHAR(20) DEFAULT 'medium' CHECK (impact_level IN ('low', 'medium', 'high')),
    implementation_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_meeting_decisions_recording_id ON meeting_decisions(recording_id);

-- MEETING TOPICS TABLE
CREATE TABLE IF NOT EXISTS meeting_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recording_id UUID NOT NULL REFERENCES call_recordings(id) ON DELETE CASCADE,
    topic_name VARCHAR(255) NOT NULL,
    start_time_ms INTEGER,
    end_time_ms INTEGER,
    importance_score FLOAT DEFAULT 0.5,
    speaker_labels TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_meeting_topics_recording_id ON meeting_topics(recording_id);

-- =============================================================================
-- STORAGE MANAGEMENT
-- =============================================================================

-- STORAGE FOLDERS TABLE
CREATE TABLE IF NOT EXISTS storage_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    case_type_id UUID REFERENCES case_types(id) ON DELETE CASCADE,
    parent_folder_id UUID REFERENCES storage_folders(id) ON DELETE CASCADE,
    path TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES private.users(id),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    deleted_at TIMESTAMP,
    is_system_folder BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_storage_folders_parent ON storage_folders(parent_folder_id);
CREATE INDEX idx_storage_folders_path ON storage_folders(path);
CREATE INDEX idx_storage_folders_created_by ON storage_folders(created_by);
CREATE INDEX idx_storage_folders_deleted ON storage_folders(deleted_at);
CREATE INDEX idx_storage_folders_case_id ON storage_folders(case_id);
CREATE INDEX idx_storage_folders_case_type_id ON storage_folders(case_type_id);

-- STORAGE FILES TABLE
CREATE TABLE IF NOT EXISTS storage_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    folder_id UUID REFERENCES storage_folders(id) ON DELETE CASCADE,
    gcs_blob_name TEXT NOT NULL,
    gcs_blob_url TEXT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    size_bytes BIGINT NOT NULL,
    checksum VARCHAR(64) NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    previous_version_id UUID REFERENCES storage_files(id),
    uploaded_by UUID NOT NULL REFERENCES private.organization_members(id),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    deleted_at TIMESTAMP,
    is_encrypted BOOLEAN NOT NULL DEFAULT TRUE,
    encryption_key_version VARCHAR(50),
    retention_policy TEXT,
    destroy_after_date TIMESTAMP
);

CREATE INDEX idx_storage_files_folder ON storage_files(folder_id);
CREATE INDEX idx_storage_files_uploaded_by ON storage_files(uploaded_by);
CREATE INDEX idx_storage_files_deleted ON storage_files(deleted_at);
CREATE INDEX idx_storage_files_version ON storage_files(previous_version_id);
CREATE INDEX idx_storage_files_retention ON storage_files(destroy_after_date);

-- =============================================================================
-- AI TASK INSIGHTS
-- =============================================================================

-- AI TASK INSIGHTS TABLE
CREATE TABLE IF NOT EXISTS ai_task_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES case_tasks(id) ON DELETE CASCADE,
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    
    -- AI Generated Data
    suggested_title VARCHAR(500) NOT NULL,
    suggested_description TEXT,
    suggested_priority VARCHAR(20) DEFAULT 'medium',
    suggested_due_date TIMESTAMP WITH TIME ZONE,
    suggested_assignee_id UUID REFERENCES private.users(id),
    suggested_case_project_id UUID REFERENCES case_projects(id),
    
    -- AI Metadata
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    extracted_entities JSONB DEFAULT '[]'::jsonb,
    ai_reasoning TEXT,
    source_type VARCHAR(50) CHECK (source_type IN ('document', 'transcript', 'email', 'chat', 'manual')),
    source_reference TEXT,
    
    -- Review Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'auto_applied')),
    reviewed_by UUID REFERENCES private.users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES private.users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ai_insights_status ON ai_task_insights(status);
CREATE INDEX idx_ai_insights_case_id ON ai_task_insights(case_id) WHERE case_id IS NOT NULL;
CREATE INDEX idx_ai_insights_project_id ON ai_task_insights(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX idx_ai_insights_created_at ON ai_task_insights(created_at DESC);
CREATE INDEX idx_ai_insights_confidence ON ai_task_insights(confidence_score DESC);

-- AI TASK INSIGHT REVIEWS TABLE
CREATE TABLE IF NOT EXISTS ai_task_insight_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    insight_id UUID REFERENCES ai_task_insights(id) ON DELETE CASCADE,
    user_id UUID REFERENCES private.users(id),
    decision VARCHAR(20) NOT NULL CHECK (decision IN ('accepted', 'rejected', 'modified')),
    modifications JSONB,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ai_insight_reviews_insight_id ON ai_task_insight_reviews(insight_id);

-- =============================================================================
-- VIEWS
-- =============================================================================

-- ACCESSIBLE RECORDINGS VIEW
CREATE OR REPLACE VIEW accessible_recordings AS
SELECT 
    cr.*,
    CASE 
        WHEN cr.meeting_type = 'meeting' THEN 'Meeting'
        WHEN cr.meeting_type = 'interview' THEN 'Interview'
        WHEN cr.meeting_type = 'consultation' THEN 'Consultation'
        ELSE 'Call'
    END as recording_type_display,
    'owner' as access_type,
    NULL as shared_by_member_id,
    NULL as shared_with_member_id,
    NULL as permission_level,
    NULL as share_expires_at
FROM call_recordings cr

UNION ALL

SELECT 
    cr.*,
    CASE 
        WHEN cr.meeting_type = 'meeting' THEN 'Meeting'
        WHEN cr.meeting_type = 'interview' THEN 'Interview'  
        WHEN cr.meeting_type = 'consultation' THEN 'Consultation'
        ELSE 'Call'
    END as recording_type_display,
    'shared' as access_type,
    rs.shared_by_member_id,
    rs.shared_with_member_id,
    rs.permission_level,
    rs.expires_at as share_expires_at
FROM call_recordings cr
JOIN recording_shares rs ON cr.id = rs.recording_id
WHERE rs.expires_at IS NULL OR rs.expires_at > NOW();

-- RECORDING STATISTICS VIEW
CREATE OR REPLACE VIEW recording_statistics AS
SELECT 
    member_id,
    COUNT(*) as total_recordings,
    COUNT(*) FILTER (WHERE status = 'processed') as processed_recordings,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_recordings,
    SUM(duration) / 1000 / 60 as total_minutes,
    SUM(word_count) as total_words,
    AVG(word_count) as avg_words_per_recording,
    MAX(start_time) as last_recording_date
FROM call_recordings
GROUP BY member_id;

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- UPDATED AT TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- FOLDER PATH FUNCTION
CREATE OR REPLACE FUNCTION get_folder_path(folder_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    folder_path TEXT;
    current_folder_id UUID;
BEGIN
    folder_path := '';
    current_folder_id := folder_uuid;
    
    WHILE current_folder_id IS NOT NULL LOOP
        SELECT name, parent_folder_id INTO folder_path, current_folder_id
        FROM storage_folders
        WHERE id = current_folder_id;
        
        IF folder_path IS NULL THEN
            RETURN NULL;
        END IF;
    END LOOP;
    
    RETURN folder_path;
END;
$$ LANGUAGE plpgsql;

-- MEETING TYPE PROMPT FUNCTION
CREATE OR REPLACE FUNCTION get_meeting_type_prompt(meeting_type_id_param UUID)
RETURNS TABLE(
    system_prompt TEXT,
    output_format TEXT,
    display_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mt.system_prompt,
        mt.output_format,
        mt.display_name
    FROM meeting_types mt
    WHERE mt.id = meeting_type_id_param
      AND mt.is_active = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ACCEPT AI SUGGESTION FUNCTION
CREATE OR REPLACE FUNCTION accept_ai_suggestion(
    p_insight_id UUID,
    p_user_id UUID
) RETURNS UUID AS $$
DECLARE
    v_task_id UUID;
    v_insight ai_task_insights%ROWTYPE;
BEGIN
    SELECT * INTO v_insight FROM ai_task_insights WHERE id = p_insight_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'AI insight not found';
    END IF;
    
    IF v_insight.status != 'pending' THEN
        RAISE EXCEPTION 'AI insight already reviewed';
    END IF;
    
    IF v_insight.task_id IS NULL THEN
        INSERT INTO case_tasks (
            name,
            description,
            priority,
            due_date,
            assignee_id,
            case_id,
            case_project_id,
            completed_by_id,
            ai_generated
        ) VALUES (
            v_insight.suggested_title,
            v_insight.suggested_description,
            v_insight.suggested_priority,
            v_insight.suggested_due_date,
            v_insight.suggested_assignee_id,
            v_insight.case_id,
            v_insight.suggested_case_project_id,
            p_user_id,
            TRUE
        ) RETURNING id INTO v_task_id;
        
        UPDATE ai_task_insights 
        SET task_id = v_task_id
        WHERE id = p_insight_id;
    ELSE
        UPDATE case_tasks
        SET 
            name = v_insight.suggested_title,
            description = COALESCE(v_insight.suggested_description, description),
            priority = v_insight.suggested_priority,
            due_date = COALESCE(v_insight.suggested_due_date, due_date),
            assignee_id = COALESCE(v_insight.suggested_assignee_id, assignee_id),
            updated_at = CURRENT_TIMESTAMP,
            ai_generated = TRUE
        WHERE id = v_insight.task_id
        RETURNING id INTO v_task_id;
    END IF;
    
    UPDATE ai_task_insights
    SET 
        status = 'accepted',
        reviewed_by = p_user_id,
        reviewed_at = CURRENT_TIMESTAMP
    WHERE id = p_insight_id;
    
    INSERT INTO ai_task_insight_reviews (
        insight_id,
        user_id,
        decision
    ) VALUES (
        p_insight_id,
        p_user_id,
        'accepted'
    );
    
    RETURN v_task_id;
END;
$$ LANGUAGE plpgsql;

-- REJECT AI SUGGESTION FUNCTION
CREATE OR REPLACE FUNCTION reject_ai_suggestion(
    p_insight_id UUID,
    p_user_id UUID,
    p_reason TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    v_insight ai_task_insights%ROWTYPE;
BEGIN
    SELECT * INTO v_insight FROM ai_task_insights WHERE id = p_insight_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'AI insight not found';
    END IF;
    
    IF v_insight.status != 'pending' THEN
        RAISE EXCEPTION 'AI insight already reviewed';
    END IF;
    
    IF v_insight.task_id IS NOT NULL THEN
        DELETE FROM case_tasks WHERE id = v_insight.task_id AND ai_generated = TRUE;
    END IF;
    
    UPDATE ai_task_insights
    SET 
        status = 'rejected',
        reviewed_by = p_user_id,
        reviewed_at = CURRENT_TIMESTAMP,
        review_notes = p_reason
    WHERE id = p_insight_id;
    
    INSERT INTO ai_task_insight_reviews (
        insight_id,
        user_id,
        decision,
        reason
    ) VALUES (
        p_insight_id,
        p_user_id,
        'rejected',
        p_reason
    );
END;
$$ LANGUAGE plpgsql;

-- UPDATE FUNCTIONS FOR CASE TYPES AND FOLDER TEMPLATES
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Updated at triggers
CREATE TRIGGER update_call_recordings_updated_at
    BEFORE UPDATE ON call_recordings
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_processing_queue_updated_at
    BEFORE UPDATE ON processing_queue
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_recording_shares_updated_at
    BEFORE UPDATE ON recording_shares
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_case_types_updated_at 
    BEFORE UPDATE ON case_types 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_folder_templates_updated_at 
    BEFORE UPDATE ON folder_templates 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meeting_participants_updated_at
    BEFORE UPDATE ON meeting_participants
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_meeting_action_items_updated_at
    BEFORE UPDATE ON meeting_action_items
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE call_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE recording_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_task_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_task_insight_reviews ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- PERMISSIONS
-- =============================================================================

-- Grant service_role permissions
GRANT USAGE ON SCHEMA {{schema_name}} TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA {{schema_name}} TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA {{schema_name}} TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA {{schema_name}} TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA {{schema_name}}
GRANT ALL ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA {{schema_name}}
GRANT ALL ON SEQUENCES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA {{schema_name}}
GRANT ALL ON FUNCTIONS TO service_role;

-- Grant authenticated permissions
GRANT SELECT ON recording_statistics TO authenticated;
GRANT SELECT ON accessible_recordings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON meeting_participants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON meeting_action_items TO authenticated;  
GRANT SELECT, INSERT, UPDATE, DELETE ON meeting_decisions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON meeting_topics TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON meeting_types TO service_role;
GRANT EXECUTE ON FUNCTION get_meeting_type_prompt(UUID) TO service_role;

-- =============================================================================
-- REALTIME PUBLICATIONS
-- =============================================================================

DO $$
BEGIN
    -- Add tables to realtime publication
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE {{schema_name}}.case_tasks;
    EXCEPTION 
        WHEN duplicate_object THEN 
            RAISE NOTICE 'Table {{schema_name}}.case_tasks already in publication';
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE {{schema_name}}.project_tasks;
    EXCEPTION 
        WHEN duplicate_object THEN 
            RAISE NOTICE 'Table {{schema_name}}.project_tasks already in publication';
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE {{schema_name}}.ai_task_insights;
    EXCEPTION 
        WHEN duplicate_object THEN 
            RAISE NOTICE 'Table {{schema_name}}.ai_task_insights already in publication';
    END;
END $$;

-- Reset search_path
RESET search_path;