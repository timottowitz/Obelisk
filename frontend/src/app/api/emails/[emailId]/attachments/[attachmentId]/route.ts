import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createEmailStorageService, getDefaultStorageConfig } from '@/lib/services/email-storage';
import { EmailStorageError } from '@/lib/services/types/email-storage';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * GET /api/emails/{emailId}/attachments/{attachmentId}
 * Download a specific email attachment from Google Cloud Storage
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { emailId: string; attachmentId: string } }
) {
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

    // Validate parameters
    const { emailId, attachmentId } = params;
    if (!emailId || !attachmentId) {
      return NextResponse.json(
        { error: 'Invalid email ID or attachment ID' },
        { status: 400 }
      );
    }

    // Get tenant schema name
    const tenantSchema = `org_${orgId.replace(/[^a-zA-Z0-9]/g, '_')}`;

    // Find the email assignment to get the case ID and verify access
    const { data: assignmentData, error: assignmentError } = await supabase
      .from(`${tenantSchema}.email_assignments`)
      .select('case_id, status')
      .eq('email_id', emailId)
      .single();

    if (assignmentError || !assignmentData) {
      console.error('Email assignment lookup error:', assignmentError);
      return NextResponse.json(
        { error: 'Email assignment not found' },
        { status: 404 }
      );
    }

    // Check if email content was successfully stored
    if (assignmentData.status !== 'completed') {
      return NextResponse.json(
        { 
          error: 'Email content not available',
          status: assignmentData.status
        },
        { status: 400 }
      );
    }

    // Get query parameters
    const url = new URL(request.url);
    const download = url.searchParams.get('download') === 'true';
    const inline = url.searchParams.get('inline') === 'true';

    try {
      // Initialize storage service
      const storageConfig = getDefaultStorageConfig();
      const storageService = createEmailStorageService(storageConfig);

      // Get email content to find the specific attachment
      const emailContent = await storageService.getEmailContent(
        emailId,
        assignmentData.case_id
      );

      // Find the requested attachment
      const attachment = emailContent.attachments.find(att => att.id === attachmentId);
      
      if (!attachment) {
        return NextResponse.json(
          { error: 'Attachment not found' },
          { status: 404 }
        );
      }

      // Prepare response headers
      const headers = new Headers();
      
      // Set content type
      if (attachment.contentType) {
        headers.set('Content-Type', attachment.contentType);
      } else {
        headers.set('Content-Type', 'application/octet-stream');
      }
      
      // Set content length
      headers.set('Content-Length', attachment.size.toString());
      
      // Set content disposition
      const filename = encodeURIComponent(attachment.name);
      if (download) {
        headers.set('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${filename}`);
      } else if (inline) {
        headers.set('Content-Disposition', `inline; filename="${filename}"`);
      } else {
        // Default to attachment for security
        headers.set('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${filename}`);
      }
      
      // Add security headers
      headers.set('X-Content-Type-Options', 'nosniff');
      headers.set('X-Frame-Options', 'DENY');
      headers.set('X-XSS-Protection', '1; mode=block');
      
      // For inline content, add CSP header
      if (inline && attachment.contentType?.startsWith('image/')) {
        headers.set('Content-Security-Policy', "default-src 'none'; img-src 'self';");
      }

      // Return the attachment content
      return new NextResponse(attachment.content, {
        status: 200,
        headers
      });

    } catch (error) {
      console.error('Error retrieving attachment:', error);
      
      if (error instanceof EmailStorageError) {
        if (error.code === 'NOT_FOUND') {
          return NextResponse.json(
            { error: 'Attachment not found in storage' },
            { status: 404 }
          );
        }
        
        return NextResponse.json(
          { 
            error: 'Failed to retrieve attachment',
            details: error.message,
            code: error.code
          },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { error: 'Internal server error while retrieving attachment' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Attachment download endpoint error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * HEAD /api/emails/{emailId}/attachments/{attachmentId}
 * Get attachment metadata without downloading content
 */
export async function HEAD(
  request: NextRequest,
  { params }: { params: { emailId: string; attachmentId: string } }
) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse(null, { status: 401 });
    }

    // Get organization from headers
    const orgId = request.headers.get('X-Org-Id');
    if (!orgId) {
      return new NextResponse(null, { status: 400 });
    }

    // Validate parameters
    const { emailId, attachmentId } = params;
    if (!emailId || !attachmentId) {
      return new NextResponse(null, { status: 400 });
    }

    // Get tenant schema name
    const tenantSchema = `org_${orgId.replace(/[^a-zA-Z0-9]/g, '_')}`;

    // Find the email assignment
    const { data: assignmentData, error: assignmentError } = await supabase
      .from(`${tenantSchema}.email_assignments`)
      .select('case_id, status')
      .eq('email_id', emailId)
      .single();

    if (assignmentError || !assignmentData || assignmentData.status !== 'completed') {
      return new NextResponse(null, { status: 404 });
    }

    try {
      // Initialize storage service
      const storageConfig = getDefaultStorageConfig();
      const storageService = createEmailStorageService(storageConfig);

      // Get email content
      const emailContent = await storageService.getEmailContent(
        emailId,
        assignmentData.case_id
      );

      // Find the requested attachment
      const attachment = emailContent.attachments.find(att => att.id === attachmentId);
      
      if (!attachment) {
        return new NextResponse(null, { status: 404 });
      }

      // Prepare response headers with metadata
      const headers = new Headers();
      
      if (attachment.contentType) {
        headers.set('Content-Type', attachment.contentType);
      }
      
      headers.set('Content-Length', attachment.size.toString());
      
      const filename = encodeURIComponent(attachment.name);
      headers.set('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${filename}`);
      
      // Custom headers with attachment metadata
      headers.set('X-Attachment-ID', attachment.id);
      headers.set('X-Attachment-Name', attachment.name);
      headers.set('X-Attachment-Size', attachment.size.toString());
      headers.set('X-Attachment-Is-Inline', attachment.isInline.toString());
      
      if (attachment.contentId) {
        headers.set('X-Attachment-Content-ID', attachment.contentId);
      }

      return new NextResponse(null, {
        status: 200,
        headers
      });

    } catch (error) {
      console.error('Error retrieving attachment metadata:', error);
      return new NextResponse(null, { status: 500 });
    }

  } catch (error) {
    console.error('Attachment HEAD endpoint error:', error);
    return new NextResponse(null, { status: 500 });
  }
}