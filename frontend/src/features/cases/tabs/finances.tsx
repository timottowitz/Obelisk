'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import InvoiceModal from './components/invoice-modal';
import ExpenseCard from './components/expense-card';
import ExpenseTable from './components/expense-table';
export default function Finances({ caseId }: { caseId: string }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [filterBy, setFilterBy] = useState<
    'all' | 'bill' | 'soft_costs' | 'credit_card' | 'check'
  >('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'status'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [view, setView] = useState<'cards' | 'compact'>('cards');

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
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value as any)}
              className='border-input bg-background rounded-md border px-3 py-2 text-sm'
              aria-label='Filter by type'
            >
              <option value='all'>All</option>
              <option value='bill'>Bill</option>
              <option value='credit_card'>Credit Card</option>
              <option value='check'>Check</option>
              <option value='soft_costs'>Soft Costs</option>
            </select>
          </div>
        </div>

        {/* Search */}
        <div className='relative min-w-[220px] max-w-[300px] flex-1'>
          <Search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' aria-hidden />
          <Input
            placeholder='Filter items'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className='pl-9'
            aria-label='Filter items'
          />
        </div>

        {/* Apply */}
        <Button
          size='sm'
          className='bg-emerald-600 text-white hover:bg-emerald-700'
          aria-label='Apply filters'
        >
          ✓
        </Button>

        {/* Sort by */}
        <div className='flex items-center gap-2'>
          <span className='text-muted-foreground text-sm'>Sort by</span>
          <div className='relative'>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className='border-input bg-background rounded-md border px-3 py-2 text-sm'
              aria-label='Sort by'
            >
              <option value='date'>Date of Invoice</option>
              <option value='amount'>Amount</option>
              <option value='status'>Status</option>
            </select>
          </div>
        </div>

        {/* Sort direction toggle */}
        <div className='flex items-center gap-1'>
          <Button
            variant={sortDir === 'asc' ? 'default' : 'outline'}
            size='icon'
            onClick={() => setSortDir('asc')}
            aria-label='Ascending'
            title='Ascending'
          >
            A↑
          </Button>
          <Button
            variant={sortDir === 'desc' ? 'default' : 'outline'}
            size='icon'
            onClick={() => setSortDir('desc')}
            aria-label='Descending'
            title='Descending'
          >
            Z↓
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
        <div className='rounded-md border bg-card'>
          <ExpenseTable />
        </div>
      )}

      {/* Cards View */}
      {view === 'cards' && (
        <div className='space-y-6'>
          <ExpenseCard
            createdAt='3/14/2025 at 9:58 AM'
            amountDisplay='$1,815.00'
            expenseType='Bill'
            payee={{
              name: 'White Horse Group LLC',
              contactPerson: 'Steve Herrera',
              phone: '2143940259',
              email: 'white-horse@sbcglobal.net',
              addressLine: '1024 Carmody, Mesquite, TX 75149'
            }}
            invoiceNumber='2501004'
            invoiceAttachment={{
              name: '2025.03.07- Invoice 2501004- Courtroom Setup D...'
            }}
            dateOfInvoice='3/7/2025'
            dueDate='4/7/2025'
            expenseDescription='Court Room Set up, Days in Court and Courtroom Tear Down'
            createInQuickbooks='Yes'
            createBillingItem='No'
            paymentStatus={{
              status: 'Deleted',
              lastUpdatedFromQuickbooks: '4/1/2025 at 12:57pm (MDT)'
            }}
          />
          <ExpenseCard
            createdAt='3/14/2025 at 9:34 AM'
            amountDisplay='$3,697.50'
            expenseType='Bill'
            payee={{
              name: 'White Horse Group LLC',
              contactPerson: 'Steve Herrera',
              phone: '2143940259',
              email: 'white-horse@sbcglobal.net',
              addressLine: '1024 Carmody, Mesquite, TX 75149'
            }}
            invoiceNumber='2401325'
            invoiceAttachment={{
              name: '2025.03.07- Invoice 2401325-Arbitration Video E...'
            }}
            dateOfInvoice='3/7/2025'
            dueDate='4/7/2025'
            expenseDescription='Arbitration Video Editing Services'
            createInQuickbooks='Yes'
            createBillingItem='No'
            paymentStatus={{
              status: 'Deleted',
              lastUpdatedFromQuickbooks: '4/1/2025 at 12:54pm (MDT)'
            }}
          />
        </div>
      )}

      {/* Bottom Action Button */}
      <div className='flex justify-end'>
        <Button className='bg-red-600 text-white hover:bg-red-700'>
          Pay Online
        </Button>
      </div>
      <InvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        caseId={caseId}
      />
    </div>
  );
}
