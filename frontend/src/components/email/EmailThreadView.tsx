'use client';

import React, { useState, useCallback } from 'react';
import { 
  MessageCircle, 
  ChevronDown,
  ChevronUp,
  User,
  Calendar,
  Paperclip,
  Reply,
  Forward,
  MoreHorizontal,
  X,
  Clock,
  AlertCircle,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useQuery } from '@tanstack/react-query';
import { emailArchiveService, EmailThread, EmailArchiveItem } from '@/lib/services/email-archive';
import { cn } from '@/lib/utils';

interface EmailThreadViewProps {
  caseId: string;
  conversationId: string;
  onEmailSelect: (email: EmailArchiveItem) => void;
  onClose?: () => void;
  className?: string;
}

interface ThreadEmailItemProps {
  email: any;
  isExpanded: boolean;
  onToggle: () => void;
  onSelect: () => void;
  onAction: (action: string) => void;
  isFirst: boolean;
  isLast: boolean;
}

function ThreadEmailItem({ 
  email, 
  isExpanded, 
  onToggle, 
  onSelect, 
  onAction,
  isFirst,
  isLast
}: ThreadEmailItemProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { 
        weekday: 'short', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else {
      return date.toLocaleDateString([], { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
  };

  const getSenderInitials = (name?: string, email?: string) => {
    if (name) {
      const parts = name.split(' ');
      return parts.length > 1 ? 
        (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() :
        parts[0].substring(0, 2).toUpperCase();
    }
    return email ? email.substring(0, 2).toUpperCase() : '??';
  };

  return (
    <div className={cn(
      'relative group',
      !isLast && 'border-l-2 border-muted ml-4 pb-4'
    )}>
      {/* Timeline dot */}
      <div className="absolute -left-2 top-6 w-4 h-4 bg-background border-2 border-primary rounded-full flex items-center justify-center">
        <div className="w-2 h-2 bg-primary rounded-full"></div>
      </div>

      <Card className={cn(
        'ml-6 transition-all hover:shadow-md',
        isExpanded ? 'shadow-md' : 'hover:bg-muted/50'
      )}>
        <Collapsible open={isExpanded} onOpenChange={onToggle}>
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${email.senderEmail}`} />
                    <AvatarFallback className="text-xs">
                      {getSenderInitials(email.senderName, email.senderEmail)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn(
                        'font-medium text-sm truncate',
                        !email.isRead && 'font-semibold'
                      )}>
                        {email.senderName || email.senderEmail}
                      </span>
                      
                      {email.hasAttachments && (
                        <Paperclip className="h-3 w-3 text-muted-foreground shrink-0" />
                      )}
                      
                      {!email.isRead && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full shrink-0"></div>
                      )}
                    </div>
                    
                    <div className="text-xs text-muted-foreground truncate">
                      {formatDate(email.receivedAt)}
                      {email.sentAt && email.sentAt !== email.receivedAt && (
                        <span className="ml-2">
                          (sent: {formatDate(email.sentAt)})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelect();
                          }}
                        >
                          <Reply className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>View full email</TooltipContent>
                    </Tooltip>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onAction('reply')}>
                          <Reply className="h-4 w-4 mr-2" />
                          Reply
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onAction('forward')}>
                          <Forward className="h-4 w-4 mr-2" />
                          Forward
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onSelect()}>
                          View Full Email
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {isExpanded ? 
                    <ChevronUp className="h-4 w-4 text-muted-foreground" /> :
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  }
                </div>
              </div>
              
              {/* Subject line (if different from thread topic) */}
              {email.subject && (
                <div className="text-sm text-foreground truncate mt-1">
                  {email.subject}
                </div>
              )}
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="pt-0">
              {/* Email preview */}
              <div className="text-sm text-muted-foreground mb-3 p-3 bg-muted/30 rounded-lg">
                <p className="line-clamp-3">
                  Email content preview would go here. This would show the first few lines
                  of the email content to give context within the thread view.
                </p>
              </div>

              {/* Attachments */}
              {email.hasAttachments && email.attachmentCount > 0 && (
                <div className="mb-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Paperclip className="h-3 w-3" />
                    <span>{email.attachmentCount} attachment{email.attachmentCount !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onAction('reply')}
                >
                  <Reply className="h-3 w-3 mr-2" />
                  Reply
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onAction('forward')}
                >
                  <Forward className="h-3 w-3 mr-2" />
                  Forward
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onSelect}
                >
                  View Full
                </Button>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  );
}

function ThreadParticipants({ participants }: { participants: EmailThread['participants'] }) {
  const [showAll, setShowAll] = useState(false);
  const visibleParticipants = showAll ? participants : participants.slice(0, 5);

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Users className="h-4 w-4" />
            Participants ({participants.length})
          </h3>
          
          {participants.length > 5 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? 'Show Less' : `Show All (${participants.length})`}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {visibleParticipants.map((participant) => (
            <div key={participant.email} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${participant.email}`} />
                  <AvatarFallback className="text-xs">
                    {participant.name ? 
                      participant.name.substring(0, 2).toUpperCase() :
                      participant.email.substring(0, 2).toUpperCase()
                    }
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">
                    {participant.name || participant.email}
                  </p>
                  {participant.name && (
                    <p className="text-xs text-muted-foreground">{participant.email}</p>
                  )}
                </div>
              </div>
              <Badge variant="secondary" className="text-xs">
                {participant.messageCount} message{participant.messageCount !== 1 ? 's' : ''}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function EmailThreadView({
  caseId,
  conversationId,
  onEmailSelect,
  onClose,
  className
}: EmailThreadViewProps) {
  const [expandedEmails, setExpandedEmails] = useState<Set<string>>(new Set());

  const { data: threadData, isLoading, error } = useQuery({
    queryKey: ['email-thread', caseId, conversationId],
    queryFn: () => emailArchiveService.getEmailThread(caseId, conversationId),
    enabled: !!caseId && !!conversationId
  });

  const handleToggleExpanded = useCallback((emailId: string) => {
    setExpandedEmails(prev => {
      const next = new Set(prev);
      if (next.has(emailId)) {
        next.delete(emailId);
      } else {
        next.add(emailId);
      }
      return next;
    });
  }, []);

  const handleEmailAction = useCallback((action: string, email: any) => {
    // Handle email actions like reply, forward, etc.
    console.log('Email action:', action, email);
  }, []);

  const handleSelectEmail = useCallback((email: any) => {
    // Find the full email data and pass it to the parent
    const fullEmail: EmailArchiveItem = {
      id: email.id,
      emailId: email.emailId,
      assignmentId: '', // Would need to be populated
      caseId: caseId,
      subject: email.subject,
      senderEmail: email.senderEmail,
      senderName: email.senderName,
      recipientEmails: [], // Would need to be populated
      recipientNames: [],
      ccEmails: [],
      bccEmails: [],
      sentAt: email.sentAt,
      receivedAt: email.receivedAt,
      messageId: email.messageId,
      conversationId: conversationId,
      threadTopic: threadData?.threadTopic,
      importance: 'normal',
      isRead: email.isRead,
      isDraft: false,
      hasAttachments: email.hasAttachments,
      attachmentCount: email.attachmentCount,
      totalAttachmentSize: 0,
      customTags: [],
      customMetadata: {},
      archiveStatus: 'active',
      lastAccessedAt: undefined,
      exportCount: 0,
      threadEmailCount: (threadData?.emails.length || 1) - 1
    };
    
    onEmailSelect(fullEmail);
  }, [caseId, conversationId, threadData, onEmailSelect]);

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center h-64", className)}>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 animate-spin" />
          Loading thread...
        </div>
      </div>
    );
  }

  if (error || !threadData) {
    return (
      <div className={cn("flex items-center justify-center h-64", className)}>
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
          <p className="text-sm text-muted-foreground">Failed to load email thread</p>
          {onClose && (
            <Button variant="outline" size="sm" className="mt-2" onClick={onClose}>
              Go Back
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Email Thread
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {threadData.threadTopic || 'Email Conversation'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {threadData.emails.length} message{threadData.emails.length !== 1 ? 's' : ''}
          </Badge>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Expand all emails
              const allEmailIds = threadData.emails.map(e => e.emailId);
              setExpandedEmails(new Set(allEmailIds));
            }}
          >
            Expand All
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpandedEmails(new Set())}
          >
            Collapse All
          </Button>

          {onClose && (
            <Button variant="outline" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-4">
            {/* Participants */}
            <ThreadParticipants participants={threadData.participants} />

            {/* Thread Timeline */}
            <div className="space-y-0">
              {threadData.emails.map((email, index) => (
                <ThreadEmailItem
                  key={email.emailId}
                  email={email}
                  isExpanded={expandedEmails.has(email.emailId)}
                  onToggle={() => handleToggleExpanded(email.emailId)}
                  onSelect={() => handleSelectEmail(email)}
                  onAction={(action) => handleEmailAction(action, email)}
                  isFirst={index === 0}
                  isLast={index === threadData.emails.length - 1}
                />
              ))}
            </div>

            {/* Thread Actions */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Reply className="h-4 w-4 mr-2" />
                    Reply to Thread
                  </Button>
                  
                  <Button variant="outline" size="sm">
                    <Forward className="h-4 w-4 mr-2" />
                    Forward Thread
                  </Button>
                  
                  <Button variant="outline" size="sm">
                    Export Thread
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}