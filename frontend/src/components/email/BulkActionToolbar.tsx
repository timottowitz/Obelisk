/**
 * Bulk Action Toolbar - Toolbar component for bulk email operations
 * 
 * Displays when emails are selected and provides actions for bulk operations
 * like assignment, marking as read/unread, archiving, and more.
 */

'use client';

import React, { useState } from 'react';
import { ZeroMailMessage } from '@/lib/zero-mail-driver';
import { useEmailSelection } from './EmailSelectionProvider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  X, 
  CheckSquare, 
  Square, 
  FolderPlus, 
  Archive, 
  Trash2, 
  Mail, 
  MailOpen, 
  Star,
  MoreHorizontal,
  Tag,
  Download
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

export interface BulkActionToolbarProps {
  emails: ZeroMailMessage[];
  className?: string;
  onBulkAssign?: (selectedEmails: ZeroMailMessage[]) => void;
  onMarkAsRead?: (selectedEmails: ZeroMailMessage[]) => void;
  onMarkAsUnread?: (selectedEmails: ZeroMailMessage[]) => void;
  onArchive?: (selectedEmails: ZeroMailMessage[]) => void;
  onDelete?: (selectedEmails: ZeroMailMessage[]) => void;
  onAddLabels?: (selectedEmails: ZeroMailMessage[]) => void;
  onExport?: (selectedEmails: ZeroMailMessage[]) => void;
  onMove?: (selectedEmails: ZeroMailMessage[], targetFolder: string) => void;
  disabled?: boolean;
}

export function BulkActionToolbar({
  emails,
  className,
  onBulkAssign,
  onMarkAsRead,
  onMarkAsUnread,
  onArchive,
  onDelete,
  onAddLabels,
  onExport,
  onMove,
  disabled = false
}: BulkActionToolbarProps) {
  const selection = useEmailSelection();
  const [isVisible, setIsVisible] = useState(true);

  if (!selection.actions.hasSelection() || !isVisible) {
    return null;
  }

  const selectedEmails = selection.actions.getSelectedEmails(emails);
  const selectionCount = selection.actions.getSelectionCount();
  
  // Count unread emails in selection
  const unreadCount = selectedEmails.filter(email => !email.isRead).length;
  const readCount = selectedEmails.length - unreadCount;

  const handleClose = () => {
    selection.actions.deselectAll();
    setIsVisible(true);
  };

  const handleSelectAll = () => {
    if (selection.state.isSelectAllChecked) {
      selection.actions.deselectAll();
    } else {
      selection.actions.selectAll(emails);
    }
  };

  const handleBulkAssign = () => {
    if (onBulkAssign && selectedEmails.length > 0) {
      onBulkAssign(selectedEmails);
    } else {
      toast.error('No emails selected for assignment');
    }
  };

  const handleMarkAsRead = () => {
    if (onMarkAsRead && unreadCount > 0) {
      onMarkAsRead(selectedEmails.filter(email => !email.isRead));
      toast.success(`Marked ${unreadCount} emails as read`);
    } else {
      toast.info('No unread emails in selection');
    }
  };

  const handleMarkAsUnread = () => {
    if (onMarkAsUnread && readCount > 0) {
      onMarkAsUnread(selectedEmails.filter(email => email.isRead));
      toast.success(`Marked ${readCount} emails as unread`);
    } else {
      toast.info('No read emails in selection');
    }
  };

  const handleArchive = () => {
    if (onArchive && selectedEmails.length > 0) {
      onArchive(selectedEmails);
      selection.actions.deselectAll();
      toast.success(`Archived ${selectedEmails.length} emails`);
    }
  };

  const handleDelete = () => {
    if (onDelete && selectedEmails.length > 0) {
      // Show confirmation for delete
      if (window.confirm(`Are you sure you want to delete ${selectedEmails.length} emails?`)) {
        onDelete(selectedEmails);
        selection.actions.deselectAll();
        toast.success(`Deleted ${selectedEmails.length} emails`);
      }
    }
  };

  const handleAddLabels = () => {
    if (onAddLabels && selectedEmails.length > 0) {
      onAddLabels(selectedEmails);
    } else {
      toast.error('No emails selected for labeling');
    }
  };

  const handleExport = () => {
    if (onExport && selectedEmails.length > 0) {
      onExport(selectedEmails);
    } else {
      toast.error('No emails selected for export');
    }
  };

  return (
    <div className={cn(
      'fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50',
      'bg-background border border-border rounded-lg shadow-lg',
      'px-4 py-3 flex items-center gap-3',
      'animate-in slide-in-from-bottom-2 duration-200',
      'max-w-full mx-4',
      disabled && 'opacity-50 pointer-events-none',
      className
    )}>
      {/* Selection Toggle */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleSelectAll}
        disabled={disabled}
        className="h-8"
      >
        {selection.state.isSelectAllChecked ? (
          <CheckSquare className="h-4 w-4" />
        ) : (
          <Square className="h-4 w-4" />
        )}
      </Button>

      <Separator orientation="vertical" className="h-6" />

      {/* Selection Count */}
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-sm">
          {selectionCount} selected
        </Badge>
        {unreadCount > 0 && (
          <Badge variant="outline" className="text-xs">
            {unreadCount} unread
          </Badge>
        )}
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Primary Actions */}
      <div className="flex items-center gap-2">
        {/* Bulk Assign - Most important action */}
        {onBulkAssign && (
          <Button
            variant="default"
            size="sm"
            onClick={handleBulkAssign}
            disabled={disabled}
            className="h-8"
          >
            <FolderPlus className="h-4 w-4 mr-2" />
            Assign to Case
          </Button>
        )}

        {/* Mark as Read/Unread */}
        {unreadCount > 0 && onMarkAsRead && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAsRead}
            disabled={disabled}
            title={`Mark ${unreadCount} emails as read`}
            className="h-8"
          >
            <MailOpen className="h-4 w-4" />
          </Button>
        )}

        {readCount > 0 && onMarkAsUnread && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAsUnread}
            disabled={disabled}
            title={`Mark ${readCount} emails as unread`}
            className="h-8"
          >
            <Mail className="h-4 w-4" />
          </Button>
        )}

        {/* Archive */}
        {onArchive && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleArchive}
            disabled={disabled}
            title="Archive selected emails"
            className="h-8"
          >
            <Archive className="h-4 w-4" />
          </Button>
        )}
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* More Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            className="h-8"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {onAddLabels && (
            <DropdownMenuItem onClick={handleAddLabels}>
              <Tag className="h-4 w-4 mr-2" />
              Add Labels
            </DropdownMenuItem>
          )}
          
          {onExport && (
            <DropdownMenuItem onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export Selected
            </DropdownMenuItem>
          )}
          
          <DropdownMenuSeparator />
          
          {onDelete && (
            <DropdownMenuItem 
              onClick={handleDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Selected
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Close Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleClose}
        disabled={disabled}
        className="h-8 w-8 p-0"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

/**
 * Compact version of bulk toolbar for mobile or limited space
 */
export interface CompactBulkActionToolbarProps {
  emails: ZeroMailMessage[];
  className?: string;
  onBulkAssign?: (selectedEmails: ZeroMailMessage[]) => void;
  onClose?: () => void;
  disabled?: boolean;
}

export function CompactBulkActionToolbar({
  emails,
  className,
  onBulkAssign,
  onClose,
  disabled = false
}: CompactBulkActionToolbarProps) {
  const selection = useEmailSelection();

  if (!selection.actions.hasSelection()) {
    return null;
  }

  const selectedEmails = selection.actions.getSelectedEmails(emails);
  const selectionCount = selection.actions.getSelectionCount();

  const handleClose = () => {
    selection.actions.deselectAll();
    onClose?.();
  };

  const handleBulkAssign = () => {
    if (onBulkAssign && selectedEmails.length > 0) {
      onBulkAssign(selectedEmails);
    }
  };

  return (
    <div className={cn(
      'bg-accent/50 border-b px-4 py-2',
      'flex items-center justify-between',
      'animate-in slide-in-from-top-2 duration-200',
      disabled && 'opacity-50 pointer-events-none',
      className
    )}>
      <div className="flex items-center gap-3">
        <Badge variant="secondary" className="text-sm">
          {selectionCount} selected
        </Badge>
        
        {onBulkAssign && (
          <Button
            variant="default"
            size="sm"
            onClick={handleBulkAssign}
            disabled={disabled}
            className="h-8"
          >
            <FolderPlus className="h-4 w-4 mr-2" />
            Assign
          </Button>
        )}
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={handleClose}
        disabled={disabled}
        className="h-8 w-8 p-0"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

/**
 * Hook to manage bulk toolbar visibility and state
 */
export function useBulkActionToolbar() {
  const selection = useEmailSelection();
  const [isVisible, setIsVisible] = useState(true);

  const showToolbar = selection.actions.hasSelection() && isVisible;
  
  const hideToolbar = () => setIsVisible(false);
  const showToolbarAgain = () => setIsVisible(true);
  
  const dismissSelection = () => {
    selection.actions.deselectAll();
    setIsVisible(true);
  };

  return {
    showToolbar,
    hideToolbar,
    showToolbarAgain,
    dismissSelection,
    selectionCount: selection.actions.getSelectionCount(),
    hasSelection: selection.actions.hasSelection()
  };
}