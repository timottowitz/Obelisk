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
 * GET /api/emails/{emailId}/content
 * Retrieve stored email content from Google Cloud Storage
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { emailId: string } }
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

    // Validate emailId parameter
    const emailId = params.emailId;
    if (!emailId || typeof emailId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid email ID' },
        { status: 400 }
      );
    }

    // Get tenant schema name
    const tenantSchema = `org_${orgId.replace(/[^a-zA-Z0-9]/g, '_')}`;

    // Find the email assignment to get the case ID
    const { data: assignmentData, error: assignmentError } = await supabase
      .from(`${tenantSchema}.email_assignments`)
      .select('case_id, status, storage_location, error_message')
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
          details: assignmentData.status === 'failed' 
            ? assignmentData.error_message 
            : `Assignment status: ${assignmentData.status}`,
          status: assignmentData.status
        },
        { status: 400 }
      );
    }

    // Get query parameters for content format preferences
    const url = new URL(request.url);
    const format = url.searchParams.get('format') || 'html'; // html, text, rtf, or all
    const includeAttachments = url.searchParams.get('attachments') !== 'false';
    const includeMetadata = url.searchParams.get('metadata') !== 'false';

    try {
      // Initialize storage service
      const storageConfig = getDefaultStorageConfig();
      const storageService = createEmailStorageService(storageConfig);

      // Retrieve email content from storage
      const emailContent = await storageService.getEmailContent(
        emailId,
        assignmentData.case_id
      );

      // Prepare response based on requested format
      const response: any = {
        emailId,
        caseId: assignmentData.case_id,
        storagePath: emailContent.storagePath
      };

      // Add metadata if requested
      if (includeMetadata) {
        response.metadata = emailContent.metadata;
      }

      // Add content based on format preference
      if (format === 'all') {
        response.content = emailContent.content;
      } else {
        response.content = {};
        
        switch (format) {
          case 'html':
            if (emailContent.content.htmlBody) {
              response.content.htmlBody = emailContent.content.htmlBody;
            }
            break;
          case 'text':
            if (emailContent.content.textBody) {
              response.content.textBody = emailContent.content.textBody;
            }
            break;
          case 'rtf':
            if (emailContent.content.rtfBody) {
              response.content.rtfBody = emailContent.content.rtfBody;
            }
            break;
        }
        
        // Always include headers if available
        if (emailContent.content.headers) {
          response.content.headers = emailContent.content.headers;
        }
      }

      // Add attachments if requested
      if (includeAttachments && emailContent.attachments.length > 0) {
        response.attachments = emailContent.attachments.map(attachment => ({
          id: attachment.id,
          name: attachment.name,
          contentType: attachment.contentType,
          size: attachment.size,
          isInline: attachment.isInline,
          contentId: attachment.contentId,
          contentLocation: attachment.contentLocation,
          // Don't include raw content in the response for performance
          // Clients should use a separate endpoint to download attachments
          hasContent: !!attachment.content
        }));
      }

      // Add statistics
      response.stats = {
        hasHtmlContent: !!emailContent.content.htmlBody,
        hasTextContent: !!emailContent.content.textBody,
        hasRtfContent: !!emailContent.content.rtfBody,
        hasHeaders: !!emailContent.content.headers,
        attachmentCount: emailContent.attachments.length,
        totalAttachmentSize: emailContent.attachments.reduce((sum, att) => sum + att.size, 0)
      };

      return NextResponse.json({
        success: true,
        data: response
      });

    } catch (error) {
      console.error('Error retrieving email content:', error);
      
      if (error instanceof EmailStorageError) {
        if (error.code === 'NOT_FOUND') {
          return NextResponse.json(
            { error: 'Email content not found in storage' },
            { status: 404 }
          );
        }
        
        return NextResponse.json(
          { 
            error: 'Failed to retrieve email content',
            details: error.message,
            code: error.code
          },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { error: 'Internal server error while retrieving email content' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Email content endpoint error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/emails/{emailId}/content
 * Retry storing email content (for failed assignments)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { emailId: string } }
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

    // Validate emailId parameter
    const emailId = params.emailId;
    if (!emailId || typeof emailId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid email ID' },
        { status: 400 }
      );
    }

    // Get tenant schema name
    const tenantSchema = `org_${orgId.replace(/[^a-zA-Z0-9]/g, '_')}`;

    // Find the email assignment
    const { data: assignmentData, error: assignmentError } = await supabase
      .from(`${tenantSchema}.email_assignments`)
      .select('id, case_id, status, storage_location')
      .eq('email_id', emailId)
      .single();

    if (assignmentError || !assignmentData) {
      return NextResponse.json(
        { error: 'Email assignment not found' },
        { status: 404 }
      );
    }

    // Only allow retry for failed or pending assignments
    if (assignmentData.status === 'completed') {
      return NextResponse.json(
        { error: 'Email content already stored successfully' },
        { status: 400 }
      );
    }

    // TODO: Implement retry logic by calling the same storage process
    // This would involve the same steps as in the assign route
    // For now, return a placeholder response
    
    return NextResponse.json({
      success: false,
      message: 'Email content storage retry is not yet implemented',
      assignmentId: assignmentData.id,
      currentStatus: assignmentData.status
    });

  } catch (error) {
    console.error('Email content retry endpoint error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}