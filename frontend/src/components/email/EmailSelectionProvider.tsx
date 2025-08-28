/**
 * Email Selection Provider - Context provider for managing email selection state
 * 
 * Provides centralized state management for multi-select email functionality,
 * including selection persistence, keyboard shortcuts, and bulk operations.
 */

'use client';

import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { ZeroMailMessage } from '@/lib/zero-mail-driver';

// Selection state interface
export interface EmailSelectionState {
  selectedEmails: Set<string>;
  lastSelectedIndex: number | null;
  selectionMode: boolean;
  isSelectAllChecked: boolean;
  totalEmailsCount: number;
}

// Selection actions
type EmailSelectionAction = 
  | { type: 'TOGGLE_EMAIL'; emailId: string; index: number }
  | { type: 'SELECT_EMAIL'; emailId: string; index: number }
  | { type: 'DESELECT_EMAIL'; emailId: string }
  | { type: 'SELECT_RANGE'; startIndex: number; endIndex: number; emailIds: string[] }
  | { type: 'SELECT_ALL'; emailIds: string[] }
  | { type: 'DESELECT_ALL' }
  | { type: 'SET_SELECTION_MODE'; enabled: boolean }
  | { type: 'SET_TOTAL_COUNT'; count: number }
  | { type: 'LOAD_SELECTION'; selectedIds: string[] };

// Selection context interface
export interface EmailSelectionContextType {
  state: EmailSelectionState;
  actions: {
    toggleEmail: (emailId: string, index: number, ctrlKey?: boolean, shiftKey?: boolean) => void;
    selectEmail: (emailId: string, index: number) => void;
    deselectEmail: (emailId: string) => void;
    selectRange: (startIndex: number, endIndex: number, emails: ZeroMailMessage[]) => void;
    selectAll: (emails: ZeroMailMessage[]) => void;
    deselectAll: () => void;
    setSelectionMode: (enabled: boolean) => void;
    setTotalCount: (count: number) => void;
    loadSelection: (selectedIds: string[]) => void;
    isSelected: (emailId: string) => boolean;
    getSelectedEmails: (emails: ZeroMailMessage[]) => ZeroMailMessage[];
    getSelectionCount: () => number;
    hasSelection: () => boolean;
  };
}

// Initial state
const initialState: EmailSelectionState = {
  selectedEmails: new Set(),
  lastSelectedIndex: null,
  selectionMode: false,
  isSelectAllChecked: false,
  totalEmailsCount: 0,
};

// Reducer function
function emailSelectionReducer(state: EmailSelectionState, action: EmailSelectionAction): EmailSelectionState {
  switch (action.type) {
    case 'TOGGLE_EMAIL': {
      const newSelected = new Set(state.selectedEmails);
      if (newSelected.has(action.emailId)) {
        newSelected.delete(action.emailId);
      } else {
        newSelected.add(action.emailId);
      }
      
      return {
        ...state,
        selectedEmails: newSelected,
        lastSelectedIndex: action.index,
        selectionMode: newSelected.size > 0,
        isSelectAllChecked: newSelected.size === state.totalEmailsCount && state.totalEmailsCount > 0,
      };
    }

    case 'SELECT_EMAIL': {
      const newSelected = new Set(state.selectedEmails);
      newSelected.add(action.emailId);
      
      return {
        ...state,
        selectedEmails: newSelected,
        lastSelectedIndex: action.index,
        selectionMode: true,
        isSelectAllChecked: newSelected.size === state.totalEmailsCount && state.totalEmailsCount > 0,
      };
    }

    case 'DESELECT_EMAIL': {
      const newSelected = new Set(state.selectedEmails);
      newSelected.delete(action.emailId);
      
      return {
        ...state,
        selectedEmails: newSelected,
        selectionMode: newSelected.size > 0,
        isSelectAllChecked: false,
      };
    }

    case 'SELECT_RANGE': {
      const newSelected = new Set(state.selectedEmails);
      action.emailIds.forEach(id => newSelected.add(id));
      
      return {
        ...state,
        selectedEmails: newSelected,
        lastSelectedIndex: action.endIndex,
        selectionMode: true,
        isSelectAllChecked: newSelected.size === state.totalEmailsCount && state.totalEmailsCount > 0,
      };
    }

    case 'SELECT_ALL': {
      const newSelected = new Set(action.emailIds);
      
      return {
        ...state,
        selectedEmails: newSelected,
        selectionMode: true,
        isSelectAllChecked: true,
      };
    }

    case 'DESELECT_ALL': {
      return {
        ...state,
        selectedEmails: new Set(),
        lastSelectedIndex: null,
        selectionMode: false,
        isSelectAllChecked: false,
      };
    }

    case 'SET_SELECTION_MODE': {
      return {
        ...state,
        selectionMode: action.enabled,
      };
    }

    case 'SET_TOTAL_COUNT': {
      return {
        ...state,
        totalEmailsCount: action.count,
        isSelectAllChecked: state.selectedEmails.size === action.count && action.count > 0,
      };
    }

    case 'LOAD_SELECTION': {
      const newSelected = new Set(action.selectedIds);
      
      return {
        ...state,
        selectedEmails: newSelected,
        selectionMode: newSelected.size > 0,
        isSelectAllChecked: newSelected.size === state.totalEmailsCount && state.totalEmailsCount > 0,
      };
    }

    default:
      return state;
  }
}

// Create context
const EmailSelectionContext = createContext<EmailSelectionContextType | undefined>(undefined);

// Provider component
export interface EmailSelectionProviderProps {
  children: React.ReactNode;
  persistSelection?: boolean;
  storageKey?: string;
}

export function EmailSelectionProvider({ 
  children, 
  persistSelection = true,
  storageKey = 'email-selection'
}: EmailSelectionProviderProps) {
  const [state, dispatch] = useReducer(emailSelectionReducer, initialState);

  // Load persisted selection on mount
  useEffect(() => {
    if (persistSelection && typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const selectedIds = JSON.parse(saved);
          if (Array.isArray(selectedIds)) {
            dispatch({ type: 'LOAD_SELECTION', selectedIds });
          }
        }
      } catch (error) {
        console.warn('Failed to load persisted email selection:', error);
      }
    }
  }, [persistSelection, storageKey]);

  // Persist selection changes
  useEffect(() => {
    if (persistSelection && typeof window !== 'undefined') {
      try {
        const selectedIds = Array.from(state.selectedEmails);
        localStorage.setItem(storageKey, JSON.stringify(selectedIds));
      } catch (error) {
        console.warn('Failed to persist email selection:', error);
      }
    }
  }, [state.selectedEmails, persistSelection, storageKey]);

  // Action creators
  const toggleEmail = useCallback((emailId: string, index: number, ctrlKey = false, shiftKey = false) => {
    if (shiftKey && state.lastSelectedIndex !== null) {
      // Range selection will be handled by the caller
      return;
    }
    
    dispatch({ type: 'TOGGLE_EMAIL', emailId, index });
  }, [state.lastSelectedIndex]);

  const selectEmail = useCallback((emailId: string, index: number) => {
    dispatch({ type: 'SELECT_EMAIL', emailId, index });
  }, []);

  const deselectEmail = useCallback((emailId: string) => {
    dispatch({ type: 'DESELECT_EMAIL', emailId });
  }, []);

  const selectRange = useCallback((startIndex: number, endIndex: number, emails: ZeroMailMessage[]) => {
    const start = Math.min(startIndex, endIndex);
    const end = Math.max(startIndex, endIndex);
    const emailIds = emails.slice(start, end + 1).map(email => email.id);
    
    dispatch({ type: 'SELECT_RANGE', startIndex: start, endIndex: end, emailIds });
  }, []);

  const selectAll = useCallback((emails: ZeroMailMessage[]) => {
    const emailIds = emails.map(email => email.id);
    dispatch({ type: 'SELECT_ALL', emailIds });
  }, []);

  const deselectAll = useCallback(() => {
    dispatch({ type: 'DESELECT_ALL' });
  }, []);

  const setSelectionMode = useCallback((enabled: boolean) => {
    dispatch({ type: 'SET_SELECTION_MODE', enabled });
  }, []);

  const setTotalCount = useCallback((count: number) => {
    dispatch({ type: 'SET_TOTAL_COUNT', count });
  }, []);

  const loadSelection = useCallback((selectedIds: string[]) => {
    dispatch({ type: 'LOAD_SELECTION', selectedIds });
  }, []);

  // Helper functions
  const isSelected = useCallback((emailId: string) => {
    return state.selectedEmails.has(emailId);
  }, [state.selectedEmails]);

  const getSelectedEmails = useCallback((emails: ZeroMailMessage[]) => {
    return emails.filter(email => state.selectedEmails.has(email.id));
  }, [state.selectedEmails]);

  const getSelectionCount = useCallback(() => {
    return state.selectedEmails.size;
  }, [state.selectedEmails]);

  const hasSelection = useCallback(() => {
    return state.selectedEmails.size > 0;
  }, [state.selectedEmails]);

  // Context value
  const contextValue: EmailSelectionContextType = {
    state,
    actions: {
      toggleEmail,
      selectEmail,
      deselectEmail,
      selectRange,
      selectAll,
      deselectAll,
      setSelectionMode,
      setTotalCount,
      loadSelection,
      isSelected,
      getSelectedEmails,
      getSelectionCount,
      hasSelection,
    },
  };

  return (
    <EmailSelectionContext.Provider value={contextValue}>
      {children}
    </EmailSelectionContext.Provider>
  );
}

// Hook to use the selection context
export function useEmailSelection() {
  const context = useContext(EmailSelectionContext);
  if (context === undefined) {
    throw new Error('useEmailSelection must be used within an EmailSelectionProvider');
  }
  return context;
}

// Hook for keyboard shortcuts
export function useEmailSelectionKeyboard() {
  const selection = useEmailSelection();

  const handleKeyDown = useCallback((
    event: KeyboardEvent,
    emailId: string,
    index: number,
    emails: ZeroMailMessage[]
  ) => {
    // Escape key - deselect all
    if (event.key === 'Escape') {
      selection.actions.deselectAll();
      return true; // Handled
    }

    // Ctrl/Cmd + A - select all
    if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
      event.preventDefault();
      selection.actions.selectAll(emails);
      return true; // Handled
    }

    // Space - toggle current item
    if (event.key === ' ') {
      event.preventDefault();
      selection.actions.toggleEmail(emailId, index);
      return true; // Handled
    }

    return false; // Not handled
  }, [selection]);

  return { handleKeyDown };
}

// Export types for external use
export type { EmailSelectionState, EmailSelectionAction, EmailSelectionContextType };