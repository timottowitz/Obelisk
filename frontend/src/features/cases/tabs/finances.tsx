'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import InvoiceModal from './components/invoice-modal';
import ExpenseCard from './components/expense-card';
import ExpenseTable from './components/expense-table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

const mockExpenseItems = [
  {
    createdAt: '3/14/2025 at 9:58 AM',
    amountDisplay: '$1,815.00',
    expenseType: 'Bill',
    payee: {
      name: 'White Horse Group LLC',
      contactPerson: 'Steve Herrera',
      phone: '2143940259',
      email: 'white-horse@sbcglobal.net',
      addressLine: '1024 Carmody, Mesquite, TX 75149'
    },
    invoiceNumber: '2501004',
    invoiceAttachment: {
      name: '2025.03.07- Invoice 2501004- Courtroom Setup D...'
    },
    dateOfInvoice: '3/7/2025',
    dueDate: '4/7/2025',
    expenseDescription:
      'Court Room Set up, Days in Court and Courtroom Tear Down',
    createInQuickbooks: 'Yes' as const,
    createBillingItem: 'No' as const,
    status: 'Deleted',
    lastUpdatedFromQuickbooks: '4/1/2025 at 12:57pm (MDT)'
  }
];
export default function Finances({ caseId }: { caseId: string }) {
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [view, setView] = useState<'cards' | 'compact'>('cards');
  const [searchValue, setSearchValue] = useState('');

  const [queryParams, setQueryParams] = useState({
    filterBy: 'all',
    filterValue: '',
    sortBy: 'created_date',
    sortDir: 'desc'
  });

  return (
    <div className='space-y-6'>
      <div className='bg-card flex flex-wrap items-center gap-3 rounded-md border p-3'>
        {/* Add Item */}
        <Button
          size='sm'
          onClick={() => setIsInvoiceModalOpen(true)}
          className='bg-emerald-600 text-white hover:bg-emerald-700'
          aria-label='Add an item'
        >
          + Add an Item
        </Button>

        {/* Filter by */}
        <div className='flex items-center gap-2'>
          <span className='text-muted-foreground text-sm'>Filter by</span>
          <div className='relative'>
            <Select
              value={queryParams.filterBy}
              onValueChange={(value) =>
                setQueryParams({ ...queryParams, filterBy: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder='Filter by' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All</SelectItem>
                <SelectItem value='expense_type'>Expense Type</SelectItem>
                <SelectItem value='entity_being_paid'>
                  Entity Being Paid
                </SelectItem>
                <SelectItem value='type'>Type</SelectItem>
                <SelectItem value='invoice_number'>Invoice Number</SelectItem>
                <SelectItem value='invoice_attachment'>
                  Invoice Attachment
                </SelectItem>
                <SelectItem value='date_of_invoice'>Date of Invoice</SelectItem>
                <SelectItem value='due_date'>Due Date</SelectItem>
                <SelectItem value='bill_no'>Bill No</SelectItem>
                <SelectItem value='expense_description'>
                  Expense Description
                </SelectItem>
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
        </div>

        {/* Apply */}
        <Button
          size='sm'
          className='bg-emerald-600 text-white hover:bg-emerald-700'
          aria-label='Apply filters'
          onClick={() =>
            setQueryParams({
              ...queryParams,
              filterValue: searchValue
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
                <SelectItem value='entity_being_paid'>
                  Entity Being Paid
                </SelectItem>
                <SelectItem value='type'>Type</SelectItem>
                <SelectItem value='invoice_number'>Invoice Number</SelectItem>
                <SelectItem value='invoice_attachment'>
                  Invoice Attachment
                </SelectItem>
                <SelectItem value='date_of_invoice'>Date of Invoice</SelectItem>
                <SelectItem value='due_date'>Due Date</SelectItem>
                <SelectItem value='bill_no'>Bill No</SelectItem>
                <SelectItem value='expense_description'>
                  Expense Description
                </SelectItem>
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
          >
            ▢
          </Button>
          <Button
            variant={view === 'compact' ? 'default' : 'outline'}
            size='icon'
            onClick={() => setView('compact')}
            aria-label='Compact view'
            title='Compact view'
          >
            ≡
          </Button>
        </div>
      </div>

      {/* Compact Table View */}
      {view === 'compact' && (
        <div className='bg-card rounded-md border'>
          <ExpenseTable rows={mockExpenseItems} />
        </div>
      )}

      {/* Cards View */}
      {view === 'cards' && (
        <div className='space-y-6'>
          {mockExpenseItems.map((item) => (
            <ExpenseCard key={item.createdAt} item={item} />
          ))}
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
