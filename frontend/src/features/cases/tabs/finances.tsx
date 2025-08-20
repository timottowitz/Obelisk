'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import InvoiceModal from './components/invoice-modal';
import ExpenseCard from './components/expense-card';
import ExpenseTable from './components/expense-table';
import { useExpenses } from '@/hooks/useExpenses';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Expense } from '@/types/expenses';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from '@/components/ui/pagination';
import { cn } from '@/lib/utils';

export default function Finances({ caseId }: { caseId: string }) {
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [view, setView] = useState<'cards' | 'compact'>('cards');
  const [searchValue, setSearchValue] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filterBy, setFilterBy] = useState(
    searchParams.get('filterBy') || 'all'
  );

  const [queryParams, setQueryParams] = useState({
    filterBy: searchParams.get('filterBy') || 'all',
    filterValue: searchParams.get('filterValue') || '',
    sortBy: searchParams.get('sortBy') || 'created_date',
    sortDir: searchParams.get('sortDir') || 'desc',
    page: Number(searchParams.get('page')) || 1
  });

  const { data: expenses, isLoading } = useExpenses(
    caseId,
    queryParams.filterBy,
    queryParams.filterValue,
    queryParams.sortBy,
    queryParams.sortDir,
    queryParams.page
  );

  const totalPages = Math.ceil((expenses?.total || 0) / 5);
  const totalAmount = expenses?.totalAmount || 0;

  const pageNumbers = useMemo(() => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (queryParams.page <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (queryParams.page >= totalPages - 3) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = queryParams.page - 1; i <= queryParams.page + 1; i++)
          pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  }, [totalPages, queryParams.page]);
  useEffect(() => {
    router.push(
      `?filterBy=${queryParams.filterBy}&filterValue=${queryParams.filterValue}&sortBy=${queryParams.sortBy}&sortDir=${queryParams.sortDir}&page=${queryParams.page}`
    );
  }, [
    queryParams.filterBy,
    queryParams.filterValue,
    queryParams.sortBy,
    queryParams.sortDir,
    queryParams.page
  ]);

  useEffect(() => {
    setQueryParams({
      ...queryParams,
      page: 1
    });
  }, [
    queryParams.filterBy,
    queryParams.filterValue,
    queryParams.sortBy,
    queryParams.sortDir
  ]);

  return (
    <div className='space-y-6'>
      <div className='bg-card flex flex-wrap items-center gap-3 rounded-md border p-3'>
        {/* Add Item */}
        <Button
          size='sm'
          onClick={() => setIsInvoiceModalOpen(true)}
          className='cursor-pointer bg-emerald-600 text-white hover:bg-emerald-700'
          aria-label='Add an item'
        >
          + Add an Item
        </Button>

        {/* Filter by */}
        <div className='flex items-center gap-2'>
          <span className='text-muted-foreground text-sm'>Filter by</span>
          <div className='relative'>
            <Select
              value={filterBy}
              onValueChange={(value) => setFilterBy(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder='Filter by' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All</SelectItem>
                <SelectItem value='expense_type'>Expense Type</SelectItem>
                <SelectItem value='payee'>Entity Being Paid</SelectItem>
                <SelectItem value='type'>Type</SelectItem>
                <SelectItem value='invoice_number'>Invoice Number</SelectItem>
                <SelectItem value='attachment'>Invoice Attachment</SelectItem>
                <SelectItem value='invoice_date'>Date of Invoice</SelectItem>
                <SelectItem value='due_date'>Due Date</SelectItem>
                <SelectItem value='bill_no'>Bill No</SelectItem>
                <SelectItem value='description'>Expense Description</SelectItem>
                <SelectItem value='memo'>Memo</SelectItem>
                <SelectItem value='notes'>Notes</SelectItem>
                <SelectItem value='notify_admin'>Notify Admin</SelectItem>
                <SelectItem value='create_in_quickbooks'>
                  Create in Quickbooks
                </SelectItem>
                <SelectItem value='create_billing_item'>
                  Create Billing Item
                </SelectItem>
                <SelectItem value='date_of_check'>Date of Check</SelectItem>
                <SelectItem value='check_number'>Check Number</SelectItem>
                <SelectItem value='last_updated_from_quickbooks'>
                  Last Updated from Quickbooks
                </SelectItem>
                <SelectItem value='copy_of_check'>Copy of Check</SelectItem>
                <SelectItem value='status'>Status</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Search */}
        <div className='relative max-w-[300px] min-w-[220px] flex-1'>
          <Search
            className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2'
            aria-hidden
          />
          <Input
            placeholder='Filter items'
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className='pl-9'
            aria-label='Filter items'
          />
          <X
            className='absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 cursor-pointer'
            onClick={() => {
              setSearchValue('');
              setQueryParams({
                ...queryParams,
                filterValue: ''
              });
            }}
          />
        </div>

        {/* Apply */}
        <Button
          size='sm'
          className='cursor-pointer bg-emerald-600 text-white hover:bg-emerald-700'
          aria-label='Apply filters'
          onClick={() =>
            setQueryParams({
              ...queryParams,
              filterValue: searchValue,
              filterBy: filterBy
            })
          }
        >
          ✓
        </Button>

        {/* Sort by */}
        <div className='flex items-center gap-2'>
          <span className='text-muted-foreground text-sm'>Sort by</span>
          <div className='relative'>
            <Select
              value={queryParams.sortBy}
              onValueChange={(value) =>
                setQueryParams({ ...queryParams, sortBy: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder='Sort by' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='created_date'>Created Date</SelectItem>
                <SelectItem value='expense_type'>Expense Type</SelectItem>
                <SelectItem value='payee'>Entity Being Paid</SelectItem>
                <SelectItem value='amount'>Amount</SelectItem>
                <SelectItem value='type'>Type</SelectItem>
                <SelectItem value='invoice_number'>Invoice Number</SelectItem>
                <SelectItem value='attachment'>Invoice Attachment</SelectItem>
                <SelectItem value='invoice_date'>Date of Invoice</SelectItem>
                <SelectItem value='due_date'>Due Date</SelectItem>
                <SelectItem value='bill_no'>Bill No</SelectItem>
                <SelectItem value='description'>Expense Description</SelectItem>
                <SelectItem value='memo'>Memo</SelectItem>
                <SelectItem value='notes'>Notes</SelectItem>
                <SelectItem value='create_in_quickbooks'>
                  Create in Quickbooks
                </SelectItem>
                <SelectItem value='create_billing_item'>
                  Create Billing Item
                </SelectItem>
                <SelectItem value='status'>Status</SelectItem>
                <SelectItem value='date_of_check'>Date of Check</SelectItem>
                <SelectItem value='check_number'>Check Number</SelectItem>
                <SelectItem value='last_update_from_quickbooks'>
                  Last Updated from Quickbooks
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Sort direction toggle */}
        <div className='flex items-center gap-1'>
          <Button
            variant='outline'
            size='icon'
            onClick={() =>
              setQueryParams({
                ...queryParams,
                sortDir: queryParams.sortDir === 'asc' ? 'desc' : 'asc'
              })
            }
            aria-label='Ascending'
            title='Ascending'
            className='cursor-pointer'
          >
            {queryParams.sortDir === 'asc' ? 'A↑' : 'Z↓'}
          </Button>
        </div>

        {/* View toggle */}
        <div className='flex items-center gap-1'>
          <Button
            variant={view === 'cards' ? 'default' : 'outline'}
            size='icon'
            onClick={() => setView('cards')}
            aria-label='Cards view'
            title='Cards view'
            className='cursor-pointer'
          >
            ▢
          </Button>
          <Button
            variant={view === 'compact' ? 'default' : 'outline'}
            size='icon'
            onClick={() => setView('compact')}
            aria-label='Compact view'
            title='Compact view'
            className='cursor-pointer'
          >
            ≡
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className='flex h-full animate-pulse items-center justify-center'>
          Loading...
        </div>
      )}

      {/* Compact Table View */}
      {view === 'compact' && (
        <div className='bg-card rounded-md border'>
          <ExpenseTable rows={expenses?.data || []} totalAmount={totalAmount} />
        </div>
      )}

      {/* Cards View */}
      {view === 'cards' && (
        <div className='space-y-2'>
          <p className='text-foreground pb-0 text-right text-lg font-semibold'>
            ${totalAmount.toLocaleString()}
          </p>
          {expenses &&
            expenses?.data.map((item: Expense) => (
              <ExpenseCard key={item.id} item={item} />
            ))}
        </div>
      )}
      {/* Pagination */}
      {totalPages > 1 && (
        <div className='flex items-center justify-between'>
          <p className='text-muted-foreground text-sm'>
            Showing {(queryParams.page - 1) * 5 + 1}-
            {Math.min(queryParams.page * 5, expenses?.total || 0)} of{' '}
            {expenses?.total || 0} tasks
          </p>

          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() =>
                    setQueryParams({
                      ...queryParams,
                      page: Math.max(1, queryParams.page - 1)
                    })
                  }
                  className={cn(
                    'cursor-pointer rounded-lg px-3 transition-all duration-200',
                    queryParams.page === 1 && 'pointer-events-none opacity-50'
                  )}
                />
              </PaginationItem>

              {pageNumbers.map((page, index) => (
                <PaginationItem key={index}>
                  {page === '...' ? (
                    <span className='text-muted-foreground cursor-pointer px-3 py-2 text-sm'>
                      ...
                    </span>
                  ) : (
                    <PaginationLink
                      onClick={() =>
                        setQueryParams({ ...queryParams, page: Number(page) })
                      }
                      isActive={queryParams.page === Number(page)}
                      className='cursor-pointer rounded-lg px-3 transition-all duration-200'
                    >
                      {page}
                    </PaginationLink>
                  )}
                </PaginationItem>
              ))}

              <PaginationItem>
                <PaginationNext
                  onClick={() =>
                    setQueryParams({
                      ...queryParams,
                      page: Math.min(totalPages, queryParams.page + 1)
                    })
                  }
                  className={cn(
                    'cursor-pointer rounded-lg px-3 transition-all duration-200',
                    queryParams.page === totalPages &&
                      'pointer-events-none opacity-50'
                  )}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      <InvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        caseId={caseId}
      />
    </div>
  );
}
