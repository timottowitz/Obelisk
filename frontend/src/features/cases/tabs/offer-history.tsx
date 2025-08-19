'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';

export default function Finances() {
  return (
    <div className='space-y-6'>
      {/* Title */}
      <h1 className='text-2xl font-bold tracking-tight text-foreground'>
        View Offer History
      </h1>

      {/* Data Table */}
      <div className='rounded-md border border-border bg-white shadow-sm dark:bg-card'>
        <Table>
          <TableHeader>
            <TableRow className='bg-muted/60 text-foreground'>
              <TableHead className='font-semibold'>
                Submitted On
              </TableHead>
              <TableHead className='font-semibold'>
                Submitted By
              </TableHead>
              <TableHead className='font-semibold'>
                Submitting Party
              </TableHead>
              <TableHead className='font-semibold'>
                Amount
              </TableHead>
              <TableHead className='font-semibold'>
                Offer Type
              </TableHead>
              <TableHead className='font-semibold'>
                Offer Details
              </TableHead>
              <TableHead className='font-semibold'>
                <div className='text-center'>
                  <div>Attachment</div>
                  <div>Included?</div>
                </div>
              </TableHead>
              <TableHead className='font-semibold'>
                Status
              </TableHead>
              <TableHead className='font-semibold'>
                Responded By
              </TableHead>
              <TableHead className='font-semibold'>
                Responded on
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={10} className='h-24 text-center text-muted-foreground'>
                No data to display.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}