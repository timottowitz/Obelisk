'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { 
  Mail, 
  Search, 
  Filter, 
  Download, 
  Archive, 
  Trash2,
  RefreshCw,
  BarChart3,
  MessageCircle,
  Settings,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  ResizableHandle, 
  ResizablePanel, 
  ResizablePanelGroup 
} from '@/components/ui/resizable';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import EmailArchiveList from './EmailArchiveList';
import EmailContentViewer from './EmailContentViewer';
import EmailExportDialog from './EmailExportDialog';
import EmailThreadView from './EmailThreadView';
import { useCaseEmails, useCaseEmailStats } from '@/hooks/useCaseEmails';
import { EmailArchiveItem } from '@/lib/services/email-archive';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CaseEmailArchiveProps {
  caseId: string;
  className?: string;
}

type ViewMode = 'split' | 'list' | 'content';
type ContentType = 'email' | 'thread' | 'stats';

interface ViewState {
  mode: ViewMode;
  contentType: ContentType;
  selectedEmailId?: string;
  selectedThreadId?: string;
  emailHistory: string[];
  historyIndex: number;
}

function EmailStats({ caseId }: { caseId: string }) {
  const { data: stats, isLoading, error } = useCaseEmailStats(caseId);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/2"></div>
          <div className="grid grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Failed to load email statistics
      </div>
    );
  }

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Email Archive Statistics</h3>
        
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Mail className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stats.totalEmails.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Emails</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Archive className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stats.totalAttachments.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Attachments</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{formatSize(stats.totalSize)}</p>
                <p className="text-sm text-muted-foreground">Total Size</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Top Senders */}
        <div className="space-y-4">
          <h4 className="font-semibold">Top Senders</h4>
          <div className="space-y-2">
            {stats.topSenders.slice(0, 10).map((sender, index) => (
              <div key={sender.email} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground w-4">
                    #{index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium">
                      {sender.name || sender.email}
                    </p>
                    {sender.name && (
                      <p className="text-xs text-muted-foreground">{sender.email}</p>
                    )}
                  </div>
                </div>
                <Badge variant="secondary">
                  {sender.count} email{sender.count !== 1 ? 's' : ''}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Activity */}
        {stats.monthlyStats && stats.monthlyStats.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-semibold">Monthly Activity</h4>
            <div className="space-y-2">
              {stats.monthlyStats.slice(0, 12).map((month) => (
                <div key={month.month} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded">
                  <span className="text-sm">{month.month}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{month.count} emails</span>
                    <span className="text-xs text-muted-foreground">
                      ({formatSize(month.size)})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CaseEmailArchive({ caseId, className }: CaseEmailArchiveProps) {
  const [viewState, setViewState] = useState<ViewState>({
    mode: 'split',
    contentType: 'email',
    emailHistory: [],
    historyIndex: -1
  });
  
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportEmailIds, setExportEmailIds] = useState<string[]>([]);

  const { 
    state: emailState,
    operations: emailOps,
    hasSelectedEmails,
    selectedEmailCount
  } = useCaseEmails({ 
    caseId, 
    pageSize: 50,
    enableRealtime: true
  });

  // Handle email selection with history
  const handleEmailSelect = useCallback((email: EmailArchiveItem) => {
    setViewState(prev => {
      const newHistory = prev.emailHistory.slice(0, prev.historyIndex + 1);
      newHistory.push(email.emailId);
      
      return {
        ...prev,
        contentType: 'email',
        selectedEmailId: email.emailId,
        emailHistory: newHistory,
        historyIndex: newHistory.length - 1
      };
    });
  }, []);

  // Handle thread view
  const handleThreadSelect = useCallback((conversationId: string) => {
    setViewState(prev => ({
      ...prev,
      contentType: 'thread',
      selectedThreadId: conversationId
    }));
  }, []);

  // Handle navigation
  const handleNavigate = useCallback((direction: 'prev' | 'next') => {
    setViewState(prev => {
      const newIndex = direction === 'prev' 
        ? Math.max(0, prev.historyIndex - 1)
        : Math.min(prev.emailHistory.length - 1, prev.historyIndex + 1);
      
      return {
        ...prev,
        historyIndex: newIndex,
        selectedEmailId: prev.emailHistory[newIndex],
        contentType: 'email'
      };
    });
  }, []);

  // Handle bulk actions
  const handleBulkAction = useCallback((action: string, emailIds: string[]) => {
    switch (action) {
      case 'export':
        setExportEmailIds(emailIds);
        setExportDialogOpen(true);
        break;
      default:
        // Handle other bulk actions
        break;
    }
  }, []);

  // Handle email actions
  const handleEmailAction = useCallback((action: string, email: EmailArchiveItem) => {
    switch (action) {
      case 'thread':
        if (email.conversationId) {
          handleThreadSelect(email.conversationId);
        }
        break;
      case 'export':
        setExportEmailIds([email.emailId]);
        setExportDialogOpen(true);
        break;
      case 'reply':
        // Implement reply functionality
        toast.info('Reply functionality coming soon');
        break;
      case 'forward':
        // Implement forward functionality
        toast.info('Forward functionality coming soon');
        break;
      default:
        // Handle other email actions
        break;
    }
  }, [handleThreadSelect]);

  // Toggle view mode
  const toggleViewMode = useCallback(() => {
    setViewState(prev => {
      const modes: ViewMode[] = ['split', 'list', 'content'];
      const currentIndex = modes.indexOf(prev.mode);
      const nextIndex = (currentIndex + 1) % modes.length;
      return { ...prev, mode: modes[nextIndex] };
    });
  }, []);

  // Show statistics
  const showStats = useCallback(() => {
    setViewState(prev => ({
      ...prev,
      contentType: 'stats'
    }));
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'f':
            event.preventDefault();
            // Focus search input
            break;
          case 'e':
            event.preventDefault();
            if (hasSelectedEmails) {
              setExportEmailIds(Array.from(emailState.selectedEmails));
              setExportDialogOpen(true);
            }
            break;
        }
      }
      
      // Navigation shortcuts
      if (!event.ctrlKey && !event.metaKey && !event.altKey) {
        switch (event.key) {
          case 'ArrowLeft':
            if (viewState.historyIndex > 0) {
              handleNavigate('prev');
            }
            break;
          case 'ArrowRight':
            if (viewState.historyIndex < viewState.emailHistory.length - 1) {
              handleNavigate('next');
            }
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasSelectedEmails, emailState.selectedEmails, viewState, handleNavigate]);

  const canNavigate = {
    prev: viewState.historyIndex > 0,
    next: viewState.historyIndex < viewState.emailHistory.length - 1
  };

  const currentEmail = emailState.emails.find(e => e.emailId === viewState.selectedEmailId);

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Archive
          </h2>
          
          {emailState.totalCount > 0 && (
            <Badge variant="secondary">
              {emailState.totalCount.toLocaleString()} emails
            </Badge>
          )}
          
          {hasSelectedEmails && (
            <Badge variant="outline">
              {selectedEmailCount} selected
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={showStats}
              >
                <BarChart3 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>View Statistics</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={emailOps.refreshEmails}
                disabled={emailState.isLoading}
              >
                <RefreshCw className={cn("h-4 w-4", emailState.isLoading && "animate-spin")} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh</TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="h-6" />

          {hasSelectedEmails && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setExportEmailIds(Array.from(emailState.selectedEmails));
                  setExportDialogOpen(true);
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Export ({selectedEmailCount})
              </Button>
              
              <Separator orientation="vertical" className="h-6" />
            </>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleViewMode}
              >
                {viewState.mode === 'split' && <Maximize2 className="h-4 w-4" />}
                {viewState.mode === 'list' && <Mail className="h-4 w-4" />}
                {viewState.mode === 'content' && <Minimize2 className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {viewState.mode === 'split' && 'List View'}
              {viewState.mode === 'list' && 'Content View'}
              {viewState.mode === 'content' && 'Split View'}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0">
        {viewState.mode === 'split' ? (
          <ResizablePanelGroup direction="horizontal" className="h-full">
            <ResizablePanel defaultSize={40} minSize={30}>
              <EmailArchiveList
                caseId={caseId}
                onEmailSelect={handleEmailSelect}
                onBulkAction={handleBulkAction}
                selectedEmailId={viewState.selectedEmailId}
                className="h-full border-0 rounded-none"
              />
            </ResizablePanel>
            
            <ResizableHandle withHandle />
            
            <ResizablePanel defaultSize={60} minSize={40}>
              <div className="h-full border-l bg-background">
                {viewState.contentType === 'stats' ? (
                  <EmailStats caseId={caseId} />
                ) : viewState.contentType === 'thread' && viewState.selectedThreadId ? (
                  <EmailThreadView
                    caseId={caseId}
                    conversationId={viewState.selectedThreadId}
                    onEmailSelect={handleEmailSelect}
                    onClose={() => setViewState(prev => ({ ...prev, contentType: 'email' }))}
                  />
                ) : viewState.selectedEmailId ? (
                  <EmailContentViewer
                    caseId={caseId}
                    emailId={viewState.selectedEmailId}
                    onAction={handleEmailAction}
                    onNavigate={handleNavigate}
                    canNavigate={canNavigate}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Select an email to view its content</p>
                      <p className="text-xs mt-2">
                        Use <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Ctrl+F</kbd> to search
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : viewState.mode === 'list' ? (
          <EmailArchiveList
            caseId={caseId}
            onEmailSelect={handleEmailSelect}
            onBulkAction={handleBulkAction}
            selectedEmailId={viewState.selectedEmailId}
            className="h-full border-0 rounded-none"
          />
        ) : (
          <div className="h-full">
            {viewState.contentType === 'stats' ? (
              <EmailStats caseId={caseId} />
            ) : viewState.contentType === 'thread' && viewState.selectedThreadId ? (
              <EmailThreadView
                caseId={caseId}
                conversationId={viewState.selectedThreadId}
                onEmailSelect={handleEmailSelect}
                onClose={() => setViewState(prev => ({ ...prev, contentType: 'email' }))}
              />
            ) : viewState.selectedEmailId ? (
              <EmailContentViewer
                caseId={caseId}
                emailId={viewState.selectedEmailId}
                onAction={handleEmailAction}
                onNavigate={handleNavigate}
                canNavigate={canNavigate}
                onClose={() => setViewState(prev => ({ ...prev, mode: 'split' }))}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No email selected</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setViewState(prev => ({ ...prev, mode: 'split' }))}
                  >
                    Back to Split View
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Export Dialog */}
      <EmailExportDialog
        isOpen={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        caseId={caseId}
        emailIds={exportEmailIds}
        emailCount={exportEmailIds.length}
      />
    </div>
  );
}