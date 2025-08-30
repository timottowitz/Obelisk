'use client';

import { forwardRef, useState, useOptimistic } from 'react';
import { Check, X, Edit3, Star, Scale, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Entity, EntityStatus } from '@/types/doc-intel';
import { useUpdateEntityStatus, useSetEntityObjectiveTruth } from '@/hooks/useDocIntel';
import { cn } from '@/lib/utils';

interface EntityCardProps {
  entity: Entity;
  isSelected?: boolean;
  onSelect?: (entityId: string) => void;
  onStatusChange?: (entityId: string, status: EntityStatus) => void;
  onEdit?: (entityId: string) => void;
  className?: string;
}

const getEntityStatusColor = (status: EntityStatus) => {
  switch (status) {
    case 'confirmed':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'rejected':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'pending':
      return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
};

export const EntityCard = forwardRef<HTMLDivElement, EntityCardProps>(
  ({ entity, isSelected, onSelect, onStatusChange, onEdit, className }, ref) => {
    const [isUpdating, setIsUpdating] = useState(false);
    
    // Optimistic updates
    const [optimisticEntity, updateOptimisticEntity] = useOptimistic(
      entity,
      (current: Entity, update: Partial<Entity>) => ({ ...current, ...update })
    );
    
    // Mutations
    const updateEntityStatus = useUpdateEntityStatus();
    const setEntityObjectiveTruth = useSetEntityObjectiveTruth();

    const handleCardClick = () => {
      onSelect?.(entity.id);
    };

    const handleStatusChange = async (status: EntityStatus, event: React.MouseEvent) => {
      event.stopPropagation();
      
      if (isUpdating) return;
      
      const originalStatus = entity.status;
      
      // Optimistic update
      updateOptimisticEntity({ status });
      setIsUpdating(true);
      
      try {
        if (onStatusChange) {
          // Use provided callback if available
          onStatusChange(entity.id, status);
        } else {
          // Use mutation directly
          await updateEntityStatus.mutateAsync({ entityId: entity.id, status });
        }
        
        // Success toast
        const statusMessages = {
          confirmed: 'Entity confirmed successfully',
          rejected: 'Entity rejected successfully',
          pending: 'Entity marked as pending'
        };
        toast.success(statusMessages[status]);
        
      } catch (error) {
        console.error('Failed to update entity status:', error);
        
        // Revert optimistic update on error
        updateOptimisticEntity({ status: originalStatus });
        
        // Error toast
        toast.error('Failed to update entity status. Please try again.');
      } finally {
        setIsUpdating(false);
      }
    };

    const handleObjectiveTruthToggle = async (event: React.MouseEvent) => {
      event.stopPropagation();
      
      if (isUpdating) return;
      
      const originalObjectiveTruth = entity.is_objective_truth;
      const newObjectiveTruth = !entity.is_objective_truth;
      
      // Optimistic update
      updateOptimisticEntity({ is_objective_truth: newObjectiveTruth });
      setIsUpdating(true);
      
      try {
        await setEntityObjectiveTruth.mutateAsync({ 
          entityId: entity.id, 
          isObjectiveTruth: newObjectiveTruth 
        });
        
        // Success toast
        toast.success(
          newObjectiveTruth 
            ? 'Entity marked as objective truth'
            : 'Entity unmarked as objective truth'
        );
        
      } catch (error) {
        console.error('Failed to toggle objective truth:', error);
        
        // Revert optimistic update on error
        updateOptimisticEntity({ is_objective_truth: originalObjectiveTruth });
        
        // Error toast
        toast.error('Failed to update objective truth status. Please try again.');
      } finally {
        setIsUpdating(false);
      }
    };

    const handleEdit = (event: React.MouseEvent) => {
      event.stopPropagation();
      onEdit?.(entity.id);
    };

    return (
      <Card
        ref={ref}
        className={cn(
          'cursor-pointer transition-all duration-200 hover:shadow-md border-l-4',
          'group hover:border-primary/30',
          isSelected ? 'ring-2 ring-blue-500 bg-blue-50 shadow-md' : 'hover:bg-muted/30',
          optimisticEntity.status === 'confirmed' ? 'border-l-emerald-500' : '',
          optimisticEntity.status === 'pending' ? 'border-l-yellow-500' : '',
          optimisticEntity.status === 'rejected' ? 'border-l-red-500' : '',
          optimisticEntity.is_objective_truth 
            ? 'bg-gradient-to-r from-amber-50/50 to-yellow-50/50 border-amber-300' 
            : '',
          className
        )}
        onClick={handleCardClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleCardClick();
          }
        }}
        aria-pressed={isSelected}
        aria-label={`Entity: ${optimisticEntity.label} - ${optimisticEntity.value}`}
      >
        <CardContent className="p-4">
          {/* Header with label, objective truth indicator, and status */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Badge 
                variant="secondary" 
                className="text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20"
              >
                {optimisticEntity.label}
              </Badge>
              {optimisticEntity.is_objective_truth && (
                <Star 
                  className="h-4 w-4 text-amber-500 fill-current" 
                  title="Objective Truth"
                />
              )}
            </div>
            <Badge
              variant="outline"
              className={cn('text-xs', getEntityStatusColor(optimisticEntity.status))}
            >
              {optimisticEntity.status.charAt(0).toUpperCase() + optimisticEntity.status.slice(1)}
            </Badge>
          </div>

          {/* Entity value */}
          <div className="font-medium text-sm mb-2 text-foreground leading-relaxed">
            {optimisticEntity.value}
          </div>

          {/* Context snippet */}
          {optimisticEntity.context_snippet && (
            <div className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
              {optimisticEntity.context_snippet}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {optimisticEntity.status === 'pending' && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                  title="Confirm entity"
                  onClick={(e) => handleStatusChange('confirmed', e)}
                  disabled={isUpdating}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                  title="Reject entity"
                  onClick={(e) => handleStatusChange('rejected', e)}
                  disabled={isUpdating}
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            )}
            {optimisticEntity.status === 'confirmed' && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50"
                  title="Mark as pending"
                  onClick={(e) => handleStatusChange('pending', e)}
                  disabled={isUpdating}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-8 w-8 p-0 transition-colors",
                    optimisticEntity.is_objective_truth
                      ? "text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                      : "text-muted-foreground hover:text-amber-600 hover:bg-amber-50"
                  )}
                  title={optimisticEntity.is_objective_truth ? "Remove objective truth" : "Mark as objective truth"}
                  onClick={handleObjectiveTruthToggle}
                  disabled={isUpdating}
                >
                  <Scale className="h-4 w-4" />
                </Button>
              </>
            )}
            {optimisticEntity.status === 'rejected' && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                title="Mark as pending"
                onClick={(e) => handleStatusChange('pending', e)}
                disabled={isUpdating}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              title="Edit entity"
              onClick={handleEdit}
              disabled={isUpdating}
            >
              <Edit3 className="h-4 w-4" />
            </Button>
          </div>

          {/* Selection indicator */}
          {isSelected && (
            <div className="absolute inset-0 border-2 border-blue-500 rounded-md pointer-events-none" />
          )}
        </CardContent>
      </Card>
    );
  }
);

EntityCard.displayName = 'EntityCard';