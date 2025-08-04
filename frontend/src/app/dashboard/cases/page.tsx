'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from '@/components/ui/pagination';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  FolderOpen,
  Search,
  Eye,
  FileText,
  ChevronDown,
  Loader2,
  ChevronUp
} from 'lucide-react';
import Link from 'next/link';
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

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800';
    case 'settled (in...)':
      return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800';
    case 'awarded':
      return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-400 dark:border-purple-800';
    case 'inactive':
      return 'bg-muted text-muted-foreground border-border';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
};

export default function CasesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [queryParams, setQueryParams] = useState({
    type: searchParams.get('type') || 'all',
    page: parseInt(searchParams.get('page') || '1'),
    search: searchParams.get('search') || '',
    status: searchParams.get('status') || 'all',
    sort: searchParams.get('sort') || 'asc'
  });

  const debouncedSearchValue = useDebounce(queryParams.search, 1000);

  const { data: casesData, isLoading: casesLoading } = useGetCases(
    queryParams.type,
    queryParams.page,
    debouncedSearchValue,
    queryParams.status,
    queryParams.sort
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
  }, [debouncedSearchValue, queryParams.status, queryParams.sort]);

  useEffect(() => {
    router.push(`/dashboard/cases?${queryString.stringify(queryParams)}`);
  }, [
    debouncedSearchValue,
    queryParams.status,
    queryParams.sort,
    queryParams.page,
    queryParams.type
  ]);

  const totalPages = Math.ceil((casesTotal || 0) / itemsPerPage);

  const getPageNumbers = useCallback(() => {
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
    <div className='bg-background max-h-[calc(100vh-100px)] min-h-screen overflow-y-auto p-8'>
      <div className='mx-auto max-w-7xl'>
        {/* Page Header */}
        <div className='mb-8 flex items-center justify-between'>
          <h1 className='text-foreground mb-2 text-3xl font-bold'>
            {queryParams.type === 'imva'
              ? 'IMVA'
              : queryParams.type === 'solar'
                ? 'Solar Cases'
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
            <Select
              onValueChange={(value) =>
                setQueryParams({
                  ...queryParams,
                  status: value
                })
              }
              value={queryParams.status}
            >
              <SelectTrigger>
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
          </div>
        </div>

        {/* Cases Table */}
        <div className='border-border bg-card overflow-hidden rounded-xl border shadow-sm'>
          {/* Table Header */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className='py-4'>
                  <Button
                    className='hover:text-foreground m-auto flex cursor-pointer items-center gap-1 transition-colors'
                    variant='ghost'
                    onClick={() =>
                      setQueryParams({
                        ...queryParams,
                        sort: queryParams.sort === 'asc' ? 'desc' : 'asc'
                      })
                    }
                  >
                    Claimant
                    {queryParams.sort === 'asc' ? (
                      <ChevronDown className='h-3 w-3' />
                    ) : (
                      <ChevronUp className='h-3 w-3' />
                    )}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    className='hover:text-foreground m-auto flex items-center gap-1 transition-colors'
                    variant='ghost'
                  >
                    Case Number
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    className='hover:text-foreground m-auto flex items-center gap-1 transition-colors'
                    variant='ghost'
                  >
                    Status
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    className='hover:text-foreground m-auto flex items-center gap-1 transition-colors'
                    variant='ghost'
                  >
                    Respondent
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    className='hover:text-foreground m-auto flex items-center gap-1 transition-colors'
                    variant='ghost'
                  >
                    Case Manager
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    className='hover:text-foreground m-auto flex items-center gap-1 transition-colors'
                    variant='ghost'
                  >
                    Next Event
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    className='hover:text-foreground m-auto flex items-center gap-1 transition-colors'
                    variant='ghost'
                  >
                    Tasks
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    className='hover:text-foreground m-auto flex items-center gap-1 transition-colors'
                    variant='ghost'
                  >
                    Docs
                  </Button>
                </TableHead>
              </TableRow>
            </TableHeader>
            {/* Table Body */}
            <TableBody>
              {casesLoading && (
                <TableRow>
                  <TableCell colSpan={10} className='text-center'>
                    <Loader2 className='text-muted-foreground h-4 w-4 animate-spin' />
                  </TableCell>
                </TableRow>
              )}
              {!casesLoading &&
                casesData?.cases?.map((caseItem) => (
                  <TableRow key={caseItem.id}>
                    {/* Claimant */}
                    <TableCell className='py-4 text-center'>
                      <Link
                        href={`/dashboard/cases/${caseItem.id}`}
                        className='flex items-center justify-center text-left text-sm font-medium text-blue-500 underline hover:text-blue-600'
                      >
                        {caseItem.claimant}
                      </Link>
                    </TableCell>

                    {/* Case Number */}
                    <TableCell className='py-4 text-center'>
                      <p className='text-foreground text-sm font-medium'>
                        {caseItem.case_number}
                      </p>
                    </TableCell>

                    {/* Status */}
                    <TableCell className='py-4 text-center'>
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium',
                          getStatusColor(caseItem.status)
                        )}
                      >
                        {caseItem.status}
                      </span>
                    </TableCell>

                    {/* Respondent */}
                    <TableCell className='py-4 text-center'>
                      <p className='text-muted-foreground text-sm'>
                        {caseItem.respondent}
                      </p>
                    </TableCell>

                    {/* Case Manager */}
                    <TableCell className='py-4 text-center'>
                      <Button
                        className='text-sm text-blue-500 underline hover:text-blue-600'
                        variant='ghost'
                      >
                        {caseItem.case_manager}
                      </Button>
                    </TableCell>

                    {/* Next Event */}
                    <TableCell className='py-4 text-center'>
                      <p className='text-muted-foreground text-sm'>N/A</p>
                    </TableCell>

                    {/* Tasks */}
                    <TableCell className='py-4 text-center'>
                      <div className='relative inline-block'>
                        <Eye className='text-muted-foreground h-5 w-5' />
                        <Badge
                          className='absolute -top-1.5 -right-1.5 h-3 w-3 rounded-full p-1 text-xs font-medium'
                          variant='destructive'
                        >
                          {caseItem.case_tasks_count || 0}
                        </Badge>
                      </div>
                    </TableCell>

                    {/* Docs */}
                    <TableCell className='py-4 text-center'>
                      <div className='relative inline-block'>
                        <FileText className='text-muted-foreground h-5 w-5' />
                        <Badge
                          className='absolute -top-1.5 -right-1.5 h-3 w-3 rounded-full p-1 text-xs font-medium'
                          variant='destructive'
                        >
                          {caseItem.documents_count || 0}
                        </Badge>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
        {/* Table Footer */}
        <div className='text-muted-foreground mt-6 flex items-center justify-between text-sm'>
          <div className='flex items-center gap-4'>
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
                  {getPageNumbers().map((page, index) => (
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
