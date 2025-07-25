/**
 * Recent Meetings Widget
 * Shows latest meeting activity with quick actions
 * Integrates with existing dashboard patterns
 */

'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Clock, 
  Users, 
  Play, 
  Eye, 
  MoreVertical,
  FileText,
  Calendar
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface RecentMeeting {
  id: string;
  title: string;
  type: 'meeting' | 'call' | 'interview' | 'consultation';
  startTime: string;
  duration: number; // in minutes
  status: 'completed' | 'processing' | 'failed' | 'in_progress';
  participantCount: number;
  hostName: string;
  hostInitials: string;
  hasRecording: boolean;
  hasTranscript: boolean;
  aiSummary?: string;
  actionItemCount?: number;
}

export function RecentMeetings() {
  const [meetings, setMeetings] = useState<RecentMeeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRecentMeetings();
  }, []);

  const fetchRecentMeetings = async () => {
    try {
      setIsLoading(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const mockMeetings: RecentMeeting[] = [
        {
          id: '1',
          title: 'Client Strategy Review',
          type: 'meeting',
          startTime: '2025-01-23T14:30:00Z',
          duration: 45,
          status: 'completed',
          participantCount: 4,
          hostName: 'Sarah Wilson',
          hostInitials: 'SW',
          hasRecording: true,
          hasTranscript: true,
          aiSummary: 'Discussed Q1 goals and budget allocation',
          actionItemCount: 3,
        },
        {
          id: '2',
          title: 'Legal Consultation - ABC Corp',
          type: 'consultation',
          startTime: '2025-01-23T11:00:00Z',
          duration: 60,
          status: 'processing',
          participantCount: 2,
          hostName: 'Mike Johnson',
          hostInitials: 'MJ',
          hasRecording: true,
          hasTranscript: false,
          actionItemCount: 2,
        },
        {
          id: '3',
          title: 'Team Standup',
          type: 'meeting',
          startTime: '2025-01-23T09:30:00Z',
          duration: 30,
          status: 'completed',
          participantCount: 6,
          hostName: 'Emily Chen',
          hostInitials: 'EC',
          hasRecording: true,
          hasTranscript: true,
          aiSummary: 'Sprint progress update and blocker discussion',
          actionItemCount: 5,
        },
        {
          id: '4',
          title: 'Candidate Interview - Senior Dev',
          type: 'interview',
          startTime: '2025-01-22T16:00:00Z',
          duration: 75,
          status: 'completed',
          participantCount: 3,
          hostName: 'David Brown',
          hostInitials: 'DB',
          hasRecording: true,
          hasTranscript: true,
          aiSummary: 'Technical interview with strong candidate',
          actionItemCount: 1,
        },
        {
          id: '5',
          title: 'Contract Review Call',
          type: 'call',
          startTime: '2025-01-22T13:15:00Z',
          duration: 25,
          status: 'completed',
          participantCount: 2,
          hostName: 'Sarah Wilson',
          hostInitials: 'SW',
          hasRecording: true,
          hasTranscript: true,
          actionItemCount: 2,
        },
      ];
      
      setMeetings(mockMeetings);
    } catch (error) {
      console.error('Failed to fetch recent meetings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getMeetingTypeConfig = (type: string) => {
    const configs = {
      meeting: { variant: 'default' as const, label: 'Meeting', color: 'bg-blue-100' },
      call: { variant: 'secondary' as const, label: 'Call', color: 'bg-green-100' },
      interview: { variant: 'outline' as const, label: 'Interview', color: 'bg-purple-100' },
      consultation: { variant: 'destructive' as const, label: 'Consultation', color: 'bg-orange-100' },
    };
    
    return configs[type as keyof typeof configs] || configs.meeting;
  };

  const getStatusConfig = (status: string) => {
    const configs = {
      completed: { color: 'text-green-600', label: '✅' },
      processing: { color: 'text-yellow-600', label: '⏳' },
      failed: { color: 'text-red-600', label: '❌' },
      in_progress: { color: 'text-blue-600', label: '🔄' },
    };
    
    return configs[status as keyof typeof configs] || configs.completed;
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${minutes}m`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Recent Activity</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-muted animate-pulse rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                  <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Recent Activity</span>
          </CardTitle>
          <Button variant="ghost" size="sm">
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {meetings.map((meeting) => {
            const typeConfig = getMeetingTypeConfig(meeting.type);
            const statusConfig = getStatusConfig(meeting.status);
            
            return (
              <div key={meeting.id} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <Avatar className={`h-8 w-8 ${typeConfig.color}`}>
                  <AvatarFallback className="text-xs font-medium">
                    {meeting.hostInitials}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="font-medium text-sm truncate">
                      {meeting.title}
                    </h4>
                    <span className={`text-xs ${statusConfig.color}`}>
                      {statusConfig.label}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-3 text-xs text-muted-foreground mb-2">
                    <Badge variant={typeConfig.variant} className="text-xs">
                      {typeConfig.label}
                    </Badge>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>{formatDuration(meeting.duration)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Users className="h-3 w-3" />
                      <span>{meeting.participantCount}</span>
                    </div>
                  </div>
                  
                  <div className="text-xs text-muted-foreground mb-2">
                    {format(new Date(meeting.startTime), 'MMM dd, HH:mm')} • {meeting.hostName}
                  </div>
                  
                  {meeting.aiSummary && (
                    <p className="text-xs text-muted-foreground truncate mb-2">
                      {meeting.aiSummary}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {meeting.actionItemCount && meeting.actionItemCount > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {meeting.actionItemCount} action{meeting.actionItemCount !== 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      {meeting.hasRecording && meeting.status === 'completed' && (
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                          <Play className="h-3 w-3" />
                        </Button>
                      )}
                      
                      {meeting.hasTranscript && (
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                          <FileText className="h-3 w-3" />
                        </Button>
                      )}
                      
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                        <Eye className="h-3 w-3" />
                      </Button>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>View Details</DropdownMenuItem>
                          <DropdownMenuItem>Share</DropdownMenuItem>
                          <DropdownMenuItem>Export</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {meetings.length === 0 && (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">No recent meetings</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}