'use client';

import { useState, useCallback, useMemo } from 'react';
import { ArrowLeft, Download, CheckCircle, FileText } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Heading } from '@/components/ui/heading';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useDocument, useDocumentEntities, useUpdateEntityStatus, useUpdateEntity, useUpdateDocument, useDownloadDocument } from '@/hooks/useDocIntel';
import { VerificationWorkbench, DocumentViewer, EntityEditModal } from '@/features/doc-intel/components';
import { cn, formatStatusLabel } from '@/lib/utils';
import { format } from 'date-fns';
import { DocumentStatus, EntityStatus, Entity, EntityUpdateData } from '@/types/doc-intel';

interface DocumentReviewClientProps {
  id: string;
}

const getStatusColor = (status: DocumentStatus) => {
  switch (status) {
    case 'complete':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'processing':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'needs_review':
      return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    case 'in_review':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'failed':
      return 'bg-red-50 text-red-700 border-red-200';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
};


export default function DocumentReviewClient({ id }: DocumentReviewClientProps) {
  const [entityFilter, setEntityFilter] = useState<EntityStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null);
  const [isFinalizingReview, setIsFinalizingReview] = useState(false);
  const [showFinalizeConfirmation, setShowFinalizeConfirmation] = useState(false);
  
  const documentQuery = useDocument(id);
  const entitiesQuery = useDocumentEntities(id);
  const updateEntityStatus = useUpdateEntityStatus();
  const updateEntity = useUpdateEntity();
  const updateDocument = useUpdateDocument();
  const downloadDocument = useDownloadDocument();
  
  const document = documentQuery.data;
  const entities = entitiesQuery.data?.entities || [];

  // Count pending entities
  const pendingEntitiesCount = useMemo(() => {
    return entities.filter(entity => entity.status === 'pending').length;
  }, [entities]);

  // Check if document can be finalized (has entities and not already complete)
  const canFinalizeReview = useMemo(() => {
    return entities.length > 0;
  }, [entities]);

  // Check if all entities are fully reviewed
  const allEntitiesReviewed = useMemo(() => {
    return entities.length > 0 && entities.every(entity => 
      entity.status === 'confirmed' || entity.status === 'rejected'
    );
  }, [entities]);

  const handleEntityStatusChange = useCallback(async (entityId: string, status: EntityStatus) => {
    try {
      await updateEntityStatus.mutateAsync({ entityId, status });
    } catch (error) {
      console.error('Failed to update entity status:', error);
      toast.error('Failed to update entity status. Please try again.');
    }
  }, [updateEntityStatus]);

  const handleEntityEdit = useCallback((entityId: string) => {
    const entity = entities.find(e => e.id === entityId);
    if (entity) {
      setEditingEntity(entity);
    }
  }, [entities]);

  const handleEntitySave = useCallback(async (entityId: string, updates: EntityUpdateData) => {
    try {
      await updateEntity.mutateAsync({ entityId, updates });
      setEditingEntity(null);
      toast.success('Entity updated successfully');
    } catch (error) {
      console.error('Failed to update entity:', error);
      toast.error('Failed to update entity. Please try again.');
      throw error; // Re-throw to handle in modal
    }
  }, [updateEntity]);

  const handleFinalizeClick = useCallback(() => {
    if (!canFinalizeReview || !document) return;
    
    // If there are pending entities, show confirmation dialog
    if (pendingEntitiesCount > 0) {
      setShowFinalizeConfirmation(true);
    } else {
      // If all entities are reviewed, proceed directly
      handleFinalizeReview();
    }
  }, [canFinalizeReview, document, pendingEntitiesCount]);

  const handleFinalizeReview = useCallback(async () => {
    if (!canFinalizeReview || !document) return;
    
    setIsFinalizingReview(true);
    setShowFinalizeConfirmation(false);
    
    try {
      await updateDocument.mutateAsync({ 
        documentId: document.id, 
        updates: { status: 'complete' }
      });
      toast.success('Document review completed successfully!');
    } catch (error) {
      console.error('Failed to finalize review:', error);
      toast.error('Failed to finalize review. Please try again.');
    } finally {
      setIsFinalizingReview(false);
    }
  }, [canFinalizeReview, document, updateDocument]);

  const handleDownload = useCallback(async () => {
    if (!document) return;
    
    try {
      const downloadUrl = await downloadDocument.mutateAsync(document.id);
      // Open the signed URL in a new tab to trigger download
      window.open(downloadUrl, '_blank');
      toast.success('Download started successfully!');
    } catch (error) {
      console.error('Failed to download document:', error);
      toast.error('Failed to download document. Please try again.');
    }
  }, [document, downloadDocument]);

  const handleRetryProcessing = useCallback(async () => {
    if (!document) return;
    
    try {
      await updateDocument.mutateAsync({ 
        documentId: document.id, 
        updates: { status: 'processing' }
      });
      toast.success('Retrying document processing...');
    } catch (error) {
      console.error('Failed to retry processing:', error);
      toast.error('Failed to retry processing. Please try again.');
    }
  }, [document, updateDocument]);

  if (documentQuery.isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span>Loading document...</span>
        </div>
      </div>
    );
  }

  if (documentQuery.error || !document) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Document not found</h2>
          <p className="text-muted-foreground mb-4">
            The document you&apos;re looking for doesn&apos;t exist or you don&apos;t have permission to view it.
          </p>
          <Link href="/dashboard/doc-intel">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Documents
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
    } catch {
      return 'Invalid date';
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard/doc-intel">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Documents
              </Button>
            </Link>
            <Separator orientation="vertical" className="h-6" />
            <div>
              <Heading
                title={document.filename}
                description={`Uploaded ${formatDate(document.uploaded_at)}`}
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge
              variant="outline"
              className={cn('px-3 py-1', getStatusColor(document.status))}
            >
              {formatStatusLabel(document.status)}
            </Badge>
            {canFinalizeReview && document.status !== 'complete' && (
              <Button 
                onClick={handleFinalizeClick}
                disabled={isFinalizingReview}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                size="sm"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                {isFinalizingReview ? 'Finalizing...' : 'Finalize Review'}
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDownload}
              disabled={downloadDocument.isPending}
            >
              <Download className="mr-2 h-4 w-4" />
              {downloadDocument.isPending ? 'Downloading...' : 'Download'}
            </Button>
          </div>
        </div>
      </div>

      {/* Two-panel layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[35%_65%] overflow-hidden">
        {/* Left Sidebar - Entity Verification Workbench */}
        <VerificationWorkbench
          entities={entities}
          document={document}
          onEntityStatusChange={handleEntityStatusChange}
          onEntityEdit={handleEntityEdit}
          onRetryProcessing={handleRetryProcessing}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          entityFilter={entityFilter}
          onEntityFilterChange={setEntityFilter}
          className="border-r bg-muted/20"
        />

        {/* Right Panel - Document Viewer */}
        <DocumentViewer
          document={document}
          entities={entities}
          className="bg-background"
        />
      </div>
      
      {/* Entity Edit Modal */}
      <EntityEditModal
        entity={editingEntity}
        isOpen={!!editingEntity}
        onClose={() => setEditingEntity(null)}
        onSave={handleEntitySave}
      />
      
      {/* Finalize Confirmation Dialog */}
      <AlertDialog open={showFinalizeConfirmation} onOpenChange={setShowFinalizeConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalize Review with Pending Entities?</AlertDialogTitle>
            <AlertDialogDescription>
              There {pendingEntitiesCount === 1 ? 'is' : 'are'} <strong>{pendingEntitiesCount}</strong> pending {pendingEntitiesCount === 1 ? 'entity' : 'entities'} that {pendingEntitiesCount === 1 ? 'has' : 'have'} not been reviewed yet.
              <br /><br />
              Are you sure you want to finalize the document review? Pending entities will remain in their current state.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleFinalizeReview}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Yes, Finalize Review
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}