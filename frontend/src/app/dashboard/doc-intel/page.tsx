'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Heading } from '@/components/ui/heading';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from '@/components/ui/pagination';
import { Search, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDocuments } from '@/hooks/useDocIntel';
import { useDebounce } from '@/hooks/use-debounce';
import { DocumentsTable } from '@/features/doc-intel/documents-table';
import { DocumentUpload } from '@/features/doc-intel/document-upload';
import { DocumentStatus } from '@/types/doc-intel';

export default function DocIntelPage() {
  const [queryParams, setQueryParams] = useState({
    page: 1,
    search: '',
    status: 'all' as DocumentStatus | 'all',
    sortBy: 'uploaded_at',
    order: 'desc' as 'asc' | 'desc'
  });

  const debouncedSearchValue = useDebounce(queryParams.search, 500);
  const itemsPerPage = 10;

  // Fetch documents with current filters
  const documentsQuery = useDocuments({
    limit: itemsPerPage,
    offset: (queryParams.page - 1) * itemsPerPage,
    search: debouncedSearchValue || undefined,
    status: queryParams.status === 'all' ? undefined : queryParams.status
  });

  const documents = documentsQuery.data?.documents || [];
  const totalDocuments = documentsQuery.data?.total || 0;
  const totalPages = Math.ceil(totalDocuments / itemsPerPage);

  // Handle sorting
  const handleChangeSort = useCallback((sort: string) => {
    setQueryParams(prev => ({
      ...prev,
      sortBy: sort,
      order: prev.sortBy === sort ? (prev.order === 'asc' ? 'desc' : 'asc') : 'asc'
    }));
  }, []);

  // Handle pagination
  const handlePageChange = useCallback((page: number) => {
    setQueryParams(prev => ({ ...prev, page }));
  }, []);

  const handlePreviousPage = useCallback(() => {
    if (queryParams.page > 1) {
      setQueryParams(prev => ({ ...prev, page: prev.page - 1 }));
    }
  }, [queryParams.page]);

  const handleNextPage = useCallback(() => {
    if (queryParams.page < totalPages) {
      setQueryParams(prev => ({ ...prev, page: prev.page + 1 }));
    }
  }, [queryParams.page, totalPages]);

  // Generate page numbers for pagination
  const getPageNumbers = useMemo(() => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (queryParams.page <= 3) {
        for (let i = 1; i <= 5; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (queryParams.page >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = queryParams.page - 1; i <= queryParams.page + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  }, [queryParams.page, totalPages]);

  // Handle upload complete
  const handleUploadComplete = useCallback(() => {
    documentsQuery.refetch();
  }, [documentsQuery]);

  // Reset page when search/filter changes
  useEffect(() => {
    setQueryParams(prev => ({ ...prev, page: 1 }));
  }, [debouncedSearchValue, queryParams.status]);

  return (
    <div className='min-h-screen bg-background p-8'>
      <div className='mx-auto max-w-7xl'>
        {/* Page Header */}
        <div className='mb-8'>
          <Heading
            title="Document Intelligence"
            description="AI-powered document analysis and insights extraction"
          />
        </div>
        <Separator className="mb-6" />

        <Tabs defaultValue="documents" className="space-y-6">
          <TabsList>
            <TabsTrigger value="documents">Document Library</TabsTrigger>
            <TabsTrigger value="upload">Upload Documents</TabsTrigger>
          </TabsList>

          <TabsContent value="documents" className="space-y-6">
            {/* Search and Filter Bar */}
            <div className='border-border bg-card rounded-xl border p-6 shadow'>
              <div className='flex flex-col items-start gap-4 sm:flex-row sm:items-center'>
                {/* Search Input */}
                <div className='relative max-w-md flex-1'>
                  <Search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform' />
                  <Input
                    type='text'
                    placeholder='Search documents by filename...'
                    value={queryParams.search}
                    onChange={(e) =>
                      setQueryParams(prev => ({
                        ...prev,
                        search: e.target.value
                      }))
                    }
                    className='border-input focus:ring-ring w-full rounded-lg border py-2.5 pr-4 pl-10 text-sm focus:border-transparent focus:ring-2'
                  />
                </div>

                {/* Status Filter */}
                <Select
                  onValueChange={(value) =>
                    setQueryParams(prev => ({
                      ...prev,
                      status: value as DocumentStatus | 'all'
                    }))
                  }
                  value={queryParams.status}
                >
                  <SelectTrigger className='flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent/60 hover:text-accent-foreground min-w-[150px]'>
                    <Filter className='h-4 w-4 text-muted-foreground' />
                    <SelectValue placeholder='Filter by status' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>All Documents</SelectItem>
                    <SelectItem value='complete'>Complete</SelectItem>
                    <SelectItem value='processing'>Processing</SelectItem>
                    <SelectItem value='needs_review'>Needs Review</SelectItem>
                    <SelectItem value='in_review'>In Review</SelectItem>
                    <SelectItem value='failed'>Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Documents Table */}
            <DocumentsTable
              documents={documents}
              isLoading={documentsQuery.isLoading}
              onChangeSort={handleChangeSort}
              queryParams={queryParams}
            />

            {/* Pagination */}
            <div className='mt-6 flex items-center justify-between text-sm text-foreground'>
              <div className='flex items-center gap-4'>
                {totalDocuments > 0 && (
                  <p>
                    Showing{' '}
                    {(queryParams.page - 1) * itemsPerPage + 1} -{' '}
                    {Math.min(queryParams.page * itemsPerPage, totalDocuments)}{' '}
                    of {totalDocuments} documents
                  </p>
                )}
              </div>

              <div>
                {totalPages > 1 && (
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem className='cursor-pointer'>
                        <PaginationPrevious
                          onClick={handlePreviousPage}
                          className={cn(
                            'border-border cursor-pointer border bg-background',
                            queryParams.page <= 1
                              ? 'pointer-events-none opacity-50'
                              : ''
                          )}
                        />
                      </PaginationItem>
                      {getPageNumbers.map((page, index) => (
                        <PaginationItem
                          key={index}
                          className={cn(
                            'cursor-pointer',
                            typeof page !== 'number' && 'pointer-events-none opacity-60'
                          )}
                        >
                          <PaginationLink
                            onClick={
                              typeof page === 'number' 
                                ? () => handlePageChange(page as number) 
                                : undefined
                            }
                            isActive={queryParams.page === page}
                            className={cn(
                              'bg-background',
                              queryParams.page === page
                                ? 'bg-accent text-accent-foreground font-semibold'
                                : 'hover:bg-accent/60'
                            )}
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem className='cursor-pointer'>
                        <PaginationNext
                          onClick={handleNextPage}
                          className={cn(
                            'border-border cursor-pointer border bg-background',
                            queryParams.page >= totalPages
                              ? 'pointer-events-none opacity-50'
                              : ''
                          )}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="upload" className="space-y-6">
            <DocumentUpload onUploadComplete={handleUploadComplete} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}