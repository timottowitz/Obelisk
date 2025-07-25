/**
 * Meeting Notification Center
 * Enhanced notification system for meeting intelligence events
 * Integrates with existing notification patterns and toast system
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Bell, 
  BellRing, 
  Check, 
  X, 
  Settings, 
  Filter,
  Users,
  Play,
  Brain,
  Target,
  MessageSquare,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useMeetingWebSocket } from '@/hooks/use-meeting-websocket';

interface MeetingNotification {
  id: string;
  type: 'meeting_started' | 'meeting_ended' | 'participant_joined' | 'participant_left' | 
        'ai_analysis_complete' | 'action_item_created' | 'decision_recorded' | 
        'processing_complete' | 'meeting_reminder';
  title: string;
  message: string;
  meetingId: string;
  meetingTitle: string;
  timestamp: Date;
  isRead: boolean;
  priority: 'high' | 'medium' | 'low';
  data?: any;
}

interface NotificationFilter {
  types: string[];
  priority: string[];
  timeRange: 'all' | 'today' | 'week' | 'month';
  readStatus: 'all' | 'unread' | 'read';
}

export function MeetingNotificationCenter() {
  const [notifications, setNotifications] = useState<MeetingNotification[]>([]);
  const [filter, setFilter] = useState<NotificationFilter>({
    types: [],
    priority: [],
    timeRange: 'all',
    readStatus: 'all',
  });
  const [isOpen, setIsOpen] = useState(false);

  const { addEventListener, isConnected } = useMeetingWebSocket({
    autoConnect: true,
    subscriptions: [
      { type: 'organization_meetings' }
    ]
  });

  // Mock notifications for demo
  useEffect(() => {
    const mockNotifications: MeetingNotification[] = [
      {
        id: '1',
        type: 'ai_analysis_complete',
        title: 'AI Analysis Complete',
        message: 'Meeting analysis ready for "Client Strategy Review"',
        meetingId: 'meeting-1',
        meetingTitle: 'Client Strategy Review',
        timestamp: new Date(Date.now() - 5 * 60 * 1000),
        isRead: false,
        priority: 'high',
      },
      {
        id: '2',
        type: 'action_item_created',
        title: 'New Action Item',
        message: 'AI detected action item: "Review Q1 budget allocation"',
        meetingId: 'meeting-1',
        meetingTitle: 'Client Strategy Review',
        timestamp: new Date(Date.now() - 10 * 60 * 1000),
        isRead: false,
        priority: 'medium',
      },
      {
        id: '3',
        type: 'meeting_started',
        title: 'Meeting Started',
        message: 'Team Standup has begun',
        meetingId: 'meeting-2',
        meetingTitle: 'Team Standup',
        timestamp: new Date(Date.now() - 30 * 60 * 1000),
        isRead: true,
        priority: 'low',
      },
      {
        id: '4',
        type: 'participant_joined',
        title: 'Participant Joined',
        message: 'Sarah Wilson joined Legal Consultation',
        meetingId: 'meeting-3',
        meetingTitle: 'Legal Consultation',
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
        isRead: true,
        priority: 'low',
      },
      {
        id: '5',
        type: 'processing_complete',
        title: 'Processing Complete',
        message: 'Interview recording is ready for review',
        meetingId: 'meeting-4', 
        meetingTitle: 'Senior Developer Interview',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        isRead: false,
        priority: 'medium',
      },
    ];

    setNotifications(mockNotifications);
  }, []);

  // Listen for real-time events
  useEffect(() => {
    const handleMeetingEvent = (event: any) => {
      const newNotification: MeetingNotification = {
        id: `${event.meetingId}-${Date.now()}`,
        type: event.type,
        title: getNotificationTitle(event.type),
        message: getNotificationMessage(event.type, event.data),
        meetingId: event.meetingId,
        meetingTitle: event.data.title || 'Unknown Meeting',
        timestamp: new Date(event.timestamp),
        isRead: false,
        priority: getNotificationPriority(event.type),
        data: event.data,
      };

      setNotifications(prev => [newNotification, ...prev]);
    };

    const eventTypes = [
      'meeting_started', 'meeting_ended', 'participant_joined', 'participant_left',
      'ai_analysis_complete', 'action_item_created', 'decision_recorded', 'processing_complete'
    ];

    const cleanupFunctions = eventTypes.map(eventType => 
      addEventListener(eventType as any, handleMeetingEvent)
    );

    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [addEventListener]);

  const getNotificationIcon = (type: string) => {
    const icons = {
      meeting_started: Play,
      meeting_ended: CheckCircle2,
      participant_joined: Users,
      participant_left: Users,
      ai_analysis_complete: Brain,
      action_item_created: Target,
      decision_recorded: CheckCircle2,
      processing_complete: Clock,
      meeting_reminder: Calendar,
    };
    
    return icons[type as keyof typeof icons] || Bell;
  };

  const getNotificationColor = (type: string, priority: string) => {
    if (priority === 'high') return 'text-red-500';
    if (type === 'ai_analysis_complete') return 'text-blue-500';
    if (type === 'action_item_created') return 'text-orange-500';
    if (type === 'meeting_started') return 'text-green-500';
    return 'text-gray-500';
  };

  const getNotificationTitle = (type: string): string => {
    const titles = {
      meeting_started: 'Meeting Started',
      meeting_ended: 'Meeting Ended',
      participant_joined: 'Participant Joined',
      participant_left: 'Participant Left',
      ai_analysis_complete: 'AI Analysis Complete',
      action_item_created: 'New Action Item',
      decision_recorded: 'Decision Recorded',
      processing_complete: 'Processing Complete',
      meeting_reminder: 'Meeting Reminder',
    };
    
    return titles[type as keyof typeof titles] || 'Meeting Update';
  };

  const getNotificationMessage = (type: string, data: any): string => {
    switch (type) {
      case 'meeting_started':
        return `${data.title} has begun`;
      case 'meeting_ended':
        return `${data.title} has concluded`;
      case 'participant_joined':
        return `${data.participant?.name} joined ${data.title}`;
      case 'participant_left':
        return `${data.participant?.name} left ${data.title}`;
      case 'ai_analysis_complete':
        return `Analysis ready for ${data.title}`;
      case 'action_item_created':
        return `New task: "${data.task_description}"`;
      case 'decision_recorded':
        return `Decision documented in ${data.title}`;
      case 'processing_complete':
        return `${data.title} is ready for review`;
      default:
        return 'Meeting update available';
    }
  };

  const getNotificationPriority = (type: string): 'high' | 'medium' | 'low' => {
    const priorities = {
      meeting_started: 'medium',
      meeting_ended: 'low',
      participant_joined: 'low',
      participant_left: 'low',
      ai_analysis_complete: 'high',
      action_item_created: 'medium',
      decision_recorded: 'medium',
      processing_complete: 'medium',
      meeting_reminder: 'high',
    };
    
    return priorities[type as keyof typeof priorities] as any || 'low';
  };

  const filteredNotifications = notifications.filter(notification => {
    // Filter by type
    if (filter.types.length > 0 && !filter.types.includes(notification.type)) {
      return false;
    }
    
    // Filter by priority
    if (filter.priority.length > 0 && !filter.priority.includes(notification.priority)) {
      return false;
    }
    
    // Filter by read status
    if (filter.readStatus === 'unread' && notification.isRead) return false;
    if (filter.readStatus === 'read' && !notification.isRead) return false;
    
    // Filter by time range
    const now = new Date();
    const notificationTime = notification.timestamp;
    
    switch (filter.timeRange) {
      case 'today':
        return notificationTime.toDateString() === now.toDateString();
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return notificationTime >= weekAgo;
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return notificationTime >= monthAgo;
      default:
        return true;
    }
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const deleteNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          {unreadCount > 0 ? (
            <BellRing className="h-4 w-4" />
          ) : (
            <Bell className="h-4 w-4" />
          )}
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs p-0"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-96 p-0" align="end">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Meeting Notifications</CardTitle>
              <div className="flex items-center space-x-2">
                {/* Filter Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Filter className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Filter Options</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>All Notifications</DropdownMenuItem>
                    <DropdownMenuItem>Unread Only</DropdownMenuItem>
                    <DropdownMenuItem>High Priority</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>Today</DropdownMenuItem>
                    <DropdownMenuItem>This Week</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Settings Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Notification Settings</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>Configure Alerts</DropdownMenuItem>
                    <DropdownMenuItem>Email Preferences</DropdownMenuItem>
                    <DropdownMenuItem>Sound Settings</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            
            {unreadCount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                </span>
                <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                  <Check className="h-3 w-3 mr-1" />
                  Mark all read
                </Button>
              </div>
            )}

            {/* Connection Status */}
            <div className="flex items-center space-x-2 text-xs">
              <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-muted-foreground">
                {isConnected ? 'Real-time updates active' : 'Disconnected from updates'}
              </span>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              {filteredNotifications.length > 0 ? (
                <div className="space-y-1">
                  {filteredNotifications.map((notification, index) => {
                    const Icon = getNotificationIcon(notification.type);
                    const iconColor = getNotificationColor(notification.type, notification.priority);
                    
                    return (
                      <div key={notification.id}>
                        <div 
                          className={`p-3 hover:bg-muted/50 cursor-pointer transition-colors ${
                            !notification.isRead ? 'bg-muted/30 border-l-2 border-l-blue-500' : ''
                          }`}
                          onClick={() => markAsRead(notification.id)}
                        >
                          <div className="flex items-start space-x-3">
                            <Icon className={`h-4 w-4 mt-0.5 ${iconColor}`} />
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <p className="font-medium text-sm truncate">
                                  {notification.title}
                                </p>
                                <div className="flex items-center space-x-1">
                                  <Badge 
                                    variant={notification.priority === 'high' ? 'destructive' : 
                                            notification.priority === 'medium' ? 'secondary' : 'outline'}
                                    className="text-xs"
                                  >
                                    {notification.priority}
                                  </Badge>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-4 w-4 p-0"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteNotification(notification.id);
                                    }}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                              
                              <p className="text-sm text-muted-foreground mb-1">
                                {notification.message}
                              </p>
                              
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>{notification.meetingTitle}</span>
                                <span>
                                  {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {index < filteredNotifications.length - 1 && <Separator />}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 px-4">
                  <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-sm text-muted-foreground">
                    No notifications to display
                  </p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}