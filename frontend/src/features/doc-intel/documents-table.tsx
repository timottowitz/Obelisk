'use client';

import Link from 'next/link';
import { ChevronDown, ChevronUp, Eye, FileText, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Document, DocumentStatus } from '@/types/doc-intel';
import { format } from 'date-fns';

interface DocumentsTableProps {
  documents: Document[];
  isLoading: boolean;
  onChangeSort: (sort: string) => void;
  queryParams: any;
}

const getStatusColor = (status: DocumentStatus) => {
  switch (status) {
    case 'complete':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800';
    case 'processing':
      return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800';
    case 'needs_review':
      return 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-400 dark:border-yellow-800';
    case 'in_review':
      return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-400 dark:border-purple-800';
    case 'uploading':
      return 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950 dark:text-gray-400 dark:border-gray-800';
    case 'failed':
      return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
};

const getStatusLabel = (status: DocumentStatus) => {
  switch (status) {
    case 'complete':
      return 'Complete';
    case 'processing':
      return 'Processing';
    case 'needs_review':
      return 'Needs Review';
    case 'in_review':
      return 'In Review';
    case 'uploading':
      return 'Uploading';
    case 'failed':
      return 'Failed';
    default:
      return status;
  }
};

const tableColumns = [
  {
    key: 'filename',
    label: 'Filename',
    sortable: true,
    className: 'w-[40%]'
  },
  {
    key: 'status',
    label: 'Status',
    sortable: true,
    className: 'w-[20%]'
  },
  {
    key: 'uploaded_at',
    label: 'Uploaded At',
    sortable: true,
    className: 'w-[25%]'
  },
  {
    key: 'actions',
    label: 'Actions',
    sortable: false,
    className: 'w-[15%]'
  }
];

export function DocumentsTable({
  documents,
  isLoading,
  onChangeSort,
  queryParams
}: DocumentsTableProps) {
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
    } catch {
      return 'Invalid date';
    }
  };

  return (
    <div className='overflow-hidden rounded-xl border border-border bg-card shadow dark:shadow-sm'>
      <Table>
        <TableHeader className='bg-accent text-accent-foreground dark:bg-muted dark:text-muted-foreground'>
          <TableRow className='border-b border-border'>
            {tableColumns.map((column) => (
              <TableHead
                key={column.key}
                className={cn(
                  'px-6 py-4 text-xs font-semibold tracking-wider uppercase text-accent-foreground dark:text-muted-foreground',
                  column.className
                )}
              >
                <div
                  className={cn(
                    'flex cursor-pointer items-center gap-2',
                    queryParams.sortBy === column.key && 'text-foreground',
                    !column.sortable && 'cursor-default'
                  )}
                  onClick={() => column.sortable && onChangeSort(column.key)}
                >
                  {column.label}
                  {column.sortable && (
                    <>
                      {queryParams.sortBy === column.key &&
                      queryParams.order === 'desc' ? (
                        <ChevronUp className={cn('ml-1 h-3 w-3', 'text-blue-600 dark:text-blue-400')} />
                      ) : (
                        <ChevronDown className={cn('ml-1 h-3 w-3', queryParams.sortBy === column.key ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground')} />
                      )}
                    </>
                  )}
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell
                colSpan={tableColumns.length}
                className='py-4 text-center'
              >
                <div className='flex items-center justify-center'>
                  <div className='h-4 w-4 animate-spin rounded-full border-2 border-foreground/50 dark:border-muted-foreground border-t-transparent' />
                </div>
              </TableCell>
            </TableRow>
          )}
          {!isLoading &&
            documents &&
            documents.length > 0 &&
            documents.map((document) => (
              <TableRow
                key={document.id}
                className='border-b border-border odd:bg-background even:bg-muted/40 hover:bg-accent/60 dark:odd:bg-card dark:even:bg-muted/30 dark:hover:bg-accent'
              >
                <TableCell className='px-6 py-4'>
                  <div className='flex items-center space-x-3'>
                    <FileText className='h-5 w-5 text-blue-500' />
                    <div>
                      <p className='text-sm font-medium text-foreground'>
                        {document.filename.length > 40
                          ? document.filename.substring(0, 40) + '...'
                          : document.filename}
                      </p>
                      {document.metadata?.pageCount && (
                        <p className='text-xs text-muted-foreground'>
                          {document.metadata.pageCount} pages
                        </p>
                      )}
                    </div>
                  </div>
                </TableCell>

                <TableCell className='px-6 py-4'>
                  <Badge
                    variant='outline'
                    className={cn(
                      'border px-2.5 py-1 text-xs font-medium',
                      getStatusColor(document.status)
                    )}
                  >
                    {getStatusLabel(document.status)}
                  </Badge>
                </TableCell>

                <TableCell className='px-6 py-4'>
                  <p className='text-sm text-foreground dark:text-muted-foreground'>
                    {formatDate(document.uploaded_at)}
                  </p>
                </TableCell>

                <TableCell className='px-6 py-4'>
                  <div className='flex items-center gap-2'>
                    {(document.status === 'complete' || document.status === 'needs_review' || document.status === 'in_review') && (
                      <Link href={`/dashboard/doc-intel/${document.id}`}>
                        <Button
                          variant='ghost'
                          size='sm'
                          className='h-8 w-8 p-0'
                          title='Review document'
                        >
                          <Eye className='h-4 w-4' />
                        </Button>
                      </Link>
                    )}
                    <Button
                      variant='ghost'
                      size='sm'
                      className='h-8 w-8 p-0'
                      title='Download document'
                      onClick={() => {
                        // TODO: Implement download functionality
                        console.log('Download document:', document.id);
                      }}
                    >
                      <Download className='h-4 w-4' />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          {!isLoading && documents && documents.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={tableColumns.length}
                className='py-8 text-center'
              >
                <div className='flex flex-col items-center justify-center space-y-2'>
                  <FileText className='h-8 w-8 text-muted-foreground' />
                  <p className='text-sm text-muted-foreground'>No documents found</p>
                  <p className='text-xs text-muted-foreground'>Upload a document to get started</p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}