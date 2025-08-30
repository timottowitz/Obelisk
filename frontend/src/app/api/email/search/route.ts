import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { MicrosoftGraphEmailProvider } from '@/server/providers/microsoftGraph';
import { EmailSearchRequest } from '@/types/email';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query');
    
    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    const folder_id = searchParams.get('folder_id') || undefined;
    const from = searchParams.get('from') || undefined;
    const to = searchParams.get('to') || undefined;
    const subject = searchParams.get('subject') || undefined;
    const date_from = searchParams.get('date_from') || undefined;
    const date_to = searchParams.get('date_to') || undefined;
    const has_attachments = searchParams.get('has_attachments') === 'true' ? true : 
                           searchParams.get('has_attachments') === 'false' ? false : undefined;
    const is_unread = searchParams.get('is_unread') === 'true' ? true :
                     searchParams.get('is_unread') === 'false' ? false : undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100); // Cap at 100

    // Validate parameters
    if (page < 1) {
      return NextResponse.json({ error: 'Page must be >= 1' }, { status: 400 });
    }
    if (limit < 1) {
      return NextResponse.json({ error: 'Limit must be >= 1' }, { status: 400 });
    }
    if (query.length > 500) {
      return NextResponse.json({ error: 'Search query too long (max 500 characters)' }, { status: 400 });
    }

    // Validate date formats if provided
    if (date_from && isNaN(Date.parse(date_from))) {
      return NextResponse.json({ error: 'Invalid date_from format. Use ISO 8601.' }, { status: 400 });
    }
    if (date_to && isNaN(Date.parse(date_to))) {
      return NextResponse.json({ error: 'Invalid date_to format. Use ISO 8601.' }, { status: 400 });
    }

    const searchRequest: EmailSearchRequest = {
      query: query.trim(),
      folder_id,
      from,
      to,
      subject,
      date_from,
      date_to,
      has_attachments,
      is_unread,
      page,
      limit
    };

    try {
      const provider = await MicrosoftGraphEmailProvider.create();
      const result = await provider.search(searchRequest);
      
      return NextResponse.json(result);
      
    } catch (providerError) {
      console.error('Failed to search messages:', providerError);
      
      // If provider fails, user likely needs to reconnect
      if (providerError instanceof Error && providerError.message.includes('access token')) {
        return NextResponse.json(
          { error: 'Microsoft account not connected. Please reconnect your account.' },
          { status: 401 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to search messages' },
        { status: 400 }
      );
    }
    
  } catch (error) {
    console.error('Error in email search API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      query,
      folder_id,
      from,
      to,
      subject,
      date_from,
      date_to,
      has_attachments,
      is_unread,
      page = 1,
      limit = 20
    } = body;

    // Validate required parameters
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Search query is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    // Validate parameters
    if (page < 1) {
      return NextResponse.json({ error: 'Page must be >= 1' }, { status: 400 });
    }
    if (limit < 1 || limit > 100) {
      return NextResponse.json({ error: 'Limit must be between 1 and 100' }, { status: 400 });
    }
    if (query.length > 500) {
      return NextResponse.json({ error: 'Search query too long (max 500 characters)' }, { status: 400 });
    }

    // Validate date formats if provided
    if (date_from && isNaN(Date.parse(date_from))) {
      return NextResponse.json({ error: 'Invalid date_from format. Use ISO 8601.' }, { status: 400 });
    }
    if (date_to && isNaN(Date.parse(date_to))) {
      return NextResponse.json({ error: 'Invalid date_to format. Use ISO 8601.' }, { status: 400 });
    }

    const searchRequest: EmailSearchRequest = {
      query: query.trim(),
      folder_id,
      from,
      to,
      subject,
      date_from,
      date_to,
      has_attachments,
      is_unread,
      page,
      limit
    };

    try {
      const provider = await MicrosoftGraphEmailProvider.create();
      const result = await provider.search(searchRequest);
      
      return NextResponse.json(result);
      
    } catch (providerError) {
      console.error('Failed to search messages:', providerError);
      
      if (providerError instanceof Error && providerError.message.includes('access token')) {
        return NextResponse.json(
          { error: 'Microsoft account not connected. Please reconnect your account.' },
          { status: 401 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to search messages' },
        { status: 400 }
      );
    }
    
  } catch (error) {
    console.error('Error in email search POST API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}