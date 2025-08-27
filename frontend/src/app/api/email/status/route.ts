import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { MicrosoftGraphEmailProvider } from '@/server/providers/microsoftGraph';
import { EmailStatusResponse } from '@/types/email';

export async function GET() {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      // Try to create a provider instance to check if user is connected
      const provider = await MicrosoftGraphEmailProvider.create();
      
      // Try to get basic user info to verify connection
      const folders = await provider.listFolders();
      
      const statusResponse: EmailStatusResponse = {
        connected: true,
        account: {
          id: crypto.randomUUID(),
          user_id: userId,
          organization_id: 'default', // This would come from Clerk organization
          provider: 'microsoft',
          provider_account_id: userId,
          email_address: 'user@example.com', // This would come from Graph API
          display_name: 'User Name', // This would come from Graph API
          scopes: ['https://graph.microsoft.com/Mail.Read', 'https://graph.microsoft.com/Mail.Send'],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_sync_at: new Date().toISOString(),
          sync_status: 'idle',
        },
        folders: folders.slice(0, 10) // Return first 10 folders for status check
      };

      return NextResponse.json(statusResponse);
      
    } catch (providerError) {
      console.error('Provider creation failed:', providerError);
      
      // User is not connected or token is invalid
      const statusResponse: EmailStatusResponse = {
        connected: false
      };
      
      return NextResponse.json(statusResponse);
    }
    
  } catch (error) {
    console.error('Error checking email status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // This would trigger a sync operation
    try {
      const provider = await MicrosoftGraphEmailProvider.create();
      
      // Get folders to verify connection and potentially sync
      const folders = await provider.listFolders();
      
      // Here you could implement actual sync logic to database
      // For now, just return updated status
      const statusResponse: EmailStatusResponse = {
        connected: true,
        account: {
          id: crypto.randomUUID(),
          user_id: userId,
          organization_id: 'default',
          provider: 'microsoft',
          provider_account_id: userId,
          email_address: 'user@example.com',
          display_name: 'User Name',
          scopes: ['https://graph.microsoft.com/Mail.Read', 'https://graph.microsoft.com/Mail.Send'],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_sync_at: new Date().toISOString(),
          sync_status: 'idle',
        },
        folders
      };

      return NextResponse.json(statusResponse);
      
    } catch (providerError) {
      console.error('Sync failed:', providerError);
      return NextResponse.json(
        { error: 'Failed to sync email account' },
        { status: 400 }
      );
    }
    
  } catch (error) {
    console.error('Error syncing email status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle disconnection
export async function DELETE() {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Here you would implement logic to:
    // 1. Remove the account from the database
    // 2. Revoke the OAuth tokens
    // 3. Clean up any synced data if desired
    
    // For now, just return success
    return NextResponse.json({ success: true, message: 'Email account disconnected' });
    
  } catch (error) {
    console.error('Error disconnecting email account:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}