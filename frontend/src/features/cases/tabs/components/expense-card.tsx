import {
  FileText,
  Phone,
  Mail,
  MapPin,
  CheckCircle,
  XCircle,
  Loader2,
  Cloud
} from 'lucide-react';
import { Expense } from '@/types/expenses';
import { memo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { QuickbooksService } from '@/services/quickbooks';
import { toast } from 'sonner';
import dayjs from 'dayjs';

function ExpenseCard({ item }: { item: Expense }) {
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(
    item.qb_sync_status || 'not_synced'
  );

  const handleSyncToQuickBooks = async () => {
    setSyncing(true);
    try {
      const result = await QuickbooksService.syncExpense(item.id);
      if (result.success) {
        setSyncStatus('synced');
        toast.success(
          `Expense synced as ${result.entity_type} (ID: ${result.qb_id})`
        );
      }
    } catch (error) {
      setSyncStatus('error');
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to sync expense to QuickBooks'
      );
    } finally {
      setSyncing(false);
    }
  };

  const getSyncStatusBadge = () => {
    if (syncing) {
      return (
        <Badge variant='secondary' className='gap-1'>
          <Loader2 className='h-3 w-3 animate-spin' />
          Syncing...
        </Badge>
      );
    }

    switch (syncStatus) {
      case 'synced':
        return (
          <Badge variant='default' className='gap-1 bg-green-600'>
            <CheckCircle className='h-3 w-3' />
            Synced to QB
          </Badge>
        );
      case 'error':
        return (
          <Badge variant='destructive' className='gap-1'>
            <XCircle className='h-3 w-3' />
            Sync Error
          </Badge>
        );
      default:
        return (
          <Badge variant='outline' className='gap-1'>
            <Cloud className='h-3 w-3' />
            Not Synced
          </Badge>
        );
    }
  };

  return (
    <div className='border-border bg-card rounded-lg border shadow transition-shadow hover:shadow-md'>
      <div className='border-border bg-accent/70 text-accent-foreground dark:bg-muted dark:text-muted-foreground flex items-center justify-between border-b px-4 py-2'>
        <div className='flex items-center gap-4'>
          <div className='text-muted-foreground text-xs'>
            Created: {dayjs(item.created_at).format('MM/DD/YYYY')} at{' '}
            {dayjs(item.created_at).format('hh:mm A')}
          </div>
          {getSyncStatusBadge()}
        </div>
        <div className='flex items-center gap-4'>
          {syncStatus !== 'synced' &&
            item.create_checking_quickbooks &&
            item.payee_id && (
              <Button
                size='sm'
                variant='default'
                onClick={handleSyncToQuickBooks}
                disabled={syncing}
                className='cursor-pointer bg-emerald-600 text-emerald-50 hover:bg-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-white'
              >
                {syncing ? (
                  <>
                    <Loader2 className='mr-2 h-3 w-3 animate-spin' />
                    Syncing...
                  </>
                ) : (
                  <>
                    <Cloud className='mr-2 h-3 w-3' />
                    Sync to QuickBooks
                  </>
                )}
              </Button>
            )}
          <div className='text-foreground text-right text-lg font-semibold'>
            ${item.amount.toLocaleString()}
          </div>
        </div>
      </div>

      <div className='grid grid-cols-1 gap-6 p-4 sm:grid-cols-2 lg:grid-cols-4'>
        <div className='lg:border-border space-y-4 lg:border-r'>
          <div>
            <div className='text-muted-foreground text-xs'>Expense Type</div>
            <div className='text-sm'>{item.expense_type}</div>
          </div>
          <div>
            <div className='text-muted-foreground text-xs'>
              Entity Being Paid
            </div>
            <div className='text-foreground text-sm font-medium'>
              {item.payee?.full_name}
            </div>
            <div className='text-muted-foreground mt-2 space-y-1 text-xs'>
              {item.payee?.phones && item.payee.phones.length > 0 && (
                <div className='flex items-center gap-2'>
                  <Phone className='h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400' />
                  <span>{item.payee.phones[0].number}</span>
                  {item.payee.phones.length > 1 && (
                    <Badge variant='secondary' className='ml-1'>
                      +{item.payee.phones.length - 1} more
                    </Badge>
                  )}
                </div>
              )}
              {item.payee?.emails && item.payee.emails.length > 0 && (
                <div className='flex items-center gap-2'>
                  <Mail className='h-3.5 w-3.5 text-sky-600 dark:text-sky-400' />
                  <span className='truncate'>
                    {item.payee.emails[0].address}
                  </span>
                  {item.payee.emails.length > 1 && (
                    <Badge variant='secondary' className='ml-1'>
                      +{item.payee.emails.length - 1} more
                    </Badge>
                  )}
                </div>
              )}
              {item.payee?.addresses && item.payee.addresses.length > 0 && (
                <div className='flex items-start gap-2'>
                  <MapPin className='mt-0.5 h-3.5 w-3.5 text-amber-600 dark:text-amber-400' />
                  <span className='break-words'>
                    {item.payee.addresses[0].fullAddress}
                  </span>
                  {item.payee.addresses.length > 1 && (
                    <Badge variant='secondary' className='ml-1'>
                      +{item.payee.addresses.length - 1} more
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
          <div>
            <div className='text-muted-foreground text-xs'>Invoice Number</div>
            <div className='text-sm'>{item.invoice_number || '-'}</div>
          </div>
          <div>
            <div className='text-muted-foreground text-xs'>Type</div>
            <div className='text-sm'>{item.type || '-'}</div>
          </div>
        </div>

        <div className='lg:border-border space-y-4 lg:border-r'>
          <div>
            <div className='text-muted-foreground text-xs'>
              Invoice Attachment
            </div>
            {item.attachment ? (
              <div className='mt-2 inline-flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:border-blue-800 dark:bg-transparent dark:text-blue-400'>
                <FileText className='h-3.5 w-3.5 text-blue-600 dark:text-blue-400' />
                <span className='max-w-[15vw] truncate'>
                  {item.attachment?.name}
                </span>
              </div>
            ) : (
              <div className='text-muted-foreground text-xs'>None</div>
            )}
          </div>
          <div>
            <div className='text-muted-foreground text-xs'>Date of Invoice</div>
            <div className='text-sm'>
              {item.invoice_date
                ? dayjs(item.invoice_date).format('MM/DD/YYYY')
                : '-'}
            </div>
          </div>
          <div>
            <div className='text-muted-foreground text-xs'>Due Date</div>
            <div className='text-sm'>
              {item.due_date ? dayjs(item.due_date).format('MM/DD/YYYY') : '-'}
            </div>
          </div>
        </div>

        <div className='lg:border-border space-y-4 lg:border-r'>
          <div>
            <div className='text-muted-foreground text-xs'>Bill No.</div>
            <div className='text-sm leading-6'>{item.bill_no || '-'}</div>
          </div>
          <div>
            <div className='text-muted-foreground text-xs'>
              Expense Description
            </div>
            <div className='text-sm leading-6 break-words'>
              {item.description || '-'}
            </div>
          </div>
          <div>
            <div className='text-muted-foreground text-xs'>Memo</div>
            <div className='text-sm leading-6 break-words'>
              {item.memo || '-'}
            </div>
          </div>
          <div>
            <div className='text-muted-foreground text-xs'>Notes</div>
            <div className='text-sm leading-6 break-words'>
              {item.notes || '-'}
            </div>
          </div>
        </div>

        <div className='space-y-4'>
          <div>
            <div className='text-muted-foreground text-xs'>Date of Check</div>
            <div className='text-sm'>
              {item.date_of_check
                ? dayjs(item.date_of_check).format('MM/DD/YYYY')
                : '-'}
            </div>
          </div>
          <div>
            <div className='text-muted-foreground text-xs'>Check Number</div>
            <div className='text-sm'>{item.check_number || '-'}</div>
          </div>
          <div>
            <div className='text-muted-foreground text-xs'>
              Create expense in QuickBooks?
            </div>
            <div className='text-sm'>
              {item.create_checking_quickbooks ? 'Yes' : 'No'}
            </div>
          </div>
          <div>
            <div className='text-muted-foreground text-xs'>
              Create Billing Item?
            </div>
            <div className='text-sm'>{item.create_billing_item || '-'}</div>
          </div>
          <div>
            <div className='border-border text-foreground border-b text-sm font-semibold'>
              Payment Status
            </div>
            <div className='mt-2 space-y-2 text-sm'>
              <div>
                <div className='text-muted-foreground text-xs'>Status</div>
                <div>{item.status || '-'}</div>
              </div>
              <div>
                <div className='text-muted-foreground text-xs'>
                  Last update from QuickBooks
                </div>
                <div>{item.last_update_from_quickbooks || '-'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(ExpenseCard);
