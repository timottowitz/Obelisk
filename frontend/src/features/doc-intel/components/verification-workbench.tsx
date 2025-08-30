'use client';

import { useMemo, useRef, useEffect } from 'react';
import { Search, Filter, FileText, Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Entity, EntityStatus } from '@/types/doc-intel';
import { useVerificationStore, useSelectedEntity, useFocusMode, useVerificationActions } from '../stores/verification-store';
import { EntityCard } from './entity-card';
import { useUpdateEntityStatus } from '@/hooks/useDocIntel';

interface VerificationWorkbenchProps {
  entities: Entity[];
  onEntityStatusChange?: (entityId: string, status: EntityStatus) => void;
  onEntityEdit?: (entityId: string) => void;
  className?: string;
  searchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
  entityFilter?: EntityStatus | 'all';
  onEntityFilterChange?: (filter: EntityStatus | 'all') => void;
}

export function VerificationWorkbench({
  entities,
  onEntityStatusChange,
  onEntityEdit,
  className,
  searchQuery = '',
  onSearchQueryChange,
  entityFilter = 'all',
  onEntityFilterChange
}: VerificationWorkbenchProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const entityCardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  
  // Zustand store state and actions
  const selectedEntityId = useSelectedEntity();
  const isFocusModeActive = useFocusMode();
  const { selectEntity, toggleFocusMode, registerEntityRef } = useVerificationActions();
  
  // Mutations
  const updateEntityStatus = useUpdateEntityStatus();

  // Filter entities based on search and status filter
  const filteredEntities = useMemo(() => {
    return entities.filter(entity => {
      const matchesFilter = entityFilter === 'all' || entity.status === entityFilter;
      const matchesSearch = !searchQuery || 
        entity.value.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entity.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entity.context_snippet?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [entities, entityFilter, searchQuery]);

  // Stats calculations
  const stats = useMemo(() => {
    const confirmed = entities.filter(e => e.status === 'confirmed').length;
    const pending = entities.filter(e => e.status === 'pending').length;
    const rejected = entities.filter(e => e.status === 'rejected').length;
    const objectiveTruth = entities.filter(e => e.is_objective_truth).length;
    
    return { confirmed, pending, rejected, objectiveTruth };
  }, [entities]);

  // Handle entity selection
  const handleEntitySelect = (entityId: string) => {
    selectEntity(entityId);
  };

  // Handle entity status change
  const handleEntityStatusChange = async (entityId: string, status: EntityStatus) => {
    try {
      if (onEntityStatusChange) {
        onEntityStatusChange(entityId, status);
      } else {
        await updateEntityStatus.mutateAsync({ entityId, status });
      }
    } catch (error) {
      console.error('Failed to update entity status:', error);
    }
  };

  // Handle entity edit
  const handleEntityEdit = (entityId: string) => {
    if (onEntityEdit) {
      onEntityEdit(entityId);
    } else {
      // Default edit behavior - could open a modal or inline editor
      console.log('Edit entity:', entityId);
    }
  };

  // Register entity refs for scroll functionality
  const setEntityCardRef = (entityId: string, ref: HTMLDivElement | null) => {
    entityCardRefs.current[entityId] = ref;
    registerEntityRef(entityId, ref);
  };

  // Auto-scroll to selected entity when it changes
  useEffect(() => {
    if (selectedEntityId && entityCardRefs.current[selectedEntityId]) {
      const entityCard = entityCardRefs.current[selectedEntityId];
      if (entityCard && scrollAreaRef.current) {
        // Calculate scroll position to center the selected entity
        const scrollArea = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollArea) {
          const cardRect = entityCard.getBoundingClientRect();
          const scrollRect = scrollArea.getBoundingClientRect();
          const scrollTop = scrollArea.scrollTop;
          
          const cardCenter = cardRect.top - scrollRect.top + scrollTop + cardRect.height / 2;
          const scrollCenter = scrollRect.height / 2;
          
          scrollArea.scrollTo({
            top: cardCenter - scrollCenter,
            behavior: 'smooth'
          });
        }
      }
    }
  }, [selectedEntityId]);

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Entity Statistics */}
      <div className="p-4 border-b bg-background">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Verification Workbench</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFocusMode}
            className={`h-8 w-8 p-0 ${isFocusModeActive ? 'text-blue-600' : 'text-muted-foreground'}`}
            title={`${isFocusModeActive ? 'Disable' : 'Enable'} focus mode`}
          >
            {isFocusModeActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </Button>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center">
            <div className="text-lg font-bold text-emerald-600">{stats.confirmed}</div>
            <div className="text-xs text-muted-foreground">Confirmed</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-xs text-muted-foreground">Pending</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-red-600">{stats.rejected}</div>
            <div className="text-xs text-muted-foreground">Rejected</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-amber-600">{stats.objectiveTruth}</div>
            <div className="text-xs text-muted-foreground">Objective Truth</div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="p-4 border-b bg-background space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search entities..."
            value={searchQuery}
            onChange={(e) => onSearchQueryChange?.(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select 
          value={entityFilter} 
          onValueChange={(value) => onEntityFilterChange?.(value as EntityStatus | 'all')}
        >
          <SelectTrigger>
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Entities ({entities.length})</SelectItem>
            <SelectItem value="pending">Pending ({stats.pending})</SelectItem>
            <SelectItem value="confirmed">Confirmed ({stats.confirmed})</SelectItem>
            <SelectItem value="rejected">Rejected ({stats.rejected})</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Entity List */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea 
          ref={scrollAreaRef}
          className="h-full"
        >
          <div className="p-4 space-y-3">
            {filteredEntities.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground mb-2">
                  {searchQuery || entityFilter !== 'all' 
                    ? 'No entities match your filters' 
                    : 'No entities found'
                  }
                </p>
                {(searchQuery || entityFilter !== 'all') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onSearchQueryChange?.('');
                      onEntityFilterChange?.('all');
                    }}
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            ) : (
              filteredEntities.map((entity) => (
                <EntityCard
                  key={entity.id}
                  ref={(ref) => setEntityCardRef(entity.id, ref)}
                  entity={entity}
                  isSelected={selectedEntityId === entity.id}
                  onSelect={handleEntitySelect}
                  onStatusChange={handleEntityStatusChange}
                  onEdit={handleEntityEdit}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Selection indicator */}
      {selectedEntityId && (
        <div className="px-4 py-2 border-t bg-muted/50 text-xs text-muted-foreground">
          Selected: {entities.find(e => e.id === selectedEntityId)?.value}
          {isFocusModeActive && (
            <span className="ml-2 text-blue-600">• Focus mode active</span>
          )}
        </div>
      )}
    </div>
  );
}