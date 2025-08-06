/**
 * Live Meeting Status Component
 * Real-time status updates for active meetings
 * Shows live participants, transcription, and AI insights
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Users, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Clock,
  Activity,
  MessageSquare,
  Target,
  Brain,
  Volume2,
  Circle
} from 'lucide-react';
import { useLiveMeetingUpdates } from '@/hooks/use-meeting-websocket';
import { formatDistanceToNow } from 'date-fns';

interface LiveMeetingStatusProps {
  meetingId: string;
  className?: string;
}

export function LiveMeetingStatus({ meetingId, className }: LiveMeetingStatusProps) {
  const [selectedTab, setSelectedTab] = useState('participants');
  
  const {
    isConnected,
    isConnecting,
    meetingData,
    participants,
    transcription,
    actionItems,
    lastEvent
  } = useLiveMeetingUpdates(meetingId);

  // Mock data for demo purposes (would come from WebSocket in real implementation)
  const mockMeetingData = {
    id: meetingId,
    title: 'Client Strategy Review',
    status: 'in_progress',
    startTime: new Date(Date.now() - 25 * 60 * 1000), // 25 minutes ago
    type: 'meeting',
    duration: 25 * 60, // 25 minutes in seconds
  };

  const mockParticipants = [
    {
      id: '1',
      name: 'Sarah Wilson',
      initials: 'SW',
      role: 'Host',
      isAudioEnabled: true,
      isVideoEnabled: true,
      isSpeaking: true,
      talkTime: 45.2,
      joinedAt: new Date(Date.now() - 25 * 60 * 1000),
    },
    {
      id: '2', 
      name: 'Mike Johnson',
      initials: 'MJ',
      role: 'Participant',
      isAudioEnabled: true,
      isVideoEnabled: false,
      isSpeaking: false,
      talkTime: 32.1,
      joinedAt: new Date(Date.now() - 23 * 60 * 1000),
    },
    {
      id: '3',
      name: 'Emily Chen',
      initials: 'EC', 
      role: 'Participant',
      isAudioEnabled: false,
      isVideoEnabled: true,
      isSpeaking: false,
      talkTime: 22.7,
      joinedAt: new Date(Date.now() - 20 * 60 * 1000),
    },
  ];

  const mockTranscription = "Sarah: We need to focus on the Q1 budget allocation and ensure we're meeting our client deliverables. Mike: I agree, and we should also consider the resource allocation for the new contracts. Emily: The legal review process needs to be streamlined to handle the increased workload...";

  const mockActionItems = [
    {
      id: '1',
      task: 'Review Q1 budget allocation',
      assignee: 'Mike Johnson',
      priority: 'high',
      createdAt: new Date(Date.now() - 5 * 60 * 1000),
    },
    {
      id: '2',
      task: 'Streamline legal review process',
      assignee: 'Emily Chen', 
      priority: 'medium',
      createdAt: new Date(Date.now() - 3 * 60 * 1000),
    },
  ];

  const currentMeeting = meetingData || mockMeetingData;
  const currentParticipants = participants.length > 0 ? participants : mockParticipants;
  const currentTranscription = transcription || mockTranscription;
  const currentActionItems = actionItems.length > 0 ? actionItems : mockActionItems;

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${minutes}m`;
  };

  const getStatusBadge = (status: string) => {
    const config = {
      in_progress: { variant: 'default' as const, label: 'Live', icon: Circle, color: 'text-green-500' },
      scheduled: { variant: 'secondary' as const, label: 'Scheduled', icon: Clock, color: 'text-blue-500' },
      completed: { variant: 'outline' as const, label: 'Completed', icon: Circle, color: 'text-gray-500' },
    };
    
    return config[status as keyof typeof config] || config.in_progress;
  };

  const statusConfig = getStatusBadge(currentMeeting.status);
  const StatusIcon = statusConfig.icon;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <StatusIcon className={`h-4 w-4 ${statusConfig.color} ${currentMeeting.status === 'in_progress' ? 'animate-pulse' : ''}`} />
              <CardTitle className="text-lg">{currentMeeting.title}</CardTitle>
            </div>
            <Badge variant={statusConfig.variant} className="text-xs">
              {statusConfig.label}
            </Badge>
          </div>
          
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <div className="flex items-center space-x-1">
              <Clock className="h-4 w-4" />
              <span>{formatDuration(currentMeeting.duration)}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Users className="h-4 w-4" />
              <span>{currentParticipants.length}</span>
            </div>
          </div>
        </div>

        {/* Connection Status */}
        <div className="flex items-center space-x-2 text-xs">
          <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : isConnecting ? 'bg-yellow-500' : 'bg-red-500'}`} />
          <span className="text-muted-foreground">
            {isConnected ? 'Connected' : isConnecting ? 'Connecting...' : 'Disconnected'}
          </span>
          {lastEvent && (
            <span className="text-muted-foreground">
              • Last update: {formatDistanceToNow(new Date(lastEvent.timestamp), { addSuffix: true })}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="participants">
              <Users className="h-4 w-4 mr-1" />
              Participants
            </TabsTrigger>
            <TabsTrigger value="transcription">
              <MessageSquare className="h-4 w-4 mr-1" />
              Live
            </TabsTrigger>
            <TabsTrigger value="actions">
              <Target className="h-4 w-4 mr-1" />
              Actions
            </TabsTrigger>
            <TabsTrigger value="insights">
              <Brain className="h-4 w-4 mr-1" />
              AI
            </TabsTrigger>
          </TabsList>

          {/* Participants Tab */}
          <TabsContent value="participants" className="space-y-3">
            <ScrollArea className="h-[300px] pr-3">
              {currentParticipants.map((participant) => (
                <div key={participant.id} className="flex items-center justify-between p-3 border rounded-lg mb-2">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={participant.avatar} />
                        <AvatarFallback className="text-xs">
                          {participant.initials}
                        </AvatarFallback>
                      </Avatar>
                      {participant.isSpeaking && (
                        <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 rounded-full animate-pulse" />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-sm">{participant.name}</span>
                        {participant.role === 'Host' && (
                          <Badge variant="outline" className="text-xs">Host</Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Joined {formatDistanceToNow(participant.joinedAt, { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1">
                      {participant.isAudioEnabled ? (
                        <Mic className="h-3 w-3 text-green-600" />
                      ) : (
                        <MicOff className="h-3 w-3 text-red-600" />
                      )}
                      {participant.isVideoEnabled ? (
                        <Video className="h-3 w-3 text-green-600" />
                      ) : (
                        <VideoOff className="h-3 w-3 text-red-600" />
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {participant.talkTime}%
                    </div>
                  </div>
                </div>
              ))}
            </ScrollArea>
          </TabsContent>

          {/* Live Transcription Tab */}
          <TabsContent value="transcription" className="space-y-3">
            <div className="flex items-center space-x-2 mb-2">
              <Volume2 className="h-4 w-4" />
              <span className="text-sm font-medium">Live Transcription</span>
              <Badge variant="outline" className="text-xs">
                Auto-updating
              </Badge>
            </div>
            
            <ScrollArea className="h-[300px] p-3 border rounded-lg bg-muted/20">
              <div className="text-sm leading-relaxed whitespace-pre-wrap">
                {currentTranscription}
                <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-1" />
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Action Items Tab */}
          <TabsContent value="actions" className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Action Items ({currentActionItems.length})</span>
              <Badge variant="secondary" className="text-xs">
                AI Generated
              </Badge>
            </div>
            
            <ScrollArea className="h-[300px] pr-3">
              {currentActionItems.map((item) => (
                <div key={item.id} className="p-3 border rounded-lg mb-2">
                  <div className="flex items-start justify-between mb-1">
                    <span className="font-medium text-sm">{item.task}</span>
                    <Badge 
                      variant={item.priority === 'high' ? 'destructive' : item.priority === 'medium' ? 'secondary' : 'outline'}
                      className="text-xs"
                    >
                      {item.priority}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Assigned to: {item.assignee}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Created {formatDistanceToNow(item.createdAt, { addSuffix: true })}
                  </div>
                </div>
              ))}
              
              {currentActionItems.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No action items detected yet</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* AI Insights Tab */}
          <TabsContent value="insights" className="space-y-3">
            <div className="flex items-center space-x-2 mb-2">
              <Brain className="h-4 w-4" />
              <span className="text-sm font-medium">Real-time AI Insights</span>
            </div>
            
            <div className="space-y-3">
              <div className="p-3 border rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Activity className="h-4 w-4 text-blue-500" />
                  <span className="font-medium text-sm">Engagement Score</span>
                </div>
                <Progress value={78} className="mb-1" />
                <p className="text-xs text-muted-foreground">
                  High participation across all attendees
                </p>
              </div>
              
              <div className="p-3 border rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <MessageSquare className="h-4 w-4 text-green-500" />
                  <span className="font-medium text-sm">Key Topics</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline" className="text-xs">Budget Planning</Badge>
                  <Badge variant="outline" className="text-xs">Resource Allocation</Badge>
                  <Badge variant="outline" className="text-xs">Legal Review</Badge>
                </div>
              </div>
              
              <div className="p-3 border rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Target className="h-4 w-4 text-orange-500" />
                  <span className="font-medium text-sm">Meeting Health</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  ✅ Good time management<br />
                  ✅ Active participation<br />
                  ⚠️ Consider action item assignment
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}