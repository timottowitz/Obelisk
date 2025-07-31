import { eventsColumns } from './columns';
import CaseDetailsTable from './table';
import { useGetCaseEvents } from '@/hooks/useCases';

export default function Events({ caseId }: { caseId: string }) {
  const { data: events, isLoading, error } = useGetCaseEvents(caseId);

  return (
    <div className='flex flex-col gap-4'>
      <h2 className='text-2xl font-bold'>Events</h2>
      <CaseDetailsTable
        columns={eventsColumns}
        data={events || []}
        isLoading={isLoading}
        error={error}
      />
    </div>
  );
}
