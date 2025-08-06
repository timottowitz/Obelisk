'use client';

import { ChevronDown } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Event {
  id: string;
  date: string;
  time: string;
  eventType: string;
  method: string;
  status: string;
  location: string;
  caseNumber: string;
  claimant: string;
}

interface EventsTableProps {
  events?: Event[];
  isLoading?: boolean;
}

const tableColumns = [
  { key: 'date', label: 'Date', sortable: true },
  { key: 'time', label: 'Time', sortable: true },
  { key: 'eventType', label: 'Event Type', sortable: true },
  { key: 'method', label: 'Method', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'location', label: 'Location', sortable: true },
  { key: 'caseNumber', label: 'Case Number', sortable: true },
  { key: 'claimant', label: 'Claimant', sortable: true }
];

const getStatusVariant = (
  status: string
): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (status?.toLowerCase()) {
    case 'scheduled':
      return 'default';
    case 'completed':
      return 'secondary';
    case 'cancelled':
      return 'destructive';
    default:
      return 'outline';
  }
};

export function EventsTable({
  events = [],
  isLoading = false
}: EventsTableProps) {
  return (
    <div className='overflow-hidden rounded-lg border border-gray-200 bg-white'>
      <Table>
        <TableHeader>
          <TableRow className='bg-gray-50'>
            {tableColumns.map((column) => (
              <TableHead
                key={column.key}
                className='px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase'
              >
                {column.sortable ? (
                  <Button
                    variant='ghost'
                    size='sm'
                    className='h-auto p-0 font-medium text-gray-500 hover:text-gray-700'
                  >
                    {column.label}
                    <ChevronDown className='ml-1 h-3 w-3' />
                  </Button>
                ) : (
                  <span>{column.label}</span>
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell
                colSpan={tableColumns.length}
                className='h-24 text-center'
              >
                <div className='flex items-center justify-center'>
                  <div className='h-6 w-6 animate-spin rounded-full border-2 border-gray-400 border-t-transparent' />
                </div>
              </TableCell>
            </TableRow>
          ) : events.length > 0 ? (
            events.map((event) => (
              <TableRow
                key={event.id}
                className='cursor-pointer hover:bg-gray-50'
              >
                <TableCell className='px-6 py-4 text-sm whitespace-nowrap text-gray-900'>
                  {event.date}
                </TableCell>
                <TableCell className='px-6 py-4 text-sm whitespace-nowrap text-gray-900'>
                  {event.time}
                </TableCell>
                <TableCell className='px-6 py-4 text-sm whitespace-nowrap text-gray-900'>
                  {event.eventType}
                </TableCell>
                <TableCell className='px-6 py-4 text-sm whitespace-nowrap text-gray-900'>
                  {event.method}
                </TableCell>
                <TableCell className='px-6 py-4 whitespace-nowrap'>
                  <Badge
                    variant={getStatusVariant(event.status)}
                    className='font-medium'
                  >
                    {event.status}
                  </Badge>
                </TableCell>
                <TableCell className='px-6 py-4 text-sm whitespace-nowrap text-gray-900'>
                  {event.location}
                </TableCell>
                <TableCell className='px-6 py-4 whitespace-nowrap'>
                  <Button
                    variant='link'
                    className='h-auto p-0 text-sm text-blue-600 hover:text-blue-800'
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log('Case number clicked:', event.caseNumber);
                    }}
                  >
                    {event.caseNumber}
                  </Button>
                </TableCell>
                <TableCell className='px-6 py-4 whitespace-nowrap'>
                  <Button
                    variant='link'
                    className='h-auto p-0 text-sm text-blue-600 hover:text-blue-800'
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log('Claimant clicked:', event.claimant);
                    }}
                  >
                    {event.claimant}
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={tableColumns.length}
                className='h-24 text-center text-gray-500'
              >
                No data to display
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
