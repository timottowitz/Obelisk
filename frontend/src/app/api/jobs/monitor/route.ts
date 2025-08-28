/**
 * Job Monitoring API Route
 * Provides system health monitoring and alerting
 */

import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { getJobMonitoringService, startJobMonitoring } from '@/lib/services/job-monitoring';

/**
 * GET /api/jobs/monitor
 * Get system health status and monitoring information
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

    const monitoringService = getJobMonitoringService();

    switch (action) {
      case 'health':
        const health = await monitoringService.getSystemHealth();
        return NextResponse.json({
          success: true,
          ...health
        });

      case 'alerts':
        const limit = parseInt(searchParams.get('limit') || '50');
        const alerts = monitoringService.getRecentAlerts(limit);
        return NextResponse.json({
          success: true,
          alerts,
          totalAlerts: alerts.length
        });

      case 'status':
        return NextResponse.json({
          success: true,
          monitoring: {
            active: true, // We don't expose internal monitoring state
            timestamp: new Date().toISOString()
          }
        });

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Valid actions: health, alerts, status` },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('GET /api/jobs/monitor error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/jobs/monitor
 * Control monitoring service and acknowledge alerts
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
    const { action, alertId } = body;

    const monitoringService = getJobMonitoringService();

    switch (action) {
      case 'acknowledge':
        if (!alertId) {
          return NextResponse.json(
            { error: 'Alert ID is required for acknowledge action' },
            { status: 400 }
          );
        }
        
        const acknowledged = monitoringService.acknowledgeAlert(alertId);
        return NextResponse.json({
          success: acknowledged,
          message: acknowledged ? 'Alert acknowledged' : 'Alert not found'
        });

      case 'start':
        startJobMonitoring();
        return NextResponse.json({
          success: true,
          message: 'Monitoring service started'
        });

      case 'stop':
        monitoringService.stop();
        return NextResponse.json({
          success: true,
          message: 'Monitoring service stopped'
        });

      case 'create_test_alert':
        // For testing purposes - remove in production
        const testAlert = monitoringService.createAlert(
          'info',
          'Test Alert',
          'This is a test alert created via API',
          { source: 'api', userId }
        );
        return NextResponse.json({
          success: true,
          alert: testAlert,
          message: 'Test alert created'
        });

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Valid actions: acknowledge, start, stop, create_test_alert` },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('POST /api/jobs/monitor error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}