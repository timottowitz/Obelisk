-- AI Task Insights Table
CREATE TABLE IF NOT EXISTS {{schema_name}}.ai_task_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES {{schema_name}}.case_tasks(id) ON DELETE CASCADE,
    case_id UUID REFERENCES {{schema_name}}.cases(id) ON DELETE CASCADE,
    project_id UUID REFERENCES {{schema_name}}.projects(id) ON DELETE CASCADE,
    
    -- AI Generated Data
    suggested_title TEXT NOT NULL,
    suggested_description TEXT,
    suggested_priority VARCHAR(20) DEFAULT 'medium',
    suggested_due_date TIMESTAMP WITH TIME ZONE,
    suggested_assignee_id UUID REFERENCES private.users(id),
    
    -- AI Metadata
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    extracted_entities JSONB DEFAULT '[]'::jsonb,
    ai_reasoning TEXT,
    source_type TEXT CHECK (source_type IN ('document', 'transcript', 'email', 'chat', 'manual')),
    source_reference TEXT,
    
    -- Review Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'auto_applied')),
    reviewed_by UUID REFERENCES private.users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES private.users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure only one pending insight per task
    CONSTRAINT unique_pending_insight_per_task UNIQUE NULLS NOT DISTINCT (task_id, status) 
        DEFERRABLE INITIALLY DEFERRED
);

-- Review Log for Audit Trail
CREATE TABLE IF NOT EXISTS {{schema_name}}.ai_task_insight_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    insight_id UUID REFERENCES {{schema_name}}.ai_task_insights(id) ON DELETE CASCADE,
    user_id UUID REFERENCES private.users(id),
    decision TEXT NOT NULL CHECK (decision IN ('accepted', 'rejected', 'modified')),
    modifications JSONB,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Performance
CREATE INDEX idx_ai_insights_status ON {{schema_name}}.ai_task_insights(status);
CREATE INDEX idx_ai_insights_case_id ON {{schema_name}}.ai_task_insights(case_id) WHERE case_id IS NOT NULL;
CREATE INDEX idx_ai_insights_project_id ON {{schema_name}}.ai_task_insights(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX idx_ai_insights_created_at ON {{schema_name}}.ai_task_insights(created_at DESC);
CREATE INDEX idx_ai_insights_confidence ON {{schema_name}}.ai_task_insights(confidence_score DESC);

-- RLS Policies
ALTER TABLE {{schema_name}}.ai_task_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE {{schema_name}}.ai_task_insight_reviews ENABLE ROW LEVEL SECURITY;

-- Users can view AI insights for their organization
CREATE POLICY "Users can view AI insights" ON {{schema_name}}.ai_task_insights
    FOR SELECT
    USING (true);  -- Organization check handled at API level

-- Only assigners and admins can accept/reject
CREATE POLICY "Authorized users can update AI insights" ON {{schema_name}}.ai_task_insights
    FOR UPDATE
    USING (true);  -- Permission check handled at API level

-- Review log is append-only
CREATE POLICY "Users can insert review logs" ON {{schema_name}}.ai_task_insight_reviews
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can view review logs" ON {{schema_name}}.ai_task_insight_reviews
    FOR SELECT
    USING (true);

-- Function to accept AI suggestion and create/update task
CREATE OR REPLACE FUNCTION {{schema_name}}.accept_ai_suggestion(
    p_insight_id UUID,
    p_user_id UUID
) RETURNS UUID AS $$
DECLARE
    v_task_id UUID;
    v_insight {{schema_name}}.ai_task_insights%ROWTYPE;
BEGIN
    -- Get the insight
    SELECT * INTO v_insight FROM {{schema_name}}.ai_task_insights WHERE id = p_insight_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'AI insight not found';
    END IF;
    
    IF v_insight.status != 'pending' THEN
        RAISE EXCEPTION 'AI insight already reviewed';
    END IF;
    
    -- Create or update the task
    IF v_insight.task_id IS NULL THEN
        -- Create new task
        INSERT INTO {{schema_name}}.case_tasks (
            title,
            description,
            priority,
            due_date,
            assignee_id,
            case_id,
            project_id,
            created_by,
            ai_generated
        ) VALUES (
            v_insight.suggested_title,
            v_insight.suggested_description,
            v_insight.suggested_priority,
            v_insight.suggested_due_date,
            v_insight.suggested_assignee_id,
            v_insight.case_id,
            v_insight.project_id,
            p_user_id,
            true
        ) RETURNING id INTO v_task_id;
        
        -- Update insight with task reference
        UPDATE {{schema_name}}.ai_task_insights 
        SET task_id = v_task_id
        WHERE id = p_insight_id;
    ELSE
        -- Update existing task
        UPDATE {{schema_name}}.case_tasks
        SET 
            title = v_insight.suggested_title,
            description = COALESCE(v_insight.suggested_description, description),
            priority = v_insight.suggested_priority,
            due_date = COALESCE(v_insight.suggested_due_date, due_date),
            assignee_id = COALESCE(v_insight.suggested_assignee_id, assignee_id),
            updated_at = CURRENT_TIMESTAMP,
            ai_generated = true
        WHERE id = v_insight.task_id
        RETURNING id INTO v_task_id;
    END IF;
    
    -- Mark insight as accepted
    UPDATE {{schema_name}}.ai_task_insights
    SET 
        status = 'accepted',
        reviewed_by = p_user_id,
        reviewed_at = CURRENT_TIMESTAMP
    WHERE id = p_insight_id;
    
    -- Log the review
    INSERT INTO {{schema_name}}.ai_task_insight_reviews (
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

-- Function to reject AI suggestion
CREATE OR REPLACE FUNCTION {{schema_name}}.reject_ai_suggestion(
    p_insight_id UUID,
    p_user_id UUID,
    p_reason TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    v_insight {{schema_name}}.ai_task_insights%ROWTYPE;
BEGIN
    -- Get the insight
    SELECT * INTO v_insight FROM {{schema_name}}.ai_task_insights WHERE id = p_insight_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'AI insight not found';
    END IF;
    
    IF v_insight.status != 'pending' THEN
        RAISE EXCEPTION 'AI insight already reviewed';
    END IF;
    
    -- If there's a placeholder task, delete it
    IF v_insight.task_id IS NOT NULL THEN
        DELETE FROM {{schema_name}}.case_tasks WHERE id = v_insight.task_id AND ai_generated = true;
    END IF;
    
    -- Mark insight as rejected
    UPDATE {{schema_name}}.ai_task_insights
    SET 
        status = 'rejected',
        reviewed_by = p_user_id,
        reviewed_at = CURRENT_TIMESTAMP,
        review_notes = p_reason
    WHERE id = p_insight_id;
    
    -- Log the review
    INSERT INTO {{schema_name}}.ai_task_insight_reviews (
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

-- Add ai_generated flag to tasks table if not exists
ALTER TABLE {{schema_name}}.case_tasks ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT false;