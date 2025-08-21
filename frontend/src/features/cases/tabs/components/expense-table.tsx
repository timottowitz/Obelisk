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
import { Expense } from '@/types/expenses';
import dayjs from 'dayjs';
import { Badge } from '@/components/ui/badge';

export default function ExpenseTable({
  rows,
  totalAmount,
  onEdit
}: {
  rows: Expense[];
  totalAmount: number;
  onEdit: (expense: Expense) => void;
}) {
  const totalAmountDisplay = `$${totalAmount.toLocaleString()}`;

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
                onClick={() => onEdit(r)}
              >
                <TableCell>
                  <Checkbox aria-label={`Select row ${idx + 1}`} />
                </TableCell>
                <TableCell className='font-medium'>
                  ${r.amount.toLocaleString()}
                </TableCell>
                <TableCell className='truncate'>{r.expense_type}</TableCell>
                <TableCell className='w-auto'>
                  <div className='flex items-start gap-2'>
                    <div className='bg-primary/20 text-primary flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold'>
                      {r.payee?.full_name
                        .split(' ')
                        .map((s) => s[0])
                        .join('')
                        .slice(0, 2)}
                    </div>
                    <div className='leading-5'>
                      <div className='font-medium break-words'>
                        {r.payee?.full_name}
                      </div>
                      {r.payee?.phones && r.payee.phones.length > 0 && (
                        <div className='text-xs break-words'>
                          <span className='text-primary'>
                            {r.payee.phones[0].number}
                          </span>
                          {r.payee.phones.length > 1 && (
                            <Badge variant='secondary' className='ml-2'>
                              +{r.payee.phones.length - 1} more
                            </Badge>
                          )}
                        </div>
                      )}
                      {r.payee?.emails && r.payee.emails.length > 0 && (
                        <div className='text-xs break-words'>
                          <span className='text-primary'>
                            {r.payee.emails[0].address}
                          </span>
                          {r.payee.emails.length > 1 && (
                            <Badge variant='secondary' className='ml-2'>
                              +{r.payee.emails.length - 1} more
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className='hidden md:table-cell'>
                  {r.type || '—'}
                </TableCell>
                <TableCell className='hidden lg:table-cell'>
                  {r.invoice_number || '—'}
                </TableCell>
                <TableCell className='hidden lg:table-cell'>
                  {r.attachment ? (
                    <div className='flex items-center gap-2'>
                      <FileText className='text-destructive h-4 w-4' />
                      <a
                        className='text-primary max-w-[240px] truncate underline-offset-2 hover:underline'
                        href='#'
                      >
                        {r.attachment?.name}
                      </a>
                    </div>
                  ) : (
                    <span className='text-muted-foreground'>—</span>
                  )}
                </TableCell>
                <TableCell className='truncate'>
                  {r.invoice_date ? dayjs(r.invoice_date).format('MM/DD/YYYY') : '—'}
                </TableCell>
                <TableCell className='truncate'>
                  {r.due_date ? dayjs(r.due_date).format('MM/DD/YYYY') : '—'}
                </TableCell>
                <TableCell className='hidden xl:table-cell'>
                  {r.bill_no || '—'}
                </TableCell>
                <TableCell className='hidden min-w-[30ch] leading-5 break-words whitespace-pre-wrap xl:table-cell'>
                  {r.description || '—'}
                </TableCell>
                <TableCell className='hidden min-w-[30ch] leading-5 break-words whitespace-pre-wrap 2xl:table-cell'>
                  {r.memo || '—'}
                </TableCell>
                <TableCell className='hidden min-w-[30ch] leading-5 break-words whitespace-pre-wrap 2xl:table-cell'>
                  {r.notes || '—'}
                </TableCell>
                <TableCell className='hidden min-w-[30ch] leading-5 break-words whitespace-pre-wrap 2xl:table-cell'>
                  {r.notify_admin_of_check_payment ? 'Yes' : 'No'}
                </TableCell>
                <TableCell className='hidden xl:table-cell'>
                  {r.create_checking_quickbooks ? 'Yes' : 'No'}
                </TableCell>
                <TableCell className='hidden xl:table-cell'>
                  {r.create_billing_item || '—'}
                </TableCell>
                <TableCell className='truncate'>{r.status || '—'}</TableCell>
                <TableCell className='hidden 2xl:table-cell'>
                  {r.date_of_check ? dayjs(r.date_of_check).format('MM/DD/YYYY') : '—'}
                </TableCell>
                <TableCell className='hidden 2xl:table-cell'>
                  {r.check_number || '—'}
                </TableCell>
                <TableCell className='hidden break-words lg:table-cell'>
                  {r.last_update_from_quickbooks || '—'}
                </TableCell>
                <TableCell className='hidden 2xl:table-cell'>
                  {r.copy_of_check?.name || '—'}
                </TableCell>
                <TableCell className='hidden break-words lg:table-cell'>
                  {r.created_at ? dayjs(r.created_at).format('MM/DD/YYYY hh:mm A') : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
