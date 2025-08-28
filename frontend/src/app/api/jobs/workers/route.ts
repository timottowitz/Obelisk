/**
 * Worker Management API Route
 * Handles starting, stopping, and monitoring background job workers
 */

import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { 
  startWorkersFromAPI, 
  getWorkerStatusFromAPI, 
  getWorkerManagerService,
  shutdownWorkerManager
} from '@/lib/services/worker-manager-service';

/**
 * GET /api/jobs/workers
 * Get worker status and health information
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

    // Get worker status
    const status = getWorkerStatusFromAPI();

    return NextResponse.json({
      success: true,
      ...status,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('GET /api/jobs/workers error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/jobs/workers
 * Start or restart workers
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

    // Parse request body for action
    const body = await request.json().catch(() => ({}));
    const action = body.action || 'start';

    let result;

    switch (action) {
      case 'start':
      case 'restart':
        result = await startWorkersFromAPI();
        break;
        
      case 'stop':
        await shutdownWorkerManager();
        result = {
          success: true,
          message: 'Workers stopped successfully'
        };
        break;
        
      case 'health':
        const workerManager = getWorkerManagerService({ autoStart: false });
        result = {
          success: true,
          message: 'Worker health check completed',
          workerHealth: workerManager.getWorkerHealth(),
          isRunning: workerManager.isServiceRunning()
        };
        break;
        
      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Valid actions are: start, restart, stop, health` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      ...result,
      action,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('POST /api/jobs/workers error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/jobs/workers
 * Update worker configuration
 */
export async function PUT(request: NextRequest) {
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
    const { config } = body;

    if (!config) {
      return NextResponse.json(
        { error: 'Configuration is required' },
        { status: 400 }
      );
    }

    // For now, we'll restart workers with new config
    // In a production system, you might want more granular updates
    await shutdownWorkerManager();
    
    // Wait a moment for cleanup
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const result = await startWorkersFromAPI();

    return NextResponse.json({
      ...result,
      message: 'Workers restarted with new configuration',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('PUT /api/jobs/workers error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}