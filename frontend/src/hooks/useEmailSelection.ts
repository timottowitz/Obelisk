/**
 * useEmailSelection Hook - React hook for managing email selection with API integration
 * 
 * Provides a React hook interface to the email selection service with automatic
 * persistence, optimistic updates, and error handling.
 */

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

// Types
export interface EmailSelectionState {
  selectedEmails: string[];
  isLoading: boolean;
  error: string | null;
  stats: {
    count: number;
    hasExpired: boolean;
    totalSelections?: number;
    activeSelections?: number;
    totalSelectedEmails?: number;
  };
}

export interface EmailSelectionHookOptions {
  folderId?: string;
  persistSelection?: boolean;
  autoLoad?: boolean;
  orgId?: string;
}

export type SelectionOperation = 'add' | 'remove' | 'toggle' | 'replace' | 'clear';

/**
 * Hook for managing email selection with API persistence
 */
export function useEmailSelectionAPI(options: EmailSelectionHookOptions = {}) {
  const {
    folderId,
    persistSelection = true,
    autoLoad = true,
    orgId
  } = options;

  const [state, setState] = useState<EmailSelectionState>({
    selectedEmails: [],
    isLoading: false,
    error: null,
    stats: {
      count: 0,
      hasExpired: false,
    }
  });

  // Helper to make API calls with proper headers
  const makeAPICall = useCallback(async (
    endpoint: string,
    options: RequestInit = {}
  ) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {})
    };

    if (orgId) {
      headers['X-Org-Id'] = orgId;
    }

    const response = await fetch(endpoint, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }, [orgId]);

  // Load selection from API
  const loadSelection = useCallback(async () => {
    if (!persistSelection) return;

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const queryParams = new URLSearchParams();
      if (folderId) queryParams.append('folderId', folderId);

      const result = await makeAPICall(`/api/emails/selection?${queryParams}`);

      setState(prev => ({
        ...prev,
        selectedEmails: result.selection?.selectedEmails || [],
        stats: result.stats || { count: 0, hasExpired: false },
        isLoading: false,
      }));

    } catch (error) {
      console.error('Failed to load email selection:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load selection',
        isLoading: false,
      }));
    }
  }, [persistSelection, folderId, makeAPICall]);

  // Update selection via API
  const updateSelection = useCallback(async (
    operation: SelectionOperation,
    emailIds: string[],
    options: {
      optimistic?: boolean;
      context?: Record<string, any>;
      expiresAt?: Date;
    } = {}
  ) => {
    const { optimistic = true, context, expiresAt } = options;

    // Optimistic update
    if (optimistic) {
      setState(prev => {
        const currentIds = new Set(prev.selectedEmails);
        const requestIds = new Set(emailIds);
        let newEmailIds: string[] = [];

        switch (operation) {
          case 'add':
            newEmailIds = [...currentIds, ...requestIds];
            break;
          case 'remove':
            newEmailIds = [...currentIds].filter(id => !requestIds.has(id));
            break;
          case 'toggle':
            newEmailIds = [...currentIds];
            emailIds.forEach(id => {
              if (currentIds.has(id)) {
                newEmailIds = newEmailIds.filter(existingId => existingId !== id);
              } else {
                newEmailIds.push(id);
              }
            });
            break;
          case 'replace':
            newEmailIds = emailIds;
            break;
          case 'clear':
            newEmailIds = [];
            break;
        }

        return {
          ...prev,
          selectedEmails: newEmailIds,
          stats: {
            ...prev.stats,
            count: newEmailIds.length,
          }
        };
      });
    }

    if (!persistSelection) return;

    try {
      const requestBody = {
        operation,
        emailIds,
        folderId,
        context,
        expiresAt: expiresAt?.toISOString(),
      };

      const result = await makeAPICall('/api/emails/selection', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      // Update with server response
      setState(prev => ({
        ...prev,
        selectedEmails: result.selection?.selectedEmails || [],
        stats: {
          ...prev.stats,
          count: result.stats?.count || 0,
        },
        error: null,
      }));

      return result.selection;

    } catch (error) {
      console.error('Failed to update email selection:', error);
      
      // Revert optimistic update on error
      if (optimistic) {
        await loadSelection();
      }
      
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to update selection',
      }));

      toast.error('Failed to update selection');
      throw error;
    }
  }, [persistSelection, folderId, makeAPICall, loadSelection]);

  // Batch operations
  const batchUpdate = useCallback(async (
    operations: Array<{
      operation: SelectionOperation;
      emailIds: string[];
      context?: Record<string, any>;
      expiresAt?: Date;
    }>
  ) => {
    if (!persistSelection) return;

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const requestBody = {
        operations: operations.map(op => ({
          ...op,
          folderId,
          expiresAt: op.expiresAt?.toISOString(),
        }))
      };

      const result = await makeAPICall('/api/emails/selection', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
      });

      // Reload selection to get final state
      await loadSelection();

      toast.success(`Processed ${result.summary.operationsProcessed} operations`);
      return result;

    } catch (error) {
      console.error('Failed to batch update selections:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to batch update selections',
        isLoading: false,
      }));

      toast.error('Failed to batch update selections');
      throw error;
    }
  }, [persistSelection, folderId, makeAPICall, loadSelection]);

  // Clear all selections
  const clearSelection = useCallback(async () => {
    // Optimistic update
    setState(prev => ({
      ...prev,
      selectedEmails: [],
      stats: {
        ...prev.stats,
        count: 0,
      }
    }));

    if (!persistSelection) return;

    try {
      const queryParams = new URLSearchParams();
      if (folderId) queryParams.append('folderId', folderId);

      await makeAPICall(`/api/emails/selection?${queryParams}`, {
        method: 'DELETE',
      });

      toast.success('Selection cleared');

    } catch (error) {
      console.error('Failed to clear email selection:', error);
      
      // Reload on error
      await loadSelection();
      
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to clear selection',
      }));

      toast.error('Failed to clear selection');
      throw error;
    }
  }, [persistSelection, folderId, makeAPICall, loadSelection]);

  // Convenience methods
  const addEmails = useCallback((emailIds: string[]) => {
    return updateSelection('add', emailIds);
  }, [updateSelection]);

  const removeEmails = useCallback((emailIds: string[]) => {
    return updateSelection('remove', emailIds);
  }, [updateSelection]);

  const toggleEmails = useCallback((emailIds: string[]) => {
    return updateSelection('toggle', emailIds);
  }, [updateSelection]);

  const replaceSelection = useCallback((emailIds: string[]) => {
    return updateSelection('replace', emailIds);
  }, [updateSelection]);

  const isSelected = useCallback((emailId: string) => {
    return state.selectedEmails.includes(emailId);
  }, [state.selectedEmails]);

  const getSelectionCount = useCallback(() => {
    return state.selectedEmails.length;
  }, [state.selectedEmails]);

  const hasSelection = useCallback(() => {
    return state.selectedEmails.length > 0;
  }, [state.selectedEmails]);

  // Load selection on mount
  useEffect(() => {
    if (autoLoad && persistSelection) {
      loadSelection();
    }
  }, [autoLoad, persistSelection, loadSelection]);

  // Refresh selection when folder changes
  useEffect(() => {
    if (persistSelection && autoLoad && folderId) {
      loadSelection();
    }
  }, [folderId, persistSelection, autoLoad, loadSelection]);

  return {
    // State
    selectedEmails: state.selectedEmails,
    isLoading: state.isLoading,
    error: state.error,
    stats: state.stats,

    // Actions
    updateSelection,
    batchUpdate,
    clearSelection,
    loadSelection,

    // Convenience methods
    addEmails,
    removeEmails,
    toggleEmails,
    replaceSelection,

    // Helpers
    isSelected,
    getSelectionCount,
    hasSelection,
  };
}