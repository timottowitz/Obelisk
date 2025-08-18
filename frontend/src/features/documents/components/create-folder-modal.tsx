'use client';

import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, PlusCircle } from 'lucide-react';
import { useCallback, useState } from 'react';

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  folderName: string;
  onCreateFolder: (name: string) => void;
  isLoading: boolean;
}

export function CreateFolderModal({
  isOpen,
  onClose,
  folderName,
  onCreateFolder,
  isLoading
}: CreateFolderModalProps) {
  const [newFolderName, setNewFolderName] = useState(folderName);

  const handleCreateFolder = useCallback(() => {
    onCreateFolder(newFolderName);
    setNewFolderName('');
  }, [newFolderName, onCreateFolder]);

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className='data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 bg-black/50' />
        <Dialog.Content className='bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] fixed top-[50%] left-[50%] z-50 grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 border p-6 shadow-lg duration-200 sm:rounded-lg'>
          <div className='flex flex-col space-y-1.5 text-center sm:text-left'>
            <Dialog.Title className='text-lg leading-none font-semibold tracking-tight'>
              Create New Folder
            </Dialog.Title>
            <Dialog.Description className='text-muted-foreground text-sm'>
              Create a new folder to organize your documents
            </Dialog.Description>
          </div>

          <div className='grid gap-4'>
            <div className='grid gap-2'>
              <label htmlFor='folder-name' className='text-sm font-medium'>
                Folder Name
              </label>
              <Input
                id='folder-name'
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder='Enter folder name...'
                className='w-full'
              />
            </div>
          </div>

          <div className='flex justify-end gap-2'>
            <Dialog.Close asChild>
              <Button
                variant='outline'
                onClick={() => {
                  setNewFolderName('');
                }}
              >
                Cancel
              </Button>
            </Dialog.Close>
            <Button
              onClick={handleCreateFolder}
              disabled={!newFolderName.trim() || isLoading}
              className='flex items-center gap-2'
            >
              {isLoading ? (
                <>
                  <Loader2 className='h-4 w-4 animate-spin' />
                  Creating...
                </>
              ) : (
                <>
                  <PlusCircle className='h-4 w-4' />
                  Create Folder
                </>
              )}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
