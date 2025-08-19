import { FileText, Phone, Mail, MapPin } from 'lucide-react';

type ExpenseItem = {
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
  lastUpdatedFromQuickbooks?: string;
};

export default function ExpenseCard({ item }: { item: ExpenseItem }) {
  return (
    <div className='border-border dark:bg-card rounded-md border bg-white shadow-sm'>
      <div className='border-border bg-muted/40 flex items-center justify-between border-b px-4 py-2 dark:bg-transparent'>
        <div className='text-muted-foreground text-xs'>
          Created: {item.createdAt}
        </div>
        <div className='text-foreground text-right text-lg font-semibold'>
          {item.amountDisplay}
        </div>
      </div>

      <div className='grid grid-cols-1 gap-6 p-4 md:grid-cols-4'>
        <div className='md:border-border space-y-4 md:border-r'>
          <div>
            <div className='text-muted-foreground text-xs'>Expense Type</div>
            <div className='text-sm'>{item.expenseType}</div>
          </div>
          <div>
            <div className='text-muted-foreground text-xs'>
              Entity Being Paid
            </div>
            <div className='text-foreground text-sm font-medium'>
              {item.payee.name}
              {item.payee.contactPerson ? ` (${item.payee.contactPerson})` : ''}
            </div>
            <div className='text-muted-foreground mt-2 space-y-1 text-xs'>
              {item.payee.phone && (
                <div className='flex items-center gap-2'>
                  <Phone className='h-3.5 w-3.5' />
                  <span>{item.payee.phone}</span>
                </div>
              )}
              {item.payee.email && (
                <div className='flex items-center gap-2'>
                  <Mail className='h-3.5 w-3.5' />
                  <span className='truncate'>{item.payee.email}</span>
                </div>
              )}
              {item.payee.addressLine && (
                <div className='flex items-start gap-2'>
                  <MapPin className='mt-0.5 h-3.5 w-3.5' />
                  <span>{item.payee.addressLine}</span>
                </div>
              )}
            </div>
          </div>
          {item.invoiceNumber && (
            <div>
              <div className='text-muted-foreground text-xs'>
                Invoice Number
              </div>
              <div className='text-sm'>{item.invoiceNumber}</div>
            </div>
          )}
        </div>

        <div className='md:border-border space-y-4 md:border-r'>
          <div>
            <div className='text-muted-foreground text-xs'>
              Invoice Attachment
            </div>
            {item.invoiceAttachment ? (
              <div className='border-border bg-muted/30 mt-2 inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs dark:bg-transparent'>
                <FileText className='h-3.5 w-3.5 text-red-500' />
                <span className='truncate'>{item.invoiceAttachment?.name}</span>
              </div>
            ) : (
              <div className='text-muted-foreground text-xs'>None</div>
            )}
          </div>
          <div>
            <div className='text-muted-foreground text-xs'>Date of Invoice</div>
            <div className='text-sm'>{item.dateOfInvoice || '-'}</div>
          </div>
          <div>
            <div className='text-muted-foreground text-xs'>Due Date</div>
            <div className='text-sm'>{item.dueDate || '-'}</div>
          </div>
        </div>

        <div className='md:border-border space-y-4 md:border-r'>
          <div>
            <div className='text-muted-foreground text-xs'>
              Expense Description
            </div>
            <div className='text-sm leading-6'>
              {item.expenseDescription || '-'}
            </div>
          </div>
          <div>
            <div className='text-muted-foreground text-xs'>
              Create expense in QuickBooks?
            </div>
            <div className='text-sm'>{item.createInQuickbooks || '-'}</div>
          </div>
        </div>

        <div className='space-y-4'>
          <div>
            <div className='text-muted-foreground text-xs'>
              Create Billing Item?
            </div>
            <div className='text-sm'>{item.createBillingItem || '-'}</div>
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
                <div>{item.lastUpdatedFromQuickbooks || '-'}</div>
              </div>
            </div>
          </div>
        </div>

        <div className='hidden md:block' />
      </div>
    </div>
  );
}
