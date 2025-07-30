'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Calendar, Info, DollarSign, Printer } from 'lucide-react';
import { FinancesFilterGroup } from './components/filters';
import CaseDetailsTable from './table';
import { financesColumns } from './columns';

export default function Finances() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  return (
    <div className='space-y-6'>
      {/* Header Section */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-4'>
          <h1 className='text-2xl font-bold text-gray-900'>Finances</h1>
          <a
            href='#'
            className='flex items-center gap-1 text-sm text-blue-600 underline hover:text-blue-800'
          >
            <Info className='h-4 w-4' />
            View Instructions & Helpful Links
          </a>
        </div>

        {/* Action Buttons */}
        <div className='flex items-center gap-3'>
          <a
            href='#'
            className='text-sm text-blue-600 underline hover:text-blue-800'
          >
            What's the difference?
          </a>
          <Button
            variant='outline'
            size='sm'
            className='border-gray-300 text-gray-700'
          >
            Generate Statements
          </Button>
          <Button
            variant='outline'
            size='sm'
            className='border-gray-200 bg-gray-100 text-gray-400'
            disabled
          >
            Generate Invoice
          </Button>
        </div>
      </div>
      <div className='flex items-center justify-between'>
        {/* Search and Filter Section */}
        <div className='flex items-center gap-2'>
          <FinancesFilterGroup
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />

          {/* Date Input */}
          <div className='relative'>
            <Calendar className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400' />
            <Input
              type='text'
              placeholder='Date'
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className='h-9 w-28 border-gray-300 pl-10'
            />
          </div>
        </div>

        {/* Financial Links/Actions */}
        <div className='flex items-center gap-6'>
          <a
            href='#'
            className='flex items-center gap-2 text-sm text-gray-700 transition-colors hover:text-gray-900'
          >
            <DollarSign className='h-4 w-4' />
            Panelist Compensation arrangements
          </a>

          <a
            href='#'
            className='flex items-center gap-2 text-sm text-gray-700 transition-colors hover:text-gray-900'
          >
            <Printer className='h-4 w-4' />
            Print AAA W-9 Form
          </a>

          <a
            href='#'
            className='flex items-center gap-2 text-sm text-gray-700 transition-colors hover:text-gray-900'
          >
            <Printer className='h-4 w-4' />
            Print Case Financial History
          </a>
        </div>
      </div>
      <CaseDetailsTable columns={financesColumns} data={[]} />
    </div>
  );
}
