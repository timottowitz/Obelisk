-- Grant access to private schema for service_role and authenticator
GRANT USAGE ON SCHEMA private TO authenticator, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA private TO authenticator, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA private
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticator, service_role; 