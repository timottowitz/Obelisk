import React from 'react';

export interface SolarDocumentItem {
  id: string;
  name: string;
  mime_type: string;
  size_bytes: number;
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
  case: string;
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