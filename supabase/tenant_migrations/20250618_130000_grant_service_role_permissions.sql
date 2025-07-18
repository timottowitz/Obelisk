-- Migration: Grant service_role permissions to tenant schemas
-- Use {{schema_name}} as the schema placeholder

-- Grant USAGE on schema to service_role
GRANT USAGE ON SCHEMA {{schema_name}} TO service_role;

-- Grant ALL permissions on all tables in schema to service_role
GRANT ALL ON ALL TABLES IN SCHEMA {{schema_name}} TO service_role;

-- Grant ALL permissions on all sequences in schema to service_role
GRANT ALL ON ALL SEQUENCES IN SCHEMA {{schema_name}} TO service_role;

-- Grant ALL permissions on all functions in schema to service_role
GRANT ALL ON ALL FUNCTIONS IN SCHEMA {{schema_name}} TO service_role;

-- Set default privileges for future tables, sequences, and functions
ALTER DEFAULT PRIVILEGES IN SCHEMA {{schema_name}}
GRANT ALL ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA {{schema_name}}
GRANT ALL ON SEQUENCES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA {{schema_name}}
GRANT ALL ON FUNCTIONS TO service_role; 