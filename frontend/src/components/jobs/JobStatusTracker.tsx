/**
 * Job Status Tracker Component
 * Real-time job progress monitoring and management
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  PlayIcon, 
  PauseIcon, 
  XMarkIcon, 
  ArrowPathIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  ClockIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { Job, JobStatus, JobType, JobPriority } from '@/lib/services/job-types';
import { cn } from '@/lib/utils';

interface JobStatusTrackerProps {
  /** Job ID to track */
  jobId?: string;
  
  /** Array of jobs to track */
  jobs?: Job[];
  
  /** Whether to show detailed information */
  detailed?: boolean;
  
  /** Whether to auto-refresh */
  autoRefresh?: boolean;
  
  /** Refresh interval in milliseconds */
  refreshInterval?: number;
  
  /** Callback when job status changes */
  onJobStatusChange?: (job: Job) => void;
  
  /** Callback when job action is triggered */
  onJobAction?: (jobId: string, action: 'cancel' | 'retry' | 'delete') => void;
  
  /** Custom className */
  className?: string;
}

// Status color mappings
const STATUS_COLORS: Record<JobStatus, string> = {
  pending: 'bg-gray-100 text-gray-800 border-gray-200',
  queued: 'bg-blue-100 text-blue-800 border-blue-200',
  running: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  completed: 'bg-green-100 text-green-800 border-green-200',
  failed: 'bg-red-100 text-red-800 border-red-200',
  cancelled: 'bg-gray-100 text-gray-800 border-gray-200',
  retry: 'bg-orange-100 text-orange-800 border-orange-200',
  stalled: 'bg-purple-100 text-purple-800 border-purple-200'
};

// Status icons
const STATUS_ICONS: Record<JobStatus, React.ComponentType<any>> = {
  pending: ClockIcon,
  queued: PlayIcon,
  running: PlayIcon,
  completed: CheckCircleIcon,
  failed: ExclamationTriangleIcon,
  cancelled: XMarkIcon,
  retry: ArrowPathIcon,
  stalled: ExclamationTriangleIcon
};

// Priority colors
const PRIORITY_COLORS: Record<JobPriority, string> = {
  low: 'text-gray-500',
  normal: 'text-blue-500',
  high: 'text-orange-500',
  urgent: 'text-red-500'
};

// Job type labels
const JOB_TYPE_LABELS: Record<JobType, string> = {
  email_storage: 'Email Storage',
  email_bulk_assignment: 'Bulk Assignment',
  email_content_analysis: 'Content Analysis',
  cleanup_storage: 'Storage Cleanup',
  maintenance_task: 'Maintenance',
  export_case_data: 'Data Export'
};

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
  return `${Math.round(ms / 3600000)}h`;
}

function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString();
}

/**
 * Individual job status display component
 */
function JobStatusCard({ 
  job, 
  detailed = false, 
  onAction 
}: { 
  job: Job; 
  detailed?: boolean; 
  onAction?: (action: 'cancel' | 'retry' | 'delete') => void;
}) {
  const StatusIcon = STATUS_ICONS[job.status];
  const statusColor = STATUS_COLORS[job.status];
  const priorityColor = PRIORITY_COLORS[job.priority];

  const canCancel = ['pending', 'queued', 'running'].includes(job.status);
  const canRetry = ['failed', 'stalled'].includes(job.status) && job.attempts < job.maxRetries;
  const canDelete = ['completed', 'failed', 'cancelled'].includes(job.status);

  const duration = job.timestamps.completed && job.timestamps.started
    ? new Date(job.timestamps.completed).getTime() - new Date(job.timestamps.started).getTime()
    : job.timestamps.started
    ? Date.now() - new Date(job.timestamps.started).getTime()
    : null;

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <StatusIcon className="h-4 w-4" />
            {JOB_TYPE_LABELS[job.type]}
            <Badge variant="outline" className={cn("text-xs", statusColor)}>
              {job.status}
            </Badge>
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <span className={cn("text-xs font-medium", priorityColor)}>
              {job.priority.toUpperCase()}
            </span>
            
            {/* Action buttons */}
            <div className="flex gap-1">
              {canCancel && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onAction?.('cancel')}
                        className="h-6 w-6 p-0"
                      >
                        <XMarkIcon className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Cancel job</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              
              {canRetry && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onAction?.('retry')}
                        className="h-6 w-6 p-0"
                      >
                        <ArrowPathIcon className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Retry job</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
        </div>

        {/* Job ID and timestamps */}
        <div className="text-xs text-muted-foreground space-y-1">
          <div>ID: {job.id}</div>
          <div>Created: {formatTimestamp(job.timestamps.created)}</div>
          {duration && (
            <div>Duration: {formatDuration(duration)}</div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {/* Progress bar for running jobs */}
        {job.status === 'running' && job.progress && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span>{job.progress.currentOperation || job.progress.currentStep}</span>
              <span>{job.progress.percentage}%</span>
            </div>
            <Progress value={job.progress.percentage} className="h-2" />
            <div className="text-xs text-muted-foreground">
              {job.progress.processedItems}/{job.progress.totalItems} items • Step {job.progress.currentStep} ({job.progress.totalSteps} total)
            </div>
          </div>
        )}

        {/* Error display */}
        {job.error && (
          <Alert variant="destructive">
            <ExclamationTriangleIcon className="h-4 w-4" />
            <AlertDescription>
              <div className="font-medium">{job.error.message}</div>
              {job.error.details && detailed && (
                <div className="text-xs mt-1 opacity-80">{job.error.details}</div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Result summary */}
        {job.result && job.status === 'completed' && (
          <Alert>
            <CheckCircleIcon className="h-4 w-4" />
            <AlertDescription>
              <div className="font-medium">Completed successfully</div>
              {job.result.summary && (
                <div className="text-xs mt-1 opacity-80">{job.result.summary}</div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Detailed information */}
        {detailed && (
          <div className="space-y-2 text-xs text-muted-foreground">
            <Separator />
            <div className="grid grid-cols-2 gap-2">
              <div>Attempts: {job.attempts}/{job.maxRetries}</div>
              <div>Timeout: {formatDuration(job.timeout)}</div>
              {job.workerId && <div className="col-span-2">Worker: {job.workerId}</div>}
            </div>
            
            {/* Job data summary */}
            {job.data && (
              <div className="space-y-1">
                <div className="font-medium">Job Data:</div>
                {job.data.caseId && <div>Case: {job.data.caseId}</div>}
                {job.data.emailId && <div>Email: {job.data.emailId}</div>}
                {job.data.emailIds && Array.isArray(job.data.emailIds) && (
                  <div>Emails: {job.data.emailIds.length} items</div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Main job status tracker component
 */
export default function JobStatusTracker({
  jobId,
  jobs: initialJobs,
  detailed = false,
  autoRefresh = true,
  refreshInterval = 5000,
  onJobStatusChange,
  onJobAction,
  className
}: JobStatusTrackerProps) {
  const [jobs, setJobs] = useState<Job[]>(initialJobs || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch job data
  const fetchJobs = useCallback(async () => {
    if (!jobId && !initialJobs) return;

    setLoading(true);
    setError(null);

    try {
      let fetchedJobs: Job[] = [];

      if (jobId) {
        // Fetch specific job
        const response = await fetch(`/api/jobs/${jobId}`, {
          headers: {
            'X-Org-Id': process.env.NEXT_PUBLIC_ORG_ID || ''
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch job: ${response.statusText}`);
        }

        const data = await response.json();
        fetchedJobs = [data.job];
      } else if (initialJobs) {
        // Refresh existing jobs
        const refreshPromises = initialJobs.map(async (job) => {
          const response = await fetch(`/api/jobs/${job.id}`, {
            headers: {
              'X-Org-Id': process.env.NEXT_PUBLIC_ORG_ID || ''
            }
          });

          if (response.ok) {
            const data = await response.json();
            return data.job;
          }
          return job; // Return original if fetch fails
        });

        fetchedJobs = await Promise.all(refreshPromises);
      }

      // Check for status changes
      if (onJobStatusChange) {
        fetchedJobs.forEach((newJob) => {
          const oldJob = jobs.find(j => j.id === newJob.id);
          if (oldJob && oldJob.status !== newJob.status) {
            onJobStatusChange(newJob);
          }
        });
      }

      setJobs(fetchedJobs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  }, [jobId, initialJobs, jobs, onJobStatusChange]);

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchJobs, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchJobs]);

  // Initial fetch
  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Handle job actions
  const handleJobAction = async (job: Job, action: 'cancel' | 'retry' | 'delete') => {
    if (onJobAction) {
      onJobAction(job.id, action);
      return;
    }

    try {
      let endpoint = '';
      let method = 'POST';

      switch (action) {
        case 'cancel':
          endpoint = `/api/jobs/${job.id}/cancel`;
          break;
        case 'retry':
          endpoint = `/api/jobs/${job.id}/retry`;
          break;
        case 'delete':
          endpoint = `/api/jobs/${job.id}`;
          method = 'DELETE';
          break;
      }

      const response = await fetch(endpoint, {
        method,
        headers: {
          'X-Org-Id': process.env.NEXT_PUBLIC_ORG_ID || ''
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} job: ${response.statusText}`);
      }

      // Refresh jobs after action
      await fetchJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} job`);
    }
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <ExclamationTriangleIcon className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (jobs.length === 0 && !loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-6">
          <div className="text-center text-muted-foreground">
            <InformationCircleIcon className="h-8 w-8 mx-auto mb-2" />
            <p>No jobs to display</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header with refresh button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          Job Status {jobs.length > 1 && `(${jobs.length})`}
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchJobs}
          disabled={loading}
        >
          <ArrowPathIcon className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Job list */}
      <ScrollArea className="max-h-96">
        <div className="space-y-3">
          {jobs.map((job) => (
            <JobStatusCard
              key={job.id}
              job={job}
              detailed={detailed}
              onAction={(action) => handleJobAction(job, action)}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

/**
 * Simplified job status badge component
 */
export function JobStatusBadge({ 
  job, 
  showProgress = false 
}: { 
  job: Job; 
  showProgress?: boolean; 
}) {
  const StatusIcon = STATUS_ICONS[job.status];
  const statusColor = STATUS_COLORS[job.status];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={cn("flex items-center gap-1", statusColor)}>
            <StatusIcon className="h-3 w-3" />
            {job.status}
            {showProgress && job.progress && job.status === 'running' && (
              <span className="ml-1">{job.progress.percentage}%</span>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs space-y-1">
            <div>Job ID: {job.id}</div>
            <div>Type: {JOB_TYPE_LABELS[job.type]}</div>
            <div>Created: {formatTimestamp(job.timestamps.created)}</div>
            {job.progress && job.status === 'running' && (
              <div>Progress: {job.progress.currentStep}</div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}