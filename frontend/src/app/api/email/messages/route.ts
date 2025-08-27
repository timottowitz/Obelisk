import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { MicrosoftGraphEmailProvider } from '@/server/providers/microsoftGraph';
import { EmailListRequest } from '@/types/email';

export async function GET(request: NextRequest) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const folder_id = searchParams.get('folder_id') || undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100); // Cap at 100
    const unread_only = searchParams.get('unread_only') === 'true';
    const sort_by = (searchParams.get('sort_by') || 'received_at') as 'received_at' | 'sent_at' | 'subject';
    const sort_order = (searchParams.get('sort_order') || 'desc') as 'asc' | 'desc';

    // Validate parameters
    if (page < 1) {
      return NextResponse.json({ error: 'Page must be >= 1' }, { status: 400 });
    }
    if (limit < 1) {
      return NextResponse.json({ error: 'Limit must be >= 1' }, { status: 400 });
    }

    const listRequest: EmailListRequest = {
      folder_id,
      page,
      limit,
      unread_only,
      sort_by,
      sort_order
    };

    try {
      const provider = await MicrosoftGraphEmailProvider.create();
      const result = await provider.listMessages(folder_id, listRequest);
      
      return NextResponse.json(result);
      
    } catch (providerError) {
      console.error('Failed to get messages:', providerError);
      
      // If provider fails, user likely needs to reconnect
      if (providerError instanceof Error && providerError.message.includes('access token')) {
        return NextResponse.json(
          { error: 'Microsoft account not connected. Please reconnect your account.' },
          { status: 401 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 400 }
      );
    }
    
  } catch (error) {
    console.error('Error in messages API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { message_id, action, target_folder_id } = body;

    if (!message_id || !action) {
      return NextResponse.json(
        { error: 'message_id and action are required' },
        { status: 400 }
      );
    }

    try {
      const provider = await MicrosoftGraphEmailProvider.create();

      switch (action) {
        case 'mark_read':
          await provider.markAsRead(message_id);
          break;
          
        case 'mark_unread':
          await provider.markAsUnread(message_id);
          break;
          
        case 'delete':
          await provider.deleteMessage(message_id);
          break;
          
        case 'move':
          if (!target_folder_id) {
            return NextResponse.json(
              { error: 'target_folder_id is required for move action' },
              { status: 400 }
            );
          }
          await provider.moveMessage(message_id, target_folder_id);
          break;
          
        default:
          return NextResponse.json(
            { error: 'Invalid action. Supported: mark_read, mark_unread, delete, move' },
            { status: 400 }
          );
      }

      return NextResponse.json({ success: true, action, message_id });
      
    } catch (providerError) {
      console.error('Failed to update message:', providerError);
      
      if (providerError instanceof Error && providerError.message.includes('access token')) {
        return NextResponse.json(
          { error: 'Microsoft account not connected. Please reconnect your account.' },
          { status: 401 }
        );
      }
      
      return NextResponse.json(
        { error: `Failed to ${action} message` },
        { status: 400 }
      );
    }
    
  } catch (error) {
    console.error('Error in messages PATCH API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}