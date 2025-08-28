/**
 * Bulk Case Assignment Modal - Modal for assigning multiple emails to a case
 * 
 * Displays selected emails, allows case selection, tracks progress,
 * and shows detailed results of bulk assignment operations.
 */

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ZeroMailMessage } from '@/lib/zero-mail-driver';
import { CaseSearchInput } from './CaseSearchInput';
import { CaseList } from './CaseList';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Mail, 
  User, 
  Calendar,
  AlertTriangle,
  RotateCcw,
  Download,
  FolderPlus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useJobStatus } from '@/hooks/useJobStatus';

// Types for case data (imported from existing components)
export interface Case {
  id: string;
  case_number: string;
  case_title: string;
  client_name?: string;
  case_type?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

// Assignment result types
export interface EmailAssignmentResult {
  emailId: string;
  email: ZeroMailMessage;
  success: boolean;
  error?: string;
  caseId?: string;
  timestamp: string;
}

export interface BulkAssignmentProgress {
  completed: number;
  total: number;
  percentage: number;
  currentEmail?: string;
  errors: EmailAssignmentResult[];
  successes: EmailAssignmentResult[];
}

export interface BulkCaseAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  emails: ZeroMailMessage[];
  onAssignComplete?: (results: EmailAssignmentResult[]) => void;
  onRetry?: (failedEmails: ZeroMailMessage[]) => void;
}

export function BulkCaseAssignmentModal({
  isOpen,
  onClose,
  emails,
  onAssignComplete,
  onRetry
}: BulkCaseAssignmentModalProps) {
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState<BulkAssignmentProgress>({
    completed: 0,
    total: emails.length,
    percentage: 0,
    errors: [],
    successes: []
  });
  const [currentTab, setCurrentTab] = useState<'selection' | 'progress' | 'results'>('selection');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Job monitoring
  const { job, isLoading: jobLoading, error: jobError } = useJobStatus(jobId);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedCase(null);
      setIsAssigning(false);
      setJobId(null);
      setProgress({
        completed: 0,
        total: emails.length,
        percentage: 0,
        errors: [],
        successes: []
      });
      setCurrentTab('selection');
    }
  }, [isOpen, emails.length]);

  // Update progress from job status
  useEffect(() => {
    if (job && job.status === 'running' && job.progress) {
      setProgress(prev => ({
        ...prev,
        completed: job.progress?.processedItems || 0,
        percentage: job.progress?.percentage || 0,
        currentEmail: job.progress?.currentOperation
      }));
    } else if (job && job.status === 'completed' && job.result) {
      // Parse results from job
      const results = job.result.data?.results || [];
      const successResults: EmailAssignmentResult[] = [];
      const errorResults: EmailAssignmentResult[] = [];

      results.forEach((result: any, index: number) => {
        const email = emails[index];
        if (!email) return;

        const assignmentResult: EmailAssignmentResult = {
          emailId: email.id,
          email,
          success: result.success,
          error: result.error,
          caseId: result.success ? selectedCase?.id : undefined,
          timestamp: new Date().toISOString()
        };

        if (result.success) {
          successResults.push(assignmentResult);
        } else {
          errorResults.push(assignmentResult);
        }
      });

      setProgress({
        completed: emails.length,
        total: emails.length,
        percentage: 100,
        errors: errorResults,
        successes: successResults
      });

      setCurrentTab('results');
      setIsAssigning(false);

      if (successResults.length > 0) {
        toast.success(`Successfully assigned ${successResults.length} emails to case`);
      }
      if (errorResults.length > 0) {
        toast.error(`Failed to assign ${errorResults.length} emails`);
      }

      onAssignComplete?.([ ...successResults, ...errorResults]);
    } else if (job && job.status === 'failed') {
      setIsAssigning(false);
      toast.error('Bulk assignment job failed');
      setCurrentTab('results');
    }
  }, [job, emails, selectedCase, onAssignComplete]);

  const handleStartAssignment = async () => {
    if (!selectedCase) {
      toast.error('Please select a case first');
      return;
    }

    try {
      setIsAssigning(true);
      setCurrentTab('progress');

      // Call bulk assignment API
      const response = await fetch('/api/emails/bulk-assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Org-Id': 'current-org-id' // TODO: Get from context
        },
        body: JSON.stringify({
          emailIds: emails.map(email => email.id),
          caseId: selectedCase.id,
          batchSize: 10,
          skipExisting: true,
          priority: 'normal'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success && result.job?.id) {
        setJobId(result.job.id);
        toast.success('Bulk assignment job started');
      } else {
        throw new Error(result.error || 'Failed to start bulk assignment');
      }
    } catch (error) {
      console.error('Failed to start bulk assignment:', error);
      toast.error('Failed to start bulk assignment');
      setIsAssigning(false);
      setCurrentTab('selection');
    }
  };

  const handleRetryFailed = () => {
    if (onRetry && progress.errors.length > 0) {
      const failedEmails = progress.errors.map(result => result.email);
      onRetry(failedEmails);
    }
  };

  const handleExportResults = () => {
    const results = [...progress.successes, ...progress.errors];
    const csvContent = [
      'Email ID,Subject,From,Status,Error,Case ID,Timestamp',
      ...results.map(result => [
        result.emailId,
        `"${result.email.subject || ''}"`,
        `"${result.email.from?.name || result.email.from?.address || ''}"`,
        result.success ? 'Success' : 'Failed',
        `"${result.error || ''}"`,
        result.caseId || '',
        result.timestamp
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bulk-assignment-results-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Results exported to CSV');
  };

  const emailsByStatus = useMemo(() => {
    const unprocessed = emails.filter(email => 
      !progress.successes.find(s => s.emailId === email.id) &&
      !progress.errors.find(e => e.emailId === email.id)
    );
    
    return {
      unprocessed,
      successful: progress.successes.map(s => s.email),
      failed: progress.errors.map(e => e.email)
    };
  }, [emails, progress]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5" />
            Bulk Case Assignment
            <Badge variant="outline" className="ml-2">
              {emails.length} emails
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Assign multiple emails to a case at once. Select a case and monitor progress.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={currentTab} onValueChange={(value) => setCurrentTab(value as any)} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="selection">Case Selection</TabsTrigger>
            <TabsTrigger value="progress" disabled={!isAssigning && !jobId}>
              Progress
              {isAssigning && (
                <Badge variant="secondary" className="ml-2">
                  {progress.percentage.toFixed(0)}%
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="results" disabled={progress.completed === 0}>
              Results
              {progress.completed > 0 && (
                <Badge variant="outline" className="ml-2">
                  {progress.successes.length}✓ {progress.errors.length}✗
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="selection" className="flex-1 flex flex-col">
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Email List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Selected Emails</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                  >
                    {showAdvanced ? 'Simple View' : 'Detailed View'}
                  </Button>
                </div>
                
                <ScrollArea className="h-96 border rounded-lg p-4">
                  <div className="space-y-3">
                    {emails.map((email, index) => (
                      <div
                        key={email.id}
                        className={cn(
                          'p-3 rounded border',
                          !email.isRead && 'bg-accent/20 border-accent'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {email.subject || '(No Subject)'}
                            </p>
                            <p className="text-sm text-muted-foreground truncate">
                              From: {email.from?.name || email.from?.address}
                            </p>
                            {showAdvanced && (
                              <>
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                  {email.preview || 'No preview available'}
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                  {!email.isRead && (
                                    <Badge variant="secondary" size="sm">Unread</Badge>
                                  )}
                                  {email.hasAttachments && (
                                    <Badge variant="outline" size="sm">Attachments</Badge>
                                  )}
                                  {email.importance === 'high' && (
                                    <Badge variant="destructive" size="sm">High Priority</Badge>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            #{index + 1}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Case Selection */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Select Target Case</h3>
                
                <div className="space-y-4">
                  <CaseSearchInput 
                    onCaseSelect={setSelectedCase}
                    placeholder="Search cases..."
                  />
                  
                  {selectedCase && (
                    <div className="p-4 border rounded-lg bg-accent/10">
                      <h4 className="font-medium">{selectedCase.case_title}</h4>
                      <p className="text-sm text-muted-foreground">
                        Case #{selectedCase.case_number}
                      </p>
                      {selectedCase.client_name && (
                        <p className="text-sm text-muted-foreground">
                          Client: {selectedCase.client_name}
                        </p>
                      )}
                      <Badge variant="outline" className="mt-2">
                        {selectedCase.status}
                      </Badge>
                    </div>
                  )}
                  
                  <CaseList 
                    onCaseSelect={setSelectedCase}
                    selectedCase={selectedCase}
                    limit={5}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="progress" className="flex-1 flex flex-col">
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-medium mb-2">Assignment in Progress</h3>
                <p className="text-muted-foreground">
                  Assigning {emails.length} emails to "{selectedCase?.case_title}"
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Progress</span>
                  <span className="text-sm text-muted-foreground">
                    {progress.completed} of {progress.total} completed
                  </span>
                </div>
                <Progress value={progress.percentage} className="w-full" />
              </div>

              {progress.currentEmail && (
                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertDescription>
                    Currently processing: {progress.currentEmail}
                  </AlertDescription>
                </Alert>
              )}

              {jobError && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Job error: {jobError}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </TabsContent>

          <TabsContent value="results" className="flex-1 flex flex-col">
            <div className="flex-1 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Assignment Results</h3>
                <div className="flex gap-2">
                  {progress.errors.length > 0 && onRetry && (
                    <Button variant="outline" size="sm" onClick={handleRetryFailed}>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Retry Failed
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={handleExportResults}>
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {progress.successes.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Successful</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {progress.errors.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Failed</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {emailsByStatus.unprocessed.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Pending</div>
                </div>
              </div>

              <ScrollArea className="flex-1 border rounded-lg p-4">
                <div className="space-y-3">
                  {[...progress.successes, ...progress.errors].map((result, index) => (
                    <div
                      key={result.emailId}
                      className={cn(
                        'p-3 rounded border flex items-start gap-3',
                        result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                      )}
                    >
                      <div className="flex-shrink-0 mt-1">
                        {result.success ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {result.email.subject || '(No Subject)'}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          From: {result.email.from?.name || result.email.from?.address}
                        </p>
                        {result.error && (
                          <p className="text-sm text-red-600 mt-1">{result.error}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {currentTab === 'selection' && `${emails.length} emails selected`}
            {currentTab === 'progress' && `${progress.percentage.toFixed(0)}% complete`}
            {currentTab === 'results' && `${progress.successes.length} successful, ${progress.errors.length} failed`}
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              {isAssigning ? 'Background' : 'Close'}
            </Button>
            
            {currentTab === 'selection' && (
              <Button 
                onClick={handleStartAssignment}
                disabled={!selectedCase || isAssigning}
              >
                Start Assignment
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}