/**
 * Zero Email Adapter for Clerk Integration
 * 
 * This adapter provides a bridge between Zero's expected interfaces and Obelisk's
 * Clerk-based authentication system for email integration.
 */

import { auth, clerkClient } from '@clerk/nextjs/server';
import { EmailAccount } from '@/types/email';

// Zero-compatible interfaces (mocked since Zero submodule wasn't available)
export interface ZeroAuth {
  getAccessToken(provider: string): Promise<string | null>;
  getUserId(): string | null;
  isAuthenticated(): boolean;
  refreshToken(provider: string): Promise<string | null>;
}

export interface ZeroEmailAuth extends ZeroAuth {
  connectProvider(provider: 'microsoft' | 'google', scopes: string[]): Promise<void>;
  disconnectProvider(provider: 'microsoft' | 'google'): Promise<void>;
  getProviderStatus(provider: 'microsoft' | 'google'): Promise<{
    connected: boolean;
    scopes: string[];
    lastSync?: Date;
    error?: string;
  }>;
}

/**
 * Clerk-based implementation of Zero's email authentication interface
 */
export class ClerkZeroEmailAdapter implements ZeroEmailAuth {
  private readonly requiredScopes = {
    microsoft: [
      'https://graph.microsoft.com/Mail.Read',
      'https://graph.microsoft.com/Mail.Send',
      'https://graph.microsoft.com/Mail.ReadWrite',
      'https://graph.microsoft.com/MailboxSettings.ReadWrite'
    ],
    google: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.modify'
    ]
  };

  /**
   * Get access token for the specified provider
   */
  async getAccessToken(provider: string): Promise<string | null> {
    try {
      const { userId } = auth();
      if (!userId) return null;

      if (provider === 'microsoft') {
        // Get the user's OAuth tokens from Clerk
        const user = await clerkClient.users.getUser(userId);
        const oauthAccount = user.externalAccounts.find(
          account => account.provider === 'oauth_microsoft'
        );

        if (!oauthAccount || !oauthAccount.publicMetadata) {
          return null;
        }

        // In a real implementation, you'd decrypt and return the stored token
        // For now, we'll return a placeholder that indicates the connection exists
        return (oauthAccount.publicMetadata as any).access_token || null;
      }

      if (provider === 'google') {
        // Similar logic for Google
        const user = await clerkClient.users.getUser(userId);
        const oauthAccount = user.externalAccounts.find(
          account => account.provider === 'oauth_google'
        );

        if (!oauthAccount || !oauthAccount.publicMetadata) {
          return null;
        }

        return (oauthAccount.publicMetadata as any).access_token || null;
      }

      return null;
    } catch (error) {
      console.error(`Error getting access token for ${provider}:`, error);
      return null;
    }
  }

  /**
   * Get the current user ID
   */
  getUserId(): string | null {
    const { userId } = auth();
    return userId;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const { userId } = auth();
    return !!userId;
  }

  /**
   * Refresh access token for the specified provider
   */
  async refreshToken(provider: string): Promise<string | null> {
    try {
      const { userId } = auth();
      if (!userId) return null;

      // In a real implementation, you'd use the refresh token to get a new access token
      // For now, we'll simulate this by returning the current token
      return this.getAccessToken(provider);
    } catch (error) {
      console.error(`Error refreshing token for ${provider}:`, error);
      return null;
    }
  }

  /**
   * Connect to an OAuth provider (redirect-based)
   */
  async connectProvider(provider: 'microsoft' | 'google', scopes: string[]): Promise<void> {
    // This would typically redirect to the OAuth flow
    // In our case, this is handled by the ConnectMicrosoftButton component
    throw new Error(
      `Provider connection must be initiated through UI components. Use ConnectMicrosoftButton for ${provider}.`
    );
  }

  /**
   * Disconnect from an OAuth provider
   */
  async disconnectProvider(provider: 'microsoft' | 'google'): Promise<void> {
    try {
      const { userId } = auth();
      if (!userId) throw new Error('User not authenticated');

      const user = await clerkClient.users.getUser(userId);
      const oauthAccount = user.externalAccounts.find(
        account => account.provider === `oauth_${provider}`
      );

      if (oauthAccount) {
        await clerkClient.users.deleteExternalAccount({
          userId,
          externalAccountId: oauthAccount.id
        });
      }
    } catch (error) {
      console.error(`Error disconnecting ${provider}:`, error);
      throw error;
    }
  }

  /**
   * Get the connection status for a provider
   */
  async getProviderStatus(provider: 'microsoft' | 'google'): Promise<{
    connected: boolean;
    scopes: string[];
    lastSync?: Date;
    error?: string;
  }> {
    try {
      const { userId } = auth();
      if (!userId) {
        return { connected: false, scopes: [] };
      }

      const user = await clerkClient.users.getUser(userId);
      const oauthAccount = user.externalAccounts.find(
        account => account.provider === `oauth_${provider}`
      );

      if (!oauthAccount) {
        return { connected: false, scopes: [] };
      }

      const metadata = (oauthAccount.publicMetadata as any) || {};
      
      return {
        connected: true,
        scopes: metadata.scopes || this.requiredScopes[provider],
        lastSync: metadata.lastSync ? new Date(metadata.lastSync) : undefined,
        error: metadata.error
      };
    } catch (error) {
      console.error(`Error getting ${provider} status:`, error);
      return {
        connected: false,
        scopes: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get required scopes for a provider
   */
  getRequiredScopes(provider: 'microsoft' | 'google'): string[] {
    return this.requiredScopes[provider] || [];
  }

  /**
   * Validate that the connected provider has all required scopes
   */
  async validateScopes(provider: 'microsoft' | 'google'): Promise<boolean> {
    try {
      const status = await this.getProviderStatus(provider);
      if (!status.connected) return false;

      const requiredScopes = this.getRequiredScopes(provider);
      return requiredScopes.every(scope => status.scopes.includes(scope));
    } catch (error) {
      console.error(`Error validating scopes for ${provider}:`, error);
      return false;
    }
  }

  /**
   * Create an EmailAccount record from the connected provider
   */
  async createEmailAccount(provider: 'microsoft' | 'google'): Promise<EmailAccount | null> {
    try {
      const { userId } = auth();
      if (!userId) return null;

      const status = await this.getProviderStatus(provider);
      if (!status.connected) return null;

      const user = await clerkClient.users.getUser(userId);
      const oauthAccount = user.externalAccounts.find(
        account => account.provider === `oauth_${provider}`
      );

      if (!oauthAccount) return null;

      // Get email address from the OAuth account or user profile
      const emailAddress = oauthAccount.emailAddress || user.primaryEmailAddress?.emailAddress;
      if (!emailAddress) return null;

      return {
        id: crypto.randomUUID(),
        user_id: userId,
        organization_id: user.organizationMemberships?.[0]?.organization.id || '',
        provider: provider === 'microsoft' ? 'microsoft' : 'microsoft', // We only support Microsoft for now
        provider_account_id: oauthAccount.providerUserId || oauthAccount.id,
        email_address: emailAddress,
        display_name: user.fullName || user.firstName || emailAddress,
        scopes: status.scopes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_sync_at: status.lastSync?.toISOString(),
        sync_status: 'idle',
        sync_error: status.error
      };
    } catch (error) {
      console.error(`Error creating email account for ${provider}:`, error);
      return null;
    }
  }
}

/**
 * Factory function to create the adapter
 */
export function createZeroEmailAdapter(): ClerkZeroEmailAdapter {
  return new ClerkZeroEmailAdapter();
}

/**
 * Hook-style interface for React components
 */
export function useZeroEmailAuth(): ClerkZeroEmailAdapter {
  return createZeroEmailAdapter();
}