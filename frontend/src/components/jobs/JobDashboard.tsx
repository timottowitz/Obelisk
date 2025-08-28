/**
 * Job Processing Dashboard Component
 * Comprehensive dashboard for monitoring and managing the job processing system
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  ClockIcon,
  PlayIcon,
  StopIcon,
  ArrowPathIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { useJobs } from '@/hooks/useJobStatus';
import JobStatusTracker from './JobStatusTracker';
import { cn } from '@/lib/utils';

interface SystemHealth {
  healthy: boolean;
  overallScore: number;
  components: {
    workers: {
      healthy: boolean;
      activeWorkers: number;
      totalWorkers: number;
      issues: string[];
    };
    queue: {
      healthy: boolean;
      queuedJobs: number;
      runningJobs: number;
      avgWaitTime: number;
      issues: string[];
    };
    processing: {
      healthy: boolean;
      throughput: number;
      errorRate: number;
      avgProcessingTime: number;
      issues: string[];
    };
  };
  alerts: Array<{
    id: string;
    severity: 'info' | 'warning' | 'error' | 'critical';
    title: string;
    message: string;
    timestamp: string;
    acknowledged: boolean;
  }>;
  lastCheck: string;
}

interface JobDashboardProps {
  className?: string;
  orgId?: string;
}

export default function JobDashboard({ className, orgId }: JobDashboardProps) {
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Use the jobs hook to get recent jobs
  const {
    jobs: recentJobs,
    loading: jobsLoading,
    refresh: refreshJobs
  } = useJobs(
    { 
      status: ['queued', 'running', 'failed', 'completed'],
    },
    { 
      page: 0, 
      limit: 10, 
      sortBy: 'created', 
      sortOrder: 'desc' 
    },
    { autoRefresh: true, refreshInterval: 10000 }
  );

  // Fetch system health
  const fetchSystemHealth = async () => {
    if (!orgId) return;
    
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/jobs/monitor?action=health', {
        headers: {
          'X-Org-Id': orgId
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch system health: ${response.statusText}`);
      }

      const data = await response.json();
      setSystemHealth(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch system health');
    } finally {
      setLoading(false);
    }
  };

  // System control actions
  const performSystemAction = async (action: string) => {
    if (!orgId) return;
    
    try {
      const response = await fetch('/api/jobs/system', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Org-Id': orgId
        },
        body: JSON.stringify({ action })
      });

      if (!response.ok) {
        throw new Error(`Action failed: ${response.statusText}`);
      }

      // Refresh health after action
      setTimeout(() => fetchSystemHealth(), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    }
  };

  // Worker control actions
  const performWorkerAction = async (action: string) => {
    if (!orgId) return;
    
    try {
      const response = await fetch('/api/jobs/workers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Org-Id': orgId
        },
        body: JSON.stringify({ action })
      });

      if (!response.ok) {
        throw new Error(`Worker action failed: ${response.statusText}`);
      }

      // Refresh health after action
      setTimeout(() => fetchSystemHealth(), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Worker action failed');
    }
  };

  // Acknowledge alert
  const acknowledgeAlert = async (alertId: string) => {
    if (!orgId) return;
    
    try {
      const response = await fetch('/api/jobs/monitor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Org-Id': orgId
        },
        body: JSON.stringify({ action: 'acknowledge', alertId })
      });

      if (response.ok) {
        // Refresh health to update alert status
        fetchSystemHealth();
      }
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  };

  // Auto-refresh effect
  useEffect(() => {
    fetchSystemHealth();
    
    if (autoRefresh) {
      const interval = setInterval(fetchSystemHealth, 30000); // 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh, orgId]);

  const getHealthColor = (healthy: boolean, score?: number) => {
    if (score !== undefined) {
      if (score >= 90) return 'text-green-600';
      if (score >= 70) return 'text-yellow-600';
      if (score >= 50) return 'text-orange-600';
      return 'text-red-600';
    }
    return healthy ? 'text-green-600' : 'text-red-600';
  };

  const getHealthIcon = (healthy: boolean) => {
    return healthy ? CheckCircleIcon : ExclamationTriangleIcon;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'error': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'info': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (error) {
    return (
      <Alert variant="destructive" className={className}>
        <ExclamationTriangleIcon className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Job Processing Dashboard</h2>
          <p className="text-muted-foreground">
            Monitor and manage background job processing
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <ArrowPathIcon className={cn("h-4 w-4 mr-2", autoRefresh && "animate-spin")} />
            Auto-refresh: {autoRefresh ? 'On' : 'Off'}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSystemHealth}
            disabled={loading}
          >
            <ArrowPathIcon className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* System Health Overview */}
      {systemHealth && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChartBarIcon className="h-5 w-5" />
              System Health
              <Badge 
                variant="outline" 
                className={cn(
                  "ml-auto",
                  systemHealth.healthy ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                )}
              >
                {systemHealth.overallScore}/100
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={systemHealth.overallScore} className="h-3" />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Workers */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Cog6ToothIcon className="h-4 w-4" />
                  <span className="font-medium">Workers</span>
                  <Badge 
                    variant="outline" 
                    className={systemHealth.components.workers.healthy ? "bg-green-50" : "bg-red-50"}
                  >
                    {systemHealth.components.workers.activeWorkers}/{systemHealth.components.workers.totalWorkers}
                  </Badge>
                </div>
                {systemHealth.components.workers.issues.map((issue, idx) => (
                  <p key={idx} className="text-xs text-muted-foreground">⚠️ {issue}</p>
                ))}
              </div>

              {/* Queue */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <ClockIcon className="h-4 w-4" />
                  <span className="font-medium">Queue</span>
                  <Badge variant="outline">
                    {systemHealth.components.queue.queuedJobs} queued
                  </Badge>
                </div>
                {systemHealth.components.queue.issues.map((issue, idx) => (
                  <p key={idx} className="text-xs text-muted-foreground">⚠️ {issue}</p>
                ))}
              </div>

              {/* Processing */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <PlayIcon className="h-4 w-4" />
                  <span className="font-medium">Processing</span>
                  <Badge variant="outline">
                    {systemHealth.components.processing.errorRate.toFixed(1)}% errors
                  </Badge>
                </div>
                {systemHealth.components.processing.issues.map((issue, idx) => (
                  <p key={idx} className="text-xs text-muted-foreground">⚠️ {issue}</p>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="jobs">Recent Jobs</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="controls">Controls</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Queued Jobs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {systemHealth?.components.queue.queuedJobs || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Running Jobs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {systemHealth?.components.queue.runningJobs || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Active Workers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {systemHealth?.components.workers.activeWorkers || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {systemHealth?.components.processing.errorRate.toFixed(1) || 0}%
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Jobs Tab */}
        <TabsContent value="jobs">
          <Card>
            <CardHeader>
              <CardTitle>Recent Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              {jobsLoading ? (
                <div className="text-center py-4">Loading jobs...</div>
              ) : (
                <JobStatusTracker 
                  jobs={recentJobs}
                  detailed={true}
                  autoRefresh={autoRefresh}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle>System Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {systemHealth?.alerts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No alerts
                    </div>
                  ) : (
                    systemHealth?.alerts.map((alert) => (
                      <div 
                        key={alert.id}
                        className={cn(
                          "p-3 rounded-lg border",
                          getSeverityColor(alert.severity),
                          alert.acknowledged && "opacity-60"
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="font-medium">{alert.title}</div>
                            <div className="text-sm">{alert.message}</div>
                            <div className="text-xs opacity-70">
                              {new Date(alert.timestamp).toLocaleString()}
                            </div>
                          </div>
                          {!alert.acknowledged && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => acknowledgeAlert(alert.id)}
                            >
                              <CheckCircleIcon className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Controls Tab */}
        <TabsContent value="controls">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>System Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  onClick={() => performSystemAction('initialize')}
                  className="w-full"
                >
                  <PlayIcon className="h-4 w-4 mr-2" />
                  Initialize System
                </Button>
                
                <Button 
                  onClick={() => performSystemAction('restart')}
                  variant="outline"
                  className="w-full"
                >
                  <ArrowPathIcon className="h-4 w-4 mr-2" />
                  Restart System
                </Button>
                
                <Button 
                  onClick={() => performSystemAction('health-check')}
                  variant="outline"
                  className="w-full"
                >
                  <EyeIcon className="h-4 w-4 mr-2" />
                  Health Check
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Worker Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  onClick={() => performWorkerAction('start')}
                  className="w-full"
                >
                  <PlayIcon className="h-4 w-4 mr-2" />
                  Start Workers
                </Button>
                
                <Button 
                  onClick={() => performWorkerAction('restart')}
                  variant="outline"
                  className="w-full"
                >
                  <ArrowPathIcon className="h-4 w-4 mr-2" />
                  Restart Workers
                </Button>
                
                <Button 
                  onClick={() => performWorkerAction('health')}
                  variant="outline"
                  className="w-full"
                >
                  <EyeIcon className="h-4 w-4 mr-2" />
                  Worker Health
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}