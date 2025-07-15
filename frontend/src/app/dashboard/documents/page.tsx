'use client';

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  Search,
  Bell,
  ChevronDown,
  FileText,
  Image,
  File,
  ChevronRight,
  Folder,
  FolderOpen,
  User,
  Package,
  Loader2,
  Clock,
  Shield,
  Scale,
  Gavel,
  FileCheck,
  Target,
  Sun,
  Bot,
  Send,
  FolderTree,
  DollarSign,
  Receipt,
  PanelLeftClose,
  PanelLeftOpen,
  CheckCircle,
  XCircle,
  AlertCircle,
  Zap,
  Mail,
  FileBarChart,
  MessageCircle,
  Settings,
  PlusCircle,
  StickyNote,
  Banknote,
  TrendingUp,
  FileSpreadsheet,
  ChevronLeft,
  Trash2,
  FolderPlus,
  UploadIcon,
  Moon,
  SunIcon
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb';
import { toast } from 'sonner';

// Radix Primitives
import * as NavigationMenu from '@radix-ui/react-navigation-menu';
import * as Dialog from '@radix-ui/react-dialog';
import * as Accordion from '@radix-ui/react-accordion';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Tooltip from '@radix-ui/react-tooltip';
import * as Collapsible from '@radix-ui/react-collapsible';
import StoreDocumentsAPI from '@/services/store-documents-api';
import { useAuth, useUser } from '@clerk/nextjs';
import DocViewer, { DocViewerRenderers } from '@cyntler/react-doc-viewer';
import { AlertModal } from '@/components/modal/alert-modal';
import { useStorageOperations } from '@/hooks/useDocuments';

export interface SolarDocumentItem {
  id: string;
  name: string;
  mime_type: string;
  size_bytes: number;
  //  modified: Date;
  azure_blob_url: string;
  created_at: Date;
  updated_at: Date;
}
export interface SolarCaseDetails {
  arbitrationTribunal: string;
  financeCompany: string;
  loanAmount: number;
  monthlyPayments: number;
  totalExpenses: number;
  casePhase: 'intake' | 'discovery' | 'arbitration' | 'settlement' | 'closed';
  nextHearing?: Date;
  arbitrator?: string;
}
export interface ClientInfo {
  name: string;
  phone: string;
  email: string;
  age: number;
  address: string;
  installationDate?: Date;
  systemSize?: string;
}
export interface ChatMessage {
  id: string;
  type: 'user' | 'agent';
  content: string;
  timestamp: Date;
  isTyping?: boolean;
}
export interface AgentStatus {
  status: 'online' | 'busy' | 'offline';
  lastSeen?: Date;
  currentTask?: string;
}
export interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<{
    className?: string;
  }>;
  isActive?: boolean;
  hasSubmenu?: boolean;
  submenu?: Array<{
    id: string;
    label: string;
    icon: React.ComponentType<{
      className?: string;
    }>;
    isActive?: boolean;
  }>;
}
export interface FolderNode {
  id: string;
  name: string;
  path: string;
  parentId?: string;
  children?: FolderNode[];
  documents?: SolarDocumentItem[];
  isExpanded?: boolean;
  level?: number;
  icon?: React.ComponentType<{
    className?: string;
  }>;
  category?: string;
  documentCount?: number;
  lastModified?: Date;
}
export interface DocumentsWorkspacePageCompactProps {
  currentOrg?: string;
  currentMatter?: string;
  user?: {
    name: string;
    email: string;
    avatar?: string;
    initials: string;
  };
  notifications?: number;
  documents?: SolarDocumentItem[];
  caseDetails?: SolarCaseDetails;
  clientInfo?: ClientInfo;
  onOrgChange?: (org: string) => void;
  onMatterChange?: (matter: string) => void;
  onSearch?: (query: string) => void;
  onQuickAction?: (action: string) => void;
}
export default function DocumentsWorkspacePageCompact({
  currentOrg = 'Solar Legal Solutions',
  currentMatter = 'Johnson Solar Arbitration',
  notifications = 3,
  onOrgChange,
  onQuickAction
}: DocumentsWorkspacePageCompactProps) {
  const { isSignedIn, isLoaded } = useAuth();
  
  // Use React Query hooks for all storage operations
  const storageOps = useStorageOperations();
  const { folders, documents, uploadDocument, createFolder, deleteFile, deleteFolder, downloadFile } = storageOps;

  // Derive state from React Query data
  const foldersList = folders.data || [];
  const isLoadingFolders = folders.isLoading;
  const foldersError = folders.error;

  const userInfo = useUser();
  const [user, setUser] = useState<any>(null);
  useEffect(() => {
    if (userInfo.user) {
      setUser(userInfo.user);
    }
  }, [userInfo.user]);

  const [searchValue, setSearchValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  const [currentPath] = useState('/Solar Cases/Johnson');
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

  // Initialize expanded folders from localStorage when folders are loaded
  useEffect(() => {
    if (Array.isArray(foldersList) && foldersList.length > 0) {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('expandedFolders');
        if (saved) {
          try {
            const savedArray = JSON.parse(saved);
            const validExpandedFolders = new Set<string>();

            // Only include folder IDs that actually exist in the current folder structure
            const allFolderIds = new Set(
              foldersList.map((folder: any) => folder.id)
            );

            savedArray.forEach((folderId: string) => {
              if (allFolderIds.has(folderId)) {
                validExpandedFolders.add(folderId);
              }
            });

            setExpandedFolders(validExpandedFolders);
          } catch (error) {
            console.warn(
              'Failed to parse expanded folders from localStorage:',
              error
            );
            // Expand all root folders by default
            setExpandedFolders(
              new Set<string>(foldersList.map((folder: any) => folder.id))
            );
          }
        } else {
          // No saved state, expand all root folders by default
          setExpandedFolders(
            new Set<string>(foldersList.map((folder: any) => folder.id))
          );
        }
      }
    }
  }, [foldersList]);

  // Show error toast if folders failed to load
  useEffect(() => {
    if (foldersError) {
      console.error('Failed to fetch folders:', foldersError);
      toast.error('Failed to load folder structure');
    }
  }, [foldersError]);

  const getAllFolders = useCallback((folders: any[]): any[] => {
    const allFolders: any[] = [];

    const collectFolders = (folderList: any[]) => {
      folderList.forEach((folder) => {
        allFolders.push(folder);
        if (folder.children && folder.children.length > 0) {
          collectFolders(folder.children);
        }
      });
    };

    collectFolders(folders);
    return allFolders;
  }, []);

  // Recursive function to count all documents in a folder and its children
  const countDocuments = useCallback((folder: any): number => {
    let count = folder.documents?.length || 0;

    if (folder.children && folder.children.length > 0) {
      folder.children.forEach((child: any) => {
        count += countDocuments(child);
      });
    }

    return count;
  }, []);

  const countAllDocuments = useCallback((folder: any): number => {
    let count = 0;
    folder.forEach((folder: any) => {
      count += countDocuments(folder);
    });
    return count;
  }, []);

  const [selectedUploadFolderId, setSelectedUploadFolderId] =
    useState<string>('root');

  // Update selectedUploadFolderId when folders are loaded
  useEffect(() => {
    if (Array.isArray(foldersList) && foldersList.length > 0 && selectedUploadFolderId === 'root') {
      const allFolders = getAllFolders(foldersList);
      if (allFolders.length > 0) {
        setSelectedUploadFolderId(allFolders[0].id);
      }
    }
  }, [foldersList, selectedUploadFolderId, getAllFolders]);

  // Sidebar state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeNavItem, setActiveNavItem] = useState('case-summary');

  // AI Assistant state - now width-based
  const [isAgentPanelCollapsed, setIsAgentPanelCollapsed] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [isAgentTyping, setIsAgentTyping] = useState(false);

  // File tree state
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set([])
  );

  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(false);

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

  // Solar-specific navigation items
  const navigationItems: NavigationItem[] = [
    {
      id: 'case-summary',
      label: 'Case Summary',
      icon: Sun,
      isActive: activeNavItem === 'case-summary'
    },
    {
      id: 'documents-timeline',
      label: 'Documents Timeline',
      icon: FileBarChart,
      isActive: activeNavItem === 'documents-timeline'
    },
    {
      id: 'status-tracker',
      label: 'Status Tracker',
      icon: Target,
      isActive: activeNavItem === 'status-tracker'
    },
    {
      id: 'expenses-financials',
      label: 'Expenses & Financials',
      icon: DollarSign,
      isActive: activeNavItem === 'expenses-financials',
      hasSubmenu: true,
      submenu: [
        {
          id: 'loan-details',
          label: 'Loan Details',
          icon: Banknote,
          isActive: activeNavItem === 'loan-details'
        },
        {
          id: 'payment-history',
          label: 'Payment History',
          icon: TrendingUp,
          isActive: activeNavItem === 'payment-history'
        },
        {
          id: 'expense-tracking',
          label: 'Expense Tracking',
          icon: FileSpreadsheet,
          isActive: activeNavItem === 'expense-tracking'
        }
      ]
    },
    {
      id: 'communications-log',
      label: 'Communications Log',
      icon: MessageCircle,
      isActive: activeNavItem === 'communications-log'
    },
    {
      id: 'admin-tools',
      label: 'Admin Tools',
      icon: Settings,
      isActive: activeNavItem === 'admin-tools'
    }
  ];

  // Use processed folder structure from backend

  const filteredFolders = Array.isArray(foldersList) ? foldersList.filter((folder) => {
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
      if (folderOrChild.children?.some((child: any) => matchesSearch(child))) {
        return true;
      }
      return false;
    };

    return matchesSearch(folder);
  }) : [];

  const folderStructure = filteredFolders;

  // Handle scroll for top bar shadow
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Load theme from localStorage and apply to document
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('darkMode');
      if (savedTheme) {
        try {
          const isDark = JSON.parse(savedTheme);
          setIsDarkMode(isDark);
        } catch (error) {
          console.warn('Failed to parse theme from localStorage:', error);
        }
      }
    }
  }, []);

  // Apply theme to document element
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [isDarkMode]);

  // Format file size
  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }, []);

  // Format date
  const formatDate = useCallback((date: Date): string => {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - new Date(date).getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1}d ago`;
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }, []);

  // Get file icon
  const getFileIcon = useCallback((type: string, className?: string) => {
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
  }, []);

  // Get status color and icon
  const getStatusDisplay = useCallback((status: string) => {
    switch (status) {
      case 'complete':
        return {
          color: 'text-green-600',
          bg: 'bg-green-100',
          icon: CheckCircle
        };
      case 'under-review':
        return {
          color: 'text-yellow-600',
          bg: 'bg-yellow-100',
          icon: AlertCircle
        };
      case 'pending':
        return {
          color: 'text-blue-600',
          bg: 'bg-blue-100',
          icon: Clock
        };
      case 'missing':
        return {
          color: 'text-red-600',
          bg: 'bg-red-100',
          icon: XCircle
        };
      default:
        return {
          color: 'text-gray-600',
          bg: 'bg-gray-100',
          icon: AlertCircle
        };
    }
  }, []);

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchValue);
  };

  // Handle document selection
  const handleDocumentSelect = useCallback((document: SolarDocumentItem) => {
    setSelectedDocument(document);
    setIsDocumentDialogOpen(true);
  }, []);

  // Handle navigation item click
  const handleNavItemClick = useCallback((itemId: string) => {
    setActiveNavItem(itemId);
  }, []);

  // Handle folder toggle
  const toggleFolder = useCallback((folderId: string) => {
    setExpandedFolders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }

      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          'expandedFolders',
          JSON.stringify(Array.from(newSet))
        );
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

  // Toggle sidebar collapse
  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed((prev) => !prev);
  }, []);

  // Toggle theme
  const toggleTheme = useCallback(() => {
    setIsDarkMode((prev) => {
      const newMode = !prev;
      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('darkMode', JSON.stringify(newMode));
      }
      return newMode;
    });
  }, []);

  // Handle create folder
  const handleCreateFolder = useCallback(async () => {
    if (!newFolderName.trim()) {
      toast.error('Please enter a folder name');
      return;
    }

    setIsCreatingFolder(true);
    try {
      await createFolder.mutateAsync({
        folderName: newFolderName.trim(),
        parentId: selectedParentFolderId
      });

      toast.success(`Folder "${newFolderName}" created successfully`);

      // Expand the parent folder if a parent was selected
      if (selectedParentFolderId !== 'root') {
        setExpandedFolders((prev) => {
          const newSet = new Set(prev);
          newSet.add(selectedParentFolderId);
          // Save to localStorage
          if (typeof window !== 'undefined') {
            localStorage.setItem(
              'expandedFolders',
              JSON.stringify(Array.from(newSet))
            );
          }
          return newSet;
        });
      }

      // Reset form
      setNewFolderName('');
      setSelectedParentFolderId('root');
      setIsCreateFolderDialogOpen(false);
    } catch (error) {
      console.error('Error creating folder:', error);
      toast.error('Failed to create folder');
    } finally {
      setIsCreatingFolder(false);
    }
  }, [newFolderName, selectedParentFolderId, createFolder]);

  // Get all available folders for parent selection

  // Parse breadcrumb path
  const breadcrumbParts = currentPath.split('/').filter(Boolean);

  // Render navigation item
  const renderNavigationItem = useCallback(
    (item: NavigationItem) => {
      const IconComponent = item.icon;
      if (item.hasSubmenu) {
        return (
          <Accordion.Root key={item.id} type='single' collapsible>
            <Accordion.Item value={item.id}>
              <Accordion.Trigger
                className={cn(
                  'flex h-10 w-full items-center justify-between gap-3 px-3 text-sm font-medium transition-all duration-200',
                  'hover:bg-accent/80 hover:text-accent-foreground rounded-md',
                  item.isActive &&
                  'bg-primary/10 text-primary border-primary border-r-2',
                  isSidebarCollapsed && 'justify-center px-2'
                )}
              >
                <div className='flex items-center gap-3'>
                  <IconComponent className='h-4 w-4 flex-shrink-0' />
                  {!isSidebarCollapsed && (
                    <span className='flex-1 text-left'>{item.label}</span>
                  )}
                </div>
                {!isSidebarCollapsed && (
                  <ChevronDown className='h-3 w-3 transition-transform duration-200 data-[state=open]:rotate-180' />
                )}
              </Accordion.Trigger>
              {!isSidebarCollapsed && (
                <Accordion.Content className='data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up space-y-1 overflow-hidden pr-3 pb-2 pl-6'>
                  {item.submenu?.map((subItem) => {
                    const SubIconComponent = subItem.icon;
                    return (
                      <Button
                        key={subItem.id}
                        variant='ghost'
                        onClick={() => handleNavItemClick(subItem.id)}
                        className={cn(
                          'h-8 w-full justify-start gap-3 px-3 text-xs font-medium transition-all duration-200',
                          'hover:bg-accent/60 hover:text-accent-foreground',
                          subItem.isActive && 'bg-primary/10 text-primary'
                        )}
                      >
                        <SubIconComponent className='h-3 w-3 flex-shrink-0' />
                        <span className='flex-1 text-left'>
                          {subItem.label}
                        </span>
                      </Button>
                    );
                  })}
                </Accordion.Content>
              )}
            </Accordion.Item>
          </Accordion.Root>
        );
      }
      return (
        <Tooltip.Provider key={item.id}>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <Button
                variant='ghost'
                onClick={() => handleNavItemClick(item.id)}
                className={cn(
                  'h-10 w-full justify-start gap-3 px-3 text-sm font-medium transition-all duration-200',
                  'hover:bg-accent/80 hover:text-accent-foreground',
                  item.isActive &&
                  'bg-primary/10 text-primary border-primary border-r-2',
                  isSidebarCollapsed && 'justify-center px-2'
                )}
              >
                <IconComponent className='h-4 w-4 flex-shrink-0' />
                {!isSidebarCollapsed && (
                  <span className='flex-1 text-left'>{item.label}</span>
                )}
              </Button>
            </Tooltip.Trigger>
            {isSidebarCollapsed && (
              <Tooltip.Portal>
                <Tooltip.Content
                  side='right'
                  className='bg-popover text-popover-foreground rounded border px-2 py-1 text-xs shadow-md'
                  sideOffset={5}
                >
                  {item.label}
                  <Tooltip.Arrow className='fill-popover' />
                </Tooltip.Content>
              </Tooltip.Portal>
            )}
          </Tooltip.Root>
        </Tooltip.Provider>
      );
    },
    [handleNavItemClick, isSidebarCollapsed]
  );

  const handleUploadEvidence = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];

      if (selectedUploadFolderId === 'root' && (!Array.isArray(foldersList) || foldersList.length === 0)) {
        toast.error('Please create a folder to upload the document');
        return;
      }

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

  const handleGetDownloadUrl = useCallback(async () => {
    if (!selectedDocument) {
      toast.error('No document selected');
      return;
    }
    
    try {
      const response = await downloadFile.mutateAsync(selectedDocument.id);
      if (response.success && response.data?.sasUrl) {
        setDownloadUrl(response.data.sasUrl);
      } else {
        toast.error('Failed to download document');
      }
    } catch (error) {
      toast.error('Failed to download document');
    }
  }, [selectedDocument, downloadFile]);

  const handleDownloadFile = useCallback(async () => {
    if (!downloadUrl) {
      toast.error('No download URL found');
      return;
    }
    // Download the file using the downloadUrl
    try {
      // Create a temporary anchor element and trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      // Try to get filename from selectedDocument, fallback to 'document'
      const filename =
        (selectedDocument && selectedDocument.name) || 'document';
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Download started');
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Failed to download file');
    }
  }, [downloadUrl, selectedDocument]);

  // Get download URL when document is selected
  useEffect(() => {
    if (selectedDocument) {
      handleGetDownloadUrl();
    }
  }, [selectedDocument, handleGetDownloadUrl]);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteTargetType, setDeleteTargetType] = useState<
    'folder' | 'document' | null
  >(null);

  const handleDeleteFile = useCallback(async (id: string) => {
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
  }, [deleteFile]);

  const handleDeleteFolder = useCallback(async (id: string) => {
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
  }, [deleteFolder]);

  // Recursive component to render folder tree
  const renderFolderTree = useCallback(
    (folders: any[], level: number = 0) => {
      return folders.map((folder, index) => {
        const FolderIcon = folder.icon || Folder;
        const isExpanded = expandedFolders.has(folder.id);
        const documents = folder.documents || [];
        const children = folder.children || [];
        const isLastItem = index === folders.length - 1;

        return (
          <div key={folder.id} className='relative space-y-1'>
            {/* Vertical line for non-last items */}
            {!isLastItem && (
              <div className='absolute left-6 top-8 w-px h-full bg-border' />
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
                    <div className='absolute left-0 top-1/2 w-6 h-px bg-border -translate-y-1/2' />
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
                      isUploadingDocument && 'opacity-50 cursor-not-allowed'
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
                    {isUploadingDocument && selectedUploadFolderId === folder.id ? (
                      <Loader2 className='h-4 w-4 animate-spin text-blue-600' />
                    ) : (
                      <UploadIcon className='h-4 w-4 text-blue-600' />
                    )}
                  </span>
                  {/* Folder delete button */}
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
                  <ChevronRight
                    className={cn(
                      'h-3 w-3 transition-transform duration-200',
                      isExpanded && 'rotate-90'
                    )}
                  />
                </Button>
              </Collapsible.Trigger>

              {/* Folder Contents */}
              <Collapsible.Content className='data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up space-y-1 overflow-hidden pl-6 relative'>
                {/* Vertical line for folder contents */}
                <div className='absolute left-6 top-0 w-px h-full bg-border' />
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
                    return (
                      <motion.div
                        key={document.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2 }}
                        className='relative'
                      >
                        {/* Horizontal line for documents */}
                        <div className='absolute left-0 top-1/2 w-6 h-px bg-border -translate-y-1/2' />
                        {/* Vertical line for non-last documents */}
                        {!isLastDocument && (
                          <div className='absolute left-6 top-8 w-px h-full bg-border' />
                        )}
                        <Button
                          variant='ghost'
                          onClick={() => handleDocumentSelect(document)}
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
      handleDocumentSelect,
      getFileIcon,
      formatFileSize,
      formatDate,
      countDocuments
    ]
  );

  return (
    <Tooltip.Provider>
      <div className='flex h-full flex-col bg-background'>

        {/* Main workspace layout */}
        <div className='flex min-h-0 flex-1 overflow-hidden'>
          {/* Main content area with scroll */}
          <main className='flex min-h-0 flex-1 flex-col overflow-y-auto'>
            {/* Solar Case Information Header */}
            <section
              className='border-b bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-950/20 dark:to-yellow-950/20 p-6'
              aria-labelledby='case-header'
            >
              {/* Case Navigation Breadcrumb */}
              <nav className='mb-4' aria-label='Case navigation'>
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbLink className='text-muted-foreground hover:text-primary flex items-center gap-1 text-sm font-medium transition-colors'>
                        <Sun className='h-4 w-4' />
                        Solar Cases
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
                        {currentMatter}
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
                      {currentMatter}
                    </h1>
                    <Badge
                      variant='secondary'
                      className='px-2 py-1 text-xs font-medium'
                    >
                      {/* Case #{clientInfo.name.split(' ')[1]}-2024 */}
                    </Badge>
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
                          {renderFolderTree(folderStructure).length > 0 ? (
                            <FolderOpen className='h-4 w-4 text-blue-500' />
                          ) : (
                            <Folder className='h-4 w-4 text-blue-500' />
                          )}
                          <span>root</span>
                          <Button
                            variant='ghost'
                            size='icon'
                            className='ml-2 h-6 w-6 cursor-pointer p-0'
                            aria-label='Add folder to root'
                            onClick={() => {
                              setIsCreateFolderDialogOpen(true);
                              setSelectedParentFolderId('root');
                            }}
                          >
                            <FolderPlus className='h-4 w-4 text-green-600' />
                          </Button>
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
            <div className='flex min-h-[73px] items-center justify-between border-b bg-orange-50/50 dark:bg-orange-950/20 p-4'>
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
                            <AvatarFallback className='bg-orange-100 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400'>
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
                            message.type === 'user' &&
                            'flex flex-col items-end'
                          )}
                        >
                          <div
                            className={cn(
                              'rounded-lg px-3 py-2 text-sm',
                              message.type === 'agent'
                                ? 'text-foreground border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/30'
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
                          <AvatarFallback className='bg-orange-100 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400'>
                            <Bot className='h-4 w-4' />
                          </AvatarFallback>
                        </Avatar>
                        <div className='rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/30 px-3 py-2'>
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
                      onKeyPress={handleKeyPress}
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

      {/* Create Folder Dialog */}
      <Dialog.Root
        open={isCreateFolderDialogOpen}
        onOpenChange={setIsCreateFolderDialogOpen}
      >
        <Dialog.Portal>
          <Dialog.Overlay className='data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 bg-black/50' />
          <Dialog.Content className='bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] fixed top-[50%] left-[50%] z-50 grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 border p-6 shadow-lg duration-200 sm:rounded-lg'>
            <div className='flex flex-col space-y-1.5 text-center sm:text-left'>
              <Dialog.Title className='text-lg leading-none font-semibold tracking-tight'>
                Create New Folder
              </Dialog.Title>
              <Dialog.Description className='text-muted-foreground text-sm'>
                Create a new folder to organize your documents
              </Dialog.Description>
            </div>

            <div className='grid gap-4'>
              <div className='grid gap-2'>
                <label htmlFor='folder-name' className='text-sm font-medium'>
                  Folder Name
                </label>
                <Input
                  id='folder-name'
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder='Enter folder name...'
                  className='w-full'
                />
              </div>
            </div>

            <div className='flex justify-end gap-2'>
              <Dialog.Close asChild>
                <Button
                  variant='outline'
                  onClick={() => {
                    setNewFolderName('');
                  }}
                >
                  Cancel
                </Button>
              </Dialog.Close>
              <Button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim() || isCreatingFolder}
                className='flex items-center gap-2'
              >
                {isCreatingFolder ? (
                  <>
                    <Loader2 className='h-4 w-4 animate-spin' />
                    Creating...
                  </>
                ) : (
                  <>
                    <PlusCircle className='h-4 w-4' />
                    Create Folder
                  </>
                )}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Document Preview Dialog */}
      <Dialog.Root
        open={isDocumentDialogOpen}
        onOpenChange={setIsDocumentDialogOpen}
      >
        <Dialog.Portal>
          <Dialog.Overlay className='data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 bg-black/50' />
          <Dialog.Content className='bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] fixed top-[50%] left-[50%] z-50 grid w-full max-w-4xl translate-x-[-50%] translate-y-[-50%] gap-4 border p-6 shadow-lg duration-200 sm:rounded-lg md:w-full'>
            <div className='flex flex-col space-y-1.5 text-center sm:text-left'>
              <Dialog.Title className='text-lg leading-none font-semibold tracking-tight'>
                Solar Document Preview
              </Dialog.Title>
              <Dialog.Description className='text-muted-foreground text-sm'>
                {selectedDocument?.name}
              </Dialog.Description>
            </div>

            {selectedDocument && (
              <div className='grid gap-4'>
                <div className='grid grid-cols-2 gap-4 text-sm'>
                  <div>
                    <span className='font-medium'>Type:</span>{' '}
                    {selectedDocument.name.split('.').pop()?.toUpperCase()}
                  </div>
                  <div>
                    <span className='font-medium'>Size:</span>{' '}
                    {formatFileSize(selectedDocument.size_bytes)}
                  </div>
                  <div>
                    <span className='font-medium'>Modified:</span>{' '}
                    {formatDate(selectedDocument.updated_at)}
                  </div>
                </div>

                <div className='bg-muted/30 flex min-h-[300px] items-center justify-center rounded-lg border p-4'>
                  <div className='text-center'>
                    {getFileIcon(
                      selectedDocument.mime_type,
                      'h-16 w-16 mb-4'
                    )}
                    <DocViewer
                      documents={[
                        {
                          uri: downloadUrl || ''
                        }
                      ]}
                      pluginRenderers={DocViewerRenderers}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className='flex justify-end gap-2'>
              <Dialog.Close asChild>
                <Button variant='outline'>Close</Button>
              </Dialog.Close>
              <Button onClick={handleDownloadFile}>Download</Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

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
