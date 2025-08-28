import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';

/**
 * GET /api/cases/[caseId]/emails
 * Get emails for a case with search and filtering
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { caseId: string } }
) {
  try {
    const { userId, orgId } = auth();
    if (!userId || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { caseId } = params;
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const query = searchParams.get('q') || '';
    const sender = searchParams.get('sender') || '';
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');
    const hasAttachments = searchParams.get('has_attachments');
    const importance = searchParams.get('importance');
    const tags = searchParams.get('tags');
    const conversationId = searchParams.get('conversation_id');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

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

    // Build the search query
    let searchQuery = supabase.rpc('search_case_emails', {
      p_case_id: caseId,
      p_search_query: query || null,
      p_sender_filter: sender || null,
      p_date_from: dateFrom ? new Date(dateFrom).toISOString() : null,
      p_date_to: dateTo ? new Date(dateTo).toISOString() : null,
      p_has_attachments: hasAttachments ? hasAttachments === 'true' : null,
      p_importance_filter: importance || null,
      p_tags_filter: tags ? tags.split(',') : null,
      p_limit: limit,
      p_offset: offset
    });

    const { data: emails, error: emailsError } = await searchQuery;

    if (emailsError) {
      console.error('Error fetching emails:', emailsError);
      return NextResponse.json({ error: 'Failed to fetch emails' }, { status: 500 });
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('email_content')
      .select('id', { count: 'exact', head: true })
      .eq('case_id', caseId)
      .eq('archive_status', 'active');

    if (query) {
      countQuery = countQuery.textSearch('search_content', query);
    }
    if (sender) {
      countQuery = countQuery.ilike('sender_email', `%${sender}%`);
    }
    if (dateFrom) {
      countQuery = countQuery.gte('received_at', dateFrom);
    }
    if (dateTo) {
      countQuery = countQuery.lte('received_at', dateTo);
    }
    if (hasAttachments !== null) {
      countQuery = countQuery.eq('has_attachments', hasAttachments === 'true');
    }
    if (importance) {
      countQuery = countQuery.eq('importance', importance);
    }
    if (conversationId) {
      countQuery = countQuery.eq('conversation_id', conversationId);
    }

    const { count: totalCount } = await countQuery;

    // If conversation_id is specified, get thread emails
    if (conversationId) {
      const { data: threadEmails, error: threadError } = await supabase
        .from('email_archive_view')
        .select('*')
        .eq('case_id', caseId)
        .eq('conversation_id', conversationId)
        .eq('archive_status', 'active')
        .order('received_at', { ascending: true });

      if (threadError) {
        console.error('Error fetching thread emails:', threadError);
        return NextResponse.json({ error: 'Failed to fetch thread emails' }, { status: 500 });
      }

      return NextResponse.json({
        emails: threadEmails || [],
        totalCount: threadEmails?.length || 0,
        hasMore: false,
        isThread: true,
        conversationId
      });
    }

    // Log access for audit trail
    try {
      await supabase.rpc('log_email_access', {
        p_email_content_id: null,
        p_case_id: caseId,
        p_user_id: userId,
        p_access_type: 'list',
        p_access_details: { 
          query, 
          filters: { sender, dateFrom, dateTo, hasAttachments, importance, tags }
        },
        p_ip_address: request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      '127.0.0.1',
        p_user_agent: request.headers.get('user-agent')
      });
    } catch (error) {
      console.warn('Failed to log email access:', error);
    }

    return NextResponse.json({
      emails: emails || [],
      totalCount: totalCount || 0,
      hasMore: (offset + limit) < (totalCount || 0),
      limit,
      offset
    });

  } catch (error) {
    console.error('Error in GET /api/cases/[caseId]/emails:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/cases/[caseId]/emails
 * Bulk update emails (tags, archive status, etc.)
 */
export async function PUT(
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
    const { emailIds, updates } = body;

    if (!emailIds || !Array.isArray(emailIds) || emailIds.length === 0) {
      return NextResponse.json({ error: 'Email IDs are required' }, { status: 400 });
    }

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

    // Build update object
    const updateData: any = {
      updated_by: userId,
      updated_at: new Date().toISOString()
    };

    if (updates.customTags !== undefined) {
      updateData.custom_tags = updates.customTags;
    }
    if (updates.archiveStatus !== undefined) {
      updateData.archive_status = updates.archiveStatus;
      if (updates.archiveStatus === 'deleted') {
        updateData.deleted_at = new Date().toISOString();
        updateData.deleted_by = userId;
      }
    }
    if (updates.customMetadata !== undefined) {
      updateData.custom_metadata = updates.customMetadata;
    }

    // Update emails
    const { error: updateError } = await supabase
      .from('email_content')
      .update(updateData)
      .in('email_id', emailIds)
      .eq('case_id', caseId);

    if (updateError) {
      console.error('Error updating emails:', updateError);
      return NextResponse.json({ error: 'Failed to update emails' }, { status: 500 });
    }

    return NextResponse.json({ success: true, updatedCount: emailIds.length });

  } catch (error) {
    console.error('Error in PUT /api/cases/[caseId]/emails:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/cases/[caseId]/emails
 * Soft delete emails
 */
export async function DELETE(
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
    const { emailIds } = body;

    if (!emailIds || !Array.isArray(emailIds) || emailIds.length === 0) {
      return NextResponse.json({ error: 'Email IDs are required' }, { status: 400 });
    }

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

    // Soft delete emails
    const { error: deleteError } = await supabase
      .from('email_content')
      .update({
        archive_status: 'deleted',
        deleted_at: new Date().toISOString(),
        deleted_by: userId,
        updated_by: userId,
        updated_at: new Date().toISOString()
      })
      .in('email_id', emailIds)
      .eq('case_id', caseId);

    if (deleteError) {
      console.error('Error deleting emails:', deleteError);
      return NextResponse.json({ error: 'Failed to delete emails' }, { status: 500 });
    }

    // Also soft delete associated attachments
    const { error: attachmentError } = await supabase
      .from('email_content_attachments')
      .update({
        archive_status: 'deleted',
        deleted_at: new Date().toISOString(),
        deleted_by: userId,
        updated_by: userId,
        updated_at: new Date().toISOString()
      })
      .in('email_content_id', 
        await supabase
          .from('email_content')
          .select('id')
          .in('email_id', emailIds)
          .eq('case_id', caseId)
          .then(({ data }) => data?.map(e => e.id) || [])
      );

    if (attachmentError) {
      console.warn('Warning: Failed to delete associated attachments:', attachmentError);
    }

    return NextResponse.json({ success: true, deletedCount: emailIds.length });

  } catch (error) {
    console.error('Error in DELETE /api/cases/[caseId]/emails:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}