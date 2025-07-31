'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Trash2 } from 'lucide-react';

interface DeleteCaseTypeDialogProps {
  caseTypeName: string;
  onDelete: () => Promise<void>;
  open: boolean;
  setOpen: (open: boolean) => void;
}

export function DeleteCaseTypeDialog({
  caseTypeName,
  onDelete,
  open,
  setOpen
}: DeleteCaseTypeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant='ghost'
          size='sm'
          className='text-red-500 hover:text-red-700'
        >
          <Trash2 className='h-4 w-4' />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Case Type</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete "{caseTypeName}"? This action cannot
            be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant='outline' className="cursor-pointer" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={onDelete}
            className='bg-red-600 hover:bg-red-700 cursor-pointer'
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 