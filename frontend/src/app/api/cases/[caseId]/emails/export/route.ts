import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';
import { emailExportService } from '@/lib/services/email-export';
import { EmailArchiveItem } from '@/lib/services/email-archive';
import crypto from 'crypto';

/**
 * POST /api/cases/[caseId]/emails/export
 * Request email export
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
      emailIds,
      exportType = 'pdf',
      includeAttachments = true,
      includeHeaders = false,
      formatOptions = {},
      passwordProtected = false
    } = body;

    if (!emailIds || !Array.isArray(emailIds) || emailIds.length === 0) {
      return NextResponse.json({ error: 'Email IDs are required' }, { status: 400 });
    }

    if (!['pdf', 'eml', 'zip', 'csv'].includes(exportType)) {
      return NextResponse.json({ error: 'Invalid export type' }, { status: 400 });
    }

    const supabase = createClient();

    // Verify case access
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('id, org_id, case_number, full_name')
      .eq('id', caseId)
      .eq('org_id', orgId)
      .single();

    if (caseError || !caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    // Verify all emails exist and belong to this case
    const { data: emailsData, error: emailsError } = await supabase
      .from('email_archive_view')
      .select('*')
      .eq('case_id', caseId)
      .in('email_id', emailIds)
      .eq('archive_status', 'active');

    if (emailsError) {
      console.error('Error fetching emails for export:', emailsError);
      return NextResponse.json({ error: 'Failed to fetch emails' }, { status: 500 });
    }

    if (!emailsData || emailsData.length !== emailIds.length) {
      return NextResponse.json({ 
        error: 'Some emails were not found or are not accessible' 
      }, { status: 400 });
    }

    // Generate access token for secure export access
    const accessToken = crypto.randomBytes(32).toString('hex');

    // Create export record
    const { data: exportRecord, error: exportError } = await supabase
      .from('email_exports')
      .insert({
        case_id: caseId,
        email_ids: emailIds,
        export_type: exportType,
        include_attachments: includeAttachments,
        include_headers: includeHeaders,
        export_format_options: formatOptions,
        status: 'pending',
        total_emails: emailIds.length,
        processed_emails: 0,
        password_protected: passwordProtected,
        access_token: accessToken,
        requested_by: userId,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      })
      .select()
      .single();

    if (exportError) {
      console.error('Error creating export record:', exportError);
      return NextResponse.json({ error: 'Failed to create export' }, { status: 500 });
    }

    // For small exports, process immediately
    if (emailIds.length <= 10 && exportType !== 'zip') {
      try {
        await processExportImmediately(exportRecord.id, emailsData, exportType, {
          includeAttachments,
          includeHeaders,
          formatOptions
        });
      } catch (error) {
        console.error('Error processing immediate export:', error);
        // Don't fail the request, let it be processed asynchronously
      }
    } else {
      // Queue for background processing
      // This would integrate with your job queue system
      console.log(`Queuing export ${exportRecord.id} for background processing`);
    }

    return NextResponse.json({
      id: exportRecord.id,
      status: exportRecord.status,
      downloadUrl: exportRecord.download_url,
      fileSize: exportRecord.file_size,
      expiresAt: exportRecord.expires_at,
      totalEmails: exportRecord.total_emails,
      processedEmails: exportRecord.processed_emails,
      errorMessage: exportRecord.error_message,
      downloadCount: exportRecord.download_count,
      maxDownloads: exportRecord.max_downloads,
      accessToken: accessToken
    });

  } catch (error) {
    console.error('Error in POST /api/cases/[caseId]/emails/export:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Process export immediately for small requests
 */
async function processExportImmediately(
  exportId: string,
  emailsData: EmailArchiveItem[],
  exportType: string,
  options: {
    includeAttachments: boolean;
    includeHeaders: boolean;
    formatOptions: any;
  }
) {
  const supabase = createClient();

  try {
    // Update status to processing
    await supabase
      .from('email_exports')
      .update({
        status: 'processing',
        processing_started_at: new Date().toISOString()
      })
      .eq('id', exportId);

    let exportBlob: Blob;
    let filename: string;

    switch (exportType) {
      case 'pdf':
        exportBlob = await emailExportService.exportToPDF(emailsData, {
          includeHeaders: options.includeHeaders,
          includeAttachmentList: options.includeAttachments,
          includeMetadata: true,
          headerLayout: 'detailed',
          pageFormat: 'Letter',
          fontSize: 'normal',
          includeSignature: true,
          ...options.formatOptions
        });
        filename = `email_export_${exportId}.pdf`;
        break;

      case 'csv':
        exportBlob = await emailExportService.exportToCSV(emailsData);
        filename = `email_export_${exportId}.csv`;
        break;

      case 'eml':
        const emlFiles = await emailExportService.exportToEML(emailsData, {
          preserveOriginalFormat: true,
          includeAttachments: options.includeAttachments,
          sanitizeHeaders: !options.includeHeaders
        });
        
        if (emlFiles.length === 1) {
          exportBlob = emlFiles[0];
          filename = `email_${exportId}.eml`;
        } else {
          // Create ZIP for multiple EML files
          exportBlob = await emailExportService.exportToZIP(emailsData, options.includeAttachments);
          filename = `email_export_${exportId}.zip`;
        }
        break;

      case 'zip':
        exportBlob = await emailExportService.exportToZIP(emailsData, options.includeAttachments);
        filename = `email_export_${exportId}.zip`;
        break;

      default:
        throw new Error(`Unsupported export type: ${exportType}`);
    }

    // In a real implementation, you would upload the blob to GCS here
    // For now, we'll simulate this with a local storage approach
    const gcsPath = `exports/${exportId}/${filename}`;
    const downloadUrl = `/api/exports/${exportId}/download?token=${crypto.randomBytes(16).toString('hex')}`;

    // Update export record with completion
    await supabase
      .from('email_exports')
      .update({
        status: 'completed',
        gcs_export_path: gcsPath,
        download_url: downloadUrl,
        file_size: exportBlob.size,
        processed_emails: emailsData.length,
        processing_completed_at: new Date().toISOString()
      })
      .eq('id', exportId);

    console.log(`Export ${exportId} completed successfully`);

  } catch (error) {
    console.error(`Error processing export ${exportId}:`, error);
    
    // Update export record with error
    await supabase
      .from('email_exports')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        processing_completed_at: new Date().toISOString()
      })
      .eq('id', exportId);
  }
}

/**
 * GET /api/cases/[caseId]/emails/export
 * Get export history for a case
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
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
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

    // Get export history
    const { data: exports, error: exportsError, count } = await supabase
      .from('email_exports')
      .select('*', { count: 'exact' })
      .eq('case_id', caseId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (exportsError) {
      console.error('Error fetching export history:', exportsError);
      return NextResponse.json({ error: 'Failed to fetch export history' }, { status: 500 });
    }

    return NextResponse.json({
      exports: exports || [],
      totalCount: count || 0,
      hasMore: (offset + limit) < (count || 0),
      limit,
      offset
    });

  } catch (error) {
    console.error('Error in GET /api/cases/[caseId]/emails/export:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}