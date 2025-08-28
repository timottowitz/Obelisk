/**
 * Job Processing System Management API
 * Handles system-wide operations for job processing
 */

import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { 
  initializeJobProcessingSystem,
  checkSystemHealth,
  shutdownJobProcessingSystem,
  restartJobProcessingSystem
} from '@/lib/services/system-init';

/**
 * GET /api/jobs/system
 * Get system status and health information
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

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'health';

    switch (action) {
      case 'health':
        const health = await checkSystemHealth();
        return NextResponse.json({
          success: true,
          ...health,
          timestamp: new Date().toISOString()
        });

      case 'status':
        const status = await checkSystemHealth();
        return NextResponse.json({
          success: true,
          system: {
            initialized: status.healthy,
            services: status.details,
            message: status.message
          },
          timestamp: new Date().toISOString()
        });

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Valid actions: health, status` },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('GET /api/jobs/system error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/jobs/system
 * Control system-wide job processing operations
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

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'initialize':
        const initResult = await initializeJobProcessingSystem();
        return NextResponse.json({
          ...initResult,
          timestamp: new Date().toISOString()
        });

      case 'shutdown':
        await shutdownJobProcessingSystem();
        return NextResponse.json({
          success: true,
          message: 'Job processing system shutdown initiated',
          timestamp: new Date().toISOString()
        });

      case 'restart':
        const restartResult = await restartJobProcessingSystem();
        return NextResponse.json({
          ...restartResult,
          timestamp: new Date().toISOString()
        });

      case 'health-check':
        const healthCheck = await checkSystemHealth();
        return NextResponse.json({
          success: true,
          ...healthCheck,
          timestamp: new Date().toISOString()
        });

      default:
        return NextResponse.json(
          { 
            error: `Unknown action: ${action}. Valid actions: initialize, shutdown, restart, health-check` 
          },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('POST /api/jobs/system error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}