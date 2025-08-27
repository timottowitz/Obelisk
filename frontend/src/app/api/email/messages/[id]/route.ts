import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { MicrosoftGraphEmailProvider } from '@/server/providers/microsoftGraph';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const messageId = params.id;

    if (!messageId) {
      return NextResponse.json(
        { error: 'Message ID is required' },
        { status: 400 }
      );
    }

    try {
      const provider = await MicrosoftGraphEmailProvider.create();
      const message = await provider.getMessage(messageId);
      
      return NextResponse.json(message);
      
    } catch (providerError) {
      console.error('Failed to get message:', providerError);
      
      // Handle specific error cases
      if (providerError instanceof Error) {
        if (providerError.message.includes('access token')) {
          return NextResponse.json(
            { error: 'Microsoft account not connected. Please reconnect your account.' },
            { status: 401 }
          );
        }
        
        if (providerError.message.includes('not found')) {
          return NextResponse.json(
            { error: 'Message not found' },
            { status: 404 }
          );
        }
      }
      
      return NextResponse.json(
        { error: 'Failed to fetch message' },
        { status: 400 }
      );
    }
    
  } catch (error) {
    console.error('Error in message detail API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const messageId = params.id;
    const body = await request.json();
    const { action, target_folder_id } = body;

    if (!messageId || !action) {
      return NextResponse.json(
        { error: 'Message ID and action are required' },
        { status: 400 }
      );
    }

    try {
      const provider = await MicrosoftGraphEmailProvider.create();

      switch (action) {
        case 'mark_read':
          await provider.markAsRead(messageId);
          break;
          
        case 'mark_unread':
          await provider.markAsUnread(messageId);
          break;
          
        case 'delete':
          await provider.deleteMessage(messageId);
          return NextResponse.json({ 
            success: true, 
            action, 
            message_id: messageId,
            message: 'Message deleted successfully'
          });
          
        case 'move':
          if (!target_folder_id) {
            return NextResponse.json(
              { error: 'target_folder_id is required for move action' },
              { status: 400 }
            );
          }
          await provider.moveMessage(messageId, target_folder_id);
          break;
          
        default:
          return NextResponse.json(
            { error: 'Invalid action. Supported: mark_read, mark_unread, delete, move' },
            { status: 400 }
          );
      }

      return NextResponse.json({ 
        success: true, 
        action, 
        message_id: messageId,
        message: `Message ${action.replace('_', ' ')} successfully`
      });
      
    } catch (providerError) {
      console.error('Failed to update message:', providerError);
      
      if (providerError instanceof Error) {
        if (providerError.message.includes('access token')) {
          return NextResponse.json(
            { error: 'Microsoft account not connected. Please reconnect your account.' },
            { status: 401 }
          );
        }
        
        if (providerError.message.includes('not found')) {
          return NextResponse.json(
            { error: 'Message not found' },
            { status: 404 }
          );
        }
      }
      
      return NextResponse.json(
        { error: `Failed to ${action} message` },
        { status: 400 }
      );
    }
    
  } catch (error) {
    console.error('Error in message detail PATCH API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const messageId = params.id;

    if (!messageId) {
      return NextResponse.json(
        { error: 'Message ID is required' },
        { status: 400 }
      );
    }

    try {
      const provider = await MicrosoftGraphEmailProvider.create();
      await provider.deleteMessage(messageId);
      
      return NextResponse.json({ 
        success: true, 
        message_id: messageId,
        message: 'Message deleted successfully'
      });
      
    } catch (providerError) {
      console.error('Failed to delete message:', providerError);
      
      if (providerError instanceof Error) {
        if (providerError.message.includes('access token')) {
          return NextResponse.json(
            { error: 'Microsoft account not connected. Please reconnect your account.' },
            { status: 401 }
          );
        }
        
        if (providerError.message.includes('not found')) {
          return NextResponse.json(
            { error: 'Message not found' },
            { status: 404 }
          );
        }
      }
      
      return NextResponse.json(
        { error: 'Failed to delete message' },
        { status: 400 }
      );
    }
    
  } catch (error) {
    console.error('Error in message delete API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}