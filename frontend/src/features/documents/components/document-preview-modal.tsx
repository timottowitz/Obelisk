'use client';

import { useState, useEffect, useMemo } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import DocViewer, { DocViewerRenderers } from '@cyntler/react-doc-viewer';
import { SolarDocumentItem } from '@/types/documents';
import { formatFileSize, formatDate } from '@/lib/document-utils';
import '@/lib/pdf-setup';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: SolarDocumentItem;
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
  const [previewSrc, setPreviewSrc] = useState<string>('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const fileExt = useMemo(
    () => document.name.split('.').pop()?.toLowerCase(),
    [document.name]
  );

  useEffect(() => {
    if (!isOpen) return;
    if (!downloadUrl) return;

    const controller = new AbortController();
    const load = async () => {
      setPreviewLoading(true);
      setPreviewError(null);

      let objectUrl: string | null = null;
      let proxied = `/api/proxy?url=${encodeURIComponent(downloadUrl)}`;
      let res: Response;
      try {
        if (fileExt !== 'eml') {
          res = await fetch(proxied, {
            signal: controller.signal,
            cache: 'no-store'
          });
        } else {
          proxied = `/api/proxy?url=${encodeURIComponent(downloadUrl)}&type=eml`;
          res = await fetch(proxied, {
            signal: controller.signal,
            cache: 'no-store'
          });
        }

        if (!res.ok) {
          throw new Error(`Preview fetch failed: ${res.status}`);
        }
        const blob = await res.blob();
        objectUrl = URL.createObjectURL(blob);
        setPreviewSrc(objectUrl);
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          setPreviewError(e?.message || 'Unable to load preview');
          setPreviewSrc('');
        }
      } finally {
        setPreviewLoading(false);
      }
      return () => {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
      };
    };

    const cleanup = load();
    return () => {
      controller.abort();
      // Cleanup object URL once promise resolves
      Promise.resolve(cleanup).catch(() => {});
    };
  }, [isOpen, downloadUrl, fileExt]);

  const documents = useMemo(() => {
    return [
      {
        uri: previewSrc,
        fileName: document.name,
        fileType: fileExt
      }
    ];
  }, [previewSrc, document.name, fileExt]);

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className='data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 bg-black/50' />
        <Dialog.Content className='bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] fixed top-[50%] left-[50%] z-50 grid max-h-[85vh] w-[80vw] max-w-5xl! translate-x-[-50%] translate-y-[-50%] gap-4 overflow-auto border p-6 shadow-lg duration-200 sm:rounded-lg'>
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

            <div className='bg-muted/30 flex h-full items-center justify-center overflow-auto rounded-lg border p-4'>
              <div className='w-full text-center'>
                {previewLoading && (
                  <div className='text-muted-foreground text-sm'>
                    Loading preview…
                  </div>
                )}
                {previewError && (
                  <div className='text-destructive text-sm'>{previewError}</div>
                )}
                {!previewLoading &&
                  !previewError &&
                  previewSrc &&
                  fileExt !== 'mp4' &&
                  fileExt !== 'eml' && (
                    <DocViewer
                      documents={documents}
                      pluginRenderers={DocViewerRenderers}
                      className='[&_#html-renderer]:h-[500px]'
                    />
                  )}
                {!previewLoading &&
                  !previewError &&
                  previewSrc &&
                  fileExt === 'eml' && (
                    <iframe
                      src={previewSrc}
                      className='h-[500px] w-full border-0 bg-white'
                      title='Email Preview'
                    />
                  )}
                {!previewLoading &&
                  !previewError &&
                  previewSrc &&
                  fileExt === 'mp4' && (
                    <video
                      src={previewSrc}
                      controls
                      className='h-full w-full object-contain'
                    />
                  )}
              </div>
            </div>
          </div>

          <div className='flex justify-end gap-2'>
            <Dialog.Close asChild>
              <Button variant='outline'>Close</Button>
            </Dialog.Close>
            <Button onClick={onDownload} disabled={isLoadingDownloadUrl}>
              Download
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
