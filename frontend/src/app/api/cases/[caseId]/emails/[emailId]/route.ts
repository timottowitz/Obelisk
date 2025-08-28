import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';
import { emailArchiveService } from '@/lib/services/email-archive';

/**
 * GET /api/cases/[caseId]/emails/[emailId]
 * Get a specific email's content and metadata
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { caseId: string; emailId: string } }
) {
  try {
    const { userId, orgId } = auth();
    if (!userId || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { caseId, emailId } = params;

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

    // Get email from database
    const { data: emailData, error: emailError } = await supabase
      .from('email_archive_view')
      .select('*')
      .eq('case_id', caseId)
      .eq('email_id', emailId)
      .eq('archive_status', 'active')
      .single();

    if (emailError || !emailData) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    }

    // Get email content from GCS if available
    let emailContent: any = {};
    
    try {
      const storageResult = await emailArchiveService.getEmailContentFromStorage(emailId, caseId);
      if (storageResult) {
        emailContent = storageResult.content;
      }
    } catch (error) {
      console.warn('Failed to retrieve email content from storage:', error);
    }

    // Get attachments
    const { data: attachments, error: attachmentError } = await supabase
      .from('email_content_attachments')
      .select('*')
      .eq('email_content_id', emailData.id)
      .eq('archive_status', 'active')
      .order('filename', { ascending: true });

    if (attachmentError) {
      console.warn('Failed to fetch attachments:', attachmentError);
    }

    // Log access for audit trail
    try {
      await supabase.rpc('log_email_access', {
        p_email_content_id: emailData.id,
        p_case_id: caseId,
        p_user_id: userId,
        p_access_type: 'view',
        p_access_details: { emailId },
        p_ip_address: request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      '127.0.0.1',
        p_user_agent: request.headers.get('user-agent')
      });
    } catch (error) {
      console.warn('Failed to log email access:', error);
    }

    // Update last accessed timestamp
    try {
      await supabase
        .from('email_content')
        .update({ last_accessed_at: new Date().toISOString() })
        .eq('id', emailData.id);
    } catch (error) {
      console.warn('Failed to update last accessed timestamp:', error);
    }

    const result = {
      ...emailData,
      content: emailContent,
      attachments: attachments || []
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error in GET /api/cases/[caseId]/emails/[emailId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/cases/[caseId]/emails/[emailId]
 * Update email metadata (tags, read status, etc.)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { caseId: string; emailId: string } }
) {
  try {
    const { userId, orgId } = auth();
    if (!userId || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { caseId, emailId } = params;
    const body = await request.json();

    const supabase = createClient();

    // Verify case access and email existence
    const { data: emailData, error: emailError } = await supabase
      .from('email_content')
      .select('id, case_id')
      .eq('case_id', caseId)
      .eq('email_id', emailId)
      .single();

    if (emailError || !emailData) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    }

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

    if (body.isRead !== undefined) {
      updateData.is_read = body.isRead;
    }
    if (body.customTags !== undefined) {
      updateData.custom_tags = body.customTags;
    }
    if (body.customMetadata !== undefined) {
      updateData.custom_metadata = body.customMetadata;
    }
    if (body.importance !== undefined) {
      updateData.importance = body.importance;
    }

    // Update email
    const { error: updateError } = await supabase
      .from('email_content')
      .update(updateData)
      .eq('id', emailData.id);

    if (updateError) {
      console.error('Error updating email:', updateError);
      return NextResponse.json({ error: 'Failed to update email' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error in PUT /api/cases/[caseId]/emails/[emailId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/cases/[caseId]/emails/[emailId]
 * Soft delete a specific email
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { caseId: string; emailId: string } }
) {
  try {
    const { userId, orgId } = auth();
    if (!userId || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { caseId, emailId } = params;

    const supabase = createClient();

    // Verify case access and email existence
    const { data: emailData, error: emailError } = await supabase
      .from('email_content')
      .select('id, case_id')
      .eq('case_id', caseId)
      .eq('email_id', emailId)
      .single();

    if (emailError || !emailData) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    }

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

    // Soft delete email
    const { error: deleteError } = await supabase
      .from('email_content')
      .update({
        archive_status: 'deleted',
        deleted_at: new Date().toISOString(),
        deleted_by: userId,
        updated_by: userId,
        updated_at: new Date().toISOString()
      })
      .eq('id', emailData.id);

    if (deleteError) {
      console.error('Error deleting email:', deleteError);
      return NextResponse.json({ error: 'Failed to delete email' }, { status: 500 });
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
      .eq('email_content_id', emailData.id);

    if (attachmentError) {
      console.warn('Warning: Failed to delete associated attachments:', attachmentError);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error in DELETE /api/cases/[caseId]/emails/[emailId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}