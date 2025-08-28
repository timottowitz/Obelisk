import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';

/**
 * POST /api/cases/[caseId]/emails/search
 * Advanced email search within a case
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { caseId: string } }
) {
  try {
    const { userId, orgId } = auth();
    if (!userId || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { caseId } = params;
    const body = await request.json();
    const { 
      query = '', 
      filters = {}, 
      limit = 50, 
      offset = 0,
      sortBy = 'received_at',
      sortOrder = 'desc'
    } = body;

    const supabase = createClient();

    // Verify case access
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('id, org_id')
      .eq('id', caseId)
      .eq('org_id', orgId)
      .single();

    if (caseError || !caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    // Use the search function for complex queries
    const { data: searchResults, error: searchError } = await supabase.rpc('search_case_emails', {
      p_case_id: caseId,
      p_search_query: query || null,
      p_sender_filter: filters.senderFilter || null,
      p_date_from: filters.dateFrom ? new Date(filters.dateFrom).toISOString() : null,
      p_date_to: filters.dateTo ? new Date(filters.dateTo).toISOString() : null,
      p_has_attachments: filters.hasAttachments !== undefined ? filters.hasAttachments : null,
      p_importance_filter: filters.importance || null,
      p_tags_filter: filters.tags || null,
      p_limit: Math.min(limit, 100),
      p_offset: offset
    });

    if (searchError) {
      console.error('Error searching emails:', searchError);
      return NextResponse.json({ error: 'Failed to search emails' }, { status: 500 });
    }

    // Get total count for the search
    let countQuery = supabase
      .from('email_content')
      .select('id', { count: 'exact', head: true })
      .eq('case_id', caseId)
      .eq('archive_status', 'active');

    if (query) {
      countQuery = countQuery.textSearch('search_content', query);
    }
    if (filters.senderFilter) {
      countQuery = countQuery.ilike('sender_email', `%${filters.senderFilter}%`);
    }
    if (filters.dateFrom) {
      countQuery = countQuery.gte('received_at', filters.dateFrom);
    }
    if (filters.dateTo) {
      countQuery = countQuery.lte('received_at', filters.dateTo);
    }
    if (filters.hasAttachments !== undefined) {
      countQuery = countQuery.eq('has_attachments', filters.hasAttachments);
    }
    if (filters.importance) {
      countQuery = countQuery.eq('importance', filters.importance);
    }
    if (filters.tags && filters.tags.length > 0) {
      countQuery = countQuery.overlaps('custom_tags', filters.tags);
    }

    const { count: totalCount } = await countQuery;

    // Get search suggestions if query is provided
    let suggestions: string[] = [];
    if (query && query.length >= 3) {
      const { data: suggestionData, error: suggestionError } = await supabase
        .from('email_content')
        .select('subject, sender_name, custom_tags')
        .eq('case_id', caseId)
        .eq('archive_status', 'active')
        .textSearch('search_content', query)
        .limit(10);

      if (!suggestionError && suggestionData) {
        const suggestionSet = new Set<string>();
        suggestionData.forEach(item => {
          // Extract potential search terms
          if (item.subject) {
            const words = item.subject.toLowerCase().split(/\s+/).filter(w => 
              w.length >= 3 && w.includes(query.toLowerCase())
            );
            words.forEach(word => suggestionSet.add(word));
          }
          if (item.sender_name) {
            const words = item.sender_name.toLowerCase().split(/\s+/).filter(w => 
              w.length >= 3 && w.includes(query.toLowerCase())
            );
            words.forEach(word => suggestionSet.add(word));
          }
          if (item.custom_tags) {
            item.custom_tags.forEach((tag: string) => {
              if (tag.toLowerCase().includes(query.toLowerCase())) {
                suggestionSet.add(tag);
              }
            });
          }
        });
        suggestions = Array.from(suggestionSet).slice(0, 5);
      }
    }

    // Get faceted search results (for filters)
    const facets: any = {};

    // Get sender facets
    const { data: senderFacets, error: senderError } = await supabase
      .from('email_content')
      .select('sender_email, sender_name')
      .eq('case_id', caseId)
      .eq('archive_status', 'active')
      .then(({ data, error }) => {
        if (error) return { data: [], error };
        
        const senderMap = new Map();
        data?.forEach(item => {
          const key = item.sender_email;
          if (!senderMap.has(key)) {
            senderMap.set(key, {
              email: item.sender_email,
              name: item.sender_name,
              count: 0
            });
          }
          senderMap.get(key).count++;
        });

        return { 
          data: Array.from(senderMap.values())
            .sort((a, b) => b.count - a.count)
            .slice(0, 10),
          error: null
        };
      });

    if (!senderError) {
      facets.senders = senderFacets;
    }

    // Get importance facets
    const { data: importanceFacets, error: importanceError } = await supabase
      .from('email_content')
      .select('importance')
      .eq('case_id', caseId)
      .eq('archive_status', 'active')
      .then(({ data, error }) => {
        if (error) return { data: [], error };
        
        const importanceMap = new Map();
        data?.forEach(item => {
          const importance = item.importance || 'normal';
          importanceMap.set(importance, (importanceMap.get(importance) || 0) + 1);
        });

        return {
          data: Array.from(importanceMap.entries()).map(([importance, count]) => ({
            importance,
            count
          })),
          error: null
        };
      });

    if (!importanceError) {
      facets.importance = importanceFacets;
    }

    // Get tag facets
    const { data: tagFacets, error: tagError } = await supabase
      .from('email_content')
      .select('custom_tags')
      .eq('case_id', caseId)
      .eq('archive_status', 'active')
      .not('custom_tags', 'is', null)
      .then(({ data, error }) => {
        if (error) return { data: [], error };
        
        const tagMap = new Map();
        data?.forEach(item => {
          if (item.custom_tags && Array.isArray(item.custom_tags)) {
            item.custom_tags.forEach((tag: string) => {
              tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
            });
          }
        });

        return {
          data: Array.from(tagMap.entries())
            .map(([tag, count]) => ({ tag, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 20),
          error: null
        };
      });

    if (!tagError) {
      facets.tags = tagFacets;
    }

    // Log search for audit trail
    try {
      await supabase.rpc('log_email_access', {
        p_email_content_id: null,
        p_case_id: caseId,
        p_user_id: userId,
        p_access_type: 'search',
        p_access_details: { 
          query, 
          filters,
          resultsCount: searchResults?.length || 0
        },
        p_ip_address: request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      '127.0.0.1',
        p_user_agent: request.headers.get('user-agent')
      });
    } catch (error) {
      console.warn('Failed to log email search:', error);
    }

    return NextResponse.json({
      emails: searchResults || [],
      totalCount: totalCount || 0,
      hasMore: (offset + limit) < (totalCount || 0),
      facets,
      suggestions,
      query,
      filters,
      limit,
      offset
    });

  } catch (error) {
    console.error('Error in POST /api/cases/[caseId]/emails/search:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}