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
    <div className="space-y-6">
      {/* Title */}
      <h1 className="text-2xl font-bold tracking-tight text-gray-800">
        View Offer History
      </h1>

      {/* Data Table */}
      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-100">
              <TableHead className="font-semibold text-gray-800">
                Submitted On
              </TableHead>
              <TableHead className="font-semibold text-gray-800">
                Submitted By
              </TableHead>
              <TableHead className="font-semibold text-gray-800">
                Submitting Party
              </TableHead>
              <TableHead className="font-semibold text-gray-800">
                Amount
              </TableHead>
              <TableHead className="font-semibold text-gray-800">
                Offer Type
              </TableHead>
              <TableHead className="font-semibold text-gray-800">
                Offer Details
              </TableHead>
              <TableHead className="font-semibold text-gray-800">
                <div className="text-center">
                  <div>Attachment</div>
                  <div>Included?</div>
                </div>
              </TableHead>
              <TableHead className="font-semibold text-gray-800">
                Status
              </TableHead>
              <TableHead className="font-semibold text-gray-800">
                Responded By
              </TableHead>
              <TableHead className="font-semibold text-gray-800">
                Responded on
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                No data to display.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}