'use client';

import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

interface CreateCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseName: string;
  onCaseNameChange: (name: string) => void;
  onCreateCase: () => void;
  isLoading: boolean;
}

export function CreateCaseModal({
  isOpen,
  onClose,
  caseName,
  onCaseNameChange,
  onCreateCase,
  isLoading
}: CreateCaseModalProps) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className='data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 bg-black/50' />
        <Dialog.Content className='bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] fixed top-[50%] left-[50%] z-50 grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 border p-6 shadow-lg duration-200 sm:rounded-lg'>
          <div className='flex flex-col space-y-1.5 text-center sm:text-left'>
            <Dialog.Title className='text-lg leading-none font-semibold tracking-tight'>
              Create New Folder Case
            </Dialog.Title>
            <Dialog.Description className='text-muted-foreground text-sm'>
              Create a new folder case to organize your documents
            </Dialog.Description>
          </div>
          <div className='grid gap-4'>
            <Input
              id='folder-case-name'
              value={caseName}
              onChange={(e) => onCaseNameChange(e.target.value)}
              placeholder='Enter folder case name...'
              className='w-full'
            />
          </div>
          <div className='flex justify-end gap-2'>
            <Dialog.Close asChild>
              <Button variant='outline'>Close</Button>
            </Dialog.Close>
            <Button onClick={onCreateCase} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className='h-4 w-4 animate-spin' />
                  Creating...
                </>
              ) : (
                <>Create</>
              )}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
} 