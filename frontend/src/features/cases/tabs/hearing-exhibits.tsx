'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  RefreshCw,
  Trash2,
  Printer,
  Download,
  Flag,
  Info,
  Square
} from 'lucide-react';
import { HearingExhibitFilterGroup } from './components/filters';
import CaseDetailsTable from './table';
import { hearingExhibitColumns } from './columns';

export default function HearingExhibits() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedDate, setSelectedDate] = useState('');

  return (
    <div className='space-y-6'>
      {/* Page Header */}
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold text-gray-900'>Hearing Exhibits</h1>
        <Button className='bg-blue-600 text-white hover:bg-blue-700'>
          Add New Exhibits
        </Button>
      </div>

      <HearingExhibitFilterGroup
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedFilter={selectedFilter}
        setSelectedFilter={setSelectedFilter}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
      />

      {/* Action Toolbar */}
      <div className='flex items-center gap-4 rounded-md border border-gray-200 p-2'>
        {/* Actions Dropdown */}
        <Select>
          <SelectTrigger className='h-6 w-24 rounded-md border border-gray-200 bg-white'>
            <SelectValue className='text-xs' placeholder='Actions' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='add-flag' className='text-xs'>
              Add Flag
            </SelectItem>
            <SelectItem value='remove-flag' className='text-xs'>
              Remove Flag
            </SelectItem>
            <SelectItem value='mark-all-as-read' className='text-xs'>
              Mark All as Read
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Action Buttons */}
        <div className='flex items-center gap-4'>
          <Button
            variant='outline'
            size='sm'
            className='flex items-center gap-1'
          >
            <RefreshCw className='h-3 w-3' />
            Refresh
          </Button>

          <Button
            variant='outline'
            size='sm'
            className='flex items-center gap-1 text-red-600 hover:text-red-700'
          >
            <Trash2 className='h-3 w-3' />
            Delete
          </Button>

          <Button
            variant='outline'
            size='sm'
            className='flex items-center gap-1'
          >
            <Printer className='h-3 w-3' />
            Print List
          </Button>

          <Button
            variant='outline'
            size='sm'
            className='flex items-center gap-1'
          >
            <Download className='h-3 w-3' />
            Download
          </Button>

          <Button
            variant='outline'
            size='sm'
            className='flex items-center gap-1'
          >
            <Flag className='h-3 w-3' />
            Add
          </Button>

          <Button
            variant='outline'
            size='sm'
            className='flex items-center gap-1'
          >
            <Flag className='h-3 w-3' />
            Remove
          </Button>

          <Button
            size='sm'
            className='bg-blue-600 text-white hover:bg-blue-700'
          >
            Save
          </Button>

          <a
            href='#'
            className='flex items-center gap-1 text-xs text-blue-600 transition-colors hover:text-blue-800'
          >
            <Info className='h-3 w-3' />
            What is Clearbrief?
          </a>

          <Button variant='outline' size='sm' className='p-1'>
            <Square className='h-3 w-3' />
          </Button>
        </div>
      </div>

      {/* Exhibit Table */}
      <CaseDetailsTable columns={hearingExhibitColumns} data={[]} />
    </div>
  );
}
