'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Entity, EntityUpdateData } from '@/types/doc-intel';
import { useUpdateEntity } from '@/hooks/useDocIntel';
import { Loader2, Save, X } from 'lucide-react';

interface EntityEditModalProps {
  entity: Entity | null;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (entityId: string, updates: EntityUpdateData) => void;
}

export function EntityEditModal({ entity, isOpen, onClose, onSave }: EntityEditModalProps) {
  const [label, setLabel] = useState('');
  const [value, setValue] = useState('');
  const [contextSnippet, setContextSnippet] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const updateEntity = useUpdateEntity();

  // Initialize form when entity changes
  React.useEffect(() => {
    if (entity) {
      setLabel(entity.label);
      setValue(entity.value);
      setContextSnippet(entity.context_snippet || '');
    } else {
      setLabel('');
      setValue('');
      setContextSnippet('');
    }
  }, [entity]);

  const handleSave = async () => {
    if (!entity) return;

    const updates: EntityUpdateData = {
      label: label.trim(),
      value: value.trim(),
      context_snippet: contextSnippet.trim() || null
    };

    setIsSaving(true);
    try {
      if (onSave) {
        await onSave(entity.id, updates);
      } else {
        await updateEntity.mutateAsync({ entityId: entity.id, updates });
        toast.success('Entity updated successfully');
      }
      onClose();
    } catch (error) {
      console.error('Failed to update entity:', error);
      if (!onSave) {
        toast.error('Failed to update entity. Please try again.');
      }
      // Don't close modal on error - let user retry
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (entity) {
      setLabel(entity.label);
      setValue(entity.value);
      setContextSnippet(entity.context_snippet || '');
    }
    onClose();
  };

  const hasChanges = entity && (
    label !== entity.label ||
    value !== entity.value ||
    contextSnippet !== (entity.context_snippet || '')
  );

  const isValid = label.trim().length > 0 && value.trim().length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Entity</DialogTitle>
          <DialogDescription>
            Make changes to the entity information. Click save when you&apos;re done.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="label" className="text-right">
              Label
            </Label>
            <Input
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="col-span-3"
              placeholder="e.g., Name, Date, Amount"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="value" className="text-right">
              Value
            </Label>
            <Input
              id="value"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="col-span-3"
              placeholder="The actual value"
            />
          </div>
          
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="context" className="text-right pt-2">
              Context
            </Label>
            <Textarea
              id="context"
              value={contextSnippet}
              onChange={(e) => setContextSnippet(e.target.value)}
              className="col-span-3 resize-none"
              rows={3}
              placeholder="Context or surrounding text (optional)"
            />
          </div>
        </div>
        
        <div className="flex justify-end space-x-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isSaving}
          >
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!isValid || !hasChanges || isSaving}
          >
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}