import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { CallRecordingsAPI } from '@/services/call-recordings-api';
import { AccessibleRecordingsFilters, AccessibleRecordingsResponse } from '@/types/callcaps';

export interface UseAccessibleRecordingsOptions extends AccessibleRecordingsFilters {
  enabled?: boolean;
  refetchInterval?: number;
}

export interface UseAccessibleRecordingsReturn {
  data: AccessibleRecordingsResponse | undefined;
  recordings: AccessibleRecordingsResponse['recordings'];
  summary: AccessibleRecordingsResponse['summary'] | undefined;
  pagination: AccessibleRecordingsResponse['pagination'] | undefined;
  filters: AccessibleRecordingsResponse['filters'] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  refresh: () => Promise<void>;
}

export function useAccessibleRecordings(
  options: UseAccessibleRecordingsOptions = {}
): UseAccessibleRecordingsReturn {
  const queryClient = useQueryClient();
  const { orgId } = useAuth();
  
  const {
    enabled = true,
    refetchInterval,
    ...filterOptions
  } = options;

  // Fetch recordings using react-query
  const {
    data,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['accessible-recordings', orgId, filterOptions],
    queryFn: async () => {
      return await CallRecordingsAPI.getAccessibleRecordings(filterOptions);
    },
    enabled: !!orgId && enabled,
    refetchInterval,
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes (formerly cacheTime)
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ 
      queryKey: ['accessible-recordings', orgId] 
    });
  };

  return {
    data,
    recordings: data?.recordings || [],
    summary: data?.summary,
    pagination: data?.pagination,
    filters: data?.filters,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
    refresh,
  };
}

// Additional utility hook for specific access types
export function useOwnedRecordings(
  options: Omit<UseAccessibleRecordingsOptions, 'accessType'> = {}
): UseAccessibleRecordingsReturn {
  return useAccessibleRecordings({
    ...options,
    accessType: 'owned',
  });
}

export function useSharedRecordings(
  options: Omit<UseAccessibleRecordingsOptions, 'accessType'> = {}
): UseAccessibleRecordingsReturn {
  return useAccessibleRecordings({
    ...options,
    accessType: 'shared',
  });
}

// Hook for pagination management
export function useAccessibleRecordingsPagination(
  baseFilters: AccessibleRecordingsFilters = {}
) {
  const [currentPage, setCurrentPage] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(20);
  
  const { data, ...rest } = useAccessibleRecordings({
    ...baseFilters,
    limit: pageSize,
    offset: currentPage * pageSize,
  });

  const totalPages = data?.pagination ? Math.ceil(data.pagination.total / pageSize) : 0;
  const hasNextPage = data?.pagination?.hasMore || false;
  const hasPreviousPage = currentPage > 0;

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(0, Math.min(page, totalPages - 1)));
  };

  const nextPage = () => {
    if (hasNextPage) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const previousPage = () => {
    if (hasPreviousPage) {
      setCurrentPage(prev => prev - 1);
    }
  };

  return {
    data,
    ...rest,
    pagination: {
      currentPage,
      pageSize,
      totalPages,
      hasNextPage,
      hasPreviousPage,
      goToPage,
      nextPage,
      previousPage,
      setPageSize,
    },
  };
} 