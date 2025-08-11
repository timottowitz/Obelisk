import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Pencil,
  Archive,
  Trash2,
  UserPlus,
  Info
} from 'lucide-react';

interface ContactActionsProps {
  selectedContact: any | null;
  onEdit?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
  onAddNew?: () => void;
  onInfo?: () => void;
}

export default function ContactActions({
  selectedContact,
  onEdit,
  onArchive,
  onDelete,
  onAddNew,
  onInfo
}: ContactActionsProps) {
  return (
    <div className='flex items-center gap-4'>
      {selectedContact && (
        <>
          <Button 
            size='icon' 
            variant='ghost' 
            className='cursor-pointer'
            onClick={onEdit}
          >
            <Pencil className='text-muted-foreground h-12 w-12' />
          </Button>
          <Button 
            size='icon' 
            variant='ghost' 
            className='cursor-pointer'
            onClick={onArchive}
          >
            <Archive className='text-muted-foreground h-12 w-12' />
          </Button>
          <Button 
            size='icon' 
            variant='ghost' 
            className='cursor-pointer'
            onClick={onDelete}
          >
            <Trash2 className='h-12 w-12 text-red-500' />
          </Button>
        </>
      )}
      <Button 
        size='sm' 
        variant='ghost' 
        className='cursor-pointer'
        onClick={onAddNew}
      >
        <UserPlus className='h-12 w-12 text-cyan-500' />
      </Button>

      <Button 
        size='icon' 
        variant='ghost' 
        className='cursor-pointer'
        onClick={onInfo}
      >
        <Info className='text-foreground h-12 w-12' />
      </Button>
    </div>
  );
}