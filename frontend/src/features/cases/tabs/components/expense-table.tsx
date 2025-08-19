import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { FileText } from 'lucide-react';

type ExpenseRow = {
  createdAt: string;
  amountDisplay: string;
  expenseType: string;
  payee: {
    name: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    addressLine?: string;
  };
  invoiceNumber?: string;
  invoiceAttachment?: { name: string } | null;
  dateOfInvoice?: string;
  dueDate?: string;
  expenseDescription?: string;
  createInQuickbooks?: 'Yes' | 'No';
  createBillingItem?: 'Yes' | 'No' | 'Unknown';
  status?: string;
  billNo?: string;
  memo?: string;
  notes?: string;
  notifyAdmin?: string;
  createInQB?: string;
  dateOfCheck?: string;
  checkNumber?: string;
  lastUpdateFromQB?: string;
  copyOfCheck?: string;
  createdDate?: string;
  lastUpdatedFromQuickbooks?: string;
};

export default function ExpenseTable({ rows }: { rows: ExpenseRow[] }) {
  const totalAmountDisplay = '$82,022.60';

  return (
    <div className='space-y-2'>
      <div className='text-muted-foreground border-border dark:bg-card flex items-center justify-between rounded-md border bg-white px-3 py-2 text-xs shadow-sm'>
        <div>
          <span className='font-medium'>Amount:</span> {totalAmountDisplay}
        </div>
      </div>
      <div className='border-border dark:bg-card w-full max-w-[82vw] overflow-x-auto rounded-md border bg-white shadow-sm'>
        <Table className='w-full table-auto text-xs'>
          <TableHeader>
            <TableRow className='bg-muted/60 text-foreground'>
              <TableHead>
                <Checkbox aria-label='Select all' />
              </TableHead>
              <TableHead className='w-24'>Amount</TableHead>
              <TableHead className='w-24'>Expense Type</TableHead>
              <TableHead className='w-auto'>Entity Being Paid</TableHead>
              <TableHead className='hidden w-16 md:table-cell'>Type</TableHead>
              <TableHead className='hidden w-28 lg:table-cell'>
                Invoice Number
              </TableHead>
              <TableHead className='hidden w-[240px] lg:table-cell'>
                Invoice Attachment
              </TableHead>
              <TableHead className='w-24'>Date of Invoice</TableHead>
              <TableHead className='w-24'>Due Date</TableHead>
              <TableHead className='hidden w-20 xl:table-cell'>
                Bill no.
              </TableHead>
              <TableHead className='hidden min-w-[20ch] xl:table-cell'>
                Expense Description
              </TableHead>
              <TableHead className='hidden min-w-[20ch] 2xl:table-cell'>
                Memo
              </TableHead>
              <TableHead className='hidden min-w-[20ch] 2xl:table-cell'>
                Notes
              </TableHead>
              <TableHead className='hidden w-[220px] 2xl:table-cell'>
                Notify Admin of Check Payment
              </TableHead>
              <TableHead className='hidden w-28 xl:table-cell'>
                Create expense in QuickBooks?
              </TableHead>
              <TableHead className='hidden w-28 xl:table-cell'>
                Create Billing Item?
              </TableHead>
              <TableHead className='w-24'>Status</TableHead>
              <TableHead className='hidden w-28 2xl:table-cell'>
                Date of Check
              </TableHead>
              <TableHead className='hidden w-28 2xl:table-cell'>
                Check Number
              </TableHead>
              <TableHead className='hidden w-[220px] lg:table-cell'>
                Last update from QuickBooks
              </TableHead>
              <TableHead className='hidden w-24 2xl:table-cell'>
                Copy of Check
              </TableHead>
              <TableHead className='hidden w-[180px] lg:table-cell'>
                Created Date
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, idx) => (
              <TableRow
                key={idx}
                className='even:bg-muted/20 dark:odd:bg-card dark:even:bg-muted/20 border-border border-b odd:bg-white'
              >
                <TableCell>
                  <Checkbox aria-label={`Select row ${idx + 1}`} />
                </TableCell>
                <TableCell className='font-medium'>{r.amountDisplay}</TableCell>
                <TableCell className='truncate'>{r.expenseType}</TableCell>
                <TableCell className='w-auto'>
                  <div className='flex items-start gap-2'>
                    <div className='bg-primary/20 text-primary flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold'>
                      {r.payee.name
                        .split(' ')
                        .map((s) => s[0])
                        .join('')
                        .slice(0, 2)}
                    </div>
                    <div className='leading-5'>
                      <div className='font-medium break-words'>
                        {r.payee.name}
                      </div>
                      {r.payee.contactPerson && (
                        <span className='text-muted-foreground text-xs'>
                          ({r.payee.contactPerson})
                        </span>
                      )}
                      <div className='text-primary text-xs break-words'>
                        {r.payee.phone}
                      </div>
                      <div className='text-primary text-xs break-words'>
                        {r.payee.email}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className='hidden md:table-cell'>{r.expenseType}</TableCell>
                <TableCell className='hidden lg:table-cell'>
                  {r.invoiceNumber || '—'}
                </TableCell>
                <TableCell className='hidden lg:table-cell'>
                  {r.invoiceAttachment ? (
                    <div className='flex items-center gap-2'>
                      <FileText className='text-destructive h-4 w-4' />
                      <a
                        className='text-primary max-w-[240px] truncate underline-offset-2 hover:underline'
                        href='#'
                      >
                        {r.invoiceAttachment?.name}
                      </a>
                    </div>
                  ) : (
                    <span className='text-muted-foreground'>—</span>
                  )}
                </TableCell>
                <TableCell className='truncate'>
                  {r.dateOfInvoice || '—'}
                </TableCell>
                <TableCell className='truncate'>{r.dueDate || '—'}</TableCell>
                <TableCell className='hidden xl:table-cell'>
                  {r.billNo || '—'}
                </TableCell>
                <TableCell className='hidden min-w-[30ch] leading-5 break-words whitespace-pre-wrap xl:table-cell'>
                  {r.expenseDescription || '—'}
                </TableCell>
                <TableCell className='hidden min-w-[30ch] leading-5 break-words whitespace-pre-wrap 2xl:table-cell'>
                  {r.memo || '—'}
                </TableCell>
                <TableCell className='hidden min-w-[30ch] leading-5 break-words whitespace-pre-wrap 2xl:table-cell'>
                  {r.notes || '—'}
                </TableCell>
                <TableCell className='hidden min-w-[30ch] leading-5 break-words whitespace-pre-wrap 2xl:table-cell'>
                  {r.notifyAdmin || '—'}
                </TableCell>
                <TableCell className='hidden xl:table-cell'>
                  {r.createInQB || '—'}
                </TableCell>
                <TableCell className='hidden xl:table-cell'>
                  {r.createBillingItem || '—'}
                </TableCell>
                <TableCell className='truncate'>{r.status || '—'}</TableCell>
                <TableCell className='hidden 2xl:table-cell'>
                  {r.dateOfCheck || '—'}
                </TableCell>
                <TableCell className='hidden 2xl:table-cell'>
                  {r.checkNumber || '—'}
                </TableCell>
                <TableCell className='hidden break-words lg:table-cell'>
                  {r.lastUpdateFromQB || '—'}
                </TableCell>
                <TableCell className='hidden 2xl:table-cell'>
                  {r.copyOfCheck || '—'}
                </TableCell>
                <TableCell className='hidden break-words lg:table-cell'>
                  {r.createdDate || '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
