-- Alter the 'supabase_realtime' publication to include task-related tables.
-- This enables real-time updates for tasks within each tenant's schema.
-- Using exception handling to avoid errors if tables are already in publication.

DO $$
BEGIN
    -- Try to add case_tasks table to publication
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE {{schema_name}}.case_tasks;
    EXCEPTION 
        WHEN duplicate_object THEN 
            -- Table is already in publication, ignore the error
            RAISE NOTICE 'Table {{schema_name}}.case_tasks is already in publication';
    END;
    
    -- Try to add project_tasks table to publication  
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE {{schema_name}}.project_tasks;
    EXCEPTION 
        WHEN duplicate_object THEN 
            -- Table is already in publication, ignore the error
            RAISE NOTICE 'Table {{schema_name}}.project_tasks is already in publication';
    END;
END $$;
