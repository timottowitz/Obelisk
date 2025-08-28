/**
 * Job Retry API Route
 * Handles retrying a failed job
 */

import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { getJobQueueService } from '@/lib/services/job-queue';

/**
 * POST /api/jobs/{jobId}/retry
 * Retry a failed or stalled job
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get organization from headers
    const orgId = request.headers.get('X-Org-Id');
    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization ID required' },
        { status: 400 }
      );
    }

    // Validate jobId parameter
    const jobId = params.jobId;
    if (!jobId || typeof jobId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid job ID' },
        { status: 400 }
      );
    }

    // Get job queue service
    const jobQueue = getJobQueueService();

    // Get job to check ownership and status
    const job = await jobQueue.getJob(jobId, orgId);

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // Check if user has access to this job
    if (job.data.userId !== userId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Check if job can be retried
    if (!['failed', 'stalled'].includes(job.status)) {
      return NextResponse.json(
        { 
          error: 'Job cannot be retried',
          details: `Only failed or stalled jobs can be retried. Job is currently ${job.status}`
        },
        { status: 400 }
      );
    }

    // Check if job has exceeded max retries
    if (job.attempts >= job.maxRetries) {
      return NextResponse.json(
        { 
          error: 'Job has exceeded maximum retry attempts',
          details: `Job has already been attempted ${job.attempts} times (max: ${job.maxRetries})`
        },
        { status: 400 }
      );
    }

    // Retry job
    await jobQueue.retryJob(jobId, orgId);

    return NextResponse.json({
      success: true,
      message: 'Job queued for retry',
      jobId,
      attempt: job.attempts + 1,
      maxRetries: job.maxRetries
    });

  } catch (error) {
    console.error('POST /api/jobs/[jobId]/retry error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}