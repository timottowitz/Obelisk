import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

// Enhanced request validation schema
const searchParamsSchema = z.object({
  q: z.string().min(1, 'Query must be at least 1 character'),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  case_type_id: z.string().uuid().optional(),
  status: z.string().optional(),
  // Enhanced filters
  filter: z.enum(['active', 'my_cases', 'recent', 'frequent']).optional(),
  date_range: z.enum(['30days', '3months', '6months', 'year', 'all']).optional().default('all'),
  client_domain: z.string().optional(),
  assigned_attorney_id: z.string().optional(),
  sort_by: z.enum(['relevance', 'date', 'case_number', 'client_name']).optional().default('relevance')
});

// Enhanced response types
interface CaseSearchResult {
  id: string;
  caseNumber: string;
  title: string;
  clientName: string;
  clientOrganization?: string;
  clientDomain?: string;
  status: string;
  lastActivity?: Date;
  emailCount?: number;
  caseDescription?: string;
  caseType?: string;
  assignedAttorneys?: string[];
  relevanceScore?: number;
  matchedFields?: ('caseNumber' | 'title' | 'clientName' | 'clientOrganization' | 'description')[];
  suggestionReason?: 'content-analysis' | 'recent-assignment' | 'pattern-match' | 'domain-match' | 'frequent-case';
  priority?: 'high' | 'medium' | 'low';
  created_at?: Date;
  updated_at?: Date;
}

interface SearchResponse {
  cases: CaseSearchResult[];
  totalCount: number;
  query: string;
  appliedFilters: Record<string, any>;
  hasMore: boolean;
  searchTime?: number;
}

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * GET /api/cases/search
 * Search cases with fuzzy matching and relevance ranking
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get organization from headers
    const orgId = request.headers.get('X-Org-Id');
    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization ID required' },
        { status: 400 }
      );
    }

    // Parse and validate query parameters
    const searchParams = request.nextUrl.searchParams;
    const params = {
      q: searchParams.get('q') || '',
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
      case_type_id: searchParams.get('case_type_id'),
      status: searchParams.get('status'),
      filter: searchParams.get('filter'),
      date_range: searchParams.get('date_range'),
      client_domain: searchParams.get('client_domain'),
      assigned_attorney_id: searchParams.get('assigned_attorney_id'),
      sort_by: searchParams.get('sort_by')
    };

    const validatedParams = searchParamsSchema.parse(params);
    const startTime = Date.now();

    // Get tenant schema name (simplified for now)
    const tenantSchema = `org_${orgId.replace(/[^a-zA-Z0-9]/g, '_')}`;

    // Execute enhanced search with tenant isolation
    const { data: searchResults, error: searchError } = await supabase
      .rpc('search_cases_enhanced', {
        search_query: validatedParams.q,
        tenant_schema: tenantSchema,
        limit_count: validatedParams.limit,
        offset_count: validatedParams.offset,
        case_type_filter: validatedParams.case_type_id,
        status_filter: validatedParams.status,
        filter_type: validatedParams.filter,
        date_range_filter: validatedParams.date_range,
        client_domain_filter: validatedParams.client_domain,
        assigned_attorney_filter: validatedParams.assigned_attorney_id,
        sort_by_field: validatedParams.sort_by,
        user_id: userId
      });

    if (searchError) {
      console.error('Case search error:', searchError);
      return NextResponse.json(
        { error: 'Search failed' },
        { status: 500 }
      );
    }

    // Transform results to match frontend interface
    const transformedResults: CaseSearchResult[] = (searchResults || []).map(transformEnhancedCaseResult);

    // Add smart suggestions based on query context
    const suggestions = await getSmartCaseSuggestions(
      validatedParams.q, 
      validatedParams.client_domain,
      userId,
      tenantSchema,
      transformedResults
    );

    const searchTime = Date.now() - startTime;
    const allResults = [...suggestions, ...transformedResults];

    const response: SearchResponse = {
      cases: allResults,
      query: validatedParams.q,
      totalCount: allResults.length,
      appliedFilters: {
        filter: validatedParams.filter,
        date_range: validatedParams.date_range,
        case_type_id: validatedParams.case_type_id,
        status: validatedParams.status,
        client_domain: validatedParams.client_domain,
        sort_by: validatedParams.sort_by
      },
      hasMore: (searchResults?.length || 0) === validatedParams.limit,
      searchTime
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Search endpoint error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid query parameters',
          details: error.errors.map(e => e.message)
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


/**
 * Transform enhanced database result to frontend interface
 */
function transformEnhancedCaseResult(row: any): CaseSearchResult {
  const matchedFields: ('caseNumber' | 'title' | 'clientName' | 'clientOrganization' | 'description')[] = [];
  
  // Determine which fields matched based on similarity scores
  if (row.case_number_similarity > 0.3) matchedFields.push('caseNumber');
  if (row.title_similarity > 0.2) matchedFields.push('title');
  if (row.client_similarity > 0.2) matchedFields.push('clientName');
  if (row.client_org_similarity > 0.2) matchedFields.push('clientOrganization');
  if (row.description_similarity > 0.15) matchedFields.push('description');

  return {
    id: row.id,
    caseNumber: row.case_number,
    title: row.title || row.full_name,
    clientName: row.client_name,
    clientOrganization: row.client_organization,
    clientDomain: row.client_domain,
    status: row.status,
    lastActivity: row.last_activity ? new Date(row.last_activity) : undefined,
    emailCount: row.email_count || 0,
    caseDescription: row.case_description ? row.case_description.substring(0, 100) : undefined,
    caseType: row.case_type_name,
    relevanceScore: parseFloat(row.relevance_score) || 0,
    matchedFields: matchedFields.length > 0 ? matchedFields : undefined,
    suggestionReason: row.suggestion_reason,
    priority: row.priority,
    assignedAttorneys: row.assigned_attorneys ? row.assigned_attorneys.split(',') : [],
    created_at: row.created_at ? new Date(row.created_at) : undefined,
    updated_at: row.updated_at ? new Date(row.updated_at) : undefined
  };
}

/**
 * Get smart case suggestions based on context
 */
async function getSmartCaseSuggestions(
  query: string, 
  clientDomain: string | undefined,
  userId: string,
  tenantSchema: string,
  existingResults: CaseSearchResult[]
): Promise<CaseSearchResult[]> {
  const suggestions: CaseSearchResult[] = [];
  
  try {
    // Get recent cases user has assigned emails to
    const { data: recentCases } = await supabase
      .rpc('get_recent_user_cases', {
        tenant_schema: tenantSchema,
        user_id: userId,
        limit_count: 3
      });
    
    if (recentCases) {
      suggestions.push(...recentCases.map((row: any) => ({
        ...transformEnhancedCaseResult(row),
        suggestionReason: 'recent-assignment' as const,
        relevanceScore: 0.9
      })));
    }

    // If client domain is provided, get cases with matching client domains
    if (clientDomain) {
      const { data: domainCases } = await supabase
        .rpc('get_domain_matching_cases', {
          tenant_schema: tenantSchema,
          client_domain: clientDomain,
          limit_count: 2
        });
        
      if (domainCases) {
        suggestions.push(...domainCases.map((row: any) => ({
          ...transformEnhancedCaseResult(row),
          suggestionReason: 'domain-match' as const,
          relevanceScore: 0.85
        })));
      }
    }

    // Get frequently assigned cases
    const { data: frequentCases } = await supabase
      .rpc('get_frequent_user_cases', {
        tenant_schema: tenantSchema,
        user_id: userId,
        limit_count: 2
      });
      
    if (frequentCases) {
      suggestions.push(...frequentCases.map((row: any) => ({
        ...transformEnhancedCaseResult(row),
        suggestionReason: 'frequent-case' as const,
        relevanceScore: 0.8
      })));
    }

    // Remove duplicates with existing results
    const existingIds = new Set(existingResults.map(r => r.id));
    return suggestions.filter(s => !existingIds.has(s.id)).slice(0, 5);
    
  } catch (error) {
    console.error('Error getting smart suggestions:', error);
    return [];
  }
}

/**
 * Enhanced database functions for case search (run these migrations first)
 */
export const ENHANCED_SEARCH_FUNCTIONS_SQL = `
-- Enhanced main search function
CREATE OR REPLACE FUNCTION search_cases_enhanced(
  search_query TEXT,
  tenant_schema TEXT,
  limit_count INTEGER DEFAULT 20,
  offset_count INTEGER DEFAULT 0,
  case_type_filter UUID DEFAULT NULL,
  status_filter TEXT DEFAULT NULL,
  filter_type TEXT DEFAULT NULL,
  date_range_filter TEXT DEFAULT 'all',
  client_domain_filter TEXT DEFAULT NULL,
  assigned_attorney_filter TEXT DEFAULT NULL,
  sort_by_field TEXT DEFAULT 'relevance',
  user_id TEXT DEFAULT NULL
) RETURNS TABLE(
  id UUID,
  case_number TEXT,
  full_name TEXT,
  client_name TEXT,
  client_organization TEXT,
  client_domain TEXT,
  status TEXT,
  last_activity TIMESTAMPTZ,
  email_count INTEGER,
  case_description TEXT,
  case_type_name TEXT,
  priority TEXT,
  assigned_attorneys TEXT,
  relevance_score REAL,
  case_number_similarity REAL,
  title_similarity REAL,
  client_similarity REAL,
  client_org_similarity REAL,
  description_similarity REAL,
  suggestion_reason TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
DECLARE
  query_sql TEXT;
  date_filter TEXT;
  order_clause TEXT;
BEGIN
  -- Build date filter
  CASE date_range_filter
    WHEN '30days' THEN date_filter := format('AND c.updated_at >= NOW() - INTERVAL ''30 days''');
    WHEN '3months' THEN date_filter := format('AND c.updated_at >= NOW() - INTERVAL ''3 months''');
    WHEN '6months' THEN date_filter := format('AND c.updated_at >= NOW() - INTERVAL ''6 months''');
    WHEN 'year' THEN date_filter := format('AND c.updated_at >= NOW() - INTERVAL ''1 year''');
    ELSE date_filter := '';
  END CASE;

  -- Build order clause
  CASE sort_by_field
    WHEN 'date' THEN order_clause := 'ORDER BY c.updated_at DESC';
    WHEN 'case_number' THEN order_clause := 'ORDER BY c.case_number ASC';
    WHEN 'client_name' THEN order_clause := 'ORDER BY c.client_name ASC';
    ELSE order_clause := 'ORDER BY relevance_score DESC, GREATEST(case_number_similarity, title_similarity, client_similarity, client_org_similarity) DESC, c.updated_at DESC';
  END CASE;

  query_sql := format('
    SELECT 
      c.id,
      c.case_number,
      c.full_name,
      COALESCE(client.full_name, c.client_name) as client_name,
      COALESCE(client.organization, '''') as client_organization,
      COALESCE(client.email_domain, '''') as client_domain,
      c.status,
      COALESCE(c.updated_at, c.created_at) as last_activity,
      COALESCE(email_stats.email_count, 0) as email_count,
      COALESCE(c.special_notes, c.full_name) as case_description,
      COALESCE(ct.display_name, ct.name, '''') as case_type_name,
      COALESCE(c.priority, ''medium'') as priority,
      COALESCE(attorneys.attorney_names, '''') as assigned_attorneys,
      COALESCE(ts_rank_cd(c.search_vector, plainto_tsquery(''english'', %L)), 0) as relevance_score,
      similarity(c.case_number, %L) as case_number_similarity,
      similarity(c.full_name, %L) as title_similarity,
      similarity(COALESCE(client.full_name, c.client_name), %L) as client_similarity,
      similarity(COALESCE(client.organization, ''''), %L) as client_org_similarity,
      similarity(COALESCE(c.special_notes, ''''), %L) as description_similarity,
      null as suggestion_reason,
      c.created_at,
      c.updated_at
    FROM %I.cases c
    LEFT JOIN %I.case_types ct ON c.case_type = ct.id
    LEFT JOIN (
      SELECT 
        case_id,
        string_agg(DISTINCT full_name, '', '') as full_name,
        string_agg(DISTINCT organization, '', '') as organization,
        string_agg(DISTINCT split_part(email, ''@'', 2), '', '') as email_domain
      FROM %I.contacts 
      WHERE contact_type = ''client''
      GROUP BY case_id
    ) client ON c.id = client.case_id
    LEFT JOIN (
      SELECT 
        case_id,
        COUNT(*) as email_count
      FROM %I.email_assignments 
      GROUP BY case_id
    ) email_stats ON c.id = email_stats.case_id
    LEFT JOIN (
      SELECT 
        case_id,
        string_agg(full_name, '', '') as attorney_names
      FROM %I.case_attorneys ca
      JOIN %I.users u ON ca.attorney_id = u.id
      GROUP BY case_id
    ) attorneys ON c.id = attorneys.case_id
    WHERE (',
    search_query, search_query, search_query, search_query, search_query, search_query,
    tenant_schema, tenant_schema, tenant_schema, tenant_schema, tenant_schema, tenant_schema
  );

  -- Add search conditions
  IF search_query != '' THEN
    query_sql := query_sql || format('
      (c.search_vector @@ plainto_tsquery(''english'', %L)
       OR similarity(c.case_number, %L) > 0.3
       OR similarity(c.full_name, %L) > 0.2
       OR similarity(COALESCE(client.full_name, c.client_name), %L) > 0.2
       OR similarity(COALESCE(client.organization, ''''), %L) > 0.2
       OR similarity(COALESCE(c.special_notes, ''''), %L) > 0.15)
    ', search_query, search_query, search_query, search_query, search_query, search_query);
  ELSE
    query_sql := query_sql || '1=1';
  END IF;

  -- Apply filters
  IF case_type_filter IS NOT NULL THEN
    query_sql := query_sql || format(' AND c.case_type = %L', case_type_filter);
  END IF;
  
  IF status_filter IS NOT NULL THEN
    query_sql := query_sql || format(' AND c.status = %L', status_filter);
  END IF;

  IF client_domain_filter IS NOT NULL THEN
    query_sql := query_sql || format(' AND client.email_domain LIKE %L', '%' || client_domain_filter || '%');
  END IF;

  -- Apply special filters
  CASE filter_type
    WHEN 'active' THEN
      query_sql := query_sql || ' AND c.status = ''active''';
    WHEN 'my_cases' THEN
      IF user_id IS NOT NULL THEN
        query_sql := query_sql || format(' AND attorneys.case_id IS NOT NULL AND attorneys.attorney_names LIKE %L', '%' || user_id || '%');
      END IF;
    WHEN 'recent' THEN
      query_sql := query_sql || ' AND c.updated_at >= NOW() - INTERVAL ''30 days''';
  END CASE;

  -- Add date filter
  query_sql := query_sql || date_filter;

  -- Add ordering and pagination
  query_sql := query_sql || format(' %s LIMIT %L OFFSET %L', order_clause, limit_count, offset_count);

  RETURN QUERY EXECUTE query_sql;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get recent cases user has assigned emails to
CREATE OR REPLACE FUNCTION get_recent_user_cases(
  tenant_schema TEXT,
  user_id TEXT,
  limit_count INTEGER DEFAULT 5
) RETURNS TABLE(
  id UUID,
  case_number TEXT,
  full_name TEXT,
  client_name TEXT,
  client_organization TEXT,
  client_domain TEXT,
  status TEXT,
  last_activity TIMESTAMPTZ,
  email_count INTEGER,
  case_description TEXT,
  case_type_name TEXT,
  priority TEXT,
  assigned_attorneys TEXT,
  relevance_score REAL,
  case_number_similarity REAL,
  title_similarity REAL,
  client_similarity REAL,
  client_org_similarity REAL,
  description_similarity REAL,
  suggestion_reason TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
DECLARE
  query_sql TEXT;
BEGIN
  query_sql := format('
    SELECT DISTINCT
      c.id, c.case_number, c.full_name,
      COALESCE(client.full_name, c.client_name) as client_name,
      COALESCE(client.organization, '''') as client_organization,
      COALESCE(client.email_domain, '''') as client_domain,
      c.status,
      GREATEST(c.updated_at, ea.assigned_at) as last_activity,
      COALESCE(email_stats.email_count, 0) as email_count,
      COALESCE(c.special_notes, c.full_name) as case_description,
      COALESCE(ct.display_name, ct.name, '''') as case_type_name,
      COALESCE(c.priority, ''medium'') as priority,
      COALESCE(attorneys.attorney_names, '''') as assigned_attorneys,
      0.9::REAL as relevance_score,
      0::REAL as case_number_similarity,
      0::REAL as title_similarity,
      0::REAL as client_similarity,
      0::REAL as client_org_similarity,
      0::REAL as description_similarity,
      ''recent-assignment'' as suggestion_reason,
      c.created_at,
      c.updated_at
    FROM %I.cases c
    JOIN %I.email_assignments ea ON c.id = ea.case_id
    LEFT JOIN %I.case_types ct ON c.case_type = ct.id
    LEFT JOIN (
      SELECT 
        case_id,
        string_agg(DISTINCT full_name, '', '') as full_name,
        string_agg(DISTINCT organization, '', '') as organization,
        string_agg(DISTINCT split_part(email, ''@'', 2), '', '') as email_domain
      FROM %I.contacts 
      WHERE contact_type = ''client''
      GROUP BY case_id
    ) client ON c.id = client.case_id
    LEFT JOIN (
      SELECT 
        case_id,
        COUNT(*) as email_count
      FROM %I.email_assignments 
      GROUP BY case_id
    ) email_stats ON c.id = email_stats.case_id
    LEFT JOIN (
      SELECT 
        case_id,
        string_agg(full_name, '', '') as attorney_names
      FROM %I.case_attorneys ca
      JOIN %I.users u ON ca.attorney_id = u.id
      GROUP BY case_id
    ) attorneys ON c.id = attorneys.case_id
    WHERE ea.assigned_by = %L
    AND ea.assigned_date >= NOW() - INTERVAL ''30 days''
    ORDER BY ea.assigned_date DESC
    LIMIT %L',
    tenant_schema, tenant_schema, tenant_schema, tenant_schema, tenant_schema, tenant_schema, tenant_schema,
    user_id, limit_count
  );

  RETURN QUERY EXECUTE query_sql;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get cases with matching client domains
CREATE OR REPLACE FUNCTION get_domain_matching_cases(
  tenant_schema TEXT,
  client_domain TEXT,
  limit_count INTEGER DEFAULT 3
) RETURNS TABLE(
  id UUID,
  case_number TEXT,
  full_name TEXT,
  client_name TEXT,
  client_organization TEXT,
  client_domain TEXT,
  status TEXT,
  last_activity TIMESTAMPTZ,
  email_count INTEGER,
  case_description TEXT,
  case_type_name TEXT,
  priority TEXT,
  assigned_attorneys TEXT,
  relevance_score REAL,
  case_number_similarity REAL,
  title_similarity REAL,
  client_similarity REAL,
  client_org_similarity REAL,
  description_similarity REAL,
  suggestion_reason TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
DECLARE
  query_sql TEXT;
BEGIN
  query_sql := format('
    SELECT DISTINCT
      c.id, c.case_number, c.full_name,
      COALESCE(client.full_name, c.client_name) as client_name,
      COALESCE(client.organization, '''') as client_organization,
      client.email_domain as client_domain,
      c.status,
      COALESCE(c.updated_at, c.created_at) as last_activity,
      COALESCE(email_stats.email_count, 0) as email_count,
      COALESCE(c.special_notes, c.full_name) as case_description,
      COALESCE(ct.display_name, ct.name, '''') as case_type_name,
      COALESCE(c.priority, ''medium'') as priority,
      COALESCE(attorneys.attorney_names, '''') as assigned_attorneys,
      0.85::REAL as relevance_score,
      0::REAL as case_number_similarity,
      0::REAL as title_similarity,
      0::REAL as client_similarity,
      0::REAL as client_org_similarity,
      0::REAL as description_similarity,
      ''domain-match'' as suggestion_reason,
      c.created_at,
      c.updated_at
    FROM %I.cases c
    LEFT JOIN %I.case_types ct ON c.case_type = ct.id
    JOIN (
      SELECT 
        case_id,
        string_agg(DISTINCT full_name, '', '') as full_name,
        string_agg(DISTINCT organization, '', '') as organization,
        string_agg(DISTINCT split_part(email, ''@'', 2), '', '') as email_domain
      FROM %I.contacts 
      WHERE contact_type = ''client''
      GROUP BY case_id
    ) client ON c.id = client.case_id
    LEFT JOIN (
      SELECT 
        case_id,
        COUNT(*) as email_count
      FROM %I.email_assignments 
      GROUP BY case_id
    ) email_stats ON c.id = email_stats.case_id
    LEFT JOIN (
      SELECT 
        case_id,
        string_agg(full_name, '', '') as attorney_names
      FROM %I.case_attorneys ca
      JOIN %I.users u ON ca.attorney_id = u.id
      GROUP BY case_id
    ) attorneys ON c.id = attorneys.case_id
    WHERE client.email_domain LIKE %L
    AND c.status = ''active''
    ORDER BY c.updated_at DESC
    LIMIT %L',
    tenant_schema, tenant_schema, tenant_schema, tenant_schema, tenant_schema, tenant_schema,
    '%' || client_domain || '%', limit_count
  );

  RETURN QUERY EXECUTE query_sql;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get frequently assigned cases
CREATE OR REPLACE FUNCTION get_frequent_user_cases(
  tenant_schema TEXT,
  user_id TEXT,
  limit_count INTEGER DEFAULT 3
) RETURNS TABLE(
  id UUID,
  case_number TEXT,
  full_name TEXT,
  client_name TEXT,
  client_organization TEXT,
  client_domain TEXT,
  status TEXT,
  last_activity TIMESTAMPTZ,
  email_count INTEGER,
  case_description TEXT,
  case_type_name TEXT,
  priority TEXT,
  assigned_attorneys TEXT,
  relevance_score REAL,
  case_number_similarity REAL,
  title_similarity REAL,
  client_similarity REAL,
  client_org_similarity REAL,
  description_similarity REAL,
  suggestion_reason TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
DECLARE
  query_sql TEXT;
BEGIN
  query_sql := format('
    SELECT 
      c.id, c.case_number, c.full_name,
      COALESCE(client.full_name, c.client_name) as client_name,
      COALESCE(client.organization, '''') as client_organization,
      COALESCE(client.email_domain, '''') as client_domain,
      c.status,
      COALESCE(c.updated_at, c.created_at) as last_activity,
      freq.email_count,
      COALESCE(c.special_notes, c.full_name) as case_description,
      COALESCE(ct.display_name, ct.name, '''') as case_type_name,
      COALESCE(c.priority, ''medium'') as priority,
      COALESCE(attorneys.attorney_names, '''') as assigned_attorneys,
      0.8::REAL as relevance_score,
      0::REAL as case_number_similarity,
      0::REAL as title_similarity,
      0::REAL as client_similarity,
      0::REAL as client_org_similarity,
      0::REAL as description_similarity,
      ''frequent-case'' as suggestion_reason,
      c.created_at,
      c.updated_at
    FROM %I.cases c
    JOIN (
      SELECT 
        case_id,
        COUNT(*) as email_count
      FROM %I.email_assignments 
      WHERE assigned_by = %L
      GROUP BY case_id
      HAVING COUNT(*) > 2
      ORDER BY COUNT(*) DESC
    ) freq ON c.id = freq.case_id
    LEFT JOIN %I.case_types ct ON c.case_type = ct.id
    LEFT JOIN (
      SELECT 
        case_id,
        string_agg(DISTINCT full_name, '', '') as full_name,
        string_agg(DISTINCT organization, '', '') as organization,
        string_agg(DISTINCT split_part(email, ''@'', 2), '', '') as email_domain
      FROM %I.contacts 
      WHERE contact_type = ''client''
      GROUP BY case_id
    ) client ON c.id = client.case_id
    LEFT JOIN (
      SELECT 
        case_id,
        string_agg(full_name, '', '') as attorney_names
      FROM %I.case_attorneys ca
      JOIN %I.users u ON ca.attorney_id = u.id
      GROUP BY case_id
    ) attorneys ON c.id = attorneys.case_id
    LIMIT %L',
    tenant_schema, tenant_schema, user_id, tenant_schema, tenant_schema, tenant_schema, tenant_schema,
    limit_count
  );

  RETURN QUERY EXECUTE query_sql;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`;