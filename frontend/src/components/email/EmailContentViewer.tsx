'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { 
  Download, 
  Reply, 
  Forward, 
  Archive, 
  Trash2, 
  Tag,
  MoreHorizontal,
  Paperclip,
  AlertCircle,
  Clock,
  User,
  Calendar,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  ExternalLink,
  Shield,
  Copy,
  Star,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible';
import { useCaseEmail } from '@/hooks/useCaseEmails';
import { EmailArchiveItem } from '@/lib/services/email-archive';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface EmailContentViewerProps {
  caseId: string;
  emailId: string;
  onClose?: () => void;
  onAction?: (action: string, email: EmailArchiveItem) => void;
  onNavigate?: (direction: 'prev' | 'next') => void;
  canNavigate?: {
    prev: boolean;
    next: boolean;
  };
  className?: string;
}

interface AttachmentItemProps {
  attachment: any;
  caseId: string;
  emailId: string;
  onDownload: (attachmentId: string, filename: string) => void;
}

function AttachmentItem({ attachment, caseId, emailId, onDownload }: AttachmentItemProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await onDownload(attachment.attachment_id, attachment.filename);
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Failed to download attachment');
    } finally {
      setIsDownloading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (contentType: string) => {
    if (contentType?.startsWith('image/')) return '🖼️';
    if (contentType?.includes('pdf')) return '📄';
    if (contentType?.includes('word') || contentType?.includes('document')) return '📝';
    if (contentType?.includes('sheet') || contentType?.includes('excel')) return '📊';
    if (contentType?.includes('presentation') || contentType?.includes('powerpoint')) return '📈';
    if (contentType?.includes('zip') || contentType?.includes('archive')) return '🗜️';
    return '📎';
  };

  return (
    <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
      <span className="text-2xl">{getFileIcon(attachment.content_type)}</span>
      
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate" title={attachment.filename}>
          {attachment.filename}
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <span>{formatFileSize(attachment.size_bytes)}</span>
          {attachment.content_type && (
            <span>{attachment.content_type.split('/')[1]?.toUpperCase()}</span>
          )}
          {attachment.is_inline && (
            <Badge variant="outline" className="text-xs px-1 py-0 h-4">
              Inline
            </Badge>
          )}
          {attachment.has_preview && (
            <Badge variant="secondary" className="text-xs px-1 py-0 h-4">
              Preview Available
            </Badge>
          )}
        </div>
      </div>
      
      <Button
        variant="outline"
        size="sm"
        onClick={handleDownload}
        disabled={isDownloading}
      >
        {isDownloading ? (
          <Clock className="h-3 w-3 animate-spin mr-2" />
        ) : (
          <Download className="h-3 w-3 mr-2" />
        )}
        {isDownloading ? 'Downloading...' : 'Download'}
      </Button>
    </div>
  );
}

function EmailHeader({ 
  email, 
  onAction, 
  onNavigate, 
  canNavigate,
  onClose 
}: {
  email: EmailArchiveItem & { content?: any };
  onAction: (action: string) => void;
  onNavigate?: (direction: 'prev' | 'next') => void;
  canNavigate?: { prev: boolean; next: boolean };
  onClose?: () => void;
}) {
  const [showAllRecipients, setShowAllRecipients] = useState(false);
  const [showHeaders, setShowHeaders] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const priorityColors = {
    low: 'text-blue-600',
    normal: '',
    high: 'text-red-600'
  };

  const allRecipients = [
    ...email.recipientEmails.map((email, idx) => ({
      email,
      name: email.recipientNames?.[idx],
      type: 'To'
    })),
    ...(email.ccEmails || []).map((email) => ({
      email,
      name: undefined,
      type: 'CC'
    })),
    ...(email.bccEmails || []).map((email) => ({
      email,
      name: undefined,
      type: 'BCC'
    }))
  ];

  const visibleRecipients = showAllRecipients ? allRecipients : allRecipients.slice(0, 3);

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        {/* Navigation and Actions */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {onNavigate && canNavigate && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigate('prev')}
                  disabled={!canNavigate.prev}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigate('next')}
                  disabled={!canNavigate.next}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Separator orientation="vertical" className="mx-2 h-4" />
              </>
            )}
            
            <Button variant="outline" size="sm" onClick={() => onAction('reply')}>
              <Reply className="h-4 w-4 mr-2" />
              Reply
            </Button>
            
            <Button variant="outline" size="sm" onClick={() => onAction('forward')}>
              <Forward className="h-4 w-4 mr-2" />
              Forward
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onAction('archive')}>
              <Archive className="h-4 w-4 mr-2" />
              Archive
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onAction('tag')}>
                  <Tag className="h-4 w-4 mr-2" />
                  Add Tags
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAction('star')}>
                  <Star className="h-4 w-4 mr-2" />
                  Star
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAction('export')}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onAction('mark-unread')}>
                  <EyeOff className="h-4 w-4 mr-2" />
                  Mark as Unread
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => onAction('delete')}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {onClose && (
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            )}
          </div>
        </div>

        {/* Subject */}
        <div className="flex items-start gap-3 mb-3">
          {email.importance === 'high' && (
            <AlertCircle className="h-5 w-5 text-red-500 mt-1 shrink-0" />
          )}
          <h2 className="text-xl font-semibold text-foreground flex-1">
            {email.subject || '(No Subject)'}
          </h2>
          {email.hasAttachments && (
            <Paperclip className="h-5 w-5 text-muted-foreground mt-1 shrink-0" />
          )}
        </div>

        {/* Sender */}
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${email.senderEmail}`} />
            <AvatarFallback>
              {getSenderInitials(email.senderName, email.senderEmail)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className={cn(
              'font-medium text-sm',
              priorityColors[email.importance]
            )}>
              {email.senderName || email.senderEmail}
            </div>
            
            {email.senderName && (
              <div className="text-xs text-muted-foreground">
                {email.senderEmail}
              </div>
            )}
          </div>
          
          <div className="text-right text-xs text-muted-foreground">
            <div className="flex items-center gap-1 mb-1">
              <Calendar className="h-3 w-3" />
              {formatDate(email.receivedAt)}
            </div>
            {email.sentAt && email.sentAt !== email.receivedAt && (
              <div className="text-xs">
                Sent: {formatDate(email.sentAt)}
              </div>
            )}
          </div>
        </div>

        {/* Recipients */}
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">
            <span className="font-medium">To: </span>
            {visibleRecipients.map((recipient, idx) => (
              <span key={idx}>
                {recipient.type !== 'To' && (
                  <Badge variant="outline" className="text-xs px-1 py-0 h-4 mr-1">
                    {recipient.type}
                  </Badge>
                )}
                <button
                  className="hover:underline"
                  onClick={() => copyToClipboard(recipient.email)}
                >
                  {recipient.name || recipient.email}
                </button>
                {idx < visibleRecipients.length - 1 && ', '}
              </span>
            ))}
            
            {allRecipients.length > 3 && !showAllRecipients && (
              <button
                className="text-blue-600 hover:underline ml-2"
                onClick={() => setShowAllRecipients(true)}
              >
                +{allRecipients.length - 3} more
              </button>
            )}
            
            {showAllRecipients && allRecipients.length > 3 && (
              <button
                className="text-blue-600 hover:underline ml-2"
                onClick={() => setShowAllRecipients(false)}
              >
                show less
              </button>
            )}
          </div>
        </div>

        {/* Tags */}
        {email.customTags && email.customTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {email.customTags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Headers Toggle */}
        <Collapsible open={showHeaders} onOpenChange={setShowHeaders}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
              {showHeaders ? 'Hide' : 'Show'} Headers
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 p-3 bg-muted/50 rounded-lg text-xs font-mono">
              <div className="space-y-1">
                {email.messageId && (
                  <div>
                    <span className="font-semibold">Message-ID:</span> {email.messageId}
                  </div>
                )}
                {email.conversationId && (
                  <div>
                    <span className="font-semibold">Conversation-ID:</span> {email.conversationId}
                  </div>
                )}
                {email.threadTopic && (
                  <div>
                    <span className="font-semibold">Thread-Topic:</span> {email.threadTopic}
                  </div>
                )}
                {email.content?.headers && Object.entries(email.content.headers).map(([key, value]) => (
                  <div key={key}>
                    <span className="font-semibold">{key}:</span> {String(value)}
                  </div>
                ))}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardHeader>
    </Card>
  );
}

export default function EmailContentViewer({
  caseId,
  emailId,
  onClose,
  onAction,
  onNavigate,
  canNavigate,
  className
}: EmailContentViewerProps) {
  const [preferredFormat, setPreferredFormat] = useState<'html' | 'text'>('html');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { data: emailData, isLoading, error } = useCaseEmail(caseId, emailId);

  const handleAction = useCallback((action: string) => {
    if (emailData && onAction) {
      onAction(action, emailData);
    }
  }, [emailData, onAction]);

  const handleAttachmentDownload = useCallback(async (attachmentId: string, filename: string) => {
    try {
      const response = await fetch(`/api/cases/${caseId}/emails/${emailId}/attachments/${attachmentId}`);
      
      if (!response.ok) {
        throw new Error('Download failed');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success(`Downloaded ${filename}`);
    } catch (error) {
      console.error('Download failed:', error);
      throw error;
    }
  }, [caseId, emailId]);

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center h-64", className)}>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 animate-spin" />
          Loading email...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("flex items-center justify-center h-64", className)}>
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
          <p className="text-sm text-muted-foreground">Failed to load email</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!emailData) {
    return (
      <div className={cn("flex items-center justify-center h-64", className)}>
        <div className="text-center">
          <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground">Email not found</p>
        </div>
      </div>
    );
  }

  const hasContent = emailData.content?.htmlBody || emailData.content?.textBody;
  const displayContent = preferredFormat === 'html' && emailData.content?.htmlBody 
    ? emailData.content.htmlBody 
    : emailData.content?.textBody || 'No content available';

  return (
    <div className={cn(
      "flex flex-col h-full bg-background",
      isFullscreen ? "fixed inset-0 z-50 p-4" : "",
      className
    )}>
      <EmailHeader
        email={emailData}
        onAction={handleAction}
        onNavigate={onNavigate}
        canNavigate={canNavigate}
        onClose={onClose}
      />

      <div className="flex-1 min-h-0 space-y-4">
        {/* Content Format Toggle */}
        {emailData.content?.htmlBody && emailData.content?.textBody && (
          <div className="flex items-center gap-2">
            <Button
              variant={preferredFormat === 'html' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPreferredFormat('html')}
            >
              HTML
            </Button>
            <Button
              variant={preferredFormat === 'text' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPreferredFormat('text')}
            >
              Plain Text
            </Button>
            <div className="flex-1" />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        )}

        {/* Email Content */}
        <Card className="flex-1">
          <CardContent className="p-0">
            <ScrollArea className="h-full max-h-96">
              {hasContent ? (
                <div className="p-6">
                  {preferredFormat === 'html' && emailData.content?.htmlBody ? (
                    <div 
                      className="prose prose-sm max-w-none dark:prose-invert"
                      dangerouslySetInnerHTML={{ __html: emailData.content.htmlBody }}
                    />
                  ) : (
                    <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">
                      {displayContent}
                    </pre>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  <div className="text-center">
                    <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Email content not available</p>
                    <p className="text-xs mt-1">Content may be stored externally or encrypted</p>
                  </div>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Attachments */}
        {emailData.attachments && emailData.attachments.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Attachments ({emailData.attachments.length})
              </h3>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {emailData.attachments.map((attachment) => (
                  <AttachmentItem
                    key={attachment.id}
                    attachment={attachment}
                    caseId={caseId}
                    emailId={emailId}
                    onDownload={handleAttachmentDownload}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}