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
import { quickbooksService } from '@/services/quickbooks-service';
import { toast } from 'sonner';

function ExpenseCard({ item }: { item: Expense }) {
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(
    item.qb_sync_status || 'not_synced'
  );

  const handleSyncToQuickBooks = async () => {
    setSyncing(true);
    try {
      const result = await quickbooksService.syncExpense(item.id);
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
    <div className='border-border dark:bg-card rounded-md border bg-white shadow-sm'>
      <div className='border-border bg-muted/40 flex items-center justify-between border-b px-4 py-2 dark:bg-transparent'>
        <div className='flex items-center gap-4'>
          <div className='text-muted-foreground text-xs'>
            Created: {item.created_at}
          </div>
          {getSyncStatusBadge()}
        </div>
        <div className='flex items-center gap-4'>
          {syncStatus !== 'synced' && item.create_checking_quickbooks && (
            <Button
              size='sm'
              variant='outline'
              onClick={handleSyncToQuickBooks}
              disabled={syncing}
              className='cursor-pointer bg-green-600 hover:bg-green-700'
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
            ${item.amount.toFixed(2)}
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
              {item.payee?.phones.map((phone) => (
                <div className='flex items-center gap-2' key={phone.id}>
                  <Phone className='h-3.5 w-3.5' />
                  <span>{phone.number}</span>
                </div>
              ))}
              {item.payee?.emails.map((email) => (
                <div className='flex items-center gap-2' key={email.id}>
                  <Mail className='h-3.5 w-3.5' />
                  <span className='truncate'>{email.address}</span>
                </div>
              ))}
              {item.payee?.addresses.map((address) => (
                <div className='flex items-start gap-2' key={address.id}>
                  <MapPin className='mt-0.5 h-3.5 w-3.5' />
                  <span className='break-words'>{address.fullAddress}</span>
                </div>
              ))}
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
              <div className='border-border bg-muted/30 mt-2 inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs dark:bg-transparent'>
                <FileText className='h-3.5 w-3.5 text-red-500' />
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
            <div className='text-sm'>{item.invoice_date || '-'}</div>
          </div>
          <div>
            <div className='text-muted-foreground text-xs'>Due Date</div>
            <div className='text-sm'>{item.due_date || '-'}</div>
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
            <div className='text-sm'>{item.date_of_check || '-'}</div>
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
            <div className='border-border border-b text-sm font-semibold'>
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
