import { useCallback, useEffect, useState } from 'react';
import { useAuth, useOrganization } from '@clerk/nextjs';
import { DocumentEditor } from '@onlyoffice/document-editor-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { SolarDocumentItem } from '@/types/documents';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import 'dotenv/config';

const documentTypes = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    'word',
  'application/vnd.ms-excel.sheet.macroenabled.12': 'cell',
  'application/vnd.ms-powerpoint': 'slide',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'cell',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation':
    'slide'
};

const fileTypes = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    'docx',
  'application/vnd.ms-excel.sheet.macroenabled.12': 'xls',
  'application/vnd.ms-powerpoint': 'pptx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation':
    'pptx'
};

export default function DocumentEditModal({
  isOpen,
  onClose,
  downloadUrl,
  selectedDocument,
  onDocumentSaved,
  caseId
}: {
  isOpen: boolean;
  onClose: () => void;
  downloadUrl: string;
  selectedDocument: SolarDocumentItem;
  onDocumentSaved: () => void;
  caseId: string;
}) {
  const [token, setToken] = useState<string | null>(null);
  const { userId } = useAuth();
  const { organization } = useOrganization();
  const orgId = organization?.id;
  const [isSaving, setIsSaving] = useState(false);
  const onDocumentReady = useCallback((event: any) => {
    console.log('Document is loaded');
  }, []);

  const onLoadComponentError = useCallback(
    (errorCode: number, errorDescription: string) => {
      switch (errorCode) {
        case -1: // Unknown error loading component
          console.log(errorDescription);
          break;

        case -2: // Error load DocsAPI from http://documentserver/
          console.log(errorDescription);
          break;

        case -3: // DocsAPI is not defined
          console.log(errorDescription);
          break;
      }
    },
    []
  );

  // Build callback URL - use Supabase Edge Function directly with metadata
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const callbackParams = new URLSearchParams({
    fileId: selectedDocument.id,
    orgId: orgId || '',
    userId: userId || '',
    caseId: caseId
  });
  const callbackUrl = `${supabaseUrl}/functions/v1/storage/onlyoffice-callback?${callbackParams}`;


  const config = {
    document: {
      fileType: fileTypes[selectedDocument.mime_type as keyof typeof fileTypes],
      key: `${selectedDocument.id}-${selectedDocument.updated_at.toString().replaceAll(" ", "-").replaceAll(":", "-")}`,
      title: selectedDocument.name,
      url: downloadUrl,
      permissions: {
        download: true,
        edit: true,
        print: true
      }
    },
    documentType:
      documentTypes[selectedDocument.mime_type as keyof typeof documentTypes],
    type: 'desktop',
    editorConfig: {
      callbackUrl: callbackUrl,
      mode: 'edit',
      coEditing: { mode: 'fast', change: true }
    },
    events: {
      onDocumentReady: onDocumentReady
    }
  };

  useEffect(() => {
    const fetchToken = async () => {
      const response = await fetch('/api/onlyoffice', {
        method: 'POST',
        body: JSON.stringify(config)
      });
      const data = await response.json();
      setToken(data.token);
    };
    fetchToken();
  }, [downloadUrl, selectedDocument.id, selectedDocument.name, callbackUrl]);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      onDocumentSaved();
      setIsSaving(false);
      onClose();
    }, 10 * 1000);
  };

  const handleDownload = useCallback(async () => {
    if (!downloadUrl) {
      toast.error('No download URL found');
      return;
    }
    try {
      const filename = selectedDocument?.name || 'document';
      const url = new URL(downloadUrl);
      url.searchParams.set(
        'response-content-disposition',
        `attachment; filename="${encodeURIComponent(filename)}"`
      );
      url.searchParams.set('response-content-type', 'application/octet-stream');

      const a = document.createElement('a');
      a.href = url.toString();
      a.download = filename;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error('Error downloading file:', err);
      toast.error('Failed to download file');
    }
  }, [downloadUrl, selectedDocument]);

  if (process.env.NEXT_PUBLIC_ONLYOFFICE_URL === undefined) {
    return <div>OnlyOffice URL is not set</div>;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='h-[85vh] max-w-6xl! overflow-hidden p-0 sm:rounded-lg'>
        <div className='flex h-full flex-col'>
          <DialogHeader className='border-b p-4'>
            <DialogTitle>Edit Document</DialogTitle>
          </DialogHeader>

          <div className='flex flex-1 items-center justify-center p-4'>
            <div className='h-[70vh] min-h-[400px] w-full max-w-5xl'>
              {token && !isSaving && (
                <div className='h-full w-full'>
                  <DocumentEditor
                    id='docxEditor'
                    documentServerUrl={process.env.NEXT_PUBLIC_ONLYOFFICE_URL!}
                    config={{ ...config, token: token }}
                    onLoadComponentError={onLoadComponentError}
                  />
                </div>
              )}
              {isSaving && (
                <div className='flex h-full w-full items-center justify-center'>
                  <Loader2 className='h-10 w-10 animate-spin' />
                </div>
              )}
            </div>
          </div>
        </div>
        <DialogFooter className='mr-4 mb-4 flex justify-end gap-2'>
          <Button variant='outline' onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleDownload}>
            <Download className='h-4 w-4' />
            Download
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className='bg-blue-600'
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
