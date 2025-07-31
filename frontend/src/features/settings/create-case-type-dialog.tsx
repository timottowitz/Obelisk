'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { CaseType } from '@/types/cases';

interface CreateCaseTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateCaseType: (caseType: any) => Promise<void>;
  onEditCaseType: (caseTypeId: string, caseType: any) => Promise<void>;
  initialCaseType: CaseType | null;
}

export function CreateCaseTypeDialog({
  open,
  onOpenChange,
  onCreateCaseType,
  onEditCaseType,
  initialCaseType
}: CreateCaseTypeDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [newCaseType, setNewCaseType] = useState({
    name: '',
    display_name: '',
    description: '',
    color: '#3B82F6',
    icon: 'folder'
  });

  // Update state when initialCaseType changes
  useEffect(() => {
    if (initialCaseType) {
      setNewCaseType({
        name: initialCaseType.name || '',
        display_name: initialCaseType.display_name || '',
        description: initialCaseType.description || '',
        color: initialCaseType.color || '#3B82F6',
        icon: initialCaseType.icon || 'folder'
      });
    } else {
      // Reset to default values when not editing
      setNewCaseType({
        name: '',
        display_name: '',
        description: '',
        color: '#3B82F6',
        icon: 'folder'
      });
    }
  }, [initialCaseType]);

  const handleCaseType = async () => {
    if (!newCaseType.name || !newCaseType.display_name) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    try {
      if (initialCaseType) {
        await onEditCaseType(initialCaseType.id, newCaseType);
        toast.success('Case type updated successfully');
      } else {
        await onCreateCaseType(newCaseType);
        toast.success('Case type created successfully');
      }
      
      // Reset form after successful operation
      setNewCaseType({
        name: '',
        display_name: '',
        description: '',
        color: '#3B82F6',
        icon: 'folder'
      });
      onOpenChange(false);
    } catch (error) {
      toast.error(initialCaseType ? 'Failed to update case type' : 'Failed to create case type');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className='bg-blue-600 hover:bg-blue-700'>
          <Plus className='mr-2 h-4 w-4' />
          Create Case Type
        </Button>
      </DialogTrigger>
      <DialogContent className='max-w-md'>
        <DialogHeader>
          <DialogTitle>{initialCaseType ? 'Edit Case Type' : 'Create New Case Type'}</DialogTitle>
          <DialogDescription>
            {initialCaseType ? 'Edit a case type' : 'Add a new case type'}
          </DialogDescription>
        </DialogHeader>
        <div className='space-y-4'>
          <div>
            <Label htmlFor='name'>Name (slug)</Label>
            <Input
              id='name'
              placeholder='e.g., intellectual_property'
              value={newCaseType.name}
              onChange={(e) =>
                setNewCaseType({
                  ...newCaseType,
                  name: e.target.value
                })
              }
            />
          </div>
          <div>
            <Label htmlFor='display_name'>Display Name</Label>
            <Input
              id='display_name'
              placeholder='e.g., Intellectual Property'
              value={newCaseType.display_name}
              onChange={(e) =>
                setNewCaseType({
                  ...newCaseType,
                  display_name: e.target.value
                })
              }
            />
          </div>
          <div>
            <Label htmlFor='description'>Description</Label>
            <Textarea
              id='description'
              placeholder='Brief description of this case type'
              value={newCaseType.description}
              onChange={(e) =>
                setNewCaseType({
                  ...newCaseType,
                  description: e.target.value
                })
              }
              rows={3}
            />
          </div>
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <Label htmlFor='color'>Color</Label>
              <Input
                id='color'
                type='color'
                value={newCaseType.color}
                onChange={(e) =>
                  setNewCaseType({
                    ...newCaseType,
                    color: e.target.value
                  })
                }
                className='h-10'
              />
            </div>
            <div>
              <Label htmlFor='icon'>Icon</Label>
              <Select
                value={newCaseType.icon}
                onValueChange={(value) =>
                  setNewCaseType({ ...newCaseType, icon: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='gavel'>Gavel</SelectItem>
                  <SelectItem value='file-text'>File Text</SelectItem>
                  <SelectItem value='briefcase'>Briefcase</SelectItem>
                  <SelectItem value='folder'>Folder</SelectItem>
                  <SelectItem value='scale'>Scale</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCaseType}
            disabled={
              isLoading || !newCaseType.name || !newCaseType.display_name
            }
            className='bg-blue-600 hover:bg-blue-700'
          >
            {isLoading ? 'Saving...' : (initialCaseType ? 'Update Case Type' : 'Create Case Type')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
