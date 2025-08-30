import React from 'react';
import { CheckCircle, AlertCircle, Clock, XCircle } from 'lucide-react';
import { Entity, EntityStatus } from '@/types/doc-intel';

// Format file size
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Format date
export function formatDate(date: Date): string {
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - new Date(date).getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays === 1) return 'Today';
  if (diffDays === 2) return 'Yesterday';
  if (diffDays <= 7) return `${diffDays - 1}d ago`;
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}


// Count documents in a folder
export function countDocuments(folder: any): number {
  const count = folder.documents?.length || 0;

  if (folder.children && folder.children.length > 0) {
    return folder.children.reduce(
      (acc: number, child: any) => acc + countDocuments(child),
      count
    );
  }

  return count;
}

// Count all documents in folders
export function countAllDocuments(folders: any): number {
  return folders.reduce(
    (count: number, folder: any) => count + countDocuments(folder),
    0
  );
} 

// Get status color and icon
export function getStatusDisplay(status: string) {
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
  }

// Entity highlighting utility
export function getEntityHighlightClass(status: EntityStatus, isObjectiveTruth: boolean, isSelected: boolean) {
  let baseClass = 'px-1 py-0.5 rounded-sm transition-all duration-200 cursor-pointer';
  
  if (isSelected) {
    baseClass += ' ring-2 ring-blue-500 ring-offset-1';
  }
  
  if (isObjectiveTruth) {
    return `${baseClass} bg-gradient-to-r from-yellow-200 to-yellow-300 text-yellow-900 font-semibold border border-yellow-400 shadow-sm`;
  }
  
  switch (status) {
    case 'pending':
      return `${baseClass} bg-yellow-100 text-yellow-800 hover:bg-yellow-150`;
    case 'confirmed':
      return `${baseClass} bg-green-100 text-green-800 hover:bg-green-150`;
    case 'rejected':
      return `${baseClass} bg-red-100 text-red-800 line-through opacity-75 hover:opacity-90`;
    default:
      return `${baseClass} bg-gray-100 text-gray-800`;
  }
}

// Highlight text with entities
export function highlightText(
  text: string, 
  entities: Entity[], 
  selectedEntityId?: string,
  isFocusModeActive?: boolean
): React.ReactElement {
  if (!text || !entities.length) {
    const className = `whitespace-pre-wrap text-sm leading-relaxed ${
      isFocusModeActive && selectedEntityId ? 'opacity-30 transition-opacity duration-300' : ''
    }`;
    return React.createElement('div', { className }, text);
  }

  // Sort entities by their position in text (if we have coordinates or context)
  // For now, we'll use simple string matching
  const sortedEntities = [...entities].sort((a, b) => {
    const indexA = text.indexOf(a.value);
    const indexB = text.indexOf(b.value);
    return indexA - indexB;
  });

  let highlightedText = text;
  let offset = 0;

  // Process entities and wrap them in spans
  sortedEntities.forEach((entity) => {
    const entityValue = entity.value;
    const searchIndex = highlightedText.indexOf(entityValue, offset);
    
    if (searchIndex !== -1) {
      const isSelected = selectedEntityId === entity.id;
      const highlightClass = getEntityHighlightClass(entity.status, entity.is_objective_truth, isSelected);
      
      // Create the replacement span
      const spanOpen = `<span class="${highlightClass}" data-entity-id="${entity.id}" title="${entity.label}: ${entity.value}${entity.context_snippet ? ' | ' + entity.context_snippet : ''}">`;
      const spanClose = '</span>';
      
      // Replace the text
      highlightedText = highlightedText.slice(0, searchIndex) + 
                      spanOpen + 
                      entityValue + 
                      spanClose + 
                      highlightedText.slice(searchIndex + entityValue.length);
      
      // Update offset to account for added HTML
      offset = searchIndex + spanOpen.length + entityValue.length + spanClose.length;
    }
  });

  // Apply focus mode styling
  const baseClassName = 'whitespace-pre-wrap text-sm leading-relaxed';
  const focusClassName = isFocusModeActive && selectedEntityId 
    ? 'focus-mode-container' 
    : '';
  
  const className = `${baseClassName} ${focusClassName}`.trim();

  // Return JSX element with dangerouslySetInnerHTML
  return React.createElement('div', {
    className,
    dangerouslySetInnerHTML: { __html: highlightedText }
  });
}

// Enhanced highlight text with focus mode and scroll registration
export function highlightTextWithFocus(
  text: string, 
  entities: Entity[], 
  selectedEntityId?: string,
  isFocusModeActive?: boolean,
  onEntityRef?: (entityId: string, element: HTMLElement | null) => void
): React.ReactElement {
  if (!text || !entities.length) {
    const className = `whitespace-pre-wrap text-sm leading-relaxed ${
      isFocusModeActive && selectedEntityId ? 'opacity-30 transition-opacity duration-300' : ''
    }`;
    return React.createElement('div', { className }, text);
  }

  const containerRef = React.useRef<HTMLDivElement>(null);
  
  React.useEffect(() => {
    if (!containerRef.current || !onEntityRef) return;
    
    // Register all entity elements for scroll functionality
    const entityElements = containerRef.current.querySelectorAll('[data-entity-id]');
    entityElements.forEach((element) => {
      const entityId = element.getAttribute('data-entity-id');
      if (entityId) {
        onEntityRef(entityId, element as HTMLElement);
      }
    });
    
    // Cleanup function
    return () => {
      entityElements.forEach((element) => {
        const entityId = element.getAttribute('data-entity-id');
        if (entityId) {
          onEntityRef(entityId, null);
        }
      });
    };
  }, [text, entities, onEntityRef]);

  // Sort entities by their position in text
  const sortedEntities = [...entities].sort((a, b) => {
    const indexA = text.indexOf(a.value);
    const indexB = text.indexOf(b.value);
    return indexA - indexB;
  });

  let highlightedText = text;
  let offset = 0;

  // Process entities and wrap them in spans
  sortedEntities.forEach((entity) => {
    const entityValue = entity.value;
    const searchIndex = highlightedText.indexOf(entityValue, offset);
    
    if (searchIndex !== -1) {
      const isSelected = selectedEntityId === entity.id;
      const highlightClass = getEntityHighlightClass(entity.status, entity.is_objective_truth, isSelected);
      
      // Add scroll-to animation class for flash effect
      const animationClass = isSelected ? 'entity-highlight-flash' : '';
      const fullClass = `${highlightClass} ${animationClass}`.trim();
      
      // Create the replacement span
      const spanOpen = `<span class="${fullClass}" data-entity-id="${entity.id}" title="${entity.label}: ${entity.value}${entity.context_snippet ? ' | ' + entity.context_snippet : ''}">`;
      const spanClose = '</span>';
      
      // Replace the text
      highlightedText = highlightedText.slice(0, searchIndex) + 
                      spanOpen + 
                      entityValue + 
                      spanClose + 
                      highlightedText.slice(searchIndex + entityValue.length);
      
      // Update offset to account for added HTML
      offset = searchIndex + spanOpen.length + entityValue.length + spanClose.length;
    }
  });

  // Apply focus mode styling
  const baseClassName = 'whitespace-pre-wrap text-sm leading-relaxed';
  const focusClassName = isFocusModeActive && selectedEntityId 
    ? 'focus-mode-text opacity-30 transition-opacity duration-300' 
    : 'transition-opacity duration-300';
  
  const className = `${baseClassName} ${focusClassName}`.trim();

  // Return JSX element with ref and dangerouslySetInnerHTML
  return React.createElement('div', {
    ref: containerRef,
    className,
    dangerouslySetInnerHTML: { __html: highlightedText }
  });
}