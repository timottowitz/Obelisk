import { useState, useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
  SelectItem
} from '@/components/ui/select';
import { eventsColumns } from './columns';
import CaseDetailsTable from './table';
import { useGetCaseEvents } from '@/hooks/useCases';

export default function Events({ caseId }: { caseId: string }) {
  const { data: events, isLoading, error } = useGetCaseEvents(caseId);
  const [status, setStatus] = useState<string>('all');
  const filteredEvents = useMemo(() => {
    if (status === 'all') return events;
    return events?.filter((event) => event.status === status);
  }, [events, status]);

  return (
    <div className='flex flex-col gap-4'>
      <h2 className='text-2xl font-bold'>Events</h2>
      <div className='flex flex-row gap-4'>
        <Select onValueChange={(value) => setStatus(value)} value={status}>
          <SelectTrigger className='w-[180px]'>
            <SelectValue placeholder='Select an event' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All</SelectItem>
            <SelectItem value='success'>Success</SelectItem>
            <SelectItem value='failed'>Failed</SelectItem>
            <SelectItem value='pending'>Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <CaseDetailsTable
        columns={eventsColumns}
        data={filteredEvents || []}
        isLoading={isLoading}
        error={error}
      />
    </div>
  );
}