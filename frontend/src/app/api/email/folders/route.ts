import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { MicrosoftGraphEmailProvider } from '@/server/providers/microsoftGraph';

export async function GET() {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const provider = await MicrosoftGraphEmailProvider.create();
      const folders = await provider.listFolders();
      
      return NextResponse.json({
        folders,
        total: folders.length
      });
      
    } catch (providerError) {
      console.error('Failed to get folders:', providerError);
      
      // If provider fails, user likely needs to reconnect
      if (providerError instanceof Error && providerError.message.includes('access token')) {
        return NextResponse.json(
          { error: 'Microsoft account not connected. Please reconnect your account.' },
          { status: 401 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to fetch folders' },
        { status: 400 }
      );
    }
    
  } catch (error) {
    console.error('Error in folders API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}