/**
 * React hook for real-time job status monitoring
 * Provides job tracking, updates, and management capabilities
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Job, JobStatus, JobFilter, JobPagination, PaginatedJobResult } from '@/lib/services/job-types';

interface UseJobStatusOptions {
  /** Job ID to track (for single job tracking) */
  jobId?: string;
  
  /** Filter for job queries (for multiple job tracking) */
  filter?: JobFilter;
  
  /** Pagination options */
  pagination?: JobPagination;
  
  /** Whether to automatically refresh job data */
  autoRefresh?: boolean;
  
  /** Refresh interval in milliseconds */
  refreshInterval?: number;
  
  /** Whether to start fetching immediately */
  immediate?: boolean;
  
  /** Organization ID (will use default if not provided) */
  orgId?: string;
}

interface UseJobStatusReturn {
  /** Current job or jobs data */
  job?: Job;
  jobs: Job[];
  
  /** Loading state */
  loading: boolean;
  
  /** Error state */
  error: string | null;
  
  /** Pagination information (for multiple jobs) */
  pagination?: {
    totalCount: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  };
  
  /** Manually refresh job data */
  refresh: () => Promise<void>;
  
  /** Cancel a job */
  cancelJob: (jobId: string) => Promise<void>;
  
  /** Retry a failed job */
  retryJob: (jobId: string) => Promise<void>;
  
  /** Delete a job */
  deleteJob: (jobId: string) => Promise<void>;
  
  /** Check if job is in terminal state */
  isCompleted: boolean;
  
  /** Check if job failed */
  isFailed: boolean;
  
  /** Check if job is running */
  isRunning: boolean;
  
  /** Get job progress percentage */
  progressPercentage: number;
}

/**
 * Hook for tracking single or multiple job status with real-time updates
 */
export function useJobStatus(options: UseJobStatusOptions = {}): UseJobStatusReturn {
  const {
    jobId,
    filter,
    pagination = { page: 0, limit: 20 },
    autoRefresh = true,
    refreshInterval = 5000,
    immediate = true,
    orgId = process.env.NEXT_PUBLIC_ORG_ID || ''
  } = options;

  const [job, setJob] = useState<Job | undefined>();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paginationInfo, setPaginationInfo] = useState<PaginatedJobResult | undefined>();

  const refreshTimeoutRef = useRef<NodeJS.Timeout>();
  const abortControllerRef = useRef<AbortController>();

  // Fetch job data
  const fetchJobs = useCallback(async (signal?: AbortSignal) => {
    if (!orgId && !process.env.NEXT_PUBLIC_ORG_ID) {
      setError('Organization ID is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let response: Response;

      if (jobId) {
        // Fetch single job
        response = await fetch(`/api/jobs/${jobId}`, {
          headers: {
            'X-Org-Id': orgId
          },
          signal
        });
      } else {
        // Fetch multiple jobs with filters
        const searchParams = new URLSearchParams();
        
        // Add pagination params
        searchParams.append('page', pagination.page.toString());
        searchParams.append('limit', pagination.limit.toString());
        if (pagination.sortBy) searchParams.append('sortBy', pagination.sortBy);
        if (pagination.sortOrder) searchParams.append('sortOrder', pagination.sortOrder);
        
        // Add filter params
        if (filter) {
          if (filter.status) {
            const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
            searchParams.append('status', statuses.join(','));
          }
          if (filter.type) {
            const types = Array.isArray(filter.type) ? filter.type : [filter.type];
            searchParams.append('type', types.join(','));
          }
          if (filter.priority) {
            const priorities = Array.isArray(filter.priority) ? filter.priority : [filter.priority];
            searchParams.append('priority', priorities.join(','));
          }
          if (filter.userId) searchParams.append('userId', filter.userId);
          if (filter.caseId) searchParams.append('caseId', filter.caseId);
          if (filter.search) searchParams.append('search', filter.search);
          if (filter.dateRange) {
            searchParams.append('startDate', filter.dateRange.start);
            searchParams.append('endDate', filter.dateRange.end);
          }
        }

        response = await fetch(`/api/jobs?${searchParams.toString()}`, {
          headers: {
            'X-Org-Id': orgId
          },
          signal
        });
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch jobs: ${response.statusText}`);
      }

      const data = await response.json();

      if (jobId) {
        setJob(data.job);
        setJobs([data.job]);
      } else {
        setJobs(data.jobs || []);
        setPaginationInfo(data);
        
        // If we had a single job before, try to find it in the results
        if (job) {
          const updatedJob = data.jobs?.find((j: Job) => j.id === job.id);
          setJob(updatedJob);
        }
      }

    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Request was aborted, don't set error
      }
      setError(err instanceof Error ? err.message : 'Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  }, [jobId, filter, pagination, orgId, job?.id]);

  // Manual refresh function
  const refresh = useCallback(async () => {
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();
    await fetchJobs(abortControllerRef.current.signal);
  }, [fetchJobs]);

  // Job action functions
  const performJobAction = useCallback(async (targetJobId: string, endpoint: string, method = 'POST') => {
    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          'X-Org-Id': orgId,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Action failed: ${response.statusText}`);
      }

      // Refresh jobs after action
      await refresh();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
      throw err;
    }
  }, [orgId, refresh]);

  const cancelJob = useCallback(async (targetJobId: string) => {
    await performJobAction(targetJobId, `/api/jobs/${targetJobId}/cancel`);
  }, [performJobAction]);

  const retryJob = useCallback(async (targetJobId: string) => {
    await performJobAction(targetJobId, `/api/jobs/${targetJobId}/retry`);
  }, [performJobAction]);

  const deleteJob = useCallback(async (targetJobId: string) => {
    await performJobAction(targetJobId, `/api/jobs/${targetJobId}`, 'DELETE');
  }, [performJobAction]);

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) return;

    // Don't auto-refresh if job is in terminal state (unless tracking multiple jobs)
    if (jobId && job && ['completed', 'failed', 'cancelled'].includes(job.status)) {
      return;
    }

    const setupRefresh = () => {
      refreshTimeoutRef.current = setTimeout(async () => {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();
        await fetchJobs(abortControllerRef.current.signal);
        setupRefresh(); // Schedule next refresh
      }, refreshInterval);
    };

    setupRefresh();

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [autoRefresh, refreshInterval, jobId, job?.status, fetchJobs]);

  // Initial fetch effect
  useEffect(() => {
    if (immediate) {
      refresh();
    }

    return () => {
      // Cleanup on unmount
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [immediate, refresh]);

  // Computed status values
  const currentJob = job || jobs[0];
  const isCompleted = currentJob ? ['completed', 'cancelled'].includes(currentJob.status) : false;
  const isFailed = currentJob ? ['failed', 'stalled'].includes(currentJob.status) : false;
  const isRunning = currentJob ? currentJob.status === 'running' : false;
  const progressPercentage = currentJob?.progress?.percentage || 0;

  return {
    job,
    jobs,
    loading,
    error,
    pagination: paginationInfo ? {
      totalCount: paginationInfo.totalCount,
      page: paginationInfo.page,
      limit: paginationInfo.limit,
      totalPages: paginationInfo.totalPages,
      hasMore: paginationInfo.hasMore
    } : undefined,
    refresh,
    cancelJob,
    retryJob,
    deleteJob,
    isCompleted,
    isFailed,
    isRunning,
    progressPercentage
  };
}

/**
 * Simplified hook for tracking a single job by ID
 */
export function useJob(
  jobId: string,
  options: Omit<UseJobStatusOptions, 'jobId' | 'filter'> = {}
): Omit<UseJobStatusReturn, 'jobs' | 'pagination'> {
  const result = useJobStatus({ ...options, jobId });
  
  return {
    job: result.job,
    loading: result.loading,
    error: result.error,
    refresh: result.refresh,
    cancelJob: result.cancelJob,
    retryJob: result.retryJob,
    deleteJob: result.deleteJob,
    isCompleted: result.isCompleted,
    isFailed: result.isFailed,
    isRunning: result.isRunning,
    progressPercentage: result.progressPercentage,
    jobs: result.jobs // Keep for compatibility, but will have max 1 item
  };
}

/**
 * Hook for tracking multiple jobs with filters
 */
export function useJobs(
  filter?: JobFilter,
  pagination?: JobPagination,
  options: Omit<UseJobStatusOptions, 'jobId' | 'filter' | 'pagination'> = {}
): Omit<UseJobStatusReturn, 'job'> {
  const result = useJobStatus({ ...options, filter, pagination });
  
  return {
    jobs: result.jobs,
    loading: result.loading,
    error: result.error,
    pagination: result.pagination,
    refresh: result.refresh,
    cancelJob: result.cancelJob,
    retryJob: result.retryJob,
    deleteJob: result.deleteJob,
    isCompleted: result.isCompleted,
    isFailed: result.isFailed,
    isRunning: result.isRunning,
    progressPercentage: result.progressPercentage,
    job: result.job // Keep for compatibility
  };
}