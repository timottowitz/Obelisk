'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
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
  Filter,
  Calendar,
  RefreshCw,
  Trash2,
  Printer,
  Download,
  Flag,
  Plus,
  Minus,
  Save,
  Expand
} from 'lucide-react';

export default function Finances() {
  const [searchTerm, setSearchTerm] = useState('');
  const [exhibitsFilter, setExhibitsFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');

  return (
    <div className='space-y-6'>
      {/* Header Section */}
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold tracking-tight text-foreground'>Hearing Exhibits</h1>
        <Button>
          <Plus className='mr-2 h-4 w-4' />
          Add New Exhibits
        </Button>
      </div>

      {/* Search and Filter Bar */}
      <div className='flex items-center space-x-4 rounded-md border border-border bg-white p-4 shadow-sm dark:bg-card'>
        <div className='relative max-w-md flex-1'>
          <Search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
          <Input
            placeholder='Find by keyword or number'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className='pl-10'
          />
        </div>

        <Select value={exhibitsFilter} onValueChange={setExhibitsFilter}>
          <SelectTrigger className='w-[140px]'>
            <Filter className='mr-2 h-4 w-4' />
            <SelectValue placeholder='All Exhibits' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All Exhibits</SelectItem>
            <SelectItem value='pending'>Pending</SelectItem>
            <SelectItem value='approved'>Approved</SelectItem>
            <SelectItem value='rejected'>Rejected</SelectItem>
          </SelectContent>
        </Select>

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

      {/* Action Bar (Toolbar) */}
      <div className='flex items-center space-x-2 rounded-md border border-border bg-white p-2 shadow-sm dark:bg-card'>
        <Button variant='outline' size='sm'>
          <RefreshCw className='mr-2 h-4 w-4' />
          Refresh
        </Button>
        <Button
          variant='outline'
          size='sm'
          className='text-destructive hover:text-destructive'
        >
          <Trash2 className='mr-2 h-4 w-4' />
          Delete
        </Button>
        <Button variant='outline' size='sm'>
          <Printer className='mr-2 h-4 w-4' />
          Print List
        </Button>
        <Button variant='outline' size='sm'>
          <Download className='mr-2 h-4 w-4' />
          Download
        </Button>
        <Button variant='outline' size='sm'>
          <Flag className='mr-2 h-4 w-4' />
          Add
        </Button>
        <Button variant='outline' size='sm'>
          <Minus className='mr-2 h-4 w-4' />
          Remove
        </Button>
        <Button size='sm'>
          <Save className='mr-2 h-4 w-4' />
          Save
        </Button>
        <Button variant='outline' size='sm'>
          <Expand className='mr-2 h-4 w-4' />
        </Button>
      </div>

      {/* Data Table */}
      <div className='rounded-md border border-border bg-white shadow-sm dark:bg-card'>
        <Table>
          <TableHeader>
            <TableRow className='bg-muted/50'>
              <TableHead className='w-12'>
                <Checkbox />
              </TableHead>
              <TableHead>View</TableHead>
              <TableHead>New</TableHead>
              <TableHead>Exhibit No. & Description</TableHead>
              <TableHead>Joint?</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Upload Date</TableHead>
              <TableHead>Flag</TableHead>
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
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
