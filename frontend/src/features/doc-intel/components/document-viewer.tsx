'use client';

import { useEffect, useCallback } from 'react';
import { FileText } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Entity } from '@/types/doc-intel';
import { highlightText } from '@/lib/document-utils';
import { useSelectedEntity, useFocusMode, useVerificationActions } from '../stores/verification-store';

interface DocumentViewerProps {
  document?: {
    id: string;
    filename: string;
    extracted_text: string | null;
  };
  entities: Entity[];
  className?: string;
}

export function DocumentViewer({ document, entities, className }: DocumentViewerProps) {
  const selectedEntityId = useSelectedEntity();
  const isFocusModeActive = useFocusMode();
  const { selectEntity } = useVerificationActions();

  // Handle clicking on highlighted entities in the document
  const handleDocumentTextClick = useCallback((event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    if (target.dataset.entityId) {
      selectEntity(target.dataset.entityId);
    }
  }, [selectEntity]);


  // Auto-scroll to selected entity in document
  useEffect(() => {
    if (selectedEntityId) {
      const entityElement = document?.getElementById(`entity-${selectedEntityId}`) || 
                           document?.querySelector(`[data-entity-id="${selectedEntityId}"]`) as HTMLElement;
      
      if (entityElement) {
        entityElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });
        
        // Add flash effect
        entityElement.classList.add('entity-highlight-flash');
        setTimeout(() => {
          entityElement.classList.remove('entity-highlight-flash');
        }, 1500);
      }
    }
  }, [selectedEntityId]);

  if (!document) {
    return (
      <div className={`flex flex-col bg-background ${className}`}>
        <div className="border-b px-4 py-3">
          <h3 className="font-medium">Document Viewer</h3>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No document selected</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col bg-background ${className}`}>
      {/* Header */}
      <div className="border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Document Viewer</h3>
          <div className="text-xs text-muted-foreground">
            {selectedEntityId 
              ? `Selected: ${entities.find(e => e.id === selectedEntityId)?.value}`
              : 'Click on highlighted entities to review them'
            }
          </div>
        </div>
      </div>

      {/* Document Content */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full document-viewer">
          <div className="p-6">
            {document.extracted_text ? (
              <div 
                className={`${
                  isFocusModeActive && selectedEntityId 
                    ? 'document-focus-mode' 
                    : ''
                }`}
                data-selected={selectedEntityId ? 'true' : 'false'}
                onClick={handleDocumentTextClick}
              >
                {highlightText(
                  document.extracted_text, 
                  entities, 
                  selectedEntityId, 
                  isFocusModeActive
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full min-h-[400px]">
                <div className="text-center">
                  <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h4 className="text-lg font-medium mb-2">No text content available</h4>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    This document may be an image or the text extraction process is still running.
                  </p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
      
      {/* Focus mode indicator */}
      {isFocusModeActive && selectedEntityId && (
        <div className="border-t px-4 py-2 bg-blue-50 text-xs text-blue-700">
          Focus mode active - showing selected entity context
        </div>
      )}
    </div>
  );
}