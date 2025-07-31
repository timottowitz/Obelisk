import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
  SelectItem
} from '@/components/ui/select';
import { eventsColumns } from './columns';
import CaseDetailsTable from './table';

export default function Events() {
  return (
    <div className='flex flex-col gap-4'>
      <h2 className='text-2xl font-bold'>Events</h2>
      <div className='flex flex-row gap-4'>
        <Select>
          <SelectTrigger className='w-[180px]'>
            <SelectValue placeholder='Select an event' defaultValue='all' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All</SelectItem>
            <SelectItem value='active'>Active</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <CaseDetailsTable columns={eventsColumns} data={[]} />
    </div>
  );
}
