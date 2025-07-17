'use client';

import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import DocViewer, { DocViewerRenderers } from '@cyntler/react-doc-viewer';
import { SolarDocumentItem } from '@/types/documents';
import { formatFileSize, formatDate } from '@/lib/document-utils';
import { File, FileText, Image } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: SolarDocumentItem | null;
  downloadUrl: string | null;
  isLoadingDownloadUrl: boolean;
  onDownload: () => void;
}

export function DocumentPreviewModal({
  isOpen,
  onClose,
  document,
  downloadUrl,
  isLoadingDownloadUrl,
  onDownload
}: DocumentPreviewModalProps) {
  // Get file icon
  function getFileIcon(type: string, className?: string) {
    const iconClass = cn('h-4 w-4', className);
    const mimeType = type.split('/')[1];
    switch (mimeType) {
      case 'pdf':
        return <FileText className={cn(iconClass, 'text-red-500')} />;
      case 'doc':
      case 'vnd.openxmlformats-officedocument.wordprocessingml.document':
        return <FileText className={cn(iconClass, 'text-blue-500')} />;
      case 'txt':
        return <FileText className={cn(iconClass, 'text-gray-500')} />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return <Image className={cn(iconClass, 'text-green-500')} />;
      default:
        return <File className={cn(iconClass, 'text-muted-foreground')} />;
    }
  }
  if (!document) return null;

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className='data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 bg-black/50' />
        <Dialog.Content className='bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] fixed top-[50%] left-[50%] z-50 grid w-full max-w-4xl translate-x-[-50%] translate-y-[-50%] gap-4 border p-6 shadow-lg duration-200 sm:rounded-lg md:w-full'>
          <div className='flex flex-col space-y-1.5 text-center sm:text-left'>
            <Dialog.Title className='text-lg leading-none font-semibold tracking-tight'>
              Solar Document Preview
            </Dialog.Title>
            <Dialog.Description className='text-muted-foreground text-sm'>
              {document.name}
            </Dialog.Description>
          </div>

          <div className='grid gap-4'>
            <div className='grid grid-cols-2 gap-4 text-sm'>
              <div>
                <span className='font-medium'>Type:</span>{' '}
                {document.name.split('.').pop()?.toUpperCase()}
              </div>
              <div>
                <span className='font-medium'>Size:</span>{' '}
                {formatFileSize(document.size_bytes)}
              </div>
              <div>
                <span className='font-medium'>Modified:</span>{' '}
                {formatDate(document.updated_at)}
              </div>
            </div>

            <div className='bg-muted/30 flex min-h-[300px] items-center justify-center rounded-lg border p-4'>
              <div className='text-center'>
                {getFileIcon(document.mime_type, 'h-16 w-16 mb-4')}
                <DocViewer
                  documents={[
                    {
                      uri: downloadUrl || ''
                    }
                  ]}
                  pluginRenderers={DocViewerRenderers}
                />
              </div>
            </div>
          </div>

          <div className='flex justify-end gap-2'>
            <Dialog.Close asChild>
              <Button variant='outline'>Close</Button>
            </Dialog.Close>
            <Button onClick={onDownload} disabled={isLoadingDownloadUrl}>Download</Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
