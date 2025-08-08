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
            name = v_insight.suggested_title,
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