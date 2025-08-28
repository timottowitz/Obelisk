/**
 * React hook for managing case emails
 * Provides comprehensive email management functionality including search, filtering, and caching
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  EmailArchiveItem, 
  EmailSearchFilters, 
  EmailSearchResult,
  EmailThread,
  emailArchiveService 
} from '@/lib/services/email-archive';
import { useDebounce } from '@/hooks/use-debounce';
import { toast } from 'sonner';

export interface UseCaseEmailsOptions {
  caseId: string;
  initialFilters?: EmailSearchFilters;
  pageSize?: number;
  enableRealtime?: boolean;
  cacheTTL?: number;
}

export interface EmailListState {
  emails: EmailArchiveItem[];
  totalCount: number;
  hasMore: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  currentPage: number;
  filters: EmailSearchFilters;
  selectedEmails: Set<string>;
  searchQuery: string;
}

export interface EmailOperations {
  // Data fetching
  loadEmails: (reset?: boolean) => Promise<void>;
  loadMore: () => Promise<void>;
  refreshEmails: () => Promise<void>;
  
  // Search and filtering
  setSearchQuery: (query: string) => void;
  updateFilters: (filters: Partial<EmailSearchFilters>) => void;
  clearFilters: () => void;
  
  // Email selection
  selectEmail: (emailId: string) => void;
  deselectEmail: (emailId: string) => void;
  selectAllVisible: () => void;
  deselectAll: () => void;
  toggleEmailSelection: (emailId: string) => void;
  
  // Email operations
  updateEmailTags: (emailIds: string[], tags: string[]) => Promise<void>;
  archiveEmails: (emailIds: string[]) => Promise<void>;
  restoreEmails: (emailIds: string[]) => Promise<void>;
  deleteEmails: (emailIds: string[]) => Promise<void>;
  markAsRead: (emailIds: string[]) => Promise<void>;
  markAsUnread: (emailIds: string[]) => Promise<void>;
  
  // Thread operations
  loadThread: (conversationId: string) => Promise<EmailThread | null>;
  
  // Export operations
  exportEmails: (emailIds: string[], options: any) => Promise<void>;
}

export interface UseCaseEmailsReturn {
  state: EmailListState;
  operations: EmailOperations;
  
  // Computed properties
  hasSelectedEmails: boolean;
  selectedEmailCount: number;
  canLoadMore: boolean;
  isSearching: boolean;
  hasActiveFilters: boolean;
}

export function useCaseEmails({
  caseId,
  initialFilters = {},
  pageSize = 50,
  enableRealtime = false,
  cacheTTL = 5 * 60 * 1000 // 5 minutes
}: UseCaseEmailsOptions): UseCaseEmailsReturn {
  const queryClient = useQueryClient();

  // Local state
  const [searchQuery, setSearchQueryState] = useState('');
  const [filters, setFilters] = useState<EmailSearchFilters>(initialFilters);
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(0);

  // Debounced search query to prevent excessive API calls
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Generate cache key for React Query
  const getCacheKey = useCallback((page: number = 0) => [
    'case-emails',
    caseId,
    debouncedSearchQuery,
    filters,
    page,
    pageSize
  ], [caseId, debouncedSearchQuery, filters, pageSize]);

  // Main query for emails
  const {
    data: emailsData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: getCacheKey(0),
    queryFn: async () => {
      const result = await emailArchiveService.getCaseEmails(
        caseId,
        { ...filters, query: debouncedSearchQuery },
        pageSize,
        0
      );
      return result;
    },
    staleTime: cacheTTL,
    enabled: !!caseId
  });

  // Mutation for loading more emails
  const loadMoreMutation = useMutation({
    mutationFn: async (page: number) => {
      const result = await emailArchiveService.getCaseEmails(
        caseId,
        { ...filters, query: debouncedSearchQuery },
        pageSize,
        page * pageSize
      );
      return { result, page };
    },
    onSuccess: ({ result, page }) => {
      // Update cache with new data
      queryClient.setQueryData(getCacheKey(0), (old: EmailSearchResult | undefined) => {
        if (!old) return result;
        return {
          ...result,
          emails: page === 0 ? result.emails : [...old.emails, ...result.emails],
        };
      });
      setCurrentPage(page);
    },
    onError: (error) => {
      toast.error('Failed to load more emails');
      console.error('Error loading more emails:', error);
    }
  });

  // Mutations for email operations
  const updateEmailsMutation = useMutation({
    mutationFn: async ({ emailIds, updates }: { emailIds: string[]; updates: any }) => {
      const response = await fetch(`/api/cases/${caseId}/emails`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailIds, updates })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update emails');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch emails
      queryClient.invalidateQueries({ queryKey: ['case-emails', caseId] });
      setSelectedEmails(new Set());
    },
    onError: (error) => {
      toast.error('Failed to update emails');
      console.error('Error updating emails:', error);
    }
  });

  const deleteEmailsMutation = useMutation({
    mutationFn: async (emailIds: string[]) => {
      const response = await fetch(`/api/cases/${caseId}/emails`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailIds })
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete emails');
      }
      
      return response.json();
    },
    onSuccess: (_, emailIds) => {
      toast.success(`Deleted ${emailIds.length} email${emailIds.length > 1 ? 's' : ''}`);
      queryClient.invalidateQueries({ queryKey: ['case-emails', caseId] });
      setSelectedEmails(new Set());
    },
    onError: (error) => {
      toast.error('Failed to delete emails');
      console.error('Error deleting emails:', error);
    }
  });

  // Reset page when search or filters change
  useEffect(() => {
    setCurrentPage(0);
  }, [debouncedSearchQuery, filters]);

  // Clear selection when data changes
  useEffect(() => {
    setSelectedEmails(new Set());
  }, [emailsData]);

  // Operations
  const operations: EmailOperations = {
    loadEmails: useCallback(async (reset = false) => {
      if (reset) {
        setCurrentPage(0);
        setSelectedEmails(new Set());
      }
      await refetch();
    }, [refetch]),

    loadMore: useCallback(async () => {
      if (emailsData?.hasMore && !loadMoreMutation.isPending) {
        loadMoreMutation.mutate(currentPage + 1);
      }
    }, [emailsData?.hasMore, loadMoreMutation, currentPage]),

    refreshEmails: useCallback(async () => {
      queryClient.invalidateQueries({ queryKey: ['case-emails', caseId] });
      setCurrentPage(0);
      setSelectedEmails(new Set());
    }, [queryClient, caseId]),

    setSearchQuery: useCallback((query: string) => {
      setSearchQueryState(query);
    }, []),

    updateFilters: useCallback((newFilters: Partial<EmailSearchFilters>) => {
      setFilters(prev => ({ ...prev, ...newFilters }));
    }, []),

    clearFilters: useCallback(() => {
      setFilters(initialFilters);
      setSearchQueryState('');
    }, [initialFilters]),

    selectEmail: useCallback((emailId: string) => {
      setSelectedEmails(prev => new Set([...prev, emailId]));
    }, []),

    deselectEmail: useCallback((emailId: string) => {
      setSelectedEmails(prev => {
        const next = new Set(prev);
        next.delete(emailId);
        return next;
      });
    }, []),

    selectAllVisible: useCallback(() => {
      if (emailsData?.emails) {
        setSelectedEmails(new Set(emailsData.emails.map(e => e.emailId)));
      }
    }, [emailsData?.emails]),

    deselectAll: useCallback(() => {
      setSelectedEmails(new Set());
    }, []),

    toggleEmailSelection: useCallback((emailId: string) => {
      setSelectedEmails(prev => {
        const next = new Set(prev);
        if (next.has(emailId)) {
          next.delete(emailId);
        } else {
          next.add(emailId);
        }
        return next;
      });
    }, []),

    updateEmailTags: useCallback(async (emailIds: string[], tags: string[]) => {
      await updateEmailsMutation.mutateAsync({
        emailIds,
        updates: { customTags: tags }
      });
      toast.success(`Updated tags for ${emailIds.length} email${emailIds.length > 1 ? 's' : ''}`);
    }, [updateEmailsMutation]),

    archiveEmails: useCallback(async (emailIds: string[]) => {
      await updateEmailsMutation.mutateAsync({
        emailIds,
        updates: { archiveStatus: 'archived' }
      });
      toast.success(`Archived ${emailIds.length} email${emailIds.length > 1 ? 's' : ''}`);
    }, [updateEmailsMutation]),

    restoreEmails: useCallback(async (emailIds: string[]) => {
      await updateEmailsMutation.mutateAsync({
        emailIds,
        updates: { archiveStatus: 'active' }
      });
      toast.success(`Restored ${emailIds.length} email${emailIds.length > 1 ? 's' : ''}`);
    }, [updateEmailsMutation]),

    deleteEmails: useCallback(async (emailIds: string[]) => {
      await deleteEmailsMutation.mutateAsync(emailIds);
    }, [deleteEmailsMutation]),

    markAsRead: useCallback(async (emailIds: string[]) => {
      await updateEmailsMutation.mutateAsync({
        emailIds,
        updates: { isRead: true }
      });
      toast.success(`Marked ${emailIds.length} email${emailIds.length > 1 ? 's' : ''} as read`);
    }, [updateEmailsMutation]),

    markAsUnread: useCallback(async (emailIds: string[]) => {
      await updateEmailsMutation.mutateAsync({
        emailIds,
        updates: { isRead: false }
      });
      toast.success(`Marked ${emailIds.length} email${emailIds.length > 1 ? 's' : ''} as unread`);
    }, [updateEmailsMutation]),

    loadThread: useCallback(async (conversationId: string) => {
      try {
        return await emailArchiveService.getEmailThread(caseId, conversationId);
      } catch (error) {
        console.error('Error loading email thread:', error);
        toast.error('Failed to load email thread');
        return null;
      }
    }, [caseId]),

    exportEmails: useCallback(async (emailIds: string[], options: any) => {
      try {
        await emailArchiveService.requestEmailExport({
          caseId,
          emailIds,
          ...options
        });
        toast.success('Email export started. You will be notified when it\'s ready.');
      } catch (error) {
        console.error('Error exporting emails:', error);
        toast.error('Failed to start email export');
      }
    }, [caseId])
  };

  // Computed state
  const state: EmailListState = {
    emails: emailsData?.emails || [],
    totalCount: emailsData?.totalCount || 0,
    hasMore: emailsData?.hasMore || false,
    isLoading: isLoading,
    isLoadingMore: loadMoreMutation.isPending,
    error: error?.message || null,
    currentPage,
    filters,
    selectedEmails,
    searchQuery
  };

  // Computed properties
  const hasSelectedEmails = selectedEmails.size > 0;
  const selectedEmailCount = selectedEmails.size;
  const canLoadMore = state.hasMore && !state.isLoading && !state.isLoadingMore;
  const isSearching = !!debouncedSearchQuery;
  const hasActiveFilters = Object.keys(filters).some(key => 
    filters[key as keyof EmailSearchFilters] !== undefined &&
    filters[key as keyof EmailSearchFilters] !== '' &&
    (Array.isArray(filters[key as keyof EmailSearchFilters]) ? 
     (filters[key as keyof EmailSearchFilters] as any[]).length > 0 : 
     true)
  );

  // Setup real-time updates if enabled
  useEffect(() => {
    if (!enableRealtime || !caseId) return;

    // This would set up WebSocket or Server-Sent Events for real-time updates
    // For now, we'll just refresh periodically
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['case-emails', caseId] });
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [enableRealtime, caseId, queryClient]);

  return {
    state,
    operations,
    hasSelectedEmails,
    selectedEmailCount,
    canLoadMore,
    isSearching,
    hasActiveFilters
  };
}

/**
 * Hook for getting a specific email's details
 */
export function useCaseEmail(caseId: string, emailId: string) {
  return useQuery({
    queryKey: ['case-email', caseId, emailId],
    queryFn: () => emailArchiveService.getEmailContent(caseId, emailId),
    enabled: !!caseId && !!emailId,
    staleTime: 10 * 60 * 1000 // 10 minutes
  });
}

/**
 * Hook for case email statistics
 */
export function useCaseEmailStats(caseId: string) {
  return useQuery({
    queryKey: ['case-email-stats', caseId],
    queryFn: () => emailArchiveService.getCaseEmailStats(caseId),
    enabled: !!caseId,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });
}