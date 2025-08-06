'use client';

import { useCallback, useEffect, useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from '@/components/ui/pagination';
import { Search, Filter } from 'lucide-react';
import {
  SelectItem,
  SelectContent,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useGetCases } from '@/hooks/useCases';
import { useDebounce } from '@/hooks/use-debounce';
import { useSearchParams, useRouter } from 'next/navigation';
import queryString from 'query-string';
import { CasesTable } from '@/features/cases/cases-table';

export default function CasesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [queryParams, setQueryParams] = useState({
    type: searchParams.get('type') || 'all',
    page: parseInt(searchParams.get('page') || '1'),
    search: searchParams.get('search') || '',
    status: searchParams.get('status') || 'all',
    sortBy: searchParams.get('sortBy') || 'claimant',
    order: searchParams.get('order') || 'asc'
  });

  const debouncedSearchValue = useDebounce(queryParams.search, 1000);

  const handleChangeSort = (sort: string) => {
    setQueryParams({
      ...queryParams,
      sortBy: queryParams.sortBy === sort ? 'claimant' : sort,
      order:
        queryParams.sortBy === sort
          ? queryParams.order === 'asc'
            ? 'desc'
            : 'asc'
          : 'asc'
    });
  };

  const { data: casesData, isLoading: casesLoading } = useGetCases(
    queryParams.type,
    queryParams.page,
    debouncedSearchValue,
    queryParams.status,
    queryParams.sortBy,
    queryParams.order
  );

  const casesTotal = casesData?.total;
  const itemsPerPage = 5;

  useEffect(() => {
    setQueryParams({
      ...queryParams,
      type: searchParams.get('type') || 'all'
    });
  }, [searchParams.get('type')]);

  useEffect(() => {
    setQueryParams({
      ...queryParams,
      page: 1
    });
  }, [
    debouncedSearchValue,
    queryParams.status,
    queryParams.sortBy,
    queryParams.order
  ]);

  useEffect(() => {
    router.push(`/dashboard/cases?${queryString.stringify(queryParams)}`);
  }, [
    debouncedSearchValue,
    queryParams.status,
    queryParams.sortBy,
    queryParams.order,
    queryParams.page,
    queryParams.type
  ]);

  const totalPages = Math.ceil((casesTotal || 0) / itemsPerPage);

  const getPageNumbers = useMemo(() => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is 5 or less
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show 5 pages with ellipsis
      if (queryParams.page <= 3) {
        // Show first 5 pages
        for (let i = 1; i <= 5; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (queryParams.page >= totalPages - 2) {
        // Show last 5 pages
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // Show current page with 2 pages on each side
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

  const handlePageChange = useCallback(
    (page: number) => {
      setQueryParams({
        ...queryParams,
        page
      });
    },
    [queryParams]
  );

  const handlePreviousPage = useCallback(() => {
    if (queryParams.page > 1) {
      setQueryParams({
        ...queryParams,
        page: queryParams.page - 1
      });
    }
  }, [queryParams]);

  const handleNextPage = useCallback(() => {
    if (queryParams.page < totalPages) {
      setQueryParams({
        ...queryParams,
        page: queryParams.page + 1
      });
    }
  }, [queryParams, totalPages]);

  return (
    <div className='min-h-screen bg-gray-50 p-8'>
      <div className='mx-auto max-w-7xl'>
        {/* Page Header */}
        <div className='mb-8'>
          <h1 className='mb-2 text-3xl font-bold text-gray-900'>
            {queryParams.type === 'imva'
              ? 'IMVA'
              : queryParams.type === 'solar'
                ? 'Solar cases'
                : 'Litigation'}
          </h1>
        </div>

        {/* Search and Filter Bar */}
        <div className='border-border bg-card mb-6 rounded-xl border p-6 shadow-sm'>
          <div className='flex flex-col items-start gap-4 sm:flex-row sm:items-center'>
            {/* Search Input */}
            <div className='relative max-w-md flex-1'>
              <Search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform' />
              <Input
                type='text'
                placeholder='Find by keyword or number'
                value={queryParams.search}
                onChange={(e) =>
                  setQueryParams({
                    ...queryParams,
                    search: e.target.value
                  })
                }
                className='border-input focus:ring-ring w-full rounded-lg border py-2.5 pr-4 pl-10 text-sm focus:border-transparent focus:ring-2'
              />
            </div>

            {/* Filter Dropdown */}
            {queryParams.type !== 'imva' && (
              <Select
                onValueChange={(value) =>
                  setQueryParams({
                    ...queryParams,
                    status: value
                  })
                }
                value={queryParams.status}
              >
                <SelectTrigger className='flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50'>
                  <Filter className='h-4 w-4 text-gray-500' />
                  <SelectValue placeholder='Select a filter' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All Cases</SelectItem>
                  <SelectItem value='active'>Active</SelectItem>
                  <SelectItem value='inactive'>Inactive</SelectItem>
                  <SelectItem value='settled'>Settled</SelectItem>
                  <SelectItem value='awarded'>Awarded</SelectItem>
                  <SelectItem value='closed'>Closed</SelectItem>
                </SelectContent>
              </Select>
            )}
            {queryParams.type === 'imva' && (
              <>
                <Select value='all-documents'>
                  <SelectTrigger className='flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50'>
                    <Filter className='h-4 w-4 text-gray-500' />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all-documents'>All Documents</SelectItem>
                  </SelectContent>
                </Select>
                <Select value='viewing-privilege'>
                  <SelectTrigger className='flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50'>
                    <Filter className='h-4 w-4 text-gray-500' />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='viewing-privilege'>
                      Viewing Privilege
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Select value='document-group'>
                  <SelectTrigger className='flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50'>
                    <Filter className='h-4 w-4 text-gray-500' />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='document-group'>
                      Document Group
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Select value='document-type'>
                  <SelectTrigger className='flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50'>
                    <Filter className='h-4 w-4 text-gray-500' />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='document-type'>Document Type</SelectItem>
                  </SelectContent>
                </Select>
                <Select value='hearing-exhibits'>
                  <SelectTrigger className='flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50'>
                    <Filter className='h-4 w-4 text-gray-500' />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='hearing-exhibits'>
                      Hearing Exhibits
                    </SelectItem>
                  </SelectContent>
                </Select>
              </>
            )}
          </div>
        </div>

        {/* Cases Table */}
        <CasesTable
          cases={casesData?.cases || []}
          isLoading={casesLoading}
          onChangeSort={handleChangeSort}
        />
        {/* Table Footer */}
        <div className='text-muted-foreground mt-6 flex items-center justify-between text-sm'>
          <div className='flex items-center gap-4'>
            {casesTotal && casesTotal > 0 ? (
              <p>
                Showing{' '}
                {casesTotal ? (queryParams.page - 1) * itemsPerPage + 1 : 0} -{' '}
                {casesTotal
                  ? casesTotal > queryParams.page * itemsPerPage
                    ? queryParams.page * itemsPerPage
                    : casesTotal
                  : 0}{' '}
                of {casesTotal || 0} cases
              </p>
            ) : null}
          </div>

          <div>
            {totalPages > 1 && (
              <Pagination>
                <PaginationContent>
                  <PaginationItem className='cursor-pointer'>
                    <PaginationPrevious
                      onClick={handlePreviousPage}
                      className={cn(
                        'border-muted-foreground cursor-pointer border',
                        queryParams.page <= 1
                          ? 'pointer-events-none opacity-50'
                          : ''
                      )}
                    />
                  </PaginationItem>
                  {getPageNumbers.map((page, index) => (
                    <PaginationItem key={index} className='cursor-pointer'>
                      <PaginationLink
                        onClick={() => handlePageChange(page as number)}
                        isActive={queryParams.page === page}
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem className='cursor-pointer'>
                    <PaginationNext
                      onClick={handleNextPage}
                      className={cn(
                        'border-muted-foreground cursor-pointer border',
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
      </div>
    </div>
  );
}
