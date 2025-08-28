/**
 * Microsoft Graph Authentication Service
 * Handles OAuth token management for Microsoft Graph API access
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface MicrosoftGraphTokens {
  access_token: string;
  refresh_token?: string;
  expires_at: number; // Unix timestamp
  token_type: string;
  scope: string;
}

export interface TokenRefreshResult {
  success: boolean;
  tokens?: MicrosoftGraphTokens;
  error?: string;
}

/**
 * Service for managing Microsoft Graph API authentication tokens
 */
export class MicrosoftAuthService {
  private clientId: string;
  private clientSecret: string;
  private tenantId: string;

  constructor() {
    this.clientId = process.env.MICROSOFT_CLIENT_ID!;
    this.clientSecret = process.env.MICROSOFT_CLIENT_SECRET!;
    this.tenantId = process.env.MICROSOFT_TENANT_ID || 'common';

    if (!this.clientId || !this.clientSecret) {
      throw new Error('Microsoft OAuth credentials not configured');
    }
  }

  /**
   * Get valid access token for a user
   * @param userId - Clerk user ID
   * @param orgId - Organization ID
   * @returns Promise with access token or null if not available
   */
  async getValidAccessToken(userId: string, orgId: string): Promise<string | null> {
    try {
      // Get tenant schema name
      const tenantSchema = `org_${orgId.replace(/[^a-zA-Z0-9]/g, '_')}`;

      // Get user's Microsoft Graph tokens from database
      const { data: tokenData, error: tokenError } = await supabase
        .from(`${tenantSchema}.email_accounts`)
        .select('access_token, refresh_token, token_expires_at, provider_account_id')
        .eq('user_id', userId)
        .eq('provider', 'microsoft')
        .single();

      if (tokenError || !tokenData) {
        console.log('No Microsoft Graph tokens found for user:', userId);
        return null;
      }

      const now = Math.floor(Date.now() / 1000);
      const expiresAt = new Date(tokenData.token_expires_at).getTime() / 1000;

      // Check if token is still valid (with 5 minute buffer)
      if (expiresAt > now + 300) {
        return tokenData.access_token;
      }

      // Token is expired or expiring soon, try to refresh it
      if (tokenData.refresh_token) {
        console.log('Access token expired, attempting refresh...');
        const refreshResult = await this.refreshAccessToken(tokenData.refresh_token);
        
        if (refreshResult.success && refreshResult.tokens) {
          // Update tokens in database
          await this.updateStoredTokens(userId, orgId, refreshResult.tokens);
          return refreshResult.tokens.access_token;
        }
      }

      console.log('Unable to refresh access token for user:', userId);
      return null;

    } catch (error) {
      console.error('Error getting valid access token:', error);
      return null;
    }
  }

  /**
   * Refresh an expired access token using the refresh token
   * @param refreshToken - The refresh token
   * @returns Promise with refresh result
   */
  private async refreshAccessToken(refreshToken: string): Promise<TokenRefreshResult> {
    try {
      const tokenEndpoint = `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`;
      
      const params = new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
        scope: 'https://graph.microsoft.com/Mail.ReadWrite https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/User.Read'
      });

      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Token refresh failed:', errorData);
        return {
          success: false,
          error: errorData.error_description || 'Token refresh failed'
        };
      }

      const tokenData = await response.json();
      
      const tokens: MicrosoftGraphTokens = {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || refreshToken, // Some responses don't include refresh token
        expires_at: Math.floor(Date.now() / 1000) + tokenData.expires_in,
        token_type: tokenData.token_type,
        scope: tokenData.scope
      };

      return {
        success: true,
        tokens
      };

    } catch (error) {
      console.error('Error refreshing access token:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update stored tokens in the database
   * @param userId - Clerk user ID
   * @param orgId - Organization ID
   * @param tokens - New token data
   */
  private async updateStoredTokens(
    userId: string, 
    orgId: string, 
    tokens: MicrosoftGraphTokens
  ): Promise<void> {
    try {
      const tenantSchema = `org_${orgId.replace(/[^a-zA-Z0-9]/g, '_')}`;
      
      const { error } = await supabase
        .from(`${tenantSchema}.email_accounts`)
        .update({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: new Date(tokens.expires_at * 1000).toISOString(),
          updated_at: new Date().toISOString(),
          last_sync_at: new Date().toISOString(),
          sync_status: 'idle'
        })
        .eq('user_id', userId)
        .eq('provider', 'microsoft');

      if (error) {
        console.error('Error updating stored tokens:', error);
      } else {
        console.log('Successfully updated stored tokens for user:', userId);
      }
    } catch (error) {
      console.error('Error updating stored tokens:', error);
    }
  }

  /**
   * Check if a user has connected their Microsoft account
   * @param userId - Clerk user ID
   * @param orgId - Organization ID
   * @returns Promise with boolean indicating connection status
   */
  async isUserConnected(userId: string, orgId: string): Promise<boolean> {
    try {
      const tenantSchema = `org_${orgId.replace(/[^a-zA-Z0-9]/g, '_')}`;

      const { data, error } = await supabase
        .from(`${tenantSchema}.email_accounts`)
        .select('id')
        .eq('user_id', userId)
        .eq('provider', 'microsoft')
        .single();

      return !error && !!data;
    } catch (error) {
      console.error('Error checking user connection:', error);
      return false;
    }
  }

  /**
   * Get user's email address from their Microsoft account
   * @param userId - Clerk user ID
   * @param orgId - Organization ID
   * @returns Promise with email address or null
   */
  async getUserEmail(userId: string, orgId: string): Promise<string | null> {
    try {
      const tenantSchema = `org_${orgId.replace(/[^a-zA-Z0-9]/g, '_')}`;

      const { data, error } = await supabase
        .from(`${tenantSchema}.email_accounts`)
        .select('email_address')
        .eq('user_id', userId)
        .eq('provider', 'microsoft')
        .single();

      if (error || !data) {
        return null;
      }

      return data.email_address;
    } catch (error) {
      console.error('Error getting user email:', error);
      return null;
    }
  }

  /**
   * Revoke stored tokens and disconnect user's Microsoft account
   * @param userId - Clerk user ID
   * @param orgId - Organization ID
   * @returns Promise indicating success
   */
  async disconnectUser(userId: string, orgId: string): Promise<boolean> {
    try {
      const tenantSchema = `org_${orgId.replace(/[^a-zA-Z0-9]/g, '_')}`;

      // First, try to revoke the tokens with Microsoft
      const { data: tokenData } = await supabase
        .from(`${tenantSchema}.email_accounts`)
        .select('access_token, refresh_token')
        .eq('user_id', userId)
        .eq('provider', 'microsoft')
        .single();

      if (tokenData?.refresh_token) {
        try {
          await this.revokeToken(tokenData.refresh_token);
        } catch (error) {
          console.warn('Failed to revoke token with Microsoft:', error);
          // Continue with local cleanup even if revocation fails
        }
      }

      // Remove the email account record
      const { error } = await supabase
        .from(`${tenantSchema}.email_accounts`)
        .delete()
        .eq('user_id', userId)
        .eq('provider', 'microsoft');

      if (error) {
        console.error('Error removing email account:', error);
        return false;
      }

      console.log('Successfully disconnected Microsoft account for user:', userId);
      return true;

    } catch (error) {
      console.error('Error disconnecting user:', error);
      return false;
    }
  }

  /**
   * Revoke a token with Microsoft
   * @param token - The token to revoke
   */
  private async revokeToken(token: string): Promise<void> {
    const revokeEndpoint = `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/logout`;
    
    await fetch(revokeEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        token,
        client_id: this.clientId,
        client_secret: this.clientSecret
      }).toString()
    });
  }
}

/**
 * Singleton instance of the Microsoft Auth Service
 */
export const microsoftAuthService = new MicrosoftAuthService();

/**
 * Helper function to get a valid Microsoft Graph access token
 * @param userId - Clerk user ID
 * @param orgId - Organization ID
 * @returns Promise with access token or null
 */
export async function getMicrosoftGraphToken(userId: string, orgId: string): Promise<string | null> {
  return microsoftAuthService.getValidAccessToken(userId, orgId);
}

/**
 * Helper function to check if user has Microsoft account connected
 * @param userId - Clerk user ID
 * @param orgId - Organization ID
 * @returns Promise with connection status
 */
export async function isMicrosoftAccountConnected(userId: string, orgId: string): Promise<boolean> {
  return microsoftAuthService.isUserConnected(userId, orgId);
}