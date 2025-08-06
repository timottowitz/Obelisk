'use client';

import * as React from 'react';
import { EventsTable } from '@/features/events/events-table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

export interface EventsPageProps {}

export default function EventsPage({}: EventsPageProps) {
  return (
    <div className='flex-1 overflow-auto bg-white p-6'>
      <div className='mx-auto max-w-7xl'>
        {/* Header */}
        <div className='mb-6'>
          <h1 className='mb-4 text-2xl font-semibold text-gray-900'>
            Case Events
          </h1>

          {/* Filter Controls */}
          <div className='flex gap-3'>
            {/* Status Filter Dropdown */}
            <Select value='all'>
              <SelectTrigger>
                <SelectValue placeholder='Select Status' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All Events</SelectItem>
                <SelectItem value='active'>Active</SelectItem>
                <SelectItem value='scheduled'>Scheduled</SelectItem>
                <SelectItem value='completed'>Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Events Table Component */}
        <EventsTable events={[]} isLoading={false} />
      </div>
    </div>
  );
}
