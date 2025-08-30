-- Enhanced RLS Policies for Doc Intel Tables
-- P0 Security: Enforce strict multi-tenant isolation with organization membership verification
-- Replace {{schema_name}} with the actual tenant schema name when running

SET search_path TO {{schema_name}};

-- =============================================================================
-- DROP EXISTING WEAK RLS POLICIES
-- =============================================================================

-- Drop existing weak policies from documents table
DROP POLICY IF EXISTS documents_user_access ON documents;

-- Drop existing weak policies from entities table  
DROP POLICY IF EXISTS entities_user_access ON entities;

-- Drop existing weak policies from doc_intel_job_queue table
DROP POLICY IF EXISTS doc_intel_job_queue_user_access ON doc_intel_job_queue;

-- Drop existing weak policies from doc_intel_job_logs table
DROP POLICY IF EXISTS doc_intel_job_logs_user_access ON doc_intel_job_logs;

-- Drop existing weak policies from doc_intel_job_heartbeats table
DROP POLICY IF EXISTS doc_intel_job_heartbeats_user_access ON doc_intel_job_heartbeats;

-- =============================================================================
-- HELPER FUNCTIONS FOR RLS
-- =============================================================================

-- Function to get current organization ID from schema context
CREATE OR REPLACE FUNCTION get_current_organization_id()
RETURNS UUID AS $$
DECLARE
    org_id UUID;
    schema_name_param TEXT;
BEGIN
    -- Get current schema name
    SELECT current_schema() INTO schema_name_param;
    
    -- Extract organization ID from schema name (assumes format like 'org_uuid')
    IF schema_name_param LIKE 'org_%' THEN
        SELECT o.id INTO org_id 
        FROM private.organizations o 
        WHERE o.schema_name = schema_name_param;
    END IF;
    
    RETURN org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to verify user belongs to current organization
CREATE OR REPLACE FUNCTION user_belongs_to_current_organization(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    org_id UUID;
    is_member BOOLEAN := FALSE;
BEGIN
    -- Get current organization ID
    SELECT get_current_organization_id() INTO org_id;
    
    -- Check if user is active member of this organization
    IF org_id IS NOT NULL AND user_uuid IS NOT NULL THEN
        SELECT EXISTS(
            SELECT 1 
            FROM private.organization_members om 
            WHERE om.user_id = user_uuid 
            AND om.organization_id = org_id 
            AND om.status = 'active'
        ) INTO is_member;
    END IF;
    
    RETURN is_member;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =============================================================================
-- ENHANCED RLS POLICIES FOR DOCUMENTS TABLE
-- =============================================================================

-- Documents SELECT policy - users can only see documents from their organization
CREATE POLICY documents_select_policy ON documents
    FOR SELECT
    TO authenticated
    USING (
        user_belongs_to_current_organization(auth.uid()) AND
        user_belongs_to_current_organization(user_id)
    );

-- Documents INSERT policy - users can only create documents in their organization
CREATE POLICY documents_insert_policy ON documents
    FOR INSERT
    TO authenticated
    WITH CHECK (
        user_belongs_to_current_organization(auth.uid()) AND
        user_id = auth.uid()
    );

-- Documents UPDATE policy - users can only update their own documents in their organization
CREATE POLICY documents_update_policy ON documents
    FOR UPDATE
    TO authenticated
    USING (
        user_belongs_to_current_organization(auth.uid()) AND
        user_belongs_to_current_organization(user_id) AND
        user_id = auth.uid()
    )
    WITH CHECK (
        user_belongs_to_current_organization(auth.uid()) AND
        user_id = auth.uid()
    );

-- Documents DELETE policy - users can only delete their own documents in their organization
CREATE POLICY documents_delete_policy ON documents
    FOR DELETE
    TO authenticated
    USING (
        user_belongs_to_current_organization(auth.uid()) AND
        user_belongs_to_current_organization(user_id) AND
        user_id = auth.uid()
    );

-- =============================================================================
-- ENHANCED RLS POLICIES FOR ENTITIES TABLE
-- =============================================================================

-- Entities SELECT policy - users can only see entities from documents they own in their organization
CREATE POLICY entities_select_policy ON entities
    FOR SELECT
    TO authenticated
    USING (
        user_belongs_to_current_organization(auth.uid()) AND
        EXISTS (
            SELECT 1 FROM documents d
            WHERE d.id = entities.document_id 
            AND user_belongs_to_current_organization(d.user_id)
            AND d.user_id = auth.uid()
        )
    );

-- Entities INSERT policy - users can only create entities for their documents in their organization
CREATE POLICY entities_insert_policy ON entities
    FOR INSERT
    TO authenticated
    WITH CHECK (
        user_belongs_to_current_organization(auth.uid()) AND
        EXISTS (
            SELECT 1 FROM documents d
            WHERE d.id = entities.document_id 
            AND d.user_id = auth.uid()
            AND user_belongs_to_current_organization(d.user_id)
        )
    );

-- Entities UPDATE policy - users can only update entities from their documents in their organization
CREATE POLICY entities_update_policy ON entities
    FOR UPDATE
    TO authenticated
    USING (
        user_belongs_to_current_organization(auth.uid()) AND
        EXISTS (
            SELECT 1 FROM documents d
            WHERE d.id = entities.document_id 
            AND d.user_id = auth.uid()
            AND user_belongs_to_current_organization(d.user_id)
        )
    )
    WITH CHECK (
        user_belongs_to_current_organization(auth.uid()) AND
        EXISTS (
            SELECT 1 FROM documents d
            WHERE d.id = entities.document_id 
            AND d.user_id = auth.uid()
            AND user_belongs_to_current_organization(d.user_id)
        )
    );

-- Entities DELETE policy - users can only delete entities from their documents in their organization
CREATE POLICY entities_delete_policy ON entities
    FOR DELETE
    TO authenticated
    USING (
        user_belongs_to_current_organization(auth.uid()) AND
        EXISTS (
            SELECT 1 FROM documents d
            WHERE d.id = entities.document_id 
            AND d.user_id = auth.uid()
            AND user_belongs_to_current_organization(d.user_id)
        )
    );

-- =============================================================================
-- ENHANCED RLS POLICIES FOR DOC_INTEL_JOB_QUEUE TABLE  
-- =============================================================================

-- Job queue SELECT policy - users can only see jobs from their organization
CREATE POLICY doc_intel_job_queue_select_policy ON doc_intel_job_queue
    FOR SELECT
    TO authenticated
    USING (
        user_belongs_to_current_organization(auth.uid()) AND
        user_belongs_to_current_organization(user_id)
    );

-- Job queue INSERT policy - users can only create jobs in their organization
CREATE POLICY doc_intel_job_queue_insert_policy ON doc_intel_job_queue
    FOR INSERT
    TO authenticated
    WITH CHECK (
        user_belongs_to_current_organization(auth.uid()) AND
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM documents d
            WHERE d.id = doc_intel_job_queue.document_id 
            AND d.user_id = auth.uid()
            AND user_belongs_to_current_organization(d.user_id)
        )
    );

-- Job queue UPDATE policy - users can only update their jobs in their organization
CREATE POLICY doc_intel_job_queue_update_policy ON doc_intel_job_queue
    FOR UPDATE
    TO authenticated
    USING (
        user_belongs_to_current_organization(auth.uid()) AND
        user_belongs_to_current_organization(user_id) AND
        user_id = auth.uid()
    )
    WITH CHECK (
        user_belongs_to_current_organization(auth.uid()) AND
        user_id = auth.uid()
    );

-- Job queue DELETE policy - users can only delete their jobs in their organization
CREATE POLICY doc_intel_job_queue_delete_policy ON doc_intel_job_queue
    FOR DELETE
    TO authenticated
    USING (
        user_belongs_to_current_organization(auth.uid()) AND
        user_belongs_to_current_organization(user_id) AND
        user_id = auth.uid()
    );

-- =============================================================================
-- ENHANCED RLS POLICIES FOR DOC_INTEL_JOB_LOGS TABLE
-- =============================================================================

-- Job logs SELECT policy - users can only see logs from their jobs in their organization
CREATE POLICY doc_intel_job_logs_select_policy ON doc_intel_job_logs
    FOR SELECT
    TO authenticated
    USING (
        user_belongs_to_current_organization(auth.uid()) AND
        EXISTS (
            SELECT 1 FROM doc_intel_job_queue q
            WHERE q.id = doc_intel_job_logs.job_id 
            AND user_belongs_to_current_organization(q.user_id)
            AND q.user_id = auth.uid()
        )
    );

-- Job logs INSERT policy - users can only create logs for their jobs in their organization
CREATE POLICY doc_intel_job_logs_insert_policy ON doc_intel_job_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (
        user_belongs_to_current_organization(auth.uid()) AND
        EXISTS (
            SELECT 1 FROM doc_intel_job_queue q
            WHERE q.id = doc_intel_job_logs.job_id 
            AND q.user_id = auth.uid()
            AND user_belongs_to_current_organization(q.user_id)
        )
    );

-- Job logs UPDATE policy - users can only update logs from their jobs in their organization
CREATE POLICY doc_intel_job_logs_update_policy ON doc_intel_job_logs
    FOR UPDATE
    TO authenticated
    USING (
        user_belongs_to_current_organization(auth.uid()) AND
        EXISTS (
            SELECT 1 FROM doc_intel_job_queue q
            WHERE q.id = doc_intel_job_logs.job_id 
            AND q.user_id = auth.uid()
            AND user_belongs_to_current_organization(q.user_id)
        )
    )
    WITH CHECK (
        user_belongs_to_current_organization(auth.uid()) AND
        EXISTS (
            SELECT 1 FROM doc_intel_job_queue q
            WHERE q.id = doc_intel_job_logs.job_id 
            AND q.user_id = auth.uid()
            AND user_belongs_to_current_organization(q.user_id)
        )
    );

-- Job logs DELETE policy - users can only delete logs from their jobs in their organization  
CREATE POLICY doc_intel_job_logs_delete_policy ON doc_intel_job_logs
    FOR DELETE
    TO authenticated
    USING (
        user_belongs_to_current_organization(auth.uid()) AND
        EXISTS (
            SELECT 1 FROM doc_intel_job_queue q
            WHERE q.id = doc_intel_job_logs.job_id 
            AND q.user_id = auth.uid()
            AND user_belongs_to_current_organization(q.user_id)
        )
    );

-- =============================================================================
-- ENHANCED RLS POLICIES FOR DOC_INTEL_JOB_HEARTBEATS TABLE
-- =============================================================================

-- Job heartbeats SELECT policy - users can only see heartbeats from their jobs in their organization
CREATE POLICY doc_intel_job_heartbeats_select_policy ON doc_intel_job_heartbeats
    FOR SELECT
    TO authenticated
    USING (
        user_belongs_to_current_organization(auth.uid()) AND
        EXISTS (
            SELECT 1 FROM doc_intel_job_queue q
            WHERE q.id = doc_intel_job_heartbeats.job_id 
            AND user_belongs_to_current_organization(q.user_id)
            AND q.user_id = auth.uid()
        )
    );

-- Job heartbeats INSERT policy - users can only create heartbeats for their jobs in their organization
CREATE POLICY doc_intel_job_heartbeats_insert_policy ON doc_intel_job_heartbeats
    FOR INSERT
    TO authenticated
    WITH CHECK (
        user_belongs_to_current_organization(auth.uid()) AND
        EXISTS (
            SELECT 1 FROM doc_intel_job_queue q
            WHERE q.id = doc_intel_job_heartbeats.job_id 
            AND q.user_id = auth.uid()
            AND user_belongs_to_current_organization(q.user_id)
        )
    );

-- Job heartbeats UPDATE policy - users can only update heartbeats from their jobs in their organization
CREATE POLICY doc_intel_job_heartbeats_update_policy ON doc_intel_job_heartbeats
    FOR UPDATE
    TO authenticated
    USING (
        user_belongs_to_current_organization(auth.uid()) AND
        EXISTS (
            SELECT 1 FROM doc_intel_job_queue q
            WHERE q.id = doc_intel_job_heartbeats.job_id 
            AND q.user_id = auth.uid()
            AND user_belongs_to_current_organization(q.user_id)
        )
    )
    WITH CHECK (
        user_belongs_to_current_organization(auth.uid()) AND
        EXISTS (
            SELECT 1 FROM doc_intel_job_queue q
            WHERE q.id = doc_intel_job_heartbeats.job_id 
            AND q.user_id = auth.uid()
            AND user_belongs_to_current_organization(q.user_id)
        )
    );

-- Job heartbeats DELETE policy - users can only delete heartbeats from their jobs in their organization
CREATE POLICY doc_intel_job_heartbeats_delete_policy ON doc_intel_job_heartbeats
    FOR DELETE
    TO authenticated
    USING (
        user_belongs_to_current_organization(auth.uid()) AND
        EXISTS (
            SELECT 1 FROM doc_intel_job_queue q
            WHERE q.id = doc_intel_job_heartbeats.job_id 
            AND q.user_id = auth.uid()
            AND user_belongs_to_current_organization(q.user_id)
        )
    );

-- =============================================================================
-- FUNCTION PERMISSIONS
-- =============================================================================

-- Grant execute permissions for RLS helper functions
GRANT EXECUTE ON FUNCTION get_current_organization_id() TO authenticated;
GRANT EXECUTE ON FUNCTION user_belongs_to_current_organization(UUID) TO authenticated;

-- Grant service_role permissions for backend operations (bypass RLS)
GRANT EXECUTE ON FUNCTION get_current_organization_id() TO service_role;
GRANT EXECUTE ON FUNCTION user_belongs_to_current_organization(UUID) TO service_role;

-- =============================================================================
-- VERIFICATION QUERIES (for testing)
-- =============================================================================

-- The following queries can be used to test RLS policies:
/*
-- Test 1: Verify user can only see their own documents
SELECT count(*) FROM documents WHERE user_id = auth.uid();

-- Test 2: Verify user cannot see documents from other organizations
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "user_from_different_org"}';
SELECT count(*) FROM documents; -- Should return 0

-- Test 3: Verify entity access is properly scoped
SELECT count(*) FROM entities e
JOIN documents d ON d.id = e.document_id
WHERE d.user_id = auth.uid();

-- Test 4: Verify job queue access is properly scoped  
SELECT count(*) FROM doc_intel_job_queue WHERE user_id = auth.uid();

-- Test 5: Test cross-tenant access denial
-- This should fail when executed from a different organization schema
SELECT count(*) FROM documents WHERE user_id != auth.uid();
*/

-- Reset search_path
RESET search_path;