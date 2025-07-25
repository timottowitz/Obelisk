/**
 * Meeting Statistics Overview
 * Displays key metrics for meeting intelligence dashboard
 * Extends existing dashboard patterns with meeting-specific KPIs
 */

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Users, 
  Clock, 
  CheckCircle, 
  TrendingUp, 
  Calendar,
  FileText,
  Target,
  MessageSquare
} from 'lucide-react';

interface MeetingStatsData {
  totalMeetings: number;
  totalDuration: number; // in minutes
  avgParticipants: number;
  completionRate: number; // percentage
  actionItemsCreated: number;
  decisionsTracked: number;
  topicsDiscussed: number;
  meetingsByType: {
    meeting: number;
    call: number;
    interview: number;
    consultation: number;
  };
  recentTrends: {
    meetingsThisWeek: number;
    meetingsLastWeek: number;
    durationThisWeek: number;
    durationLastWeek: number;
  };
  processingStatus: {
    completed: number;
    processing: number;
    failed: number;
  };
}

export function MeetingStats() {
  const [stats, setStats] = useState<MeetingStatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMeetingStats();
  }, []);

  const fetchMeetingStats = async () => {
    try {
      setIsLoading(true);
      
      // In a real implementation, this would call your API
      // For now, we'll simulate with mock data
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockStats: MeetingStatsData = {
        totalMeetings: 147,
        totalDuration: 8420, // minutes
        avgParticipants: 3.2,
        completionRate: 94.5,
        actionItemsCreated: 284,
        decisionsTracked: 156,
        topicsDiscussed: 847,
        meetingsByType: {
          meeting: 89,
          call: 34,
          interview: 15,
          consultation: 9
        },
        recentTrends: {
          meetingsThisWeek: 23,
          meetingsLastWeek: 19,
          durationThisWeek: 1240,
          durationLastWeek: 1050
        },
        processingStatus: {
          completed: 139,
          processing: 6,
          failed: 2
        }
      };
      
      setStats(mockStats);
      setError(null);
    } catch (err) {
      setError('Failed to load meeting statistics');
      console.error('Failed to fetch meeting stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Format duration in a human-readable way
  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${minutes}m`;
  };

  // Calculate trend percentage
  const calculateTrend = (current: number, previous: number): { value: number; isPositive: boolean } => {
    if (previous === 0) return { value: 0, isPositive: true };
    const change = ((current - previous) / previous) * 100;
    return { value: Math.abs(change), isPositive: change >= 0 };
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-[80px] mb-2" />
              <Skeleton className="h-3 w-[120px]" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !stats) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">{error || 'No data available'}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const meetingsTrend = calculateTrend(stats.recentTrends.meetingsThisWeek, stats.recentTrends.meetingsLastWeek);
  const durationTrend = calculateTrend(stats.recentTrends.durationThisWeek, stats.recentTrends.durationLastWeek);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Meetings */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Meetings</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalMeetings}</div>
          <div className="flex items-center text-xs text-muted-foreground">
            <TrendingUp className={`mr-1 h-3 w-3 ${meetingsTrend.isPositive ? 'text-green-500' : 'text-red-500'}`} />
            <span className={meetingsTrend.isPositive ? 'text-green-600' : 'text-red-600'}>
              {meetingsTrend.isPositive ? '+' : '-'}{meetingsTrend.value.toFixed(1)}%
            </span>
            <span className="ml-1">from last week</span>
          </div>
        </CardContent>
      </Card>

      {/* Total Duration */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Duration</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatDuration(stats.totalDuration)}</div>
          <div className="flex items-center text-xs text-muted-foreground">
            <TrendingUp className={`mr-1 h-3 w-3 ${durationTrend.isPositive ? 'text-green-500' : 'text-red-500'}`} />
            <span className={durationTrend.isPositive ? 'text-green-600' : 'text-red-600'}>
              {durationTrend.isPositive ? '+' : '-'}{durationTrend.value.toFixed(1)}%
            </span>
            <span className="ml-1">from last week</span>
          </div>
        </CardContent>
      </Card>

      {/* Average Participants */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Participants</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.avgParticipants.toFixed(1)}</div>
          <p className="text-xs text-muted-foreground">
            per meeting session
          </p>
        </CardContent>
      </Card>

      {/* Completion Rate */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.completionRate}%</div>
          <Progress value={stats.completionRate} className="mt-2" />
        </CardContent>
      </Card>

      {/* Action Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Action Items</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.actionItemsCreated}</div>
          <p className="text-xs text-muted-foreground">
            tasks identified by AI
          </p>
        </CardContent>
      </Card>

      {/* Decisions Tracked */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Decisions</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.decisionsTracked}</div>
          <p className="text-xs text-muted-foreground">
            decisions documented
          </p>
        </CardContent>
      </Card>

      {/* Topics Discussed */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Topics</CardTitle>
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.topicsDiscussed}</div>
          <p className="text-xs text-muted-foreground">
            unique topics analyzed
          </p>
        </CardContent>
      </Card>

      {/* Meeting Types Breakdown */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">By Type</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm">Meetings</span>
              <Badge variant="default" className="text-xs">
                {stats.meetingsByType.meeting}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Legal Calls</span>
              <Badge variant="secondary" className="text-xs">
                {stats.meetingsByType.call}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Interviews</span>
              <Badge variant="outline" className="text-xs">
                {stats.meetingsByType.interview}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Consultations</span>
              <Badge variant="destructive" className="text-xs">
                {stats.meetingsByType.consultation}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}