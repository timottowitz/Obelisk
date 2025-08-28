import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';
import { emailArchiveService } from '@/lib/services/email-archive';

/**
 * GET /api/cases/[caseId]/emails/[emailId]/attachments/[attachmentId]
 * Download email attachment
 */
export async function GET(
  request: NextRequest,
  { 
    params 
  }: { 
    params: { 
      caseId: string; 
      emailId: string; 
      attachmentId: string; 
    } 
  }
) {
  try {
    const { userId, orgId } = auth();
    if (!userId || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { caseId, emailId, attachmentId } = params;

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

    // Verify email exists and belongs to case
    const { data: emailData, error: emailError } = await supabase
      .from('email_content')
      .select('id, email_id, case_id')
      .eq('case_id', caseId)
      .eq('email_id', emailId)
      .eq('archive_status', 'active')
      .single();

    if (emailError || !emailData) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    }

    // Get attachment info
    const { data: attachmentData, error: attachmentError } = await supabase
      .from('email_content_attachments')
      .select('*')
      .eq('email_content_id', emailData.id)
      .eq('attachment_id', attachmentId)
      .eq('archive_status', 'active')
      .single();

    if (attachmentError || !attachmentData) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    try {
      // Download attachment from storage service
      const { blob, filename, contentType } = await emailArchiveService.downloadAttachment(
        caseId, 
        emailId, 
        attachmentId
      );

      // Update download statistics
      await supabase
        .from('email_content_attachments')
        .update({
          download_count: (attachmentData.download_count || 0) + 1,
          last_downloaded_at: new Date().toISOString(),
          downloaded_by: attachmentData.downloaded_by 
            ? [...(attachmentData.downloaded_by || []), userId].filter((id, index, array) => array.indexOf(id) === index)
            : [userId],
          updated_at: new Date().toISOString()
        })
        .eq('id', attachmentData.id);

      // Log access for audit trail
      try {
        await supabase.rpc('log_email_access', {
          p_email_content_id: emailData.id,
          p_case_id: caseId,
          p_user_id: userId,
          p_access_type: 'download_attachment',
          p_access_details: { 
            attachmentId,
            filename: attachmentData.filename,
            size: attachmentData.size_bytes
          },
          p_ip_address: request.headers.get('x-forwarded-for') || 
                        request.headers.get('x-real-ip') || 
                        '127.0.0.1',
          p_user_agent: request.headers.get('user-agent')
        });
      } catch (error) {
        console.warn('Failed to log attachment download:', error);
      }

      // Set appropriate headers for file download
      const headers = new Headers();
      headers.set('Content-Type', contentType);
      headers.set('Content-Disposition', `attachment; filename="${filename}"`);
      headers.set('Content-Length', blob.size.toString());
      headers.set('Cache-Control', 'private, max-age=3600');

      return new NextResponse(blob, {
        status: 200,
        headers
      });

    } catch (storageError) {
      console.error('Error downloading attachment from storage:', storageError);
      
      // If storage download fails, try to get attachment content from GCS directly
      try {
        const storageResult = await emailArchiveService.getEmailContentFromStorage(emailId, caseId);
        if (storageResult?.attachments) {
          const attachment = storageResult.attachments.find(att => att.id === attachmentId);
          if (attachment) {
            const blob = new Blob([attachment.content], { 
              type: attachment.contentType || 'application/octet-stream' 
            });

            // Update download statistics
            await supabase
              .from('email_content_attachments')
              .update({
                download_count: (attachmentData.download_count || 0) + 1,
                last_downloaded_at: new Date().toISOString(),
                downloaded_by: attachmentData.downloaded_by 
                  ? [...(attachmentData.downloaded_by || []), userId].filter((id, index, array) => array.indexOf(id) === index)
                  : [userId],
                updated_at: new Date().toISOString()
              })
              .eq('id', attachmentData.id);

            const headers = new Headers();
            headers.set('Content-Type', attachment.contentType || 'application/octet-stream');
            headers.set('Content-Disposition', `attachment; filename="${attachment.name}"`);
            headers.set('Content-Length', blob.size.toString());
            headers.set('Cache-Control', 'private, max-age=3600');

            return new NextResponse(blob, {
              status: 200,
              headers
            });
          }
        }
      } catch (fallbackError) {
        console.error('Fallback attachment retrieval also failed:', fallbackError);
      }

      return NextResponse.json({ 
        error: 'Failed to download attachment' 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error in GET attachment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cases/[caseId]/emails/[emailId]/attachments/[attachmentId]?preview=true
 * Get attachment preview or metadata
 */
export async function HEAD(
  request: NextRequest,
  { 
    params 
  }: { 
    params: { 
      caseId: string; 
      emailId: string; 
      attachmentId: string; 
    } 
  }
) {
  try {
    const { userId, orgId } = auth();
    if (!userId || !orgId) {
      return new NextResponse(null, { status: 401 });
    }

    const { caseId, emailId, attachmentId } = params;
    const { searchParams } = new URL(request.url);
    const isPreview = searchParams.get('preview') === 'true';

    const supabase = createClient();

    // Verify case access
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('id, org_id')
      .eq('id', caseId)
      .eq('org_id', orgId)
      .single();

    if (caseError || !caseData) {
      return new NextResponse(null, { status: 404 });
    }

    // Verify email exists and belongs to case
    const { data: emailData, error: emailError } = await supabase
      .from('email_content')
      .select('id, email_id, case_id')
      .eq('case_id', caseId)
      .eq('email_id', emailId)
      .eq('archive_status', 'active')
      .single();

    if (emailError || !emailData) {
      return new NextResponse(null, { status: 404 });
    }

    // Get attachment info
    const { data: attachmentData, error: attachmentError } = await supabase
      .from('email_content_attachments')
      .select('*')
      .eq('email_content_id', emailData.id)
      .eq('attachment_id', attachmentId)
      .eq('archive_status', 'active')
      .single();

    if (attachmentError || !attachmentData) {
      return new NextResponse(null, { status: 404 });
    }

    // Set headers with attachment metadata
    const headers = new Headers();
    headers.set('Content-Type', attachmentData.content_type || 'application/octet-stream');
    headers.set('Content-Length', attachmentData.size_bytes.toString());
    headers.set('X-Filename', attachmentData.filename);
    headers.set('X-Is-Inline', attachmentData.is_inline.toString());
    headers.set('X-Has-Preview', attachmentData.has_preview.toString());
    headers.set('X-Is-Searchable', attachmentData.is_searchable.toString());
    headers.set('X-Download-Count', (attachmentData.download_count || 0).toString());
    
    if (attachmentData.last_downloaded_at) {
      headers.set('X-Last-Downloaded', attachmentData.last_downloaded_at);
    }

    // If preview is requested and available, include preview path
    if (isPreview && attachmentData.has_preview && attachmentData.preview_path) {
      headers.set('X-Preview-Path', attachmentData.preview_path);
    }

    return new NextResponse(null, {
      status: 200,
      headers
    });

  } catch (error) {
    console.error('Error in HEAD attachment:', error);
    return new NextResponse(null, { status: 500 });
  }
}