/**
 * API endpoint for email case suggestions
 * GET /api/emails/[emailId]/suggestions - Get case suggestions for an email
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase';
import { getCaseSuggestionsService } from '@/lib/services/case-suggestions';
import { EmailStorageService, getDefaultStorageConfig } from '@/lib/services/email-storage';

interface SuggestionsRequestParams {
  params: {
    emailId: string;
  };
}

export async function GET(
  request: NextRequest,
  { params }: SuggestionsRequestParams
) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { emailId } = params;
    const { searchParams } = new URL(request.url);
    const forceReanalysis = searchParams.get('force') === 'true';

    // Get email content from storage if available
    const emailContent = await getEmailContentFromStorage(emailId, userId);

    // Get case suggestions
    const suggestionsService = getCaseSuggestionsService();
    const suggestions = await suggestionsService.getCaseSuggestions({
      emailId,
      emailContent,
      userId,
      forceReanalysis,
    });

    return NextResponse.json({
      success: true,
      data: suggestions,
    });

  } catch (error) {
    console.error('Error getting email suggestions:', error);
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Failed to get suggestions';

    return NextResponse.json(
      { 
        success: false,
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/emails/[emailId]/suggestions - Force reanalysis and get new suggestions
 */
export async function POST(
  request: NextRequest,
  { params }: SuggestionsRequestParams
) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { emailId } = params;
    const body = await request.json();
    const { emailContent } = body;

    if (!emailContent) {
      return NextResponse.json(
        { error: 'Email content is required for reanalysis' },
        { status: 400 }
      );
    }

    // Validate email content structure
    if (!emailContent.subject || !emailContent.fromEmail) {
      return NextResponse.json(
        { error: 'Invalid email content structure' },
        { status: 400 }
      );
    }

    // Get case suggestions with forced reanalysis
    const suggestionsService = getCaseSuggestionsService();
    const suggestions = await suggestionsService.getCaseSuggestions({
      emailId,
      emailContent,
      userId,
      forceReanalysis: true,
    });

    return NextResponse.json({
      success: true,
      data: suggestions,
    });

  } catch (error) {
    console.error('Error reanalyzing email:', error);
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Failed to reanalyze email';

    return NextResponse.json(
      { 
        success: false,
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * Helper function to get email content from storage
 */
async function getEmailContentFromStorage(emailId: string, userId: string) {
  try {
    const supabase = createClient();

    // Get user's tenant
    const { data: userTenant } = await supabase
      .from('user_tenant_access')
      .select('tenant_id')
      .eq('user_id', userId)
      .single();

    if (!userTenant) {
      throw new Error('User tenant not found');
    }

    // Try to get email content from storage
    const storageService = new EmailStorageService(getDefaultStorageConfig());
    
    // First check if we have a case assignment to get the case ID
    const { data: assignment } = await supabase
      .from('email_assignments')
      .select('case_id')
      .eq('email_id', emailId)
      .single();

    if (assignment?.case_id) {
      // Get content from storage
      const emailData = await storageService.getEmailContent(emailId, assignment.case_id);
      
      if (emailData) {
        return {
          subject: emailData.metadata.subject || '',
          fromName: emailData.metadata.from?.name,
          fromEmail: emailData.metadata.from?.address || '',
          htmlBody: emailData.content.htmlBody,
          textBody: emailData.content.textBody,
          receivedAt: emailData.metadata.receivedDateTime || emailData.metadata.createdDateTime || '',
          hasAttachments: emailData.attachments.length > 0,
          attachmentTypes: emailData.attachments.map(a => a.contentType || 'application/octet-stream'),
        };
      }
    }

    // If not in storage, try to get from Microsoft Graph or other source
    // This would be implemented based on your email provider integration
    return await getEmailFromProvider(emailId, userId);

  } catch (error) {
    console.error('Failed to get email content from storage:', error);
    // Return null if we can't get content - suggestions can still work with cached analysis
    return null;
  }
}

/**
 * Helper function to get email from external provider (Microsoft Graph, etc.)
 */
async function getEmailFromProvider(emailId: string, userId: string) {
  try {
    // This would integrate with your existing email provider
    // For now, we'll just return null and let the suggestion service handle cached analysis
    console.log('Email provider integration not implemented for suggestions');
    return null;
  } catch (error) {
    console.error('Failed to get email from provider:', error);
    return null;
  }
}