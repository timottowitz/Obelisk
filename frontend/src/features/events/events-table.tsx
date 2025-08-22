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
    <div className='overflow-hidden rounded-lg border border-border bg-card'>
      <div className='w-full overflow-x-auto'>
        <Table>
          <TableHeader>
            <TableRow className='bg-muted'>
              {tableColumns.map((column) => (
                <TableHead
                  key={column.key}
                  className='px-4 py-2 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase md:px-6 md:py-3'
                >
                  {column.sortable ? (
                    <Button
                      variant='ghost'
                      size='sm'
                      className='h-auto p-0 font-medium text-muted-foreground hover:text-foreground'
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
                    <div className='h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground/40 border-t-transparent' />
                  </div>
                </TableCell>
              </TableRow>
            ) : events.length > 0 ? (
              events.map((event) => (
                <TableRow
                  key={event.id}
                  className='cursor-pointer hover:bg-muted'
                >
                  <TableCell className='px-4 py-3 text-sm whitespace-nowrap text-foreground md:px-6 md:py-4'>
                    {event.date}
                  </TableCell>
                  <TableCell className='px-4 py-3 text-sm whitespace-nowrap text-foreground md:px-6 md:py-4'>
                    {event.time}
                  </TableCell>
                  <TableCell className='px-4 py-3 text-sm whitespace-nowrap text-foreground md:px-6 md:py-4'>
                    {event.eventType}
                  </TableCell>
                  <TableCell className='px-4 py-3 text-sm whitespace-nowrap text-foreground md:px-6 md:py-4'>
                    {event.method}
                  </TableCell>
                  <TableCell className='px-4 py-3 whitespace-nowrap md:px-6 md:py-4'>
                    <Badge
                      variant={getStatusVariant(event.status)}
                      className='font-medium'
                    >
                      {event.status}
                    </Badge>
                  </TableCell>
                  <TableCell className='px-4 py-3 text-sm whitespace-nowrap text-foreground md:px-6 md:py-4'>
                    {event.location}
                  </TableCell>
                  <TableCell className='px-4 py-3 whitespace-nowrap md:px-6 md:py-4'>
                    <Button
                      variant='link'
                      className='h-auto p-0 text-sm text-primary hover:text-primary/80'
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('Case number clicked:', event.caseNumber);
                      }}
                    >
                      {event.caseNumber}
                    </Button>
                  </TableCell>
                  <TableCell className='px-4 py-3 whitespace-nowrap md:px-6 md:py-4'>
                    <Button
                      variant='link'
                      className='h-auto p-0 text-sm text-primary hover:text-primary/80'
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
                  className='h-24 text-center text-muted-foreground'
                >
                  No data to display
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
