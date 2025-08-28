/**
 * Bulk Email Assignment API
 * Creates background jobs for bulk email assignment operations
 */

import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getJobQueueService } from '@/lib/services/job-queue';
import { BulkAssignmentJobData } from '@/lib/services/job-types';

// Request validation schema
const bulkAssignRequestSchema = z.object({
  emailIds: z.array(z.string()).min(1).max(1000), // Limit to 1000 emails per bulk operation
  caseId: z.string().uuid('Invalid case ID format'),
  batchSize: z.number().min(1).max(100).optional().default(10),
  skipExisting: z.boolean().optional().default(true),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional().default('normal'),
  description: z.string().optional()
});

/**
 * POST /api/emails/bulk-assign
 * Create a bulk assignment job for multiple emails
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
    const validatedData = bulkAssignRequestSchema.parse(body);

    // Validate that we have a reasonable number of emails for bulk processing
    if (validatedData.emailIds.length < 2) {
      return NextResponse.json(
        { 
          error: 'Bulk assignment requires at least 2 emails',
          suggestion: 'For single email assignments, use the individual assignment API'
        },
        { status: 400 }
      );
    }

    // Create job data
    const jobData: BulkAssignmentJobData = {
      type: 'email_bulk_assignment',
      orgId,
      userId,
      emailIds: validatedData.emailIds,
      caseId: validatedData.caseId,
      batchSize: validatedData.batchSize,
      skipExisting: validatedData.skipExisting,
      description: validatedData.description || `Bulk assign ${validatedData.emailIds.length} emails to case`
    };

    // Get job queue service
    const jobQueue = getJobQueueService();

    // Create the bulk assignment job
    const job = await jobQueue.createJob({
      type: 'email_bulk_assignment',
      data: jobData,
      priority: validatedData.priority,
      timeout: Math.max(300000, validatedData.emailIds.length * 5000), // 5 seconds per email, minimum 5 minutes
      maxRetries: 2, // Limited retries for bulk operations
      metadata: {
        totalEmails: validatedData.emailIds.length,
        estimatedDuration: validatedData.emailIds.length * 5000,
        batchSize: validatedData.batchSize
      }
    });

    // Return job information
    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        type: job.type,
        status: job.status,
        priority: job.priority,
        estimatedDuration: job.metadata?.estimatedDuration,
        totalEmails: validatedData.emailIds.length,
        batchSize: validatedData.batchSize
      },
      message: `Bulk assignment job created for ${validatedData.emailIds.length} emails`,
      tracking: {
        jobId: job.id,
        statusEndpoint: `/api/jobs/${job.id}`,
        cancelEndpoint: `/api/jobs/${job.id}/cancel`
      }
    });

  } catch (error) {
    console.error('Bulk assignment endpoint error:', error);

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