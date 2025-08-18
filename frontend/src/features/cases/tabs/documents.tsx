import { useState, useEffect, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  Search,
  FileText,
  Image,
  File,
  ChevronRight,
  Folder,
  FolderOpen,
  User,
  Loader2,
  Clock,
  Sun,
  Bot,
  Send,
  FolderTree,
  Zap,
  ChevronLeft,
  Trash2,
  FolderPlus,
  UploadIcon
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb';
import { toast } from 'sonner';
import {
  formatFileSize,
  formatDate,
  countDocuments,
  countAllDocuments,
  getStatusDisplay
} from '@/lib/document-utils';
import { SolarDocumentItem, AgentStatus, ChatMessage } from '@/types/documents';

// Radix Primitives
import * as Tooltip from '@radix-ui/react-tooltip';
import * as Collapsible from '@radix-ui/react-collapsible';

import { AlertModal } from '@/components/modal/alert-modal';
import {
  useFoldersOperations,
  useStorageOperations
} from '@/hooks/useDocuments';
import { DocumentPreviewModal } from '@/features/documents/components/document-preview-modal';
import { CreateFolderModal } from '@/features/documents/components/create-folder-modal';
import { useGetCase } from '@/hooks/useCases';

// Get file icon
function getFileIcon(type: string, className?: string) {
  const iconClass = cn('h-4 w-4', className);
  const mimeType = type.split('/')[1];
  switch (mimeType) {
    case 'pdf':
      return <FileText className={cn(iconClass, 'text-red-500')} />;
    case 'doc':
    case 'vnd.openxmlformats-officedocument.wordprocessingml.document':
      return <FileText className={cn(iconClass, 'text-blue-500')} />;
    case 'txt':
      return <FileText className={cn(iconClass, 'text-gray-500')} />;
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
      return <Image className={cn(iconClass, 'text-green-500')} />;
    default:
      return <File className={cn(iconClass, 'text-muted-foreground')} />;
  }
}

export default function Documents({
  caseId,
  caseTypeName
}: {
  caseId: string;
  caseTypeName: string;
}) {
  const { data: caseData, isLoading: isLoadingCase } = useGetCase(caseId);

  // Use React Query hooks for all storage operations
  const {
    uploadDocument,
    createFolder,
    deleteFile,
    deleteFolder,
    downloadFile
  } = useStorageOperations();
  const { folders } = useFoldersOperations(caseId);

  // Derive state from React Query data
  const foldersList = folders.data || [];
  const isLoadingFolders = folders.isLoading;
  const foldersError = folders.error;

  const [searchValue, setSearchValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDocument, setSelectedDocument] =
    useState<SolarDocumentItem | null>(null);
  const [isDocumentDialogOpen, setIsDocumentDialogOpen] = useState(false);

  // Create folder state
  const [isCreateFolderDialogOpen, setIsCreateFolderDialogOpen] =
    useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedParentFolderId, setSelectedParentFolderId] =
    useState<string>('root');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  // Upload document state
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);

  // Recursive function to count all documents in a folder and its children
  const [selectedUploadFolderId, setSelectedUploadFolderId] =
    useState<string>('root');

  // AI Assistant state - now width-based
  const [isAgentPanelCollapsed, setIsAgentPanelCollapsed] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [isAgentTyping, setIsAgentTyping] = useState(false);

  // File tree state
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set([])
  );

  // Agent status and messages
  const [agentStatus] = useState<AgentStatus>({
    status: 'online',
    currentTask: 'Analyzing solar case documents'
  });
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'agent',
      content:
        "Hello! I'm your solar arbitration AI assistant. I can help you analyze solar contracts, calculate damages, review installation issues, and prepare arbitration documents. How can I assist with your solar case today?",
      timestamp: new Date(Date.now() - 300000)
    },
    {
      id: '2',
      type: 'user',
      content:
        'Can you review the solar installation contract and identify any warranty issues?',
      timestamp: new Date(Date.now() - 240000)
    },
    {
      id: '3',
      type: 'agent',
      content:
        'Based on my analysis of the Solar Installation Contract, I found several key warranty provisions:\n\n• 25-year performance warranty with 80% output guarantee\n• 10-year workmanship warranty on installation\n• Equipment warranty varies by manufacturer (panels: 25 years, inverter: 12 years)\n• Warranty may be voided by unauthorized modifications\n• Client has right to remedy within 30 days of notice\n\nI notice potential issues with the performance degradation clause. Would you like me to elaborate on this?',
      timestamp: new Date(Date.now() - 180000)
    }
  ]);

  // Use processed folder structure from backend
  const filteredFolders = useMemo(
    () =>
      foldersList.filter((folder) => {
        // Logically fix: search should check folder name, its documents, and recursively its children
        const matchesSearch = (folderOrChild: any): boolean => {
          if (searchQuery.length === 0) {
            return true;
          }
          // Check documents in this folder/child
          if (
            folderOrChild.documents?.some((doc: any) =>
              doc.name?.toLowerCase().includes(searchQuery.toLowerCase())
            )
          ) {
            return true;
          }
          // Recursively check children
          if (
            folderOrChild.children?.some((child: any) => matchesSearch(child))
          ) {
            return true;
          }
          return false;
        };

        return matchesSearch(folder);
      }),
    [foldersList, searchQuery]
  );

  const folderStructure = Array.isArray(foldersList) ? filteredFolders : [];

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchValue);
  };

  const toggleFolder = useCallback((folderId: string) => {
    setExpandedFolders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  }, []);

  // Handle sending messages
  const handleSendMessage = useCallback(() => {
    if (!chatInput.trim()) return;
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: chatInput.trim(),
      timestamp: new Date()
    };
    setMessages((prev) => [...prev, newMessage]);
    setChatInput('');
    setIsAgentTyping(true);

    // Simulate agent response
    setTimeout(() => {
      const agentResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'agent',
        content:
          'I understand your solar case question. Let me analyze the relevant documents and solar industry standards to provide you with a comprehensive response based on your case materials.',
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, agentResponse]);
      setIsAgentTyping(false);
    }, 2000);
  }, [chatInput]);

  // Handle key press in input
  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    },
    [handleSendMessage]
  );

  // Toggle panel collapse - now width-based
  const toggleAgentPanel = useCallback(() => {
    setIsAgentPanelCollapsed((prev) => !prev);
  }, []);

  // Handle create folder
  const handleCreateFolder = useCallback(async (folderName: string) => {
    if (!folderName.trim()) {
      toast.error('Please enter a folder name');
      return;
    }

    setIsCreatingFolder(true);
    try {
      await createFolder.mutateAsync({
        folderName: folderName.trim(),
        parentId: selectedParentFolderId
      });

      toast.success(`Folder "${folderName}" created successfully`);

      // Expand the parent folder if a parent was selected
      if (selectedParentFolderId !== 'root') {
        setExpandedFolders((prev) => {
          const newSet = new Set(prev);
          newSet.add(selectedParentFolderId);
          return newSet;
        });
      }

      // Reset form
      setNewFolderName('');
      setIsCreateFolderDialogOpen(false);
    } catch (error) {
      console.error('Error creating folder:', error);
      toast.error('Failed to create folder');
    } finally {
      setIsCreatingFolder(false);
    }
  }, [newFolderName, selectedParentFolderId, createFolder]);

  const handleUploadEvidence = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];

      if (file) {
        try {
          setIsUploadingDocument(true);
          // Show upload progress toast
          toast.loading(`Uploading ${file.name}...`, {
            id: 'upload-progress'
          });

          await uploadDocument.mutateAsync({
            file,
            folderId: selectedUploadFolderId
          });

          toast.success('Document uploaded successfully', {
            id: 'upload-progress'
          });
        } catch (error) {
          console.error('Error uploading document:', error);
          toast.error('Failed to upload document', {
            id: 'upload-progress'
          });
        } finally {
          setIsUploadingDocument(false);
          // Reset the input value so the same file can be uploaded again
          if (e.target) {
            e.target.value = '';
          }
        }
      }
    },
    [selectedUploadFolderId, foldersList, uploadDocument]
  );

  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [isLoadingDownloadUrl, setIsLoadingDownloadUrl] = useState(false);

  const handleGetDownloadUrl = useCallback(
    async (document: SolarDocumentItem) => {
      setIsLoadingDownloadUrl(true);
      if (!document) {
        toast.error('No document selected');
        return;
      }

      try {
        const response = await downloadFile.mutateAsync(document.id);
        if (response.success && response.data?.signedUrl) {
          setDownloadUrl(response.data.signedUrl);
        } else {
          toast.error('Failed to download document');
        }
      } catch (error) {
        toast.error('Failed to download document');
      } finally {
        setIsLoadingDownloadUrl(false);
      }
    },
    [downloadFile]
  );

  const handleDownloadFile = useCallback(async () => {
    if (!downloadUrl) {
      toast.error('No download URL found');
      return;
    }
    try {
      const filename =
        (selectedDocument && selectedDocument.name) || 'document';

      window.open(downloadUrl, '_blank', 'noopener,noreferrer');

      const url = new URL(downloadUrl);
      url.searchParams.set(
        'response-content-disposition',
        `attachment; filename="${encodeURIComponent(filename)}"`
      );
      url.searchParams.set('response-content-type', 'application/octet-stream');

      const a = document.createElement('a');
      a.href = url.toString();
      a.download = filename;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success('Download started');
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Failed to download file');
    }
  }, [downloadUrl, selectedDocument]);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteTargetType, setDeleteTargetType] = useState<
    'folder' | 'document' | null
  >(null);

  const handleDeleteFile = useCallback(
    async (id: string) => {
      setDeleteLoading(true);
      try {
        await deleteFile.mutateAsync(id);
        toast.success('File deleted successfully');
        setDeleteTargetId(null);
        setDeleteTargetType(null);
        setDeleteModalOpen(false);
      } catch (error) {
        toast.error('Failed to delete file');
      }
      setDeleteLoading(false);
    },
    [deleteFile]
  );

  const handleDeleteFolder = useCallback(
    async (id: string) => {
      setDeleteLoading(true);
      try {
        await deleteFolder.mutateAsync(id);
        toast.success('Folder deleted successfully');
        setDeleteTargetId(null);
        setDeleteTargetType(null);
        setDeleteModalOpen(false);
      } catch (error) {
        toast.error('Failed to delete folder');
      }
      setDeleteLoading(false);
    },
    [deleteFolder]
  );

  // Recursive component to render folder tree
  const renderFolderTree = useCallback(
    (folders: any[], level: number = 0) => {
      return folders.map((folder, index) => {
        const isExpanded = expandedFolders.has(folder.id);
        const documents = folder.documents || [];
        const children = folder.children || [];
        const isLastItem = index === folders.length - 1;

        return (
          <div key={folder.id} className='relative space-y-1'>
            {/* Vertical line for non-last items */}
            {!isLastItem && (
              <div className='bg-border absolute top-8 left-6 h-full w-px' />
            )}
            {/* Folder Header */}
            <Collapsible.Root
              open={isExpanded}
              onOpenChange={() => toggleFolder(folder.id)}
            >
              <Collapsible.Trigger asChild>
                <Button
                  variant='ghost'
                  className={cn(
                    'hover:bg-accent/80 h-10 w-full justify-start gap-2 px-3 text-sm font-medium transition-colors',
                    level > 0 && 'ml-6'
                  )}
                  role='treeitem'
                  aria-expanded={isExpanded}
                  aria-label={`${folder.name} folder, ${documents.length} documents`}
                >
                  {/* Horizontal line connecting to parent */}
                  {level > 0 && (
                    <div className='bg-border absolute top-1/2 left-0 h-px w-6 -translate-y-1/2' />
                  )}
                  {isExpanded ? (
                    <FolderOpen className='h-4 w-4 text-blue-500' />
                  ) : (
                    <Folder className='h-4 w-4 text-blue-500' />
                  )}
                  {/* Folder name and add button in a row */}
                  <span className='flex flex-1 flex-row items-center gap-1 text-left'>
                    {folder.name}
                  </span>
                  <Badge variant='secondary' className='px-2 py-0.5 text-xs'>
                    {countDocuments(folder)}
                  </Badge>
                  <span
                    className='hover:bg-accent/10 hover:text-accent ml-1 flex h-6 w-6 flex-shrink-0 cursor-pointer flex-row items-center justify-start rounded text-left'
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedParentFolderId(folder.id);
                      setIsCreateFolderDialogOpen(true);
                    }}
                  >
                    <FolderPlus className='h-4 w-4 text-green-600' />
                  </span>
                  <span
                    className={cn(
                      'hover:bg-accent/10 hover:text-accent ml-1 flex h-6 w-6 flex-shrink-0 cursor-pointer flex-row items-center justify-start rounded text-left',
                      isUploadingDocument && 'cursor-not-allowed opacity-50'
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isUploadingDocument) return;
                      setSelectedUploadFolderId(folder.id);
                      const input = document.getElementById('upload-document');
                      if (input) {
                        input.click();
                      }
                    }}
                  >
                    {isUploadingDocument &&
                    selectedUploadFolderId === folder.id ? (
                      <Loader2 className='h-4 w-4 animate-spin text-blue-600' />
                    ) : (
                      <UploadIcon className='h-4 w-4 text-blue-600' />
                    )}
                  </span>
                  {/* Folder delete button */}
                  {folder.parent_folder_id && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTargetId(folder.id);
                        setDeleteTargetType('folder');
                        setDeleteModalOpen(true);
                      }}
                      className='text-destructive flex h-6 w-6 flex-shrink-0 cursor-pointer items-center justify-center rounded'
                      aria-label={`Delete folder ${folder.name}`}
                    >
                      <Trash2 className='h-3 w-3' />
                    </span>
                  )}
                  <ChevronRight
                    className={cn(
                      'h-3 w-3 transition-transform duration-200',
                      isExpanded && 'rotate-90'
                    )}
                  />
                </Button>
              </Collapsible.Trigger>

              {/* Folder Contents */}
              <Collapsible.Content className='data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up relative space-y-1 overflow-hidden pl-6'>
                {/* Vertical line for folder contents */}
                <div className='bg-border absolute top-0 left-6 h-full w-px' />
                {/* Render child folders first */}
                {children.length > 0 && renderFolderTree(children, level + 1)}

                {/* Render documents */}
                {documents.length === 0 && children.length === 0 ? (
                  <div className='text-muted-foreground py-4 text-center text-sm'>
                    No documents in this category
                  </div>
                ) : (
                  documents.map((document: any, docIndex: number) => {
                    const isLastDocument = docIndex === documents.length - 1;
                    const statusDisplay = getStatusDisplay(document.status);
                    return (
                      <motion.div
                        key={document.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2 }}
                        className='relative'
                      >
                        {/* Horizontal line for documents */}
                        <div className='bg-border absolute top-1/2 left-0 h-px w-6 -translate-y-1/2' />
                        {/* Vertical line for non-last documents */}
                        {!isLastDocument && (
                          <div className='bg-border absolute top-8 left-6 h-full w-px' />
                        )}
                        <Button
                          variant='ghost'
                          onClick={() => {
                            handleGetDownloadUrl(document);
                            setSelectedDocument(document);
                            setIsDocumentDialogOpen(true);
                          }}
                          className='hover:bg-accent/60 h-auto w-full justify-start gap-3 p-3 text-left transition-colors'
                          role='treeitem'
                          aria-label={`${document.name}, ${document.mime_type.toUpperCase()}, ${formatFileSize(document.size_bytes)}, modified ${formatDate(document.created_at)}`}
                        >
                          <div className='flex flex-shrink-0 items-center gap-2'>
                            {getFileIcon(document.mime_type)}
                          </div>

                          <div className='min-w-0 flex-1 space-y-1'>
                            <div className='flex items-center justify-between gap-2'>
                              <h3 className='truncate text-sm font-medium'>
                                {document.name}
                              </h3>
                            </div>

                            <div className='text-muted-foreground flex items-center gap-4 text-xs'>
                              <span className='flex items-center gap-1'>
                                <File className='h-3 w-3' />
                                {formatFileSize(document.size_bytes)}
                              </span>
                              <span className='flex items-center gap-1'>
                                <Clock className='h-3 w-3' />
                                {formatDate(document.created_at)}
                              </span>
                              <span
                                className={cn(
                                  'rounded-full px-2 py-0.5 text-xs font-medium',
                                  statusDisplay.bg,
                                  statusDisplay.color
                                )}
                              >
                                {document.status}
                              </span>
                            </div>
                          </div>

                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTargetId(document.id);
                              setDeleteTargetType('document');
                              setDeleteModalOpen(true);
                            }}
                            className='text-destructive h-6 w-6 flex-shrink-0'
                            aria-label={`Delete ${document.name}`}
                          >
                            <Trash2 className='h-3 w-3' />
                          </span>
                        </Button>
                      </motion.div>
                    );
                  })
                )}
              </Collapsible.Content>
            </Collapsible.Root>
          </div>
        );
      });
    },
    [
      expandedFolders,
      toggleFolder,
      getStatusDisplay,
      getFileIcon,
      formatFileSize,
      formatDate,
      countDocuments
    ]
  );

  return (
    <Tooltip.Provider>
      <div className='bg-background flex h-full flex-col'>
        {/* Main workspace layout */}
        <div className='flex min-h-0 flex-1 overflow-hidden'>
          {/* Main content area with scroll */}
          <main className='flex min-h-0 flex-1 flex-col overflow-y-auto'>
            {/* Solar Case Information Header */}
            <section
              className='border-b bg-gradient-to-r from-orange-50 to-yellow-50 p-6 dark:from-orange-950/20 dark:to-yellow-950/20'
              aria-labelledby='case-header'
            >
              {/* Case Navigation Breadcrumb */}
              <nav className='mb-4' aria-label='Case navigation'>
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbLink className='text-muted-foreground hover:text-primary flex items-center gap-1 text-sm font-medium transition-colors'>
                        <Sun className='h-4 w-4' />
                        {isLoadingCase ? (
                          <Loader2 className='h-3 w-3 animate-spin' />
                        ) : (
                          caseData?.full_name
                        )}
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator>
                      <ChevronRight className='h-4 w-4' />
                    </BreadcrumbSeparator>
                    <BreadcrumbItem>
                      <BreadcrumbLink className='text-muted-foreground hover:text-primary flex items-center gap-1 text-sm font-medium transition-colors'>
                        <FolderTree className='h-4 w-4' />
                        Document Explorer
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator>
                      <ChevronRight className='h-4 w-4' />
                    </BreadcrumbSeparator>
                    <BreadcrumbItem>
                      <BreadcrumbLink className='text-primary flex items-center gap-1 text-sm font-medium'>
                        <Zap className='h-4 w-4' />
                        {caseTypeName}
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </nav>

              <div className='flex flex-col justify-between gap-6 lg:flex-row lg:items-center'>
                {/* Case Title and Details */}
                <div className='min-w-0 flex-1'>
                  <div className='mb-3 flex items-center gap-3'>
                    <h1 className='text-foreground truncate text-2xl font-bold'>
                      {caseTypeName}
                    </h1>
                  </div>

                  {/* Document Summary Stats */}
                  <div className='text-muted-foreground flex items-center gap-4 text-sm'>
                    <div className='flex items-center gap-1'>
                      <FileText className='h-4 w-4' />
                      <span>
                        {isLoadingFolders ? (
                          <Loader2 className='h-3 w-3 animate-spin' />
                        ) : (
                          countAllDocuments(folderStructure)
                        )}{' '}
                        documents
                      </span>
                    </div>
                    <div className='flex items-center gap-1'>
                      <Folder className='h-4 w-4' />
                      <span>
                        {isLoadingFolders ? (
                          <Loader2 className='h-3 w-3 animate-spin' />
                        ) : (
                          folderStructure.length
                        )}{' '}
                        categories
                      </span>
                    </div>
                    <div className='flex items-center gap-1'>
                      <Clock className='h-4 w-4' />
                      <span>
                        {isLoadingFolders ? (
                          <span className='flex items-center gap-1'>
                            <Loader2 className='h-3 w-3 animate-spin' />
                            Loading...
                          </span>
                        ) : (
                          'Ready'
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Search and Actions */}
                <div className='flex items-center gap-4'>
                  <form
                    onSubmit={handleSearch}
                    role='search'
                    aria-label='Search documents'
                    className='max-w-md flex-1'
                  >
                    <div className='relative'>
                      <Search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
                      <Input
                        type='search'
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                        placeholder='Search documents...'
                        className='bg-background/80 border-border/60 focus:border-primary/60 focus:ring-primary/20 h-9 pr-4 pl-10'
                        aria-label='Search documents'
                      />
                    </div>
                  </form>
                </div>
              </div>
            </section>

            {/* File Tree Explorer */}
            <section
              className='flex-1 overflow-hidden p-6'
              aria-labelledby='file-explorer'
            >
              <div className='h-full'>
                <header className='mb-4 flex items-center justify-between'>
                  <div>
                    <h2
                      id='file-explorer'
                      className='flex items-center gap-2 text-lg font-semibold'
                    >
                      <FolderTree className='h-5 w-5 text-blue-600' />
                      Document Explorer
                    </h2>
                    <p className='text-muted-foreground mt-1 text-sm'>
                      Browse and manage your solar case documents organized by
                      category
                    </p>
                    {isUploadingDocument && (
                      <div className='mt-2 flex items-center gap-2 text-sm text-blue-600'>
                        <Loader2 className='h-4 w-4 animate-spin' />
                        <span>Uploading document...</span>
                      </div>
                    )}
                  </div>
                </header>

                <ScrollArea className='bg-card h-[calc(100%-4rem)] rounded-lg border'>
                  <div className='p-4'>
                    {isLoadingFolders ? (
                      <div className='flex items-center justify-center py-12'>
                        <div className='flex flex-col items-center gap-3'>
                          <Loader2 className='text-primary h-8 w-8 animate-spin' />
                          <span className='text-muted-foreground text-sm font-medium'>
                            Loading folders...
                          </span>
                          <span className='text-muted-foreground text-xs'>
                            Please wait while we fetch your document structure
                          </span>
                        </div>
                      </div>
                    ) : (
                      <nav
                        className='space-y-2'
                        role='tree'
                        aria-label='Document tree'
                      >
                        <div className='flex items-center gap-1'>
                          <input
                            type='file'
                            id='upload-document'
                            className='hidden'
                            onChange={handleUploadEvidence}
                            disabled={isUploadingDocument}
                          />
                        </div>
                        {renderFolderTree(folderStructure)}
                      </nav>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </section>
          </main>

          {/* AI Assistant Right Sidebar - Desktop only - Now with horizontal collapse */}
          <motion.aside
            initial={{
              width: isAgentPanelCollapsed ? 48 : 320
            }}
            animate={{
              width: isAgentPanelCollapsed ? 48 : 320
            }}
            transition={{
              duration: 0.3,
              ease: 'easeInOut'
            }}
            className='bg-card hidden flex-col border-l lg:flex'
            style={{
              overflowY: 'auto', // Always show vertical scroll bar if needed
              maxHeight: '100vh', // Prevent overflow outside viewport
              minHeight: 0
            }}
            aria-label='Solar AI Assistant'
          >
            {/* Agent Panel Header - Always visible */}
            <div className='flex min-h-[73px] items-center justify-between border-b bg-orange-50/50 p-4 dark:bg-orange-950/20'>
              {!isAgentPanelCollapsed ? (
                <div className='flex items-center gap-3'>
                  <div className='flex items-center gap-2'>
                    <div className='relative'>
                      <Bot className='h-5 w-5 text-orange-600' />
                      <div
                        className={cn(
                          'border-background absolute -right-0.5 -bottom-0.5 h-2 w-2 rounded-full border',
                          agentStatus.status === 'online' && 'bg-green-500',
                          agentStatus.status === 'busy' && 'bg-yellow-500',
                          agentStatus.status === 'offline' && 'bg-gray-500'
                        )}
                      />
                    </div>
                    <header className='flex flex-col gap-1'>
                      <h3 className='text-sm font-semibold'>
                        Solar AI Assistant
                      </h3>
                      <p className='text-muted-foreground text-xs'>
                        {agentStatus.currentTask}
                      </p>
                    </header>
                  </div>
                </div>
              ) : (
                <div className='flex flex-col items-center gap-2'>
                  <div className='relative'>
                    <Bot
                      className='h-5 w-5 text-orange-600'
                      onClick={toggleAgentPanel}
                    />
                    <div
                      className={cn(
                        'border-background absolute -right-0.5 -bottom-0.5 h-2 w-2 rounded-full border',
                        agentStatus.status === 'online' && 'bg-green-500',
                        agentStatus.status === 'busy' && 'bg-yellow-500',
                        agentStatus.status === 'offline' && 'bg-gray-500'
                      )}
                    />
                  </div>
                </div>
              )}

              <div className='flex items-center gap-1'>
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='h-7 w-7'
                      onClick={toggleAgentPanel}
                    >
                      {isAgentPanelCollapsed ? (
                        <ChevronLeft className='h-3 w-3' />
                      ) : (
                        <ChevronRight className='h-3 w-3' />
                      )}
                    </Button>
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content
                      className='bg-popover text-popover-foreground rounded border px-2 py-1 text-xs shadow-md'
                      sideOffset={5}
                    >
                      {isAgentPanelCollapsed
                        ? 'Expand agent panel'
                        : 'Collapse agent panel'}
                      <Tooltip.Arrow className='fill-popover' />
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>
              </div>
            </div>

            {/* Chat Interface - Only visible when not collapsed */}
            {!isAgentPanelCollapsed && (
              <div
                className='flex flex-1 flex-col overflow-hidden'
                style={{ minHeight: 0 }}
              >
                {/* Messages Area */}
                <ScrollArea
                  className='flex-1 p-3'
                  style={{
                    maxHeight: 'calc(100vh - 73px - 56px)',
                    minHeight: 0
                  }}
                >
                  <div className='space-y-4'>
                    {messages.map((message) => (
                      <motion.div
                        key={message.id}
                        initial={{
                          opacity: 0,
                          y: 10
                        }}
                        animate={{
                          opacity: 1,
                          y: 0
                        }}
                        transition={{
                          duration: 0.3
                        }}
                        className={cn(
                          'flex gap-3',
                          message.type === 'user' && 'flex-row-reverse'
                        )}
                      >
                        <Avatar className='h-7 w-7 flex-shrink-0'>
                          {message.type === 'agent' ? (
                            <AvatarFallback className='bg-orange-100 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400'>
                              <Bot className='h-4 w-4' />
                            </AvatarFallback>
                          ) : (
                            <AvatarFallback className='bg-secondary'>
                              <User className='h-4 w-4' />
                            </AvatarFallback>
                          )}
                        </Avatar>

                        <div
                          className={cn(
                            'max-w-[80%] flex-1',
                            message.type === 'user' && 'flex flex-col items-end'
                          )}
                        >
                          <div
                            className={cn(
                              'rounded-lg px-3 py-2 text-sm',
                              message.type === 'agent'
                                ? 'text-foreground border border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30'
                                : 'bg-primary text-primary-foreground'
                            )}
                          >
                            <p className='whitespace-pre-wrap'>
                              {message.content}
                            </p>
                          </div>
                          <span className='text-muted-foreground mt-1 text-xs'>
                            {message.timestamp.toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </motion.div>
                    ))}

                    {/* Typing indicator */}
                    {isAgentTyping && (
                      <motion.div
                        initial={{
                          opacity: 0,
                          y: 10
                        }}
                        animate={{
                          opacity: 1,
                          y: 0
                        }}
                        className='flex gap-3'
                      >
                        <Avatar className='h-7 w-7 flex-shrink-0'>
                          <AvatarFallback className='bg-orange-100 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400'>
                            <Bot className='h-4 w-4' />
                          </AvatarFallback>
                        </Avatar>
                        <div className='rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 dark:border-orange-800 dark:bg-orange-950/30'>
                          <div className='flex items-center gap-1'>
                            <div className='flex gap-1'>
                              <div className='h-2 w-2 animate-bounce rounded-full bg-orange-400 dark:bg-orange-500' />
                              <div
                                className='h-2 w-2 animate-bounce rounded-full bg-orange-400 dark:bg-orange-500'
                                style={{
                                  animationDelay: '0.1s'
                                }}
                              />
                              <div
                                className='h-2 w-2 animate-bounce rounded-full bg-orange-400 dark:bg-orange-500'
                                style={{
                                  animationDelay: '0.2s'
                                }}
                              />
                            </div>
                            <span className='text-muted-foreground ml-2 text-xs'>
                              Solar AI is analyzing...
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </ScrollArea>

                {/* Input Area */}
                <div className='bg-background/50 dark:bg-background/80 border-t p-3'>
                  <div className='flex gap-2'>
                    <Input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder='Ask about your solar case...'
                      className='flex-1 text-sm'
                      disabled={isAgentTyping}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!chatInput.trim() || isAgentTyping}
                      size='icon'
                      className='h-9 w-9'
                    >
                      {isAgentTyping ? (
                        <Loader2 className='h-4 w-4 animate-spin' />
                      ) : (
                        <Send className='h-4 w-4' />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </motion.aside>
        </div>
      </div>

      {/* Create Folder Modal */}
      <CreateFolderModal
        isOpen={isCreateFolderDialogOpen}
        onClose={() => setIsCreateFolderDialogOpen(false)}
        folderName={newFolderName}
        onCreateFolder={handleCreateFolder}
        isLoading={isCreatingFolder}
      />

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        isOpen={isDocumentDialogOpen}
        onClose={() => setIsDocumentDialogOpen(false)}
        document={selectedDocument}
        downloadUrl={downloadUrl}
        isLoadingDownloadUrl={isLoadingDownloadUrl}
        onDownload={handleDownloadFile}
      />

      {/* Confirm Delete Modal */}
      <AlertModal
        isOpen={deleteModalOpen}
        deleteTargetType={deleteTargetType}
        onClose={() => {
          setDeleteModalOpen(false);
          setDeleteTargetId(null);
          setDeleteTargetType(null);
        }}
        onConfirm={() => {
          if (deleteTargetId && deleteTargetType === 'document') {
            handleDeleteFile(deleteTargetId);
          } else if (deleteTargetId && deleteTargetType === 'folder') {
            handleDeleteFolder(deleteTargetId);
          }
        }}
        loading={deleteLoading}
      />
    </Tooltip.Provider>
  );
}
