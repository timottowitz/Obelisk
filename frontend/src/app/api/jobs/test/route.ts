/**
 * Job System Testing API Route
 * Provides testing and validation endpoints for the job processing system
 */

import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { 
  runJobSystemTests, 
  quickHealthCheck, 
  createTestJobs 
} from '@/lib/services/test-job-system';

/**
 * GET /api/jobs/test
 * Run various tests on the job system
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

    const { searchParams } = new URL(request.url);
    const testType = searchParams.get('type') || 'health';

    switch (testType) {
      case 'health':
        const health = await quickHealthCheck();
        return NextResponse.json({
          success: true,
          testType: 'health',
          ...health,
          timestamp: new Date().toISOString()
        });

      case 'comprehensive':
        const testConfig = {
          orgId,
          userId,
          testCaseId: searchParams.get('caseId') || 'test-case-id',
          testEmailIds: searchParams.get('emailIds')?.split(',') || ['test-email-1', 'test-email-2']
        };

        const testResults = await runJobSystemTests(testConfig);
        return NextResponse.json({
          success: testResults.success,
          testType: 'comprehensive',
          ...testResults,
          timestamp: new Date().toISOString()
        });

      default:
        return NextResponse.json(
          { error: `Unknown test type: ${testType}. Valid types: health, comprehensive` },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('GET /api/jobs/test error:', error);
    return NextResponse.json(
      { 
        error: 'Test execution failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/jobs/test
 * Create test jobs and data
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

    const body = await request.json().catch(() => ({}));
    const { action, caseId, emailIds } = body;

    switch (action) {
      case 'create_test_jobs':
        const testConfig = {
          orgId,
          userId,
          testCaseId: caseId || 'test-case-id',
          testEmailIds: emailIds || ['test-email-1', 'test-email-2', 'test-email-3']
        };

        const result = await createTestJobs(testConfig);
        return NextResponse.json({
          success: result.success,
          action: 'create_test_jobs',
          jobs: result.jobs,
          message: result.success 
            ? `Created ${result.jobs.length} test jobs` 
            : 'Failed to create test jobs',
          timestamp: new Date().toISOString()
        });

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Valid actions: create_test_jobs` },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('POST /api/jobs/test error:', error);
    return NextResponse.json(
      { 
        error: 'Test operation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}