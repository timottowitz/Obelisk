/**
 * Email Selection Service - Backend service for managing email selection state
 * 
 * Provides persistent selection management, selection sync across sessions,
 * and optimized selection operations for large email sets.
 */

import { createClient } from '@/lib/supabase';

// Selection state interface
export interface EmailSelection {
  id: string;
  user_id: string;
  organization_id: string;
  folder_id?: string;
  selected_email_ids: string[];
  selection_context?: Record<string, any>;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

// Selection operation types
export type SelectionOperation = 'add' | 'remove' | 'toggle' | 'replace' | 'clear';

// Selection update request
export interface SelectionUpdateRequest {
  operation: SelectionOperation;
  emailIds: string[];
  folderId?: string;
  context?: Record<string, any>;
  expiresAt?: Date;
}

// Selection query options
export interface SelectionQueryOptions {
  folderId?: string;
  includeExpired?: boolean;
  limit?: number;
}

export class EmailSelectionService {
  private supabase = createClient();
  
  /**
   * Get current email selection for user and organization
   */
  async getSelection(
    userId: string, 
    organizationId: string, 
    options: SelectionQueryOptions = {}
  ): Promise<EmailSelection | null> {
    try {
      let query = this.supabase
        .from('email_selections')
        .select('*')
        .eq('user_id', userId)
        .eq('organization_id', organizationId);

      if (options.folderId) {
        query = query.eq('folder_id', options.folderId);
      }

      if (!options.includeExpired) {
        query = query.or('expires_at.is.null,expires_at.gt.now()');
      }

      const { data, error } = await query
        .order('updated_at', { ascending: false })
        .limit(options.limit || 1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No selection found
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Failed to get email selection:', error);
      throw new Error('Failed to retrieve email selection');
    }
  }

  /**
   * Update email selection
   */
  async updateSelection(
    userId: string,
    organizationId: string,
    request: SelectionUpdateRequest
  ): Promise<EmailSelection> {
    try {
      // Get existing selection
      const existing = await this.getSelection(userId, organizationId, {
        folderId: request.folderId,
        includeExpired: false
      });

      let newEmailIds: string[] = [];

      if (existing) {
        // Apply operation to existing selection
        const currentIds = new Set(existing.selected_email_ids || []);
        const requestIds = new Set(request.emailIds);

        switch (request.operation) {
          case 'add':
            newEmailIds = [...currentIds, ...requestIds];
            break;
          case 'remove':
            newEmailIds = [...currentIds].filter(id => !requestIds.has(id));
            break;
          case 'toggle':
            newEmailIds = [...currentIds];
            request.emailIds.forEach(id => {
              if (currentIds.has(id)) {
                newEmailIds = newEmailIds.filter(existingId => existingId !== id);
              } else {
                newEmailIds.push(id);
              }
            });
            break;
          case 'replace':
            newEmailIds = request.emailIds;
            break;
          case 'clear':
            newEmailIds = [];
            break;
          default:
            throw new Error(`Unknown selection operation: ${request.operation}`);
        }

        // Update existing selection
        const { data, error } = await this.supabase
          .from('email_selections')
          .update({
            selected_email_ids: newEmailIds,
            selection_context: request.context || existing.selection_context,
            expires_at: request.expiresAt?.toISOString() || existing.expires_at,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
          .select('*')
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new selection
        switch (request.operation) {
          case 'add':
          case 'replace':
            newEmailIds = request.emailIds;
            break;
          case 'toggle':
            newEmailIds = request.emailIds;
            break;
          case 'clear':
          case 'remove':
            newEmailIds = [];
            break;
          default:
            throw new Error(`Cannot perform operation ${request.operation} on empty selection`);
        }

        const { data, error } = await this.supabase
          .from('email_selections')
          .insert({
            user_id: userId,
            organization_id: organizationId,
            folder_id: request.folderId,
            selected_email_ids: newEmailIds,
            selection_context: request.context,
            expires_at: request.expiresAt?.toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select('*')
          .single();

        if (error) throw error;
        return data;
      }
    } catch (error) {
      console.error('Failed to update email selection:', error);
      throw new Error('Failed to update email selection');
    }
  }

  /**
   * Clear all selections for user and organization
   */
  async clearAllSelections(
    userId: string,
    organizationId: string,
    folderId?: string
  ): Promise<void> {
    try {
      let query = this.supabase
        .from('email_selections')
        .delete()
        .eq('user_id', userId)
        .eq('organization_id', organizationId);

      if (folderId) {
        query = query.eq('folder_id', folderId);
      }

      const { error } = await query;

      if (error) throw error;
    } catch (error) {
      console.error('Failed to clear email selections:', error);
      throw new Error('Failed to clear email selections');
    }
  }

  /**
   * Batch update selections (optimized for large operations)
   */
  async batchUpdateSelection(
    userId: string,
    organizationId: string,
    operations: SelectionUpdateRequest[]
  ): Promise<EmailSelection[]> {
    try {
      const results: EmailSelection[] = [];

      // Process operations sequentially to maintain consistency
      for (const operation of operations) {
        const result = await this.updateSelection(userId, organizationId, operation);
        results.push(result);
      }

      return results;
    } catch (error) {
      console.error('Failed to batch update selections:', error);
      throw new Error('Failed to batch update selections');
    }
  }

  /**
   * Get selection statistics
   */
  async getSelectionStats(
    userId: string,
    organizationId: string,
    folderId?: string
  ): Promise<{
    totalSelections: number;
    activeSelections: number;
    expiredSelections: number;
    totalSelectedEmails: number;
  }> {
    try {
      let query = this.supabase
        .from('email_selections')
        .select('selected_email_ids, expires_at')
        .eq('user_id', userId)
        .eq('organization_id', organizationId);

      if (folderId) {
        query = query.eq('folder_id', folderId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const now = new Date();
      let activeSelections = 0;
      let expiredSelections = 0;
      let totalSelectedEmails = 0;

      data.forEach(selection => {
        const isExpired = selection.expires_at && new Date(selection.expires_at) < now;
        
        if (isExpired) {
          expiredSelections++;
        } else {
          activeSelections++;
          totalSelectedEmails += selection.selected_email_ids?.length || 0;
        }
      });

      return {
        totalSelections: data.length,
        activeSelections,
        expiredSelections,
        totalSelectedEmails
      };
    } catch (error) {
      console.error('Failed to get selection stats:', error);
      throw new Error('Failed to get selection statistics');
    }
  }

  /**
   * Clean up expired selections
   */
  async cleanupExpiredSelections(organizationId?: string): Promise<number> {
    try {
      let query = this.supabase
        .from('email_selections')
        .delete()
        .lt('expires_at', new Date().toISOString());

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data, error, count } = await query.select('*', { count: 'exact' });

      if (error) throw error;

      return count || 0;
    } catch (error) {
      console.error('Failed to cleanup expired selections:', error);
      throw new Error('Failed to cleanup expired selections');
    }
  }

  /**
   * Validate email IDs against actual emails (security check)
   */
  async validateEmailIds(
    emailIds: string[],
    userId: string,
    organizationId: string
  ): Promise<string[]> {
    try {
      // Query emails table to ensure user has access to these emails
      const { data, error } = await this.supabase
        .from('emails')
        .select('id')
        .in('id', emailIds)
        .eq('organization_id', organizationId); // Ensure emails belong to the organization

      if (error) throw error;

      return data.map(email => email.id);
    } catch (error) {
      console.error('Failed to validate email IDs:', error);
      throw new Error('Failed to validate email IDs');
    }
  }

  /**
   * Get selection history for auditing
   */
  async getSelectionHistory(
    userId: string,
    organizationId: string,
    limit: number = 10
  ): Promise<EmailSelection[]> {
    try {
      const { data, error } = await this.supabase
        .from('email_selections')
        .select('*')
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Failed to get selection history:', error);
      throw new Error('Failed to get selection history');
    }
  }

  /**
   * Export selected emails data for bulk operations
   */
  async exportSelectedEmails(
    userId: string,
    organizationId: string,
    folderId?: string
  ): Promise<{
    selection: EmailSelection;
    emails: any[];
  }> {
    try {
      const selection = await this.getSelection(userId, organizationId, { folderId });
      
      if (!selection || !selection.selected_email_ids?.length) {
        throw new Error('No emails selected');
      }

      // Get email details
      const { data: emails, error } = await this.supabase
        .from('emails')
        .select(`
          id,
          message_id,
          subject,
          body_preview,
          from_address,
          from_name,
          to_recipients,
          sent_at,
          received_at,
          is_read,
          has_attachments,
          case_id
        `)
        .in('id', selection.selected_email_ids)
        .eq('organization_id', organizationId);

      if (error) throw error;

      return {
        selection,
        emails: emails || []
      };
    } catch (error) {
      console.error('Failed to export selected emails:', error);
      throw new Error('Failed to export selected emails');
    }
  }
}

// Singleton instance
export const emailSelectionService = new EmailSelectionService();

// Utility functions for client-side use
export const EmailSelectionUtils = {
  /**
   * Merge multiple selections
   */
  mergeSelections(selections: string[][]): string[] {
    const merged = new Set<string>();
    selections.forEach(selection => {
      selection.forEach(id => merged.add(id));
    });
    return Array.from(merged);
  },

  /**
   * Find intersection of selections
   */
  intersectSelections(selections: string[][]): string[] {
    if (selections.length === 0) return [];
    if (selections.length === 1) return selections[0];

    let intersection = new Set(selections[0]);
    
    for (let i = 1; i < selections.length; i++) {
      const currentSet = new Set(selections[i]);
      intersection = new Set([...intersection].filter(id => currentSet.has(id)));
    }

    return Array.from(intersection);
  },

  /**
   * Calculate selection diff
   */
  calculateSelectionDiff(
    oldSelection: string[], 
    newSelection: string[]
  ): {
    added: string[];
    removed: string[];
    unchanged: string[];
  } {
    const oldSet = new Set(oldSelection);
    const newSet = new Set(newSelection);

    const added = newSelection.filter(id => !oldSet.has(id));
    const removed = oldSelection.filter(id => !newSet.has(id));
    const unchanged = oldSelection.filter(id => newSet.has(id));

    return { added, removed, unchanged };
  },

  /**
   * Validate selection size limits
   */
  validateSelectionSize(emailIds: string[], maxSize: number = 1000): boolean {
    return emailIds.length <= maxSize;
  },

  /**
   * Generate selection summary
   */
  generateSelectionSummary(emailIds: string[]): {
    count: number;
    sizeCategory: 'small' | 'medium' | 'large' | 'very_large';
  } {
    const count = emailIds.length;
    let sizeCategory: 'small' | 'medium' | 'large' | 'very_large';

    if (count <= 10) {
      sizeCategory = 'small';
    } else if (count <= 50) {
      sizeCategory = 'medium';
    } else if (count <= 200) {
      sizeCategory = 'large';
    } else {
      sizeCategory = 'very_large';
    }

    return { count, sizeCategory };
  }
};