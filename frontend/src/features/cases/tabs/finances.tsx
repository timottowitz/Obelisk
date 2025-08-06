'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Search,
  Calendar,
  Info,
  DollarSign,
  Printer,
  ChevronDown,
  ExternalLink
} from 'lucide-react';

export default function Finances() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [activeTab, setActiveTab] = useState('statements');

  return (
    <div className='space-y-6'>
      {/* Top Header */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center space-x-2'>
          <h1 className='text-2xl font-bold tracking-tight'>Finances</h1>
          <Info className='text-muted-foreground h-4 w-4' />
          <a href='#' className='text-sm text-blue-600 underline'>
            View Instructions & Helpful Links
          </a>
        </div>
        <div className='flex items-center space-x-4'>
          <a href='#' className='text-sm text-blue-600 underline'>
            What&apos;s the difference?
          </a>
          <Button
            variant={activeTab === 'statements' ? 'default' : 'outline'}
            size='sm'
            onClick={() => setActiveTab('statements')}
          >
            Generate Statements
          </Button>
          <Button
            variant={activeTab === 'invoice' ? 'default' : 'outline'}
            size='sm'
            onClick={() => setActiveTab('invoice')}
          >
            Generate Invoice
          </Button>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className='flex items-center space-x-4'>
        <div className='relative max-w-md flex-1'>
          <Search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
          <Input
            placeholder='Find by keyword or number'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className='pl-10'
          />
        </div>

        <div className='relative'>
          <Calendar className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
          <Input
            placeholder='Date'
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className='w-[120px] pl-10'
          />
        </div>
      </div>

      {/* Action Links */}
      <div className='flex items-center space-x-6'>
        <a
          href='#'
          className='flex items-center space-x-2 text-sm text-blue-600 hover:underline'
        >
          <DollarSign className='h-4 w-4' />
          <span>Panelist Compensation arrangements</span>
        </a>
        <a
          href='#'
          className='flex items-center space-x-2 text-sm text-blue-600 hover:underline'
        >
          <Printer className='h-4 w-4' />
          <span>Print AAA W-9 Form</span>
        </a>
        <a
          href='#'
          className='flex items-center space-x-2 text-sm text-blue-600 hover:underline'
        >
          <Printer className='h-4 w-4' />
          <span>Print Case Financial History</span>
        </a>
      </div>

      {/* Data Table */}
      <div className='rounded-md border bg-white'>
        <Table>
          <TableHeader>
            <TableRow className='bg-muted/50'>
              <TableHead>
                <Checkbox />
              </TableHead>
              <TableHead>Bill Line #</TableHead>
              <TableHead>Party Name</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Balance</TableHead>
              <TableHead>Payment</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell
                colSpan={8}
                className='text-muted-foreground h-24 text-center'
              >
                No data to display.
              </TableCell>
            </TableRow>
            {/* Total Row */}
            <TableRow className='bg-muted/30 font-semibold'>
              <TableCell colSpan={4} className='text-right'>
                Total Due
              </TableCell>
              <TableCell className='text-right'>$0.00</TableCell>
              <TableCell className='text-right'>$0.00</TableCell>
              <TableCell colSpan={2}></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {/* Bottom Action Button */}
      <div className='flex justify-end'>
        <Button className='bg-red-600 text-white hover:bg-red-700'>
          Pay Online
        </Button>
      </div>
    </div>
  );
}
