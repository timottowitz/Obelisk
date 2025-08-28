/**
 * Bulk Email Storage API
 * Creates multiple background jobs for bulk email content storage
 */

import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getJobQueueService } from '@/lib/services/job-queue';
import { EmailStorageJobData } from '@/lib/services/job-types';

// Request validation schema
const bulkStoreRequestSchema = z.object({
  emailAssignments: z.array(z.object({
    emailId: z.string(),
    caseId: z.string().uuid()
  })).min(1).max(500), // Limit to 500 storage operations per batch
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional().default('normal'),
  forceRestore: z.boolean().optional().default(false),
  skipAttachments: z.boolean().optional().default(false),
  description: z.string().optional()
});

/**
 * POST /api/emails/bulk-store
 * Create multiple email storage jobs
 */
export async function POST(request: NextRequest) {
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

    // Parse and validate request body
    const body = await request.json();
    const validatedData = bulkStoreRequestSchema.parse(body);

    // Validate that we have a reasonable number for bulk processing
    if (validatedData.emailAssignments.length < 2) {
      return NextResponse.json(
        { 
          error: 'Bulk storage requires at least 2 email assignments',
          suggestion: 'For single email storage, use the individual assignment API'
        },
        { status: 400 }
      );
    }

    // Get job queue service
    const jobQueue = getJobQueueService();

    // Create individual storage jobs for each email
    const jobs = [];
    const jobCreationResults = [];

    for (const assignment of validatedData.emailAssignments) {
      try {
        const jobData: EmailStorageJobData = {
          type: 'email_storage',
          orgId,
          userId,
          emailId: assignment.emailId,
          caseId: assignment.caseId,
          forceRestore: validatedData.forceRestore,
          skipAttachments: validatedData.skipAttachments,
          description: `Store email ${assignment.emailId} for case ${assignment.caseId}`
        };

        const job = await jobQueue.createJob({
          type: 'email_storage',
          data: jobData,
          priority: validatedData.priority,
          timeout: 600000, // 10 minutes per email storage
          maxRetries: 3,
          metadata: {
            bulkOperation: true,
            batchId: crypto.randomUUID(),
            emailId: assignment.emailId,
            caseId: assignment.caseId
          }
        });

        jobs.push(job);
        jobCreationResults.push({
          emailId: assignment.emailId,
          caseId: assignment.caseId,
          jobId: job.id,
          status: 'created'
        });

      } catch (error) {
        jobCreationResults.push({
          emailId: assignment.emailId,
          caseId: assignment.caseId,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Calculate summary
    const successfulJobs = jobCreationResults.filter(r => r.status === 'created');
    const failedJobs = jobCreationResults.filter(r => r.status === 'failed');

    // Return comprehensive response
    return NextResponse.json({
      success: failedJobs.length === 0,
      summary: {
        totalRequested: validatedData.emailAssignments.length,
        jobsCreated: successfulJobs.length,
        jobsFailed: failedJobs.length
      },
      jobs: jobs.map(job => ({
        id: job.id,
        type: job.type,
        status: job.status,
        priority: job.priority,
        emailId: job.data.emailId,
        caseId: job.data.caseId
      })),
      results: jobCreationResults,
      message: `Created ${successfulJobs.length} email storage jobs${failedJobs.length > 0 ? `, ${failedJobs.length} failed` : ''}`,
      tracking: {
        jobIds: jobs.map(j => j.id),
        statusEndpoint: '/api/jobs',
        bulkCancelEndpoint: '/api/jobs'
      }
    });

  } catch (error) {
    console.error('Bulk storage endpoint error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}