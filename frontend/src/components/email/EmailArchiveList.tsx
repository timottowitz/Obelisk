'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { 
  Search, 
  Filter, 
  Archive, 
  Trash2, 
  Download, 
  Tag, 
  Mail, 
  MailOpen, 
  Paperclip, 
  CalendarDays,
  User,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Eye,
  Reply,
  Forward,
  Star,
  AlertCircle,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useCaseEmails } from '@/hooks/useCaseEmails';
import { EmailArchiveItem } from '@/lib/services/email-archive';
import { cn } from '@/lib/utils';

interface EmailArchiveListProps {
  caseId: string;
  onEmailSelect: (email: EmailArchiveItem) => void;
  onBulkAction: (action: string, emailIds: string[]) => void;
  selectedEmailId?: string;
  className?: string;
}

interface EmailRowProps {
  email: EmailArchiveItem;
  isSelected: boolean;
  isChecked: boolean;
  onSelect: () => void;
  onCheck: (checked: boolean) => void;
  onAction: (action: string) => void;
  isActive?: boolean;
}

function EmailRow({ 
  email, 
  isSelected, 
  isChecked, 
  onSelect, 
  onCheck, 
  onAction,
  isActive = false 
}: EmailRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else if (diffDays < 365) {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } else {
      return date.toLocaleDateString([], { year: '2-digit', month: 'short', day: 'numeric' });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + sizes[i];
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

  const priorityColor = {
    low: 'text-blue-600',
    normal: '',
    high: 'text-red-600'
  };

  return (
    <div className={cn(
      'group border-b border-border hover:bg-muted/50 transition-colors',
      isActive && 'bg-accent border-accent-foreground/20',
      !email.isRead && 'bg-blue-50/30 dark:bg-blue-950/20'
    )}>
      <div className="flex items-center gap-3 p-3">
        {/* Checkbox */}
        <Checkbox
          checked={isChecked}
          onCheckedChange={onCheck}
          className="shrink-0"
        />

        {/* Sender Avatar */}
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${email.senderEmail}`} />
          <AvatarFallback className="text-xs">
            {getSenderInitials(email.senderName, email.senderEmail)}
          </AvatarFallback>
        </Avatar>

        {/* Email Content */}
        <div 
          className="flex-1 min-w-0 cursor-pointer" 
          onClick={onSelect}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              {/* Sender and Subject Line */}
              <div className="flex items-center gap-2 mb-1">
                <span className={cn(
                  'font-medium text-sm truncate',
                  !email.isRead && 'font-semibold',
                  priorityColor[email.importance]
                )}>
                  {email.senderName || email.senderEmail}
                </span>
                
                {email.importance === 'high' && (
                  <AlertCircle className="h-3 w-3 text-red-500 shrink-0" />
                )}
                
                {email.hasAttachments && (
                  <Paperclip className="h-3 w-3 text-muted-foreground shrink-0" />
                )}
                
                {email.threadEmailCount > 0 && (
                  <Badge variant="secondary" className="text-xs px-1 py-0 h-4">
                    {email.threadEmailCount + 1}
                  </Badge>
                )}
              </div>
              
              {/* Subject */}
              <div className={cn(
                'text-sm text-foreground truncate mb-1',
                !email.isRead && 'font-medium'
              )}>
                {email.subject || '(No Subject)'}
              </div>
              
              {/* Preview snippet - placeholder for now */}
              <div className="text-xs text-muted-foreground truncate">
                Email content preview would go here...
              </div>
            </div>

            {/* Right side info */}
            <div className="flex flex-col items-end gap-1 shrink-0 text-xs text-muted-foreground">
              <time dateTime={email.receivedAt}>
                {formatDate(email.receivedAt)}
              </time>
              
              {email.totalAttachmentSize > 0 && (
                <span className="text-xs">
                  {formatFileSize(email.totalAttachmentSize)}
                </span>
              )}
            </div>
          </div>

          {/* Tags */}
          {email.customTags && email.customTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {email.customTags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs px-1 py-0 h-4">
                  {tag}
                </Badge>
              ))}
              {email.customTags.length > 3 && (
                <Badge variant="outline" className="text-xs px-1 py-0 h-4">
                  +{email.customTags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onAction(email.isRead ? 'mark-unread' : 'mark-read');
                }}
              >
                {email.isRead ? 
                  <Mail className="h-3 w-3" /> : 
                  <MailOpen className="h-3 w-3" />
                }
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {email.isRead ? 'Mark as unread' : 'Mark as read'}
            </TooltipContent>
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
              <DropdownMenuItem onClick={() => onAction('view')}>
                <Eye className="h-4 w-4 mr-2" />
                View
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAction('reply')}>
                <Reply className="h-4 w-4 mr-2" />
                Reply
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAction('forward')}>
                <Forward className="h-4 w-4 mr-2" />
                Forward
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onAction('tag')}>
                <Tag className="h-4 w-4 mr-2" />
                Add Tags
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAction('archive')}>
                <Archive className="h-4 w-4 mr-2" />
                Archive
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
        </div>
      </div>
    </div>
  );
}

function EmailFilters({ 
  filters, 
  onFiltersChange, 
  onClear 
}: {
  filters: any;
  onFiltersChange: (filters: any) => void;
  onClear: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex items-center gap-2 p-3 border-b">
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {isOpen ? 
              <ChevronUp className="h-4 w-4 ml-2" /> : 
              <ChevronDown className="h-4 w-4 ml-2" />
            }
          </Button>
        </CollapsibleTrigger>
        
        {Object.keys(filters).length > 0 && (
          <Button variant="ghost" size="sm" onClick={onClear}>
            Clear All
          </Button>
        )}
      </div>
      
      <CollapsibleContent>
        <div className="p-3 space-y-3 bg-muted/30">
          {/* Date Range */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium mb-1 block">From Date</label>
              <Input
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => onFiltersChange({ ...filters, dateFrom: e.target.value })}
                className="h-8"
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">To Date</label>
              <Input
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => onFiltersChange({ ...filters, dateTo: e.target.value })}
                className="h-8"
              />
            </div>
          </div>

          {/* Sender Filter */}
          <div>
            <label className="text-xs font-medium mb-1 block">Sender</label>
            <Input
              placeholder="Filter by sender email or name"
              value={filters.senderFilter || ''}
              onChange={(e) => onFiltersChange({ ...filters, senderFilter: e.target.value })}
              className="h-8"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={filters.hasAttachments === true ? "default" : "outline"}
              size="sm"
              onClick={() => onFiltersChange({ 
                ...filters, 
                hasAttachments: filters.hasAttachments === true ? undefined : true 
              })}
            >
              <Paperclip className="h-3 w-3 mr-1" />
              Has Attachments
            </Button>
            
            <Button
              variant={filters.importance === 'high' ? "default" : "outline"}
              size="sm"
              onClick={() => onFiltersChange({ 
                ...filters, 
                importance: filters.importance === 'high' ? undefined : 'high' 
              })}
            >
              <AlertCircle className="h-3 w-3 mr-1" />
              High Priority
            </Button>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function EmailArchiveList({
  caseId,
  onEmailSelect,
  onBulkAction,
  selectedEmailId,
  className
}: EmailArchiveListProps) {
  const {
    state,
    operations,
    hasSelectedEmails,
    selectedEmailCount,
    canLoadMore
  } = useCaseEmails({ caseId, pageSize: 50 });

  const handleEmailAction = useCallback((email: EmailArchiveItem, action: string) => {
    switch (action) {
      case 'view':
        onEmailSelect(email);
        break;
      case 'mark-read':
        operations.markAsRead([email.emailId]);
        break;
      case 'mark-unread':
        operations.markAsUnread([email.emailId]);
        break;
      case 'archive':
        operations.archiveEmails([email.emailId]);
        break;
      case 'delete':
        operations.deleteEmails([email.emailId]);
        break;
      case 'tag':
        // This would open a tag dialog
        break;
      case 'reply':
        // This would open reply interface
        break;
      case 'forward':
        // This would open forward interface
        break;
    }
  }, [onEmailSelect, operations]);

  const handleBulkAction = useCallback((action: string) => {
    const selectedIds = Array.from(state.selectedEmails);
    if (selectedIds.length === 0) return;

    switch (action) {
      case 'mark-read':
        operations.markAsRead(selectedIds);
        break;
      case 'mark-unread':
        operations.markAsUnread(selectedIds);
        break;
      case 'archive':
        operations.archiveEmails(selectedIds);
        break;
      case 'delete':
        operations.deleteEmails(selectedIds);
        break;
      default:
        onBulkAction(action, selectedIds);
    }
  }, [state.selectedEmails, operations, onBulkAction]);

  if (state.isLoading && state.emails.length === 0) {
    return (
      <div className={cn("flex items-center justify-center h-64", className)}>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 animate-spin" />
          Loading emails...
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full bg-background border rounded-lg", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm">
            Emails ({state.totalCount})
          </h3>
          
          {hasSelectedEmails && (
            <Badge variant="secondary" className="text-xs">
              {selectedEmailCount} selected
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={operations.refreshEmails}
            disabled={state.isLoading}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search emails..."
            value={state.searchQuery}
            onChange={(e) => operations.setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Filters */}
      <EmailFilters
        filters={state.filters}
        onFiltersChange={operations.updateFilters}
        onClear={operations.clearFilters}
      />

      {/* Bulk Actions */}
      {hasSelectedEmails && (
        <div className="flex items-center gap-2 p-3 bg-accent/50 border-b">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleBulkAction('mark-read')}
          >
            <MailOpen className="h-3 w-3 mr-2" />
            Mark Read
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleBulkAction('archive')}
          >
            <Archive className="h-3 w-3 mr-2" />
            Archive
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleBulkAction('export')}
          >
            <Download className="h-3 w-3 mr-2" />
            Export
          </Button>
          
          <Separator orientation="vertical" className="mx-2 h-4" />
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleBulkAction('delete')}
            className="text-red-600 border-red-200 hover:bg-red-50"
          >
            <Trash2 className="h-3 w-3 mr-2" />
            Delete
          </Button>
        </div>
      )}

      {/* Email List */}
      <ScrollArea className="flex-1">
        {state.emails.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Mail className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-sm">No emails found</p>
            <p className="text-xs mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <>
            {state.emails.map((email) => (
              <EmailRow
                key={email.emailId}
                email={email}
                isSelected={state.selectedEmails.has(email.emailId)}
                isChecked={state.selectedEmails.has(email.emailId)}
                onSelect={() => onEmailSelect(email)}
                onCheck={(checked) => {
                  if (checked) {
                    operations.selectEmail(email.emailId);
                  } else {
                    operations.deselectEmail(email.emailId);
                  }
                }}
                onAction={(action) => handleEmailAction(email, action)}
                isActive={selectedEmailId === email.emailId}
              />
            ))}
            
            {/* Load More */}
            {canLoadMore && (
              <div className="p-4 text-center">
                <Button
                  variant="outline"
                  onClick={operations.loadMore}
                  disabled={state.isLoadingMore}
                >
                  {state.isLoadingMore ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    'Load More'
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </ScrollArea>

      {/* Status Bar */}
      {state.emails.length > 0 && (
        <div className="p-2 border-t bg-muted/30 text-xs text-muted-foreground text-center">
          Showing {state.emails.length} of {state.totalCount} emails
          {state.isLoadingMore && " • Loading more..."}
        </div>
      )}
    </div>
  );
}