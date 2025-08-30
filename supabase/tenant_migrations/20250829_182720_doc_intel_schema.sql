-- Doc Intel Database Schema Migration
-- Create tables for document intelligence and entity extraction functionality
-- Replace {{schema_name}} with the actual tenant schema name when running

SET search_path TO {{schema_name}};

-- =============================================================================
-- DOC INTEL TABLES
-- =============================================================================

-- DOCUMENTS TABLE
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'uploading' CHECK (status IN ('uploading', 'processing', 'needs_review', 'in_review', 'complete', 'failed')),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    user_id UUID NOT NULL REFERENCES private.users(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    extracted_text TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for documents table
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_at ON documents(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_filename ON documents(filename);
CREATE INDEX IF NOT EXISTS idx_documents_completed_at ON documents(completed_at DESC);

-- Full-text search index for extracted text
CREATE INDEX IF NOT EXISTS idx_documents_text_search ON documents USING GIN(to_tsvector('english', coalesce(extracted_text, '')));

-- ENTITIES TABLE
CREATE TABLE IF NOT EXISTS entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    value TEXT NOT NULL,
    context_snippet TEXT,
    coordinates_json JSONB,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected')),
    is_objective_truth BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for entities table
CREATE INDEX IF NOT EXISTS idx_entities_document_id ON entities(document_id);
CREATE INDEX IF NOT EXISTS idx_entities_label ON entities(label);
CREATE INDEX IF NOT EXISTS idx_entities_status ON entities(status);
CREATE INDEX IF NOT EXISTS idx_entities_is_objective_truth ON entities(is_objective_truth);
CREATE INDEX IF NOT EXISTS idx_entities_created_at ON entities(created_at DESC);

-- Composite index for filtering entities by document and status
CREATE INDEX IF NOT EXISTS idx_entities_document_status ON entities(document_id, status);

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION handle_doc_intel_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically set completed_at when status changes to 'complete'
CREATE OR REPLACE FUNCTION handle_document_completion()
RETURNS TRIGGER AS $$
BEGIN
    -- Set completed_at when status changes to 'complete'
    IF NEW.status = 'complete' AND OLD.status != 'complete' THEN
        NEW.completed_at = CURRENT_TIMESTAMP;
    END IF;
    
    -- Clear completed_at when status changes away from 'complete'
    IF NEW.status != 'complete' AND OLD.status = 'complete' THEN
        NEW.completed_at = NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Triggers for updated_at timestamp
CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION handle_doc_intel_updated_at();

CREATE TRIGGER update_entities_updated_at
    BEFORE UPDATE ON entities
    FOR EACH ROW
    EXECUTE FUNCTION handle_doc_intel_updated_at();

-- Trigger for automatic completion timestamp
CREATE TRIGGER handle_document_completion_trigger
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION handle_document_completion();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS on tables
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE entities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for documents table
-- Users can only see their own documents
CREATE POLICY documents_user_access ON documents
    FOR ALL
    USING (user_id = auth.uid());

-- RLS Policies for entities table  
-- Users can only see entities from their own documents
CREATE POLICY entities_user_access ON entities
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM documents 
            WHERE documents.id = entities.document_id 
            AND documents.user_id = auth.uid()
        )
    );

-- =============================================================================
-- PERMISSIONS
-- =============================================================================

-- Grant service_role permissions for backend operations
GRANT ALL ON documents TO service_role;
GRANT ALL ON entities TO service_role;
GRANT EXECUTE ON FUNCTION handle_doc_intel_updated_at() TO service_role;
GRANT EXECUTE ON FUNCTION handle_document_completion() TO service_role;

-- Grant authenticated user permissions
GRANT SELECT, INSERT, UPDATE ON documents TO authenticated;
GRANT SELECT, INSERT, UPDATE ON entities TO authenticated;

-- =============================================================================
-- REALTIME PUBLICATIONS
-- =============================================================================

DO $$
BEGIN
    -- Add documents table to realtime publication
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE {{schema_name}}.documents;
    EXCEPTION 
        WHEN duplicate_object THEN 
            RAISE NOTICE 'Table {{schema_name}}.documents already in publication';
    END;
    
    -- Add entities table to realtime publication
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE {{schema_name}}.entities;
    EXCEPTION 
        WHEN duplicate_object THEN 
            RAISE NOTICE 'Table {{schema_name}}.entities already in publication';
    END;
END $$;

-- Reset search_path
RESET search_path;