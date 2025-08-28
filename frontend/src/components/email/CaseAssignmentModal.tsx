'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, AlertCircle, Loader2, ArrowLeft, FolderOpen, Sparkles, Search, Filter, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ZeroMailMessage } from '@/lib/zero-mail-driver';
import { CaseSearchInput } from './CaseSearchInput';
import { CaseList } from './CaseList';
import { SuggestedCases } from './SuggestedCases';
import { CaseSearchFilters, FilterOptions } from './CaseSearchFilters';
import { QuickCaseAccess } from './QuickCaseAccess';
import { EmailSuggestion } from '@/hooks/useEmailSuggestions';
import { getCaseSuggestionsService } from '@/lib/services/case-suggestions';
import { caseSearchService, EnhancedSearchParams } from '@/lib/services/case-search-enhancements';
import { useCaseSearchHistory } from '@/hooks/useCaseSearchHistory';

// Types for case assignment
export interface Case {
  id: string;
  caseNumber: string;
  title: string;
  clientName: string;
  status: string;
  lastActivity?: Date;
  assignedAttorneys?: string[];
}

export interface CaseSearchResult extends Case {
  relevanceScore?: number;
  matchedFields?: ('caseNumber' | 'title' | 'clientName')[];
  suggestionReason?: 'content-analysis' | 'recent-assignment' | 'pattern-match';
}

export interface EmailAssignment {
  id: string;
  emailId: string;
  caseId: string;
  assignedBy: string;
  assignedDate: Date;
  storageLocation?: string;
  status: 'pending' | 'completed' | 'failed';
}

export interface CaseAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: ZeroMailMessage | null;
  onAssignComplete: (assignment: EmailAssignment) => void;
}

// Enhanced modal state interface
interface ModalState {
  step: 'search' | 'confirm' | 'processing' | 'complete' | 'error';
  selectedCase: CaseSearchResult | EmailSuggestion | null;
  selectedSuggestion: EmailSuggestion | null;
  isLoading: boolean;
  error: string | null;
  assignment: EmailAssignment | null;
  assignmentMethod: 'suggestion' | 'manual' | 'quick' | null;
  searchFilters: Partial<EnhancedSearchParams>;
  showAdvancedFilters: boolean;
}

export function CaseAssignmentModal({
  isOpen,
  onClose,
  email,
  onAssignComplete
}: CaseAssignmentModalProps) {
  const [state, setState] = useState<ModalState>({
    step: 'search',
    selectedCase: null,
    selectedSuggestion: null,
    isLoading: false,
    error: null,
    assignment: null,
    assignmentMethod: null,
    searchFilters: {},
    showAdvancedFilters: false
  });
  
  const { recordCaseAssignment } = useCaseSearchHistory();

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen && email) {
      // Initialize filters with smart defaults
      const initialFilters: Partial<EnhancedSearchParams> = {
        client_domain: caseSearchService.extractClientDomain(email.from.address)
      };
      
      setState({
        step: 'search',
        selectedCase: null,
        selectedSuggestion: null,
        isLoading: false,
        error: null,
        assignment: null,
        assignmentMethod: null,
        searchFilters: initialFilters,
        showAdvancedFilters: false
      });
    }
  }, [isOpen, email]);

  const handleCaseSelect = useCallback((selectedCase: CaseSearchResult) => {
    setState(prev => ({
      ...prev,
      selectedCase,
      selectedSuggestion: null,
      step: 'confirm',
      error: null,
      assignmentMethod: 'manual'
    }));
  }, []);

  const handleSuggestionSelect = useCallback((suggestion: EmailSuggestion) => {
    setState(prev => ({
      ...prev,
      selectedCase: {
        id: suggestion.caseId,
        caseNumber: suggestion.caseNumber,
        title: suggestion.caseTitle,
        clientName: suggestion.clientName,
        status: suggestion.caseStatus,
      },
      selectedSuggestion: suggestion,
      step: 'confirm',
      error: null,
      assignmentMethod: 'suggestion'
    }));
  }, []);

  const handleConfirmAssignment = useCallback(async () => {
    if (!email || !state.selectedCase) return;

    setState(prev => ({ ...prev, step: 'processing', isLoading: true, error: null }));

    try {
      // TODO: Call assignment API
      const response = await fetch(`/api/emails/${email.id}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          caseId: state.selectedCase.id
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Assignment failed' }));
        throw new Error(errorData.error || `HTTP ${response.status}: Assignment failed`);
      }

      const assignment = await response.json();
      
      setState(prev => ({
        ...prev,
        step: 'complete',
        isLoading: false,
        assignment
      }));

      // Record suggestion feedback if this was from AI suggestion
      if (state.assignmentMethod === 'suggestion' && state.selectedSuggestion) {
        try {
          const suggestionsService = getCaseSuggestionsService();
          await suggestionsService.recordEmailAssignment(
            email.id,
            state.selectedCase.id,
            state.selectedSuggestion.id,
            state.selectedSuggestion.rank
          );
        } catch (error) {
          console.error('Failed to record suggestion feedback:', error);
          // Don't fail the assignment if feedback fails
        }
      }
      
      // Record case assignment in history
      recordCaseAssignment(state.selectedCase, state.searchFilters.q);

      // Notify parent component
      onAssignComplete(assignment);
      
      // Auto-close after success
      setTimeout(() => {
        onClose();
      }, 2000);

    } catch (error) {
      console.error('Assignment failed:', error);
      setState(prev => ({
        ...prev,
        step: 'error',
        isLoading: false,
        error: error instanceof Error ? error.message : 'Assignment failed. Please try again.'
      }));
    }
  }, [email, state.selectedCase, onAssignComplete, onClose]);

  const handleBackToSearch = useCallback(() => {
    setState(prev => ({
      ...prev,
      step: 'search',
      selectedCase: null,
      selectedSuggestion: null,
      error: null,
      assignmentMethod: null
    }));
  }, []);
  
  const handleFiltersChange = useCallback((filters: Partial<EnhancedSearchParams>) => {
    setState(prev => ({ ...prev, searchFilters: filters }));
  }, []);
  
  const handleToggleAdvancedFilters = useCallback(() => {
    setState(prev => ({ ...prev, showAdvancedFilters: !prev.showAdvancedFilters }));
  }, []);
  
  const handleQuickCaseSelect = useCallback((selectedCase: CaseSearchResult) => {
    setState(prev => ({
      ...prev,
      selectedCase,
      selectedSuggestion: null,
      step: 'confirm',
      error: null,
      assignmentMethod: 'quick'
    }));
  }, []);

  const handleRetry = useCallback(() => {
    handleConfirmAssignment();
  }, [handleConfirmAssignment]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen && state.step !== 'processing') {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, state.step, handleClose]);

  if (!email) return null;

  const getModalTitle = () => {
    switch (state.step) {
      case 'search': return 'Assign Email to Case';
      case 'confirm': return 'Confirm Assignment';
      case 'processing': return 'Assigning Email...';
      case 'complete': return 'Assignment Complete';
      case 'error': return 'Assignment Failed';
      default: return 'Assign Email to Case';
    }
  };

  const renderStepContent = () => {
    switch (state.step) {
      case 'search':
        return (
          <EnhancedSearchStep 
            email={email} 
            onCaseSelect={handleCaseSelect} 
            onSuggestionSelect={handleSuggestionSelect}
            onQuickCaseSelect={handleQuickCaseSelect}
            searchFilters={state.searchFilters}
            onFiltersChange={handleFiltersChange}
            showAdvancedFilters={state.showAdvancedFilters}
            onToggleAdvancedFilters={handleToggleAdvancedFilters}
          />
        );
      
      case 'confirm':
        return (
          <ConfirmStep
            email={email}
            selectedCase={state.selectedCase!}
            onConfirm={handleConfirmAssignment}
            onBack={handleBackToSearch}
          />
        );
      
      case 'processing':
        return <ProcessingStep />;
      
      case 'complete':
        return (
          <CompleteStep
            assignment={state.assignment!}
            selectedCase={state.selectedCase!}
            onClose={handleClose}
          />
        );
      
      case 'error':
        return (
          <ErrorStep
            error={state.error!}
            onRetry={handleRetry}
            onBack={handleBackToSearch}
            onClose={handleClose}
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className={cn(
        'max-w-2xl max-h-[85vh] overflow-hidden',
        state.step === 'search' && 'max-w-4xl'
      )}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            {getModalTitle()}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto">
          {renderStepContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Enhanced Step Components
function EnhancedSearchStep({ 
  email, 
  onCaseSelect,
  onSuggestionSelect,
  onQuickCaseSelect,
  searchFilters,
  onFiltersChange,
  showAdvancedFilters,
  onToggleAdvancedFilters
}: { 
  email: ZeroMailMessage; 
  onCaseSelect: (selectedCase: CaseSearchResult) => void;
  onSuggestionSelect: (suggestion: EmailSuggestion) => void;
  onQuickCaseSelect: (selectedCase: CaseSearchResult) => void;
  searchFilters: Partial<EnhancedSearchParams>;
  onFiltersChange: (filters: Partial<EnhancedSearchParams>) => void;
  showAdvancedFilters: boolean;
  onToggleAdvancedFilters: () => void;
}) {
  const [searchResults, setSearchResults] = useState<CaseSearchResult[]>([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [currentQuery, setCurrentQuery] = useState(searchFilters.q || '');
  const [activeTab, setActiveTab] = useState('suggestions');
  const [filterOptions] = useState<FilterOptions>({
    caseTypes: [], // Would be loaded from API
    statuses: [
      { value: 'active', label: 'Active' },
      { value: 'pending', label: 'Pending' },
      { value: 'closed', label: 'Closed' },
      { value: 'archived', label: 'Archived' }
    ],
    attorneys: [] // Would be loaded from API
  });

  const handleSearch = useCallback((query: string, results: CaseSearchResult[]) => {
    setSearchResults(results);
    setCurrentQuery(query);
    setSelectedCaseId(null);
  }, []);

  const handleCaseSelect = useCallback((selectedCase: CaseSearchResult) => {
    setSelectedCaseId(selectedCase.id);
    onCaseSelect(selectedCase);
  }, [onCaseSelect]);

  const handleLoadMore = useCallback(() => {
    // TODO: Implement pagination
    console.log('Load more cases');
  }, []);

  const emailContent = {
    subject: email.subject || '',
    fromName: email.from.name,
    fromEmail: email.from.address,
    receivedAt: email.receivedAt || email.createdAt,
    hasAttachments: email.hasAttachments || false,
  };

  return (
    <div className="space-y-6">
      {/* Email Preview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Email to Assign</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2 text-sm">
            <div><strong>Subject:</strong> {email.subject || '(No Subject)'}</div>
            <div><strong>From:</strong> {email.from.name || email.from.address}</div>
            <div><strong>Date:</strong> {new Date(email.receivedAt || email.createdAt).toLocaleDateString()}</div>
            {email.hasAttachments && (
              <Badge variant="secondary" className="text-xs">
                Has Attachments
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Enhanced Assignment Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="quick" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Quick Access
          </TabsTrigger>
          <TabsTrigger value="suggestions" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            AI Suggestions
          </TabsTrigger>
          <TabsTrigger value="search" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Advanced Search
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="quick" className="mt-4">
          <QuickCaseAccess
            onCaseSelect={onQuickCaseSelect}
            emailContent={{
              subject: email.subject,
              fromName: email.from.name,
              fromEmail: email.from.address
            }}
          />
        </TabsContent>

        <TabsContent value="suggestions" className="mt-4">
          <SuggestedCases
            emailId={email.id}
            emailContent={emailContent}
            onCaseSelect={onSuggestionSelect}
            onManualSearch={() => setActiveTab('search')}
            showEmailAnalysis={true}
            autoFetch={true}
          />
        </TabsContent>

        <TabsContent value="search" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium mb-1">Advanced Search</h3>
              <p className="text-muted-foreground text-sm">
                Use filters and advanced search to find the exact case you need.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleAdvancedFilters}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
              {showAdvancedFilters ? <Settings className="h-3 w-3" /> : null}
            </Button>
          </div>
          
          {/* Search Filters */}
          {showAdvancedFilters && (
            <CaseSearchFilters
              currentFilters={searchFilters}
              onFiltersChange={onFiltersChange}
              filterOptions={filterOptions}
              isLoading={isSearchLoading}
              showAdvanced={showAdvancedFilters}
              onToggleAdvanced={onToggleAdvancedFilters}
            />
          )}
          
          {/* Enhanced Case Search Input */}
          <CaseSearchInput
            onSearch={handleSearch}
            onLoading={setIsSearchLoading}
            onError={setSearchError}
            onFiltersChange={onFiltersChange}
            currentFilters={searchFilters}
            emailContent={{
              subject: email.subject,
              fromName: email.from.name,
              fromEmail: email.from.address
            }}
            autoFocus={activeTab === 'search'}
            showSuggestions={true}
          />

          {/* Error Display */}
          {searchError && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertCircle className="h-4 w-4" />
                  <p className="text-sm">{searchError}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Enhanced Case List */}
          <CaseList
            cases={searchResults}
            selectedCaseId={selectedCaseId}
            onCaseSelect={handleCaseSelect}
            isLoading={isSearchLoading}
            hasMore={false} // TODO: Implement pagination
            onLoadMore={handleLoadMore}
            query={currentQuery}
            className="max-h-96"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Legacy SearchStep component for backward compatibility
function SearchStep({ email, onCaseSelect, onSuggestionSelect }: { 
  email: ZeroMailMessage; 
  onCaseSelect: (selectedCase: CaseSearchResult) => void;
  onSuggestionSelect: (suggestion: EmailSuggestion) => void;
}) {
  return (
    <EnhancedSearchStep
      email={email}
      onCaseSelect={onCaseSelect}
      onSuggestionSelect={onSuggestionSelect}
      onQuickCaseSelect={onCaseSelect}
      searchFilters={{}}
      onFiltersChange={() => {}}
      showAdvancedFilters={false}
      onToggleAdvancedFilters={() => {}}
    />
  );
}

function ConfirmStep({ 
  email, 
  selectedCase, 
  onConfirm, 
  onBack 
}: {
  email: ZeroMailMessage;
  selectedCase: CaseSearchResult;
  onConfirm: () => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium mb-2">Confirm Assignment</h3>
        <p className="text-muted-foreground">
          Please review the assignment details before confirming.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Email Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Email</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2 text-sm">
            <div><strong>Subject:</strong> {email.subject || '(No Subject)'}</div>
            <div><strong>From:</strong> {email.from.name || email.from.address}</div>
            <div><strong>Date:</strong> {new Date(email.receivedAt || email.createdAt).toLocaleDateString()}</div>
          </CardContent>
        </Card>

        {/* Case Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              Case
              {state.assignmentMethod === 'suggestion' && (
                <Badge variant="default" className="text-xs">
                  <Sparkles className="h-3 w-3 mr-1" />
                  AI Suggested
                </Badge>
              )}
              {state.assignmentMethod === 'quick' && (
                <Badge variant="secondary" className="text-xs">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Quick Access
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2 text-sm">
            <div><strong>Number:</strong> {selectedCase.caseNumber}</div>
            <div><strong>Title:</strong> {selectedCase.title}</div>
            <div><strong>Client:</strong> {selectedCase.clientName}</div>
            <div>
              <strong>Status:</strong>{' '}
              <Badge variant={selectedCase.status.toLowerCase() === 'active' ? 'default' : 'secondary'}>
                {selectedCase.status}
              </Badge>
            </div>
            {state.selectedSuggestion && (
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">AI Confidence:</span>
                  <Badge variant="outline" className="text-xs">
                    {state.selectedSuggestion.confidenceScore}%
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {state.selectedSuggestion.explanation}
                </div>
              </div>
            )}
            {state.assignmentMethod === 'quick' && selectedCase.suggestionReason && (
              <div className="pt-2 border-t">
                <div className="text-xs text-muted-foreground">
                  Selected from quick access ({selectedCase.suggestionReason})
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Search
        </Button>
        <Button onClick={onConfirm}>
          <CheckCircle className="h-4 w-4 mr-2" />
          Assign Email
        </Button>
      </div>
    </div>
  );
}

function ProcessingStep() {
  return (
    <div className="text-center py-8">
      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
      <h3 className="text-lg font-medium mb-2">Assigning Email to Case</h3>
      <p className="text-muted-foreground">
        Processing email content and attachments...
      </p>
    </div>
  );
}

function CompleteStep({ 
  assignment, 
  selectedCase, 
  onClose 
}: {
  assignment: EmailAssignment;
  selectedCase: CaseSearchResult;
  onClose: () => void;
}) {
  return (
    <div className="text-center py-8">
      <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-4" />
      <h3 className="text-lg font-medium mb-2">Assignment Complete!</h3>
      <p className="text-muted-foreground mb-6">
        Email has been successfully assigned to <strong>{selectedCase.caseNumber}</strong>
      </p>
      
      {assignment.storageLocation && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Email and attachments stored in case folder
            </p>
          </CardContent>
        </Card>
      )}

      <Button onClick={onClose}>
        <CheckCircle className="h-4 w-4 mr-2" />
        Done
      </Button>
    </div>
  );
}

function ErrorStep({ 
  error, 
  onRetry, 
  onBack, 
  onClose 
}: {
  error: string;
  onRetry: () => void;
  onBack: () => void;
  onClose: () => void;
}) {
  return (
    <div className="text-center py-8">
      <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-4" />
      <h3 className="text-lg font-medium mb-2">Assignment Failed</h3>
      <p className="text-muted-foreground mb-6">{error}</p>
      
      <div className="flex justify-center gap-3">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Search
        </Button>
        <Button variant="outline" onClick={onRetry}>
          <Loader2 className="h-4 w-4 mr-2" />
          Retry Assignment
        </Button>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
}