/**
 * Zero Mail Shell - UI wrapper component that provides a Zero-like email interface
 * 
 * This component creates a lightweight email interface that mimics Zero's UI patterns
 * while integrating with our Obelisk email system.
 */

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useZeroMailDriver, type ZeroMailDriver, type ZeroMailFolder, type ZeroMailMessage, type ZeroMailConfig } from '@/lib/zero-mail-driver';
import { useZeroEmailAuth } from '@/adapters/zero-email-adapter';
import { ConnectMicrosoftButton } from './ConnectMicrosoftButton';
import { EmailAssignButton } from './EmailAssignButton';
import { CaseAssignmentModal, type EmailAssignment } from './CaseAssignmentModal';
import { EmailSelectionProvider, useEmailSelection, useEmailSelectionKeyboard } from './EmailSelectionProvider';
import { BulkActionToolbar, CompactBulkActionToolbar } from './BulkActionToolbar';
import { BulkCaseAssignmentModal } from './BulkCaseAssignmentModal';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Mail, 
  Search, 
  Inbox, 
  Send, 
  FileText as Draft, 
  Trash, 
  Archive,
  Star,
  MoreHorizontal,
  RefreshCw as Refresh,
  Edit as Compose,
  ChevronRight,
  ChevronDown,
  Paperclip,
  Reply,
  ReplyAll,
  Forward,
  Clock,
  CheckSquare,
  Square
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ZeroMailShellProps {
  className?: string;
  accountId?: string;
  onMessageSelect?: (message: ZeroMailMessage) => void;
  onComposeClick?: () => void;
  showToolbar?: boolean;
  showFolders?: boolean;
  showPreview?: boolean;
  defaultView?: 'inbox' | 'sent' | 'drafts' | 'all';
  enableMultiSelect?: boolean;
  showBulkActions?: boolean;
  onBulkAssignComplete?: (results: any[]) => void;
}

/**
 * Main Zero Mail Shell component
 */
export function ZeroMailShell({
  className,
  accountId,
  onMessageSelect,
  onComposeClick,
  showToolbar = true,
  showFolders = true,
  showPreview = true,
  defaultView = 'inbox',
  enableMultiSelect = true,
  showBulkActions = true,
  onBulkAssignComplete
}: ZeroMailShellProps) {
  const auth = useZeroEmailAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [folders, setFolders] = useState<ZeroMailFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<ZeroMailFolder | null>(null);
  const [messages, setMessages] = useState<ZeroMailMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<ZeroMailMessage | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMessageDetail, setShowMessageDetail] = useState(false);
  
  // Case assignment modal state
  const [assignmentModal, setAssignmentModal] = useState({
    isOpen: false,
    emailToAssign: null as ZeroMailMessage | null
  });

  // Bulk assignment modal state
  const [bulkAssignmentModal, setBulkAssignmentModal] = useState({
    isOpen: false,
    selectedEmails: [] as ZeroMailMessage[]
  });

  // Mail driver configuration
  const [mailConfig, setMailConfig] = useState<ZeroMailConfig | undefined>(undefined);
  
  useEffect(() => {
    const setupConfig = async () => {
      if (!accountId && (await auth.isAuthenticated())) {
        const userId = await auth.getUserId();
        setMailConfig({
          provider: 'microsoft',
          accountId: userId || ''
        });
      } else if (accountId) {
        setMailConfig({
          provider: 'microsoft',
          accountId
        });
      } else {
        setMailConfig(undefined);
      }
    };
    
    setupConfig();
  }, [accountId, auth]);

  const { driver, isConfigured, error: driverError } = useZeroMailDriver(mailConfig);

  // Initialize component
  useEffect(() => {
    const initialize = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check connection status
        const status = await auth.getProviderStatus('microsoft');
        setIsConnected(status.connected);

        if (!status.connected) {
          return;
        }

        if (!driver || !isConfigured) {
          return;
        }

        // Load folders
        const folderList = await driver.getFolders();
        setFolders(folderList);

        // Select default folder
        const defaultFolder = folderList.find(f => f.type === defaultView) || folderList[0];
        if (defaultFolder) {
          setSelectedFolder(defaultFolder);
          await loadMessages(defaultFolder.id);
        }
      } catch (err) {
        console.error('Error initializing Zero Mail Shell:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize email');
        toast.error('Failed to load emails');
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [auth, driver, isConfigured, defaultView]);

  // Load messages for a folder
  const loadMessages = async (folderId: string, options: { page?: number; search?: string } = {}) => {
    if (!driver) return;

    try {
      setLoading(true);
      setError(null);

      let response;
      if (options.search) {
        response = await driver.searchMessages(options.search, {
          folderId,
          page: options.page || 1,
          limit: 20
        });
      } else {
        response = await driver.getMessages(folderId, {
          page: options.page || 1,
          limit: 20,
          sortBy: 'received',
          sortOrder: 'desc'
        });
      }

      setMessages(response.messages);
    } catch (err) {
      console.error('Error loading messages:', err);
      setError(err instanceof Error ? err.message : 'Failed to load messages');
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  // Handle folder selection
  const handleFolderSelect = (folder: ZeroMailFolder) => {
    setSelectedFolder(folder);
    setSelectedMessage(null);
    setSearchQuery('');
    loadMessages(folder.id);
  };

  // Handle message selection
  const handleMessageSelect = async (message: ZeroMailMessage) => {
    setSelectedMessage(message);
    setShowMessageDetail(true);
    
    if (onMessageSelect) {
      onMessageSelect(message);
    }

    // Mark as read if unread
    if (!message.isRead && driver) {
      try {
        await driver.markAsRead(message.id);
        // Update message in local state
        setMessages(prev => prev.map(m => 
          m.id === message.id ? { ...m, isRead: true } : m
        ));
      } catch (err) {
        console.error('Error marking message as read:', err);
      }
    }
  };

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (selectedFolder && query.trim()) {
      loadMessages(selectedFolder.id, { search: query });
    } else if (selectedFolder) {
      loadMessages(selectedFolder.id);
    }
  };

  // Handle email assignment
  const handleEmailAssign = (emailId: string) => {
    const email = messages.find(m => m.id === emailId) || selectedMessage;
    if (email) {
      setAssignmentModal({
        isOpen: true,
        emailToAssign: email
      });
    }
  };

  const handleAssignmentComplete = (assignment: EmailAssignment) => {
    console.log('Email assigned successfully:', assignment);
    // TODO: Update email state to show assignment
    // TODO: Show success toast
  };

  const handleAssignmentModalClose = () => {
    setAssignmentModal({
      isOpen: false,
      emailToAssign: null
    });
  };

  // Handle refresh
  const handleRefresh = () => {
    if (selectedFolder) {
      loadMessages(selectedFolder.id);
    }
  };

  // Handle compose
  const handleCompose = () => {
    if (onComposeClick) {
      onComposeClick();
    } else {
      toast.info('Compose functionality will open in a new window');
    }
  };

  // Show connection interface if not connected
  if (!isConnected) {
    return (
      <Card className={cn('w-full max-w-md mx-auto mt-8', className)}>
        <CardHeader className="text-center">
          <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Connect Your Email</h3>
          <p className="text-sm text-muted-foreground">
            Connect your Microsoft Outlook account to access your emails
          </p>
        </CardHeader>
        <CardContent>
          <ConnectMicrosoftButton />
        </CardContent>
      </Card>
    );
  }

  // Show error state
  if (error && !loading) {
    return (
      <Card className={cn('w-full max-w-md mx-auto mt-8', className)}>
        <CardHeader className="text-center">
          <Mail className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <h3 className="text-lg font-semibold">Email Error</h3>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardHeader>
        <CardContent>
          <Button onClick={handleRefresh} className="w-full">
            <Refresh className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Wrap the component in EmailSelectionProvider if multi-select is enabled
  if (enableMultiSelect) {
    return (
      <EmailSelectionProvider persistSelection={true} storageKey="zero-mail-selection">
        <ZeroMailShellContent
          {...{
            className,
            accountId,
            onMessageSelect,
            onComposeClick,
            showToolbar,
            showFolders,
            showPreview,
            defaultView,
            enableMultiSelect,
            showBulkActions,
            onBulkAssignComplete,
            auth,
            isConnected,
            folders,
            selectedFolder,
            messages,
            selectedMessage,
            searchQuery,
            loading,
            error,
            showMessageDetail,
            assignmentModal,
            bulkAssignmentModal,
            setIsConnected,
            setFolders,
            setSelectedFolder,
            setMessages,
            setSelectedMessage,
            setSearchQuery,
            setLoading,
            setError,
            setShowMessageDetail,
            setAssignmentModal,
            setBulkAssignmentModal,
            mailConfig,
            driver,
            isConfigured,
            driverError,
            loadMessages,
            handleFolderSelect,
            handleMessageSelect,
            handleSearch,
            handleEmailAssign,
            handleAssignmentComplete,
            handleAssignmentModalClose,
            handleRefresh,
            handleCompose
          }}
        />
      </EmailSelectionProvider>
    );
  }

  return (
    <ZeroMailShellContent
      {...{
        className,
        accountId,
        onMessageSelect,
        onComposeClick,
        showToolbar,
        showFolders,
        showPreview,
        defaultView,
        enableMultiSelect,
        showBulkActions,
        onBulkAssignComplete,
        auth,
        isConnected,
        folders,
        selectedFolder,
        messages,
        selectedMessage,
        searchQuery,
        loading,
        error,
        showMessageDetail,
        assignmentModal,
        bulkAssignmentModal,
        setIsConnected,
        setFolders,
        setSelectedFolder,
        setMessages,
        setSelectedMessage,
        setSearchQuery,
        setLoading,
        setError,
        setShowMessageDetail,
        setAssignmentModal,
        setBulkAssignmentModal,
        mailConfig,
        driver,
        isConfigured,
        driverError,
        loadMessages,
        handleFolderSelect,
        handleMessageSelect,
        handleSearch,
        handleEmailAssign,
        handleAssignmentComplete,
        handleAssignmentModalClose,
        handleRefresh,
        handleCompose
      }}
    />
  );
}

/**
 * Internal component that contains the actual shell content
 */
function ZeroMailShellContent(props: any) {
  const {
    className,
    enableMultiSelect,
    showBulkActions,
    onBulkAssignComplete,
    auth,
    isConnected,
    folders,
    selectedFolder,
    messages,
    selectedMessage,
    searchQuery,
    loading,
    error,
    showMessageDetail,
    assignmentModal,
    bulkAssignmentModal,
    setIsConnected,
    setFolders,
    setSelectedFolder,
    setMessages,
    setSelectedMessage,
    setSearchQuery,
    setLoading,
    setError,
    setShowMessageDetail,
    setAssignmentModal,
    setBulkAssignmentModal,
    mailConfig,
    driver,
    isConfigured,
    driverError,
    loadMessages,
    handleFolderSelect,
    handleMessageSelect,
    handleSearch,
    handleEmailAssign,
    handleAssignmentComplete,
    handleAssignmentModalClose,
    handleRefresh,
    handleCompose,
    showToolbar,
    showFolders,
    showPreview
  } = props;

  // Multi-select functionality (only available if enableMultiSelect is true)
  const selection = enableMultiSelect ? useEmailSelection() : null;
  const { handleKeyDown } = enableMultiSelect ? useEmailSelectionKeyboard() : { handleKeyDown: () => false };

  // Update selection total count when messages change
  useEffect(() => {
    if (selection) {
      selection.actions.setTotalCount(messages.length);
    }
  }, [messages.length, selection]);

  // Handle bulk assignment
  const handleBulkAssign = useCallback((selectedEmails: ZeroMailMessage[]) => {
    setBulkAssignmentModal({
      isOpen: true,
      selectedEmails
    });
  }, [setBulkAssignmentModal]);

  const handleBulkAssignmentModalClose = useCallback(() => {
    setBulkAssignmentModal({
      isOpen: false,
      selectedEmails: []
    });
  }, [setBulkAssignmentModal]);

  const handleBulkAssignmentComplete = useCallback((results: any[]) => {
    // Clear selection after successful bulk assignment
    if (selection) {
      selection.actions.deselectAll();
    }
    
    // Close modal
    setBulkAssignmentModal({
      isOpen: false,
      selectedEmails: []
    });

    // Call parent callback
    if (onBulkAssignComplete) {
      onBulkAssignComplete(results);
    }

    // Refresh messages to show updated assignments
    if (selectedFolder) {
      loadMessages(selectedFolder.id);
    }
  }, [selection, setBulkAssignmentModal, onBulkAssignComplete, selectedFolder, loadMessages]);

  // Handle bulk operations
  const handleBulkMarkAsRead = useCallback(async (selectedEmails: ZeroMailMessage[]) => {
    if (!driver) return;

    try {
      await Promise.all(
        selectedEmails
          .filter(email => !email.isRead)
          .map(email => driver.markAsRead(email.id))
      );
      
      // Update local state
      setMessages(prev => prev.map(m => 
        selectedEmails.find(e => e.id === m.id && !m.isRead) 
          ? { ...m, isRead: true } 
          : m
      ));
      
      toast.success(`Marked ${selectedEmails.filter(e => !e.isRead).length} emails as read`);
    } catch (error) {
      console.error('Failed to mark emails as read:', error);
      toast.error('Failed to mark emails as read');
    }
  }, [driver, setMessages]);

  const handleBulkMarkAsUnread = useCallback(async (selectedEmails: ZeroMailMessage[]) => {
    if (!driver) return;

    try {
      await Promise.all(
        selectedEmails
          .filter(email => email.isRead)
          .map(email => driver.markAsUnread(email.id))
      );
      
      // Update local state
      setMessages(prev => prev.map(m => 
        selectedEmails.find(e => e.id === m.id && m.isRead) 
          ? { ...m, isRead: false } 
          : m
      ));
      
      toast.success(`Marked ${selectedEmails.filter(e => e.isRead).length} emails as unread`);
    } catch (error) {
      console.error('Failed to mark emails as unread:', error);
      toast.error('Failed to mark emails as unread');
    }
  }, [driver, setMessages]);

  const handleBulkArchive = useCallback(async (selectedEmails: ZeroMailMessage[]) => {
    // Implementation would depend on your email provider's archive functionality
    toast.info('Archive functionality not yet implemented');
  }, []);

  const handleBulkDelete = useCallback(async (selectedEmails: ZeroMailMessage[]) => {
    if (!driver) return;

    try {
      await Promise.all(
        selectedEmails.map(email => driver.deleteMessage(email.id))
      );
      
      // Remove from local state
      setMessages(prev => prev.filter(m => !selectedEmails.find(e => e.id === m.id)));
      
      toast.success(`Deleted ${selectedEmails.length} emails`);
    } catch (error) {
      console.error('Failed to delete emails:', error);
      toast.error('Failed to delete emails');
    }
  }, [driver, setMessages]);

  return (
    <div className={cn('flex h-full w-full bg-background', className)}>
      {/* Sidebar - Folders */}
      {showFolders && (
        <div className="w-64 border-r bg-muted/20">
          <div className="p-4 border-b">
            <Button onClick={handleCompose} className="w-full">
              <Compose className="h-4 w-4 mr-2" />
              Compose
            </Button>
          </div>
          
          <ScrollArea className="h-[calc(100vh-120px)]">
            <div className="p-2">
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-1">
                  {folders.map((folder) => (
                    <FolderItem
                      key={folder.id}
                      folder={folder}
                      isSelected={selectedFolder?.id === folder.id}
                      onClick={() => handleFolderSelect(folder)}
                    />
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        {showToolbar && (
          <div className="border-b p-4 bg-background">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search emails..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <Refresh className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        <div className="flex-1 flex">
          {/* Message List */}
          <div className={cn('flex-1 border-r', showPreview ? 'max-w-md' : '')}>
            <ScrollArea className="h-full">
              {loading ? (
                <div className="p-4 space-y-4">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <MessageSkeleton key={i} />
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No messages found</p>
                </div>
              ) : (
                <div className="divide-y">
                  {/* Select All Header */}
                  {enableMultiSelect && messages.length > 0 && (
                    <div className="p-3 border-b bg-muted/20">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selection?.state.isSelectAllChecked || false}
                          onCheckedChange={(checked) => {
                            if (selection) {
                              if (checked) {
                                selection.actions.selectAll(messages);
                              } else {
                                selection.actions.deselectAll();
                              }
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-sm font-medium">
                          {selection?.state.isSelectAllChecked ? 'Deselect All' : 'Select All'}
                          {selection?.actions.getSelectionCount() > 0 && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              {selection.actions.getSelectionCount()} selected
                            </Badge>
                          )}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* Compact Bulk Toolbar for Mobile */}
                  {enableMultiSelect && showBulkActions && selection?.actions.hasSelection() && (
                    <CompactBulkActionToolbar
                      emails={messages}
                      onBulkAssign={handleBulkAssign}
                      className="sm:hidden"
                    />
                  )}
                  
                  {messages.map((message, index) => (
                    <MessageItem
                      key={message.id}
                      message={message}
                      index={index}
                      isSelected={selectedMessage?.id === message.id}
                      isMultiSelected={enableMultiSelect ? selection?.actions.isSelected(message.id) || false : false}
                      enableMultiSelect={enableMultiSelect}
                      onClick={(event) => {
                        if (enableMultiSelect && selection) {
                          // Handle multi-select logic
                          if (event.shiftKey && selection.state.lastSelectedIndex !== null) {
                            selection.actions.selectRange(selection.state.lastSelectedIndex, index, messages);
                          } else if (event.ctrlKey || event.metaKey) {
                            selection.actions.toggleEmail(message.id, index);
                          } else if (event.target instanceof HTMLInputElement && event.target.type === 'checkbox') {
                            // Checkbox click - prevent default message selection
                            return;
                          } else {
                            // Regular click - select message for preview
                            handleMessageSelect(message);
                            
                            // Also select for multi-select if not already selected
                            if (!selection.actions.isSelected(message.id)) {
                              selection.actions.selectEmail(message.id, index);
                            }
                          }
                        } else {
                          handleMessageSelect(message);
                        }
                      }}
                      onCheckboxChange={(checked) => {
                        if (enableMultiSelect && selection) {
                          if (checked) {
                            selection.actions.selectEmail(message.id, index);
                          } else {
                            selection.actions.deselectEmail(message.id);
                          }
                        }
                      }}
                      onKeyDown={(event) => {
                        if (enableMultiSelect && selection) {
                          const handled = handleKeyDown(event, message.id, index, messages);
                          if (handled) {
                            event.preventDefault();
                          }
                        }
                      }}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Message Preview */}
          {showPreview && (
            <div className="flex-1">
              {selectedMessage ? (
                <MessagePreview
                  message={selectedMessage}
                  onReply={() => handleCompose()}
                  onReplyAll={() => handleCompose()}
                  onForward={() => handleCompose()}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select a message to view</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Message Detail Sheet */}
      <Sheet open={showMessageDetail} onOpenChange={setShowMessageDetail}>
        <SheetContent className="w-full sm:max-w-lg">
          {selectedMessage && (
            <>
              <SheetHeader>
                <SheetTitle className="line-clamp-2">{selectedMessage.subject}</SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                <MessagePreview
                  message={selectedMessage}
                  onReply={() => handleCompose()}
                  onReplyAll={() => handleCompose()}
                  onForward={() => handleCompose()}
                />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Case Assignment Modal */}
      <CaseAssignmentModal
        isOpen={assignmentModal.isOpen}
        onClose={handleAssignmentModalClose}
        email={assignmentModal.emailToAssign}
        onAssignComplete={handleAssignmentComplete}
      />

      {/* Bulk Action Toolbar - Desktop */}
      {enableMultiSelect && showBulkActions && (
        <BulkActionToolbar
          emails={messages}
          onBulkAssign={handleBulkAssign}
          onMarkAsRead={handleBulkMarkAsRead}
          onMarkAsUnread={handleBulkMarkAsUnread}
          onArchive={handleBulkArchive}
          onDelete={handleBulkDelete}
          className="hidden sm:flex"
        />
      )}

      {/* Bulk Case Assignment Modal */}
      {enableMultiSelect && (
        <BulkCaseAssignmentModal
          isOpen={bulkAssignmentModal.isOpen}
          onClose={handleBulkAssignmentModalClose}
          emails={bulkAssignmentModal.selectedEmails}
          onAssignComplete={handleBulkAssignmentComplete}
          onRetry={(failedEmails) => {
            // Handle retry by opening a new bulk assignment with failed emails
            setBulkAssignmentModal({
              isOpen: true,
              selectedEmails: failedEmails
            });
          }}
        />
      )}
    </div>
  );
}

/**
 * Folder item component
 */
function FolderItem({ 
  folder, 
  isSelected, 
  onClick 
}: { 
  folder: ZeroMailFolder; 
  isSelected: boolean; 
  onClick: () => void;
}) {
  const getFolderIcon = (type: ZeroMailFolder['type']) => {
    switch (type) {
      case 'inbox': return Inbox;
      case 'sent': return Send;
      case 'draft': return Draft;
      case 'trash': return Trash;
      case 'junk': return Archive;
      default: return Mail;
    }
  };

  const Icon = getFolderIcon(folder.type);

  return (
    <Button
      variant={isSelected ? 'secondary' : 'ghost'}
      className="w-full justify-start h-auto p-3"
      onClick={onClick}
    >
      <Icon className="h-4 w-4 mr-3" />
      <span className="flex-1 text-left">{folder.name}</span>
      {folder.unreadCount > 0 && (
        <Badge variant="secondary" className="ml-2 h-5 text-xs">
          {folder.unreadCount}
        </Badge>
      )}
    </Button>
  );
}

/**
 * Message item component
 */
function MessageItem({ 
  message, 
  index,
  isSelected, 
  isMultiSelected = false,
  enableMultiSelect = false,
  onClick,
  onCheckboxChange,
  onKeyDown
}: { 
  message: ZeroMailMessage;
  index: number;
  isSelected: boolean;
  isMultiSelected?: boolean;
  enableMultiSelect?: boolean;
  onClick: (event: React.MouseEvent) => void;
  onCheckboxChange?: (checked: boolean) => void;
  onKeyDown?: (event: React.KeyboardEvent) => void;
}) {
  return (
    <div
      className={cn(
        'p-4 cursor-pointer hover:bg-muted/50 transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        isSelected && 'bg-muted',
        isMultiSelected && 'bg-accent/20 border-l-4 border-accent',
        !message.isRead && 'font-semibold bg-accent/10'
      )}
      onClick={onClick}
      onKeyDown={onKeyDown}
      tabIndex={0}
      role="option"
      aria-selected={isMultiSelected}
    >
      <div className="flex items-start gap-3">
        {/* Multi-select Checkbox */}
        {enableMultiSelect && (
          <div className="flex-shrink-0 pt-1">
            <Checkbox
              checked={isMultiSelected}
              onCheckedChange={onCheckboxChange}
              onClick={(e) => e.stopPropagation()}
              className="rounded"
              aria-label={`Select email: ${message.subject || 'No subject'}`}
            />
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-medium truncate">{message.from.name || message.from.address}</p>
            {message.hasAttachments && <Paperclip className="h-3 w-3 text-muted-foreground" />}
            {message.importance === 'high' && <Star className="h-3 w-3 text-orange-500" />}
            {!message.isRead && <div className="w-2 h-2 bg-blue-600 rounded-full" />}
          </div>
          <p className="text-sm font-medium truncate mb-1">{message.subject || '(No Subject)'}</p>
          <p className="text-xs text-muted-foreground line-clamp-2">{message.preview}</p>
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          {!enableMultiSelect && (
            <EmailAssignButton
              emailId={message.id}
              variant="icon"
              onAssign={handleEmailAssign}
            />
          )}
          <Clock className="h-3 w-3" />
          {formatMessageTime(message.receivedAt || message.createdAt)}
        </div>
      </div>
    </div>
  );
}

/**
 * Message preview component
 */
function MessagePreview({ 
  message, 
  onReply, 
  onReplyAll, 
  onForward 
}: { 
  message: ZeroMailMessage;
  onReply: () => void;
  onReplyAll: () => void;
  onForward: () => void;
}) {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b">
        <h2 className="text-xl font-semibold mb-4">{message.subject || '(No Subject)'}</h2>
        
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium">From:</span>
            <span>{message.from.name ? `${message.from.name} <${message.from.address}>` : message.from.address}</span>
          </div>
          
          {message.to.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="font-medium">To:</span>
              <span>{message.to.map(r => r.name ? `${r.name} <${r.address}>` : r.address).join(', ')}</span>
            </div>
          )}
          
          {message.cc && message.cc.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="font-medium">CC:</span>
              <span>{message.cc.map(r => r.name ? `${r.name} <${r.address}>` : r.address).join(', ')}</span>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <span className="font-medium">Date:</span>
            <span>{formatMessageDate(message.receivedAt || message.createdAt)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          <EmailAssignButton
            emailId={message.id}
            variant="compact"
            onAssign={handleEmailAssign}
          />
          <Button variant="outline" size="sm" onClick={onReply}>
            <Reply className="h-4 w-4 mr-2" />
            Reply
          </Button>
          <Button variant="outline" size="sm" onClick={onReplyAll}>
            <ReplyAll className="h-4 w-4 mr-2" />
            Reply All
          </Button>
          <Button variant="outline" size="sm" onClick={onForward}>
            <Forward className="h-4 w-4 mr-2" />
            Forward
          </Button>
        </div>
      </div>

      {/* Body */}
      <ScrollArea className="flex-1 p-6">
        <div 
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ 
            __html: message.body || message.preview || 'No content available'
          }}
        />
      </ScrollArea>
    </div>
  );
}

/**
 * Message skeleton component
 */
function MessageSkeleton() {
  return (
    <div className="p-4">
      <div className="flex items-start gap-3">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

/**
 * Utility functions
 */
function formatMessageTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  
  return date.toLocaleDateString();
}

function formatMessageDate(date: Date): string {
  return date.toLocaleString();
}