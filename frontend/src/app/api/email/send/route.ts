import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { MicrosoftGraphEmailProvider } from '@/server/providers/microsoftGraph';
import { SendEmailRequest, EmailRecipient } from '@/types/email';

// Helper function to validate email address
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Helper function to validate recipient list
function validateRecipients(recipients: EmailRecipient[], field: string): string | null {
  if (!Array.isArray(recipients)) {
    return `${field} must be an array`;
  }
  
  for (let i = 0; i < recipients.length; i++) {
    const recipient = recipients[i];
    if (!recipient || typeof recipient !== 'object') {
      return `${field}[${i}] must be an object`;
    }
    if (!recipient.address || typeof recipient.address !== 'string') {
      return `${field}[${i}].address is required and must be a string`;
    }
    if (!isValidEmail(recipient.address)) {
      return `${field}[${i}].address must be a valid email address`;
    }
    if (recipient.name && typeof recipient.name !== 'string') {
      return `${field}[${i}].name must be a string`;
    }
  }
  
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      to,
      cc,
      bcc,
      subject,
      body: messageBody,
      body_type = 'html',
      importance = 'normal',
      save_to_sent_items = true,
      reply_to_message_id,
      forward_message_id,
      case_id,
      contact_ids
    } = body;

    // Validate required fields
    if (!to || !Array.isArray(to) || to.length === 0) {
      return NextResponse.json(
        { error: 'to field is required and must be a non-empty array of recipients' },
        { status: 400 }
      );
    }

    if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
      return NextResponse.json(
        { error: 'subject is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    if (!messageBody || typeof messageBody !== 'string') {
      return NextResponse.json(
        { error: 'body is required and must be a string' },
        { status: 400 }
      );
    }

    // Validate recipient arrays
    const toError = validateRecipients(to, 'to');
    if (toError) {
      return NextResponse.json({ error: toError }, { status: 400 });
    }

    if (cc) {
      const ccError = validateRecipients(cc, 'cc');
      if (ccError) {
        return NextResponse.json({ error: ccError }, { status: 400 });
      }
    }

    if (bcc) {
      const bccError = validateRecipients(bcc, 'bcc');
      if (bccError) {
        return NextResponse.json({ error: bccError }, { status: 400 });
      }
    }

    // Validate other fields
    if (!['text', 'html'].includes(body_type)) {
      return NextResponse.json(
        { error: 'body_type must be either "text" or "html"' },
        { status: 400 }
      );
    }

    if (!['low', 'normal', 'high'].includes(importance)) {
      return NextResponse.json(
        { error: 'importance must be "low", "normal", or "high"' },
        { status: 400 }
      );
    }

    if (typeof save_to_sent_items !== 'boolean') {
      return NextResponse.json(
        { error: 'save_to_sent_items must be a boolean' },
        { status: 400 }
      );
    }

    // Check for conflicts
    if (reply_to_message_id && forward_message_id) {
      return NextResponse.json(
        { error: 'Cannot both reply to and forward a message in the same request' },
        { status: 400 }
      );
    }

    // Validate length limits
    if (subject.length > 255) {
      return NextResponse.json(
        { error: 'Subject must be 255 characters or less' },
        { status: 400 }
      );
    }

    if (messageBody.length > 1048576) { // 1MB limit
      return NextResponse.json(
        { error: 'Message body must be 1MB or less' },
        { status: 400 }
      );
    }

    const totalRecipients = to.length + (cc?.length || 0) + (bcc?.length || 0);
    if (totalRecipients > 500) { // Graph API limit
      return NextResponse.json(
        { error: 'Total recipients cannot exceed 500' },
        { status: 400 }
      );
    }

    const sendRequest: SendEmailRequest = {
      to: to.map((r: any) => ({ address: r.address.trim(), name: r.name?.trim() })),
      cc: cc?.map((r: any) => ({ address: r.address.trim(), name: r.name?.trim() })),
      bcc: bcc?.map((r: any) => ({ address: r.address.trim(), name: r.name?.trim() })),
      subject: subject.trim(),
      body: messageBody,
      body_type,
      importance,
      save_to_sent_items,
      reply_to_message_id,
      forward_message_id,
      case_id,
      contact_ids
    };

    try {
      const provider = await MicrosoftGraphEmailProvider.create();
      const result = await provider.send(sendRequest);
      
      return NextResponse.json({
        ...result,
        message: 'Email sent successfully'
      });
      
    } catch (providerError) {
      console.error('Failed to send email:', providerError);
      
      if (providerError instanceof Error) {
        if (providerError.message.includes('access token')) {
          return NextResponse.json(
            { error: 'Microsoft account not connected. Please reconnect your account.' },
            { status: 401 }
          );
        }
        
        if (providerError.message.includes('not found') && (reply_to_message_id || forward_message_id)) {
          return NextResponse.json(
            { error: 'Referenced message not found. It may have been deleted.' },
            { status: 404 }
          );
        }
        
        if (providerError.message.includes('permission')) {
          return NextResponse.json(
            { error: 'Insufficient permissions to send email. Please reconnect your account.' },
            { status: 403 }
          );
        }
      }
      
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 400 }
      );
    }
    
  } catch (error) {
    console.error('Error in email send API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET method to retrieve draft or template information (optional)
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const reply_to = searchParams.get('reply_to');
    const forward = searchParams.get('forward');

    if (!reply_to && !forward) {
      // Return empty draft template
      return NextResponse.json({
        to: [],
        cc: [],
        bcc: [],
        subject: '',
        body: '',
        body_type: 'html',
        importance: 'normal'
      });
    }

    try {
      const provider = await MicrosoftGraphEmailProvider.create();
      
      if (reply_to) {
        // Get original message for reply
        const originalMessage = await provider.getMessage(reply_to);
        
        return NextResponse.json({
          to: originalMessage.from_address ? [{ 
            address: originalMessage.from_address, 
            name: originalMessage.from_name 
          }] : [],
          cc: [],
          bcc: [],
          subject: originalMessage.subject?.startsWith('Re: ') ? 
            originalMessage.subject : 
            `Re: ${originalMessage.subject || '(no subject)'}`,
          body: `\n\n--- Original Message ---\nFrom: ${originalMessage.from_name || originalMessage.from_address}\nSubject: ${originalMessage.subject}\n\n${originalMessage.body_content || originalMessage.body_preview || ''}`,
          body_type: 'html',
          importance: 'normal',
          reply_to_message_id: reply_to
        });
      }
      
      if (forward) {
        // Get original message for forward
        const originalMessage = await provider.getMessage(forward);
        
        return NextResponse.json({
          to: [],
          cc: [],
          bcc: [],
          subject: originalMessage.subject?.startsWith('Fwd: ') ? 
            originalMessage.subject : 
            `Fwd: ${originalMessage.subject || '(no subject)'}`,
          body: `\n\n--- Forwarded Message ---\nFrom: ${originalMessage.from_name || originalMessage.from_address}\nTo: ${originalMessage.to_recipients?.map(r => r.name || r.address).join(', ') || ''}\nSubject: ${originalMessage.subject}\nDate: ${originalMessage.received_at || originalMessage.sent_at}\n\n${originalMessage.body_content || originalMessage.body_preview || ''}`,
          body_type: 'html',
          importance: 'normal',
          forward_message_id: forward
        });
      }
      
    } catch (providerError) {
      console.error('Failed to get message for reply/forward:', providerError);
      
      if (providerError instanceof Error && providerError.message.includes('not found')) {
        return NextResponse.json(
          { error: 'Referenced message not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to prepare email draft' },
        { status: 400 }
      );
    }
    
  } catch (error) {
    console.error('Error in email draft API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}