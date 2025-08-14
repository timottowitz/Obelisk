-- Alter the 'supabase_realtime' publication to include ai_task_insights table.
-- Using exception handling to avoid errors if table is already in publication.

DO $$
BEGIN
    -- Try to add ai_task_insights table to publication
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE {{schema_name}}.ai_task_insights;
    EXCEPTION 
        WHEN duplicate_object THEN 
            -- Table is already in publication, ignore the error
            RAISE NOTICE 'Table {{schema_name}}.ai_task_insights is already in publication';
    END;
END $$;
