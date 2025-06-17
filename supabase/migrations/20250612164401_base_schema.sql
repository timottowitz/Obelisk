-- 20250609_201700_base_schema.sql
-- Base schema for global organizations and users

-- Make sure the private schema exists
CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE IF NOT EXISTS private.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_organization_id text NOT NULL UNIQUE,
  name text NOT NULL,
  subdomain text NOT NULL UNIQUE,
  schema_name text NOT NULL UNIQUE,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  subscription_tier text NOT NULL CHECK (subscription_tier IN ('basic', 'professional', 'enterprise')),
  status text NOT NULL CHECK (status IN ('active', 'suspended', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_organizations_clerk_org_id ON private.organizations(clerk_organization_id);
CREATE INDEX IF NOT EXISTS idx_organizations_subdomain ON private.organizations(subdomain);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON private.organizations(status);

CREATE TABLE IF NOT EXISTS private.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id text NOT NULL UNIQUE,
  email text NOT NULL UNIQUE,
  full_name text NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_clerk_user_id ON private.users(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON private.users(email);

CREATE TABLE IF NOT EXISTS private.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES private.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES private.organizations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'lawyer', 'paralegal', 'client')),
  status text NOT NULL CHECK (status IN ('active', 'invited', 'suspended')),
  joined_at timestamp NOT NULL DEFAULT now(),
  UNIQUE (user_id, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON private.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON private.organization_members(organization_id); 

-- Migration: Create table for storing tenant migration SQL files
CREATE TABLE IF NOT EXISTS public.tenant_migration_files (
  id serial PRIMARY KEY,
  filename text NOT NULL UNIQUE,
  version text NOT NULL,
  sql text NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_migration_files_version ON public.tenant_migration_files(version); 