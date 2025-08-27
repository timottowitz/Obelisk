import { auth, clerkClient } from '@clerk/nextjs/server';

export interface MicrosoftToken {
  token: string;
  provider: string;
  scopes?: string[];
  expiresAt?: Date;
}

/**
 * Get Microsoft access token from Clerk OAuth
 * This fetches a fresh access token from Clerk's token endpoint
 */
export async function getMicrosoftAccessToken(): Promise<string> {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('User not authenticated');
  }

  try {
    const tokens = await clerkClient().users.getUserOauthAccessToken(
      userId,
      'oauth_microsoft'
    );

    if (!tokens || tokens.length === 0) {
      throw new Error('Microsoft account not connected. Please connect your Microsoft account first.');
    }

    // Get the first valid token (Clerk handles rotation)
    const validToken = tokens.find(t => t.token);
    
    if (!validToken) {
      throw new Error('No valid Microsoft access token found');
    }

    return validToken.token;
  } catch (error: any) {
    console.error('Failed to get Microsoft access token:', error);
    
    if (error.message?.includes('oauth_microsoft')) {
      throw new Error('Microsoft account not connected. Please connect your Microsoft account first.');
    }
    
    throw new Error(`Failed to retrieve Microsoft access token: ${error.message}`);
  }
}

/**
 * Check if user has connected Microsoft account
 */
export async function hasMicrosoftConnection(): Promise<boolean> {
  const { userId } = await auth();
  
  if (!userId) {
    return false;
  }

  try {
    const tokens = await clerkClient().users.getUserOauthAccessToken(
      userId,
      'oauth_microsoft'
    );
    
    return tokens && tokens.length > 0;
  } catch {
    return false;
  }
}

/**
 * Get user's Microsoft account details from token
 */
export async function getMicrosoftAccountInfo() {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('User not authenticated');
  }

  const user = await clerkClient().users.getUser(userId);
  
  // Find Microsoft account in external accounts
  const microsoftAccount = user.externalAccounts.find(
    account => account.provider === 'oauth_microsoft'
  );

  if (!microsoftAccount) {
    return null;
  }

  return {
    email: microsoftAccount.emailAddress,
    id: microsoftAccount.externalId,
    username: microsoftAccount.username,
    firstName: microsoftAccount.firstName,
    lastName: microsoftAccount.lastName,
  };
}