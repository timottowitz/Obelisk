-- Storage System Migration for Tenant Schema
-- Replace {{schema_name}} with the actual tenant schema name when running

CREATE SCHEMA IF NOT EXISTS {{schema_name}};

SET search_path TO {{schema_name}};

-- STORAGE FOLDERS (per-tenant)
CREATE TABLE storage_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  parent_folder_id uuid REFERENCES storage_folders(id) ON DELETE CASCADE,
  path text NOT NULL,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  deleted_at timestamp,
  is_system_folder boolean NOT NULL DEFAULT false
);

CREATE INDEX idx_storage_folders_parent ON storage_folders(parent_folder_id);
CREATE INDEX idx_storage_folders_path ON storage_folders(path);
CREATE INDEX idx_storage_folders_created_by ON storage_folders(created_by);
CREATE INDEX idx_storage_folders_deleted ON storage_folders(deleted_at);

-- STORAGE FILES (per-tenant)
CREATE TABLE storage_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  original_name text NOT NULL,
  folder_id uuid REFERENCES storage_folders(id) ON DELETE CASCADE,
  azure_blob_name text NOT NULL,
  azure_blob_url text NOT NULL,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL,
  checksum text NOT NULL,
  version int NOT NULL DEFAULT 1,
  previous_version_id uuid REFERENCES storage_files(id),
  uploaded_by uuid NOT NULL REFERENCES users(id),
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  deleted_at timestamp,
  is_encrypted boolean NOT NULL DEFAULT true,
  encryption_key_version text,
  retention_policy text,
  destroy_after_date timestamp
);

CREATE INDEX idx_storage_files_folder ON storage_files(folder_id);
CREATE INDEX idx_storage_files_uploaded_by ON storage_files(uploaded_by);
CREATE INDEX idx_storage_files_deleted ON storage_files(deleted_at);
CREATE INDEX idx_storage_files_version ON storage_files(previous_version_id);
CREATE INDEX idx_storage_files_retention ON storage_files(destroy_after_date);

-- STORAGE SHARES (per-tenant) - for sharing files/folders with specific users
CREATE TABLE storage_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type text NOT NULL CHECK (resource_type IN ('file', 'folder')),
  resource_id uuid NOT NULL,
  shared_by uuid NOT NULL REFERENCES users(id),
  shared_with uuid NOT NULL REFERENCES users(id),
  permission text NOT NULL CHECK (permission IN ('view', 'edit', 'admin')),
  expires_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  UNIQUE (resource_type, resource_id, shared_with)
);

CREATE INDEX idx_storage_shares_resource ON storage_shares(resource_type, resource_id);
CREATE INDEX idx_storage_shares_shared_by ON storage_shares(shared_by);
CREATE INDEX idx_storage_shares_shared_with ON storage_shares(shared_with);
CREATE INDEX idx_storage_shares_expires ON storage_shares(expires_at);

-- STORAGE PERMISSIONS (per-tenant) - for role-based access control
CREATE TABLE storage_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type text NOT NULL CHECK (resource_type IN ('file', 'folder')),
  resource_id uuid NOT NULL,
  role text NOT NULL,
  permission text NOT NULL CHECK (permission IN ('view', 'edit', 'admin')),
  created_at timestamp NOT NULL DEFAULT now(),
  UNIQUE (resource_type, resource_id, role)
);

CREATE INDEX idx_storage_permissions_resource ON storage_permissions(resource_type, resource_id);
CREATE INDEX idx_storage_permissions_role ON storage_permissions(role);

-- STORAGE ACTIVITY LOG (per-tenant) - for tracking file operations
CREATE TABLE storage_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  action text NOT NULL,
  resource_type text NOT NULL CHECK (resource_type IN ('file', 'folder')),
  resource_id uuid NOT NULL,
  details jsonb,
  ip_address text,
  user_agent text,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX idx_storage_activity_user ON storage_activity_log(user_id);
CREATE INDEX idx_storage_activity_resource ON storage_activity_log(resource_type, resource_id);
CREATE INDEX idx_storage_activity_time ON storage_activity_log(created_at);

-- STORAGE QUOTAS (per-tenant) - for managing storage limits
CREATE TABLE storage_quotas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  total_quota_bytes bigint NOT NULL,
  used_bytes bigint NOT NULL DEFAULT 0,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

CREATE INDEX idx_storage_quotas_user ON storage_quotas(user_id);

-- Create functions for storage operations

-- Function to get folder path
CREATE OR REPLACE FUNCTION get_folder_path(folder_uuid uuid)
RETURNS text AS $$
DECLARE
  folder_path text;
  current_folder_id uuid;
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

-- Function to calculate folder size
CREATE OR REPLACE FUNCTION calculate_folder_size(folder_uuid uuid)
RETURNS bigint AS $$
DECLARE
  total_size bigint := 0;
BEGIN
  SELECT COALESCE(SUM(size_bytes), 0) INTO total_size
  FROM storage_files
  WHERE folder_id = folder_uuid AND deleted_at IS NULL;
  
  RETURN total_size;
END;
$$ LANGUAGE plpgsql;

-- Function to check user permissions on a resource
CREATE OR REPLACE FUNCTION check_storage_permission(
  user_uuid uuid,
  resource_type text,
  resource_uuid uuid,
  required_permission text
)
RETURNS boolean AS $$
DECLARE
  user_role text;
  has_permission boolean := false;
BEGIN
  -- Get user's role
  SELECT role INTO user_role
  FROM members
  WHERE user_id = user_uuid;
  
  -- Check role-based permissions
  SELECT EXISTS(
    SELECT 1 FROM storage_permissions
    WHERE resource_type = $2
    AND resource_id = $3
    AND role = user_role
    AND permission = $4
  ) INTO has_permission;
  
  -- Check direct shares
  IF NOT has_permission THEN
    SELECT EXISTS(
      SELECT 1 FROM storage_shares
      WHERE resource_type = $2
      AND resource_id = $3
      AND shared_with = $1
      AND (expires_at IS NULL OR expires_at > now())
      AND permission = $4
    ) INTO has_permission;
  END IF;
  
  -- System admins have all permissions
  IF NOT has_permission THEN
    SELECT is_system_admin INTO has_permission
    FROM users
    WHERE id = $1;
  END IF;
  
  RETURN has_permission;
END;
$$ LANGUAGE plpgsql;

-- Reset search_path
RESET search_path; 