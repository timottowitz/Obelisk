import { FileText, Phone, Mail, MapPin } from 'lucide-react';

type ExpenseCardProps = {
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
  paymentStatus?: {
    status: string;
    lastUpdatedFromQuickbooks?: string;
  };
};

export default function ExpenseCard({
  createdAt,
  amountDisplay,
  expenseType,
  payee,
  invoiceNumber,
  invoiceAttachment,
  dateOfInvoice,
  dueDate,
  expenseDescription,
  createInQuickbooks,
  createBillingItem,
  paymentStatus
}: ExpenseCardProps) {
  return (
    <div className='bg-card rounded-md border'>
      <div className='flex items-center justify-between  px-4 py-2 border-b'>
        <div className='text-muted-foreground text-xs'>
          Created: {createdAt}
        </div>
        <div className='text-right text-lg font-semibold'>{amountDisplay}</div>
      </div>

      <div className='grid grid-cols-1 gap-6 md:grid-cols-4 p-4'>
        <div className='space-y-4 border-r'>
          <div>
            <div className='text-muted-foreground text-xs'>Expense Type</div>
            <div className='text-sm'>{expenseType}</div>
          </div>
          <div>
            <div className='text-muted-foreground text-xs'>
              Entity Being Paid
            </div>
            <div className='text-sm font-medium'>
              {payee.name}
              {payee.contactPerson ? ` (${payee.contactPerson})` : ''}
            </div>
            <div className='text-muted-foreground mt-2 space-y-1 text-xs'>
              {payee.phone && (
                <div className='flex items-center gap-2'>
                  <Phone className='h-3.5 w-3.5' />
                  <span>{payee.phone}</span>
                </div>
              )}
              {payee.email && (
                <div className='flex items-center gap-2'>
                  <Mail className='h-3.5 w-3.5' />
                  <span className='truncate'>{payee.email}</span>
                </div>
              )}
              {payee.addressLine && (
                <div className='flex items-start gap-2'>
                  <MapPin className='mt-0.5 h-3.5 w-3.5' />
                  <span>{payee.addressLine}</span>
                </div>
              )}
            </div>
          </div>
          {invoiceNumber && (
            <div>
              <div className='text-muted-foreground text-xs'>
                Invoice Number
              </div>
              <div className='text-sm'>{invoiceNumber}</div>
            </div>
          )}
        </div>

        <div className='space-y-4 border-r'>
          <div>
            <div className='text-muted-foreground text-xs'>
              Invoice Attachment
            </div>
            {invoiceAttachment ? (
              <div className='mt-2 inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs'>
                <FileText className='h-3.5 w-3.5 text-red-500' />
                <span className='truncate'>{invoiceAttachment.name}</span>
              </div>
            ) : (
              <div className='text-muted-foreground text-xs'>None</div>
            )}
          </div>
          <div>
            <div className='text-muted-foreground text-xs'>Date of Invoice</div>
            <div className='text-sm'>{dateOfInvoice || '-'}</div>
          </div>
          <div>
            <div className='text-muted-foreground text-xs'>Due Date</div>
            <div className='text-sm'>{dueDate || '-'}</div>
          </div>
        </div>

        <div className='space-y-4 border-r'>
          <div>
            <div className='text-muted-foreground text-xs'>
              Expense Description
            </div>
            <div className='text-sm leading-6'>{expenseDescription || '-'}</div>
          </div>
          <div>
            <div className='text-muted-foreground text-xs'>
              Create expense in QuickBooks?
            </div>
            <div className='text-sm'>{createInQuickbooks || '-'}</div>
          </div>
        </div>

        <div className='space-y-4'>
          <div>
            <div className='text-muted-foreground text-xs'>
              Create Billing Item?
            </div>
            <div className='text-sm'>{createBillingItem || '-'}</div>
          </div>
          <div>
            <div className='text-sm font-semibold border-b'>Payment Status</div>
            <div className='mt-2 space-y-2 text-sm'>
              <div>
                <div className='text-muted-foreground text-xs'>Status</div>
                <div>{paymentStatus?.status || '-'}</div>
              </div>
              <div>
                <div className='text-muted-foreground text-xs'>
                  Last update from QuickBooks
                </div>
                <div>{paymentStatus?.lastUpdatedFromQuickbooks || '-'}</div>
              </div>
            </div>
          </div>
        </div>

        <div className='hidden md:block' />
      </div>
    </div>
  );
}
