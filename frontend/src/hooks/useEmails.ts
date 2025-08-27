/**
 * Email hooks for managing email state and operations
 * 
 * These hooks provide a consistent interface for email operations
 * across the Obelisk application, integrating with our Zero-compatible
 * email system.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { 
  createZeroMailDriver, 
  type MicrosoftGraphZeroMailDriver,
  type ZeroMailConfig,
  type ZeroMailFolder,
  type ZeroMailMessage 
} from '@/lib/zero-mail-driver';
import { useZeroEmailAuth, type ClerkZeroEmailAdapter } from '@/adapters/zero-email-adapter';
import { useFeature } from '@/lib/feature-flags';

// Query keys for React Query
const EMAIL_QUERY_KEYS = {
  all: ['emails'] as const,
  driver: () => [...EMAIL_QUERY_KEYS.all, 'driver'] as const,
  account: () => [...EMAIL_QUERY_KEYS.all, 'account'] as const,
  folders: () => [...EMAIL_QUERY_KEYS.all, 'folders'] as const,
  messages: (folderId?: string) => [...EMAIL_QUERY_KEYS.all, 'messages', folderId] as const,
  message: (messageId: string) => [...EMAIL_QUERY_KEYS.all, 'message', messageId] as const,
  search: (query: string, folderId?: string) => [...EMAIL_QUERY_KEYS.all, 'search', query, folderId] as const,
  status: () => [...EMAIL_QUERY_KEYS.all, 'status'] as const,
};

// Types
export interface UseEmailsOptions {
  folderId?: string;
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
  sortBy?: 'received' | 'sent' | 'subject';
  sortOrder?: 'asc' | 'desc';
  enabled?: boolean;
}

export interface UseEmailSearchOptions {
  folderId?: string;
  from?: string;
  to?: string;
  subject?: string;
  dateFrom?: Date;
  dateTo?: Date;
  hasAttachments?: boolean;
  isUnread?: boolean;
  page?: number;
  limit?: number;
  enabled?: boolean;
}

export interface EmailConnectionStatus {
  isConnected: boolean;
  isConfigured: boolean;
  provider: 'microsoft' | 'google' | null;
  accountEmail?: string;
  lastSync?: Date;
  error?: string;
}

/**
 * Hook to get email connection status
 */
export function useEmailConnection(): {
  status: EmailConnectionStatus;
  loading: boolean;
  error: string | null;
  refresh: () => void;
} {
  const auth = useZeroEmailAuth();
  const isEmailEnabled = useFeature('emailIntegration');
  
  const { data: status, isLoading, error, refetch } = useQuery({
    queryKey: EMAIL_QUERY_KEYS.status(),
    queryFn: async (): Promise<EmailConnectionStatus> => {
      if (!isEmailEnabled) {
        return {
          isConnected: false,
          isConfigured: false,
          provider: null,
          error: 'Email integration is disabled'
        };
      }

      if (!auth.isAuthenticated()) {
        return {
          isConnected: false,
          isConfigured: false,
          provider: null,
          error: 'User not authenticated'
        };
      }

      try {
        // Check Microsoft connection
        const microsoftStatus = await auth.getProviderStatus('microsoft');
        
        if (microsoftStatus.connected) {
          return {
            isConnected: true,
            isConfigured: true,
            provider: 'microsoft',
            lastSync: microsoftStatus.lastSync,
            error: microsoftStatus.error
          };
        }

        // In the future, check Google connection here

        return {
          isConnected: false,
          isConfigured: false,
          provider: null
        };
      } catch (err) {
        return {
          isConnected: false,
          isConfigured: false,
          provider: null,
          error: err instanceof Error ? err.message : 'Unknown error'
        };
      }
    },
    enabled: isEmailEnabled && auth.isAuthenticated(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2
  });

  return {
    status: status || {
      isConnected: false,
      isConfigured: false,
      provider: null
    },
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
    refresh: refetch
  };
}

/**
 * Hook to get email driver instance
 */
export function useEmailDriver(): {
  driver: MicrosoftGraphZeroMailDriver | null;
  loading: boolean;
  error: string | null;
} {
  const { status } = useEmailConnection();
  const auth = useZeroEmailAuth();

  const { data: driver, isLoading, error } = useQuery({
    queryKey: EMAIL_QUERY_KEYS.driver(),
    queryFn: async (): Promise<MicrosoftGraphZeroMailDriver> => {
      const userId = auth.getUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const config: ZeroMailConfig = {
        provider: 'microsoft', // We only support Microsoft for now
        accountId: userId
      };

      return await createZeroMailDriver(config);
    },
    enabled: status.isConnected && status.isConfigured,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2
  });

  return {
    driver: driver || null,
    loading: isLoading,
    error: error instanceof Error ? error.message : null
  };
}

/**
 * Hook to get email folders
 */
export function useEmailFolders() {
  const { driver } = useEmailDriver();

  return useQuery({
    queryKey: EMAIL_QUERY_KEYS.folders(),
    queryFn: async (): Promise<ZeroMailFolder[]> => {
      if (!driver) throw new Error('Email driver not available');
      return await driver.getFolders();
    },
    enabled: !!driver,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to get emails for a folder
 */
export function useEmails(options: UseEmailsOptions = {}) {
  const { driver } = useEmailDriver();
  const {
    folderId,
    page = 1,
    limit = 20,
    unreadOnly = false,
    sortBy = 'received',
    sortOrder = 'desc',
    enabled = true
  } = options;

  return useQuery({
    queryKey: EMAIL_QUERY_KEYS.messages(folderId),
    queryFn: async () => {
      if (!driver) throw new Error('Email driver not available');
      
      return await driver.getMessages(folderId, {
        page,
        limit,
        unreadOnly,
        sortBy,
        sortOrder
      });
    },
    enabled: !!driver && enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to get a specific email message
 */
export function useEmailMessage(messageId: string, options: { includeBody?: boolean } = {}) {
  const { driver } = useEmailDriver();

  return useQuery({
    queryKey: EMAIL_QUERY_KEYS.message(messageId),
    queryFn: async (): Promise<ZeroMailMessage | null> => {
      if (!driver) throw new Error('Email driver not available');
      return await driver.getMessage(messageId, options);
    },
    enabled: !!driver && !!messageId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to search emails
 */
export function useEmailSearch(query: string, options: UseEmailSearchOptions = {}) {
  const { driver } = useEmailDriver();
  const {
    folderId,
    from,
    to,
    subject,
    dateFrom,
    dateTo,
    hasAttachments,
    isUnread,
    page = 1,
    limit = 20,
    enabled = true
  } = options;

  return useQuery({
    queryKey: EMAIL_QUERY_KEYS.search(query, folderId),
    queryFn: async () => {
      if (!driver) throw new Error('Email driver not available');
      
      return await driver.searchMessages(query, {
        folderId,
        from,
        to,
        subject,
        dateFrom,
        dateTo,
        hasAttachments,
        isUnread,
        page,
        limit
      });
    },
    enabled: !!driver && !!query.trim() && enabled,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Hook to send emails
 */
export function useSendEmail() {
  const { driver } = useEmailDriver();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (message: {
      to: { address: string; name?: string }[];
      cc?: { address: string; name?: string }[];
      bcc?: { address: string; name?: string }[];
      subject: string;
      body: string;
      bodyType?: 'text' | 'html';
      importance?: 'low' | 'normal' | 'high';
      replyToMessageId?: string;
      forwardMessageId?: string;
    }) => {
      if (!driver) throw new Error('Email driver not available');
      return await driver.sendMessage(message);
    },
    onSuccess: () => {
      toast.success('Email sent successfully');
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: EMAIL_QUERY_KEYS.folders() });
      queryClient.invalidateQueries({ queryKey: EMAIL_QUERY_KEYS.messages() });
    },
    onError: (error: Error) => {
      toast.error(`Failed to send email: ${error.message}`);
    }
  });
}

/**
 * Hook to mark emails as read/unread
 */
export function useEmailActions() {
  const { driver } = useEmailDriver();
  const queryClient = useQueryClient();

  const markAsRead = useMutation({
    mutationFn: async (messageId: string) => {
      if (!driver) throw new Error('Email driver not available');
      await driver.markAsRead(messageId);
    },
    onSuccess: (_, messageId) => {
      // Optimistically update the cache
      queryClient.setQueryData(
        EMAIL_QUERY_KEYS.message(messageId),
        (old: ZeroMailMessage | null | undefined) => 
          old ? { ...old, isRead: true } : old
      );
      
      // Invalidate lists to update unread counts
      queryClient.invalidateQueries({ queryKey: EMAIL_QUERY_KEYS.messages() });
      queryClient.invalidateQueries({ queryKey: EMAIL_QUERY_KEYS.folders() });
    },
    onError: (error: Error) => {
      toast.error(`Failed to mark as read: ${error.message}`);
    }
  });

  const markAsUnread = useMutation({
    mutationFn: async (messageId: string) => {
      if (!driver) throw new Error('Email driver not available');
      await driver.markAsUnread(messageId);
    },
    onSuccess: (_, messageId) => {
      // Optimistically update the cache
      queryClient.setQueryData(
        EMAIL_QUERY_KEYS.message(messageId),
        (old: ZeroMailMessage | null | undefined) => 
          old ? { ...old, isRead: false } : old
      );
      
      // Invalidate lists to update unread counts
      queryClient.invalidateQueries({ queryKey: EMAIL_QUERY_KEYS.messages() });
      queryClient.invalidateQueries({ queryKey: EMAIL_QUERY_KEYS.folders() });
    },
    onError: (error: Error) => {
      toast.error(`Failed to mark as unread: ${error.message}`);
    }
  });

  const deleteMessage = useMutation({
    mutationFn: async (messageId: string) => {
      if (!driver) throw new Error('Email driver not available');
      await driver.deleteMessage(messageId);
    },
    onSuccess: () => {
      toast.success('Email deleted successfully');
      // Invalidate lists to remove the message
      queryClient.invalidateQueries({ queryKey: EMAIL_QUERY_KEYS.messages() });
      queryClient.invalidateQueries({ queryKey: EMAIL_QUERY_KEYS.folders() });
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete email: ${error.message}`);
    }
  });

  const moveMessage = useMutation({
    mutationFn: async ({ messageId, targetFolderId }: { messageId: string; targetFolderId: string }) => {
      if (!driver) throw new Error('Email driver not available');
      await driver.moveMessage(messageId, targetFolderId);
    },
    onSuccess: () => {
      toast.success('Email moved successfully');
      // Invalidate lists to reflect the move
      queryClient.invalidateQueries({ queryKey: EMAIL_QUERY_KEYS.messages() });
      queryClient.invalidateQueries({ queryKey: EMAIL_QUERY_KEYS.folders() });
    },
    onError: (error: Error) => {
      toast.error(`Failed to move email: ${error.message}`);
    }
  });

  return {
    markAsRead,
    markAsUnread,
    deleteMessage,
    moveMessage
  };
}

/**
 * Hook for email sync operations
 */
export function useEmailSync() {
  const { driver } = useEmailDriver();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (options: { fullSync?: boolean; folderIds?: string[] } = {}) => {
      if (!driver) throw new Error('Email driver not available');
      await driver.sync(options);
    },
    onSuccess: () => {
      toast.success('Email sync completed');
      // Invalidate all email queries to refresh data
      queryClient.invalidateQueries({ queryKey: EMAIL_QUERY_KEYS.all });
    },
    onError: (error: Error) => {
      toast.error(`Email sync failed: ${error.message}`);
    }
  });
}

/**
 * Composite hook that provides all email functionality
 */
export function useEmailSystem(folderId?: string) {
  const connection = useEmailConnection();
  const { driver } = useEmailDriver();
  const folders = useEmailFolders();
  const emails = useEmails({ folderId, enabled: !!folderId });
  const actions = useEmailActions();
  const sendEmail = useSendEmail();
  const sync = useEmailSync();

  const isReady = connection.status.isConnected && connection.status.isConfigured && !!driver;

  return {
    // Connection
    connection,
    isReady,
    
    // Data
    folders,
    emails,
    
    // Actions
    actions,
    sendEmail,
    sync,
    
    // Utilities
    searchEmails: (query: string, options?: UseEmailSearchOptions) => 
      useEmailSearch(query, { ...options, enabled: !!query.trim() }),
    getMessage: (messageId: string) => useEmailMessage(messageId),
    
    // State
    loading: connection.loading || folders.isLoading || emails.isLoading,
    error: connection.error || folders.error || emails.error
  };
}

// Re-export types for convenience
export type { 
  ZeroMailFolder, 
  ZeroMailMessage, 
  ZeroMailConfig,
  MicrosoftGraphZeroMailDriver 
} from '@/lib/zero-mail-driver';

export type { ClerkZeroEmailAdapter } from '@/adapters/zero-email-adapter';