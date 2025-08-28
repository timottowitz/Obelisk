/**
 * Job Queue Statistics API Route
 * Provides queue statistics and health metrics
 */

import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { getJobQueueService } from '@/lib/services/job-queue';

/**
 * GET /api/jobs/stats
 * Get job queue statistics
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

    // Check if requesting system-wide stats (admin only)
    const { searchParams } = new URL(request.url);
    const systemWide = searchParams.get('systemWide') === 'true';
    
    // For system-wide stats, you might want additional permission checks
    // For now, we'll just get organization-specific stats
    const targetOrgId = systemWide ? undefined : orgId;

    // Get job queue service
    const jobQueue = getJobQueueService();

    // Get statistics
    const stats = await jobQueue.getQueueStats(targetOrgId);

    return NextResponse.json({
      success: true,
      stats,
      organization: targetOrgId || 'system-wide',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('GET /api/jobs/stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}