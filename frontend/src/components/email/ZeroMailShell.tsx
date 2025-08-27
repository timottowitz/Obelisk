/**
 * Zero Mail Shell - UI wrapper component that provides a Zero-like email interface
 * 
 * This component creates a lightweight email interface that mimics Zero's UI patterns
 * while integrating with our Obelisk email system.
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useZeroMailDriver, type ZeroMailDriver, type ZeroMailFolder, type ZeroMailMessage, type ZeroMailConfig } from '@/lib/zero-mail-driver';
import { useZeroEmailAuth } from '@/adapters/zero-email-adapter';
import { ConnectMicrosoftButton } from './ConnectMicrosoftButton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Mail, 
  Search, 
  Inbox, 
  Send, 
  Draft, 
  Trash, 
  Archive,
  Star,
  MoreHorizontal,
  Refresh,
  Compose,
  ChevronRight,
  ChevronDown,
  Paperclip,
  Reply,
  ReplyAll,
  Forward,
  Clock
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
  defaultView = 'inbox'
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

  // Mail driver configuration
  const mailConfig: ZeroMailConfig | undefined = useMemo(() => {
    if (!accountId && auth.isAuthenticated()) {
      return {
        provider: 'microsoft',
        accountId: auth.getUserId() || ''
      };
    }
    return accountId ? {
      provider: 'microsoft',
      accountId
    } : undefined;
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
                  {messages.map((message) => (
                    <MessageItem
                      key={message.id}
                      message={message}
                      isSelected={selectedMessage?.id === message.id}
                      onClick={() => handleMessageSelect(message)}
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
  isSelected, 
  onClick 
}: { 
  message: ZeroMailMessage; 
  isSelected: boolean; 
  onClick: () => void;
}) {
  return (
    <div
      className={cn(
        'p-4 cursor-pointer hover:bg-muted/50 transition-colors',
        isSelected && 'bg-muted',
        !message.isRead && 'font-semibold bg-accent/10'
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
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
        <div className="text-xs text-muted-foreground flex items-center gap-1">
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