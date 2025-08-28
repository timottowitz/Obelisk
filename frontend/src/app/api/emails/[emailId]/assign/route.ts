import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { getJobQueueService } from '@/lib/services/job-queue';
import { EmailStorageJobData } from '@/lib/services/job-types';

// Request validation schema
const assignRequestSchema = z.object({
  caseId: z.string().uuid('Invalid case ID format'),
  useBackgroundJob: z.boolean().optional().default(true), // Use background job for storage by default
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional().default('normal')
});

// Email assignment interface
interface EmailAssignment {
  id: string;
  emailId: string;
  caseId: string;
  assignedBy: string;
  assignedDate: Date;
  storageLocation?: string;
  status: 'pending' | 'completed' | 'failed';
  storageJobId?: string; // Add job ID for tracking background storage
}

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * POST /api/emails/{emailId}/assign
 * Assign an email to a specific case
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { emailId: string } }
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

    // Validate emailId parameter
    const emailId = params.emailId;
    if (!emailId || typeof emailId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid email ID' },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const { caseId, useBackgroundJob, priority } = assignRequestSchema.parse(body);

    // Get tenant schema name
    const tenantSchema = `org_${orgId.replace(/[^a-zA-Z0-9]/g, '_')}`;

    // Verify case exists and user has access
    const { data: caseData, error: caseError } = await supabase
      .from(`${tenantSchema}.cases`)
      .select('id, case_number, full_name, status')
      .eq('id', caseId)
      .single();

    if (caseError || !caseData) {
      console.error('Case lookup error:', caseError);
      return NextResponse.json(
        { error: 'Case not found or access denied' },
        { status: 404 }
      );
    }

    // Check if email is already assigned to this case
    const { data: existingAssignment, error: checkError } = await supabase
      .from(`${tenantSchema}.email_assignments`)
      .select('id, status')
      .eq('email_id', emailId)
      .eq('case_id', caseId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Assignment check error:', checkError);
      return NextResponse.json(
        { error: 'Failed to check existing assignment' },
        { status: 500 }
      );
    }

    if (existingAssignment) {
      return NextResponse.json(
        { 
          error: 'Email is already assigned to this case',
          assignment: {
            id: existingAssignment.id,
            emailId,
            caseId,
            assignedBy: userId,
            assignedDate: new Date(),
            status: existingAssignment.status
          }
        },
        { status: 409 }
      );
    }

    // Create email assignment record
    const assignmentId = crypto.randomUUID();
    const assignedDate = new Date();

    const { data: assignmentData, error: assignmentError } = await supabase
      .from(`${tenantSchema}.email_assignments`)
      .insert({
        id: assignmentId,
        email_id: emailId,
        case_id: caseId,
        assigned_by: userId,
        assigned_date: assignedDate.toISOString(),
        status: assignmentStatus,
        storage_location: `cases/${caseId}/emails/${emailId}/`,
        storage_job_id: storageJobId
      })
      .select()
      .single();

    if (assignmentError) {
      console.error('Assignment creation error:', assignmentError);
      return NextResponse.json(
        { error: 'Failed to create assignment' },
        { status: 500 }
      );
    }

    // Handle email content storage
    let assignmentStatus: 'pending' | 'completed' | 'failed' = useBackgroundJob ? 'pending' : 'completed';
    let storageJobId: string | undefined;
    let storageError: string | undefined;
    
    if (useBackgroundJob) {
      // Create background job for email storage
      try {
        const jobQueue = getJobQueueService();
        
        // Create email storage job data
        const jobData: EmailStorageJobData = {
          type: 'email_storage',
          orgId,
          userId,
          emailId,
          caseId,
          description: `Store email content for assignment to case ${caseData.case_number}`
        };

        // Create the storage job
        const storageJob = await jobQueue.createJob({
          type: 'email_storage',
          data: jobData,
          priority,
          timeout: 600000, // 10 minutes timeout
          maxRetries: 3,
          metadata: {
            assignmentId,
            caseNumber: caseData.case_number,
            assignedBy: userId
          }
        });

        storageJobId = storageJob.id;
        assignmentStatus = 'pending'; // Set status to pending since job is processing
        console.log(`Created background storage job ${storageJobId} for email ${emailId}`);

      } catch (error) {
        console.error('Failed to create storage job:', error);
        storageError = error instanceof Error ? error.message : 'Failed to create storage job';
        assignmentStatus = 'failed';
        // Don't fail the assignment if job creation fails - user can retry later
      }
    }
    
    const assignment: EmailAssignment = {
      id: assignmentId,
      emailId,
      caseId,
      assignedBy: userId,
      assignedDate,
      storageLocation: `cases/${caseId}/emails/${emailId}/`,
      status: assignmentStatus,
      storageJobId
    };

    // Update assignment record with final status
    if (assignmentStatus !== 'pending') {
      const updateData: any = {
        status: assignmentStatus
      };
      
      if (storageError) {
        updateData.error_message = storageError;
      }
      
      const { error: updateError } = await supabase
        .from(`${tenantSchema}.email_assignments`)
        .update(updateData)
        .eq('id', assignmentId);
      
      if (updateError) {
        console.error('Failed to update assignment status:', updateError);
      }
    }
    
    return NextResponse.json({
      success: true,
      assignment,
      case: {
        id: caseData.id,
        caseNumber: caseData.case_number,
        title: caseData.full_name,
        status: caseData.status
      },
      storage: {
        status: assignmentStatus,
        jobId: storageJobId,
        useBackgroundJob,
        error: storageError,
        ...(storageJobId && {
          tracking: {
            statusEndpoint: `/api/jobs/${storageJobId}`,
            cancelEndpoint: `/api/jobs/${storageJobId}/cancel`
          }
        })
      },
      message: useBackgroundJob && storageJobId
        ? `Email assigned to case ${caseData.case_number}. Content storage job ${storageJobId} created.`
        : assignmentStatus === 'completed' 
        ? `Email successfully assigned to case ${caseData.case_number}`
        : `Email assigned to case ${caseData.case_number} (storage ${assignmentStatus})`
    });

  } catch (error) {
    console.error('Assignment endpoint error:', error);

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
 * GET /api/emails/{emailId}/assign
 * Get assignment status for an email
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { emailId: string } }
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

    // Validate emailId parameter
    const emailId = params.emailId;
    if (!emailId || typeof emailId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid email ID' },
        { status: 400 }
      );
    }

    // Get tenant schema name
    const tenantSchema = `org_${orgId.replace(/[^a-zA-Z0-9]/g, '_')}`;

    // Get assignment information
    const { data: assignments, error: assignmentError } = await supabase
      .from(`${tenantSchema}.email_assignments`)
      .select(`
        id,
        email_id,
        case_id,
        assigned_by,
        assigned_date,
        status,
        storage_location,
        cases!inner(
          id,
          case_number,
          full_name,
          status
        )
      `)
      .eq('email_id', emailId)
      .order('assigned_date', { ascending: false });

    if (assignmentError) {
      console.error('Assignment lookup error:', assignmentError);
      return NextResponse.json(
        { error: 'Failed to lookup assignment' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      emailId,
      assignments: assignments?.map(assignment => ({
        id: assignment.id,
        emailId: assignment.email_id,
        caseId: assignment.case_id,
        assignedBy: assignment.assigned_by,
        assignedDate: new Date(assignment.assigned_date),
        status: assignment.status,
        storageLocation: assignment.storage_location,
        case: {
          id: assignment.cases.id,
          caseNumber: assignment.cases.case_number,
          title: assignment.cases.full_name,
          status: assignment.cases.status
        }
      })) || [],
      isAssigned: assignments && assignments.length > 0
    });

  } catch (error) {
    console.error('Assignment status endpoint error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}