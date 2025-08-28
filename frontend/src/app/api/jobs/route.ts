/**
 * Job Management API Routes
 * Handles CRUD operations for background jobs
 */

import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getJobQueueService } from '@/lib/services/job-queue';
import {
  JobType,
  JobPriority,
  JobFilter,
  JobPagination,
  BulkJobOperation,
  EmailStorageJobData,
  BulkAssignmentJobData,
  EmailAnalysisJobData,
  StorageCleanupJobData,
  MaintenanceJobData,
  ExportJobData
} from '@/lib/services/job-types';

// Validation schemas
const createJobSchema = z.object({
  type: z.enum(['email_storage', 'email_bulk_assignment', 'email_content_analysis', 'cleanup_storage', 'maintenance_task', 'export_case_data']),
  data: z.record(z.any()),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  timeout: z.number().min(1000).max(3600000).optional(), // 1 second to 1 hour
  maxRetries: z.number().min(0).max(10).optional(),
  scheduledFor: z.string().datetime().optional(),
  metadata: z.record(z.any()).optional()
});

const jobFilterSchema = z.object({
  status: z.union([
    z.enum(['pending', 'queued', 'running', 'completed', 'failed', 'cancelled', 'retry', 'stalled']),
    z.array(z.enum(['pending', 'queued', 'running', 'completed', 'failed', 'cancelled', 'retry', 'stalled']))
  ]).optional(),
  type: z.union([
    z.enum(['email_storage', 'email_bulk_assignment', 'email_content_analysis', 'cleanup_storage', 'maintenance_task', 'export_case_data']),
    z.array(z.enum(['email_storage', 'email_bulk_assignment', 'email_content_analysis', 'cleanup_storage', 'maintenance_task', 'export_case_data']))
  ]).optional(),
  priority: z.union([
    z.enum(['low', 'normal', 'high', 'urgent']),
    z.array(z.enum(['low', 'normal', 'high', 'urgent']))
  ]).optional(),
  userId: z.string().optional(),
  caseId: z.string().uuid().optional(),
  dateRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime()
  }).optional(),
  search: z.string().optional()
});

const paginationSchema = z.object({
  page: z.coerce.number().min(0).default(0),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.enum(['created', 'started', 'completed', 'priority', 'status']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
});

const bulkOperationSchema = z.object({
  jobIds: z.array(z.string().uuid()).min(1).max(100),
  operation: z.enum(['cancel', 'retry', 'delete', 'restart']),
  parameters: z.record(z.any()).optional()
});

/**
 * GET /api/jobs
 * List jobs with filtering and pagination
 */
export async function GET(request: NextRequest) {
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    
    // Parse filter parameters
    const filterParams: any = {};
    if (searchParams.get('status')) {
      const statuses = searchParams.get('status')!.split(',');
      filterParams.status = statuses.length === 1 ? statuses[0] : statuses;
    }
    if (searchParams.get('type')) {
      const types = searchParams.get('type')!.split(',');
      filterParams.type = types.length === 1 ? types[0] : types;
    }
    if (searchParams.get('priority')) {
      const priorities = searchParams.get('priority')!.split(',');
      filterParams.priority = priorities.length === 1 ? priorities[0] : priorities;
    }
    if (searchParams.get('userId')) {
      filterParams.userId = searchParams.get('userId');
    }
    if (searchParams.get('caseId')) {
      filterParams.caseId = searchParams.get('caseId');
    }
    if (searchParams.get('startDate') && searchParams.get('endDate')) {
      filterParams.dateRange = {
        start: searchParams.get('startDate'),
        end: searchParams.get('endDate')
      };
    }
    if (searchParams.get('search')) {
      filterParams.search = searchParams.get('search');
    }

    // Parse pagination parameters
    const paginationParams = {
      page: parseInt(searchParams.get('page') || '0'),
      limit: parseInt(searchParams.get('limit') || '20'),
      sortBy: searchParams.get('sortBy') || 'created',
      sortOrder: searchParams.get('sortOrder') || 'desc'
    };

    // Validate parameters
    const filter = filterParams ? jobFilterSchema.parse(filterParams) : undefined;
    const pagination = paginationSchema.parse(paginationParams);

    // Get job queue service
    const jobQueue = getJobQueueService();

    // Query jobs
    const result = await jobQueue.queryJobs(orgId, filter, pagination);

    return NextResponse.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('GET /api/jobs error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid parameters',
          details: error.errors.map(e => e.message)
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

/**
 * POST /api/jobs
 * Create a new job
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
    const validatedData = createJobSchema.parse(body);

    // Ensure job data includes required fields
    const jobData = {
      ...validatedData.data,
      orgId,
      userId,
      type: validatedData.type
    };

    // Validate job-specific data based on type
    switch (validatedData.type) {
      case 'email_storage':
        if (!jobData.emailId || !jobData.caseId) {
          return NextResponse.json(
            { error: 'emailId and caseId are required for email_storage jobs' },
            { status: 400 }
          );
        }
        break;
      
      case 'email_bulk_assignment':
        if (!jobData.emailIds || !Array.isArray(jobData.emailIds) || !jobData.caseId) {
          return NextResponse.json(
            { error: 'emailIds (array) and caseId are required for email_bulk_assignment jobs' },
            { status: 400 }
          );
        }
        break;

      case 'email_content_analysis':
        if (!jobData.emailId || !jobData.caseId || !jobData.analysisTypes) {
          return NextResponse.json(
            { error: 'emailId, caseId, and analysisTypes are required for email_content_analysis jobs' },
            { status: 400 }
          );
        }
        break;

      case 'cleanup_storage':
        if (!jobData.targetScope) {
          return NextResponse.json(
            { error: 'targetScope is required for cleanup_storage jobs' },
            { status: 400 }
          );
        }
        break;
    }

    // Get job queue service
    const jobQueue = getJobQueueService();

    // Create job
    const job = await jobQueue.createJob({
      type: validatedData.type as JobType,
      data: jobData as any, // Type assertion since we've validated above
      priority: validatedData.priority as JobPriority,
      timeout: validatedData.timeout,
      maxRetries: validatedData.maxRetries,
      scheduledFor: validatedData.scheduledFor ? new Date(validatedData.scheduledFor) : undefined,
      metadata: validatedData.metadata
    });

    return NextResponse.json({
      success: true,
      job
    });

  } catch (error) {
    console.error('POST /api/jobs error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: error.errors.map(e => e.message)
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

/**
 * PATCH /api/jobs
 * Perform bulk operations on jobs
 */
export async function PATCH(request: NextRequest) {
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
    const operation = bulkOperationSchema.parse(body);

    // Get job queue service
    const jobQueue = getJobQueueService();

    // Perform bulk operation
    const result = await jobQueue.bulkOperation(orgId, operation);

    return NextResponse.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('PATCH /api/jobs error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: error.errors.map(e => e.message)
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