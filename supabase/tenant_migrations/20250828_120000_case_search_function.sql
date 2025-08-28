-- Case search function with fuzzy matching and relevance ranking
-- This migration adds full-text search capabilities to the cases table

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;

-- Add search vector column to cases table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cases' 
        AND column_name = 'search_vector'
        AND table_schema = current_schema()
    ) THEN
        ALTER TABLE cases ADD COLUMN search_vector tsvector 
        GENERATED ALWAYS AS (
            setweight(to_tsvector('english', coalesce(case_number, '')), 'A') ||
            setweight(to_tsvector('english', coalesce(full_name, '')), 'B') ||
            setweight(to_tsvector('english', coalesce(phone, '')), 'C') ||
            setweight(to_tsvector('english', coalesce(email, '')), 'C')
        ) STORED;
    END IF;
END $$;

-- Create GIN index for full-text search
CREATE INDEX IF NOT EXISTS idx_cases_search_vector ON cases USING GIN(search_vector);

-- Create indexes for similarity matching
CREATE INDEX IF NOT EXISTS idx_cases_case_number_gin ON cases USING GIN(case_number gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_cases_full_name_gin ON cases USING GIN(full_name gin_trgm_ops);

-- Add client name from contacts table lookup function
CREATE OR REPLACE FUNCTION get_case_client_name(case_id UUID)
RETURNS TEXT AS $$
BEGIN
    -- For now, return the full_name from cases table
    -- In the future, this could join with contacts table
    RETURN (SELECT full_name FROM cases WHERE id = case_id);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create the main search function
CREATE OR REPLACE FUNCTION search_cases(
  search_query TEXT,
  tenant_schema TEXT,
  limit_count INTEGER DEFAULT 20,
  offset_count INTEGER DEFAULT 0,
  case_type_filter UUID DEFAULT NULL,
  status_filter TEXT DEFAULT NULL
) RETURNS TABLE(
  id UUID,
  case_number TEXT,
  full_name TEXT,
  client_name TEXT,
  status TEXT,
  updated_at TIMESTAMPTZ,
  relevance_score REAL,
  case_number_similarity REAL,
  title_similarity REAL,
  client_similarity REAL
) AS $$
DECLARE
  query_sql TEXT;
  search_tsquery tsquery;
BEGIN
  -- Create tsquery for full-text search
  BEGIN
    search_tsquery := plainto_tsquery('english', search_query);
  EXCEPTION WHEN OTHERS THEN
    -- Fallback to simple text matching if tsquery fails
    search_tsquery := to_tsquery('english', quote_literal(search_query));
  END;

  query_sql := format('
    SELECT 
      c.id,
      c.case_number,
      c.full_name,
      c.full_name as client_name,
      c.status,
      c.updated_at,
      COALESCE(ts_rank_cd(c.search_vector, %L), 0) as relevance_score,
      COALESCE(similarity(c.case_number, %L), 0) as case_number_similarity,
      COALESCE(similarity(c.full_name, %L), 0) as title_similarity,
      COALESCE(similarity(c.full_name, %L), 0) as client_similarity
    FROM %I.cases c
    WHERE (
      c.search_vector @@ %L
      OR similarity(c.case_number, %L) > 0.3
      OR similarity(c.full_name, %L) > 0.2
      OR c.case_number ILIKE %L
      OR c.full_name ILIKE %L
    )',
    search_tsquery,
    search_query, search_query, search_query,
    tenant_schema,
    search_tsquery,
    search_query, search_query,
    '%' || search_query || '%',
    '%' || search_query || '%'
  );

  -- Add filters
  IF case_type_filter IS NOT NULL THEN
    query_sql := query_sql || format(' AND c.case_type_id = %L', case_type_filter);
  END IF;
  
  IF status_filter IS NOT NULL THEN
    query_sql := query_sql || format(' AND c.status = %L', status_filter);
  END IF;

  -- Add ordering and pagination
  query_sql := query_sql || format('
    ORDER BY 
      relevance_score DESC,
      GREATEST(case_number_similarity, title_similarity, client_similarity) DESC,
      c.updated_at DESC
    LIMIT %L OFFSET %L',
    limit_count, offset_count
  );

  RETURN QUERY EXECUTE query_sql;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION search_cases(TEXT, TEXT, INTEGER, INTEGER, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION get_case_client_name(UUID) TO service_role;