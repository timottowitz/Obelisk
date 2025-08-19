'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  useExpenseTypes,
  useInitialDocuments,
  useCreateExpense
} from '@/hooks/useExpenses';
import { useContactsBySearch } from '@/hooks/useContacts';
import { useCreateContact, useContactTypes } from '@/hooks/useContacts';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Loader2, Plus, Trash, Upload, UserPlus2 } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import ContactModal from '@/features/contacts/components/contact-modal';
import { toast } from 'sonner';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseId: string;
  loading?: boolean;
  onCreate?: (payload: any) => void;
}

// Combined form state for performance and simpler updates
type FormState = {
  expenseType: string;
  expenseTypeId: string;
  amount: string;
  payeeId: string;
  payeeName: string;
  type: string; // 'unknown' | 'service' | 'product'
  invoiceNumber: string;
  invoiceDate: string;
  expenseDescription: string;
  memo: string;
  notes: string;
  createInQuickBooks: '' | 'yes' | 'no';
  createBillingItem: 'yes' | 'no' | 'unknown';
  attachment: File | null;
  attachmentId: string;
  lastUpdatedFromQuickBooks: string;
  copyOfCheck: File | null;
  copyOfCheckId: string;
  notifyAdminOfCheckPayment: '';
  billNo: string;
  dueDate: string;
};

export default function InvoiceModal({
  isOpen,
  onClose,
  caseId,
  loading
}: InvoiceModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 1000);
  const isTyping = searchTerm !== debouncedSearchTerm;
  const [showingContacts, setShowingContacts] = useState(false);
  const { data: expenseTypes, isLoading: isLoadingExpenseTypes } =
    useExpenseTypes();
  const { data: initialDocuments, isLoading: isLoadingInitialDocuments } =
    useInitialDocuments(caseId);
  const { data: contactTypes, isLoading: isLoadingContactTypes } =
    useContactTypes();
  const createContact = useCreateContact();
  const createExpense = useCreateExpense();
  const { data: contacts, isLoading: isLoadingContacts } =
    useContactsBySearch(debouncedSearchTerm);
  const [isOpenContactModal, setIsOpenContactModal] = useState(false);
  const [form, setForm] = useState<FormState>({
    expenseType: '',
    expenseTypeId: '',
    amount: '',
    payeeId: '',
    payeeName: '',
    type: 'unknown',
    invoiceNumber: '',
    invoiceDate: '',
    expenseDescription: '',
    memo: '',
    notes: '',
    createInQuickBooks: '',
    createBillingItem: 'unknown',
    attachment: null,
    attachmentId: '',
    copyOfCheck: null,
    copyOfCheckId: '',
    notifyAdminOfCheckPayment: '',
    lastUpdatedFromQuickBooks: '',
    dueDate: '',
    billNo: ''
  });

  useEffect(() => {
    if (expenseTypes) {
      setForm((p) => ({
        ...p,
        expenseTypeId: expenseTypes[0].id,
        expenseType: expenseTypes[0].name
      }));
    }
  }, [expenseTypes]);

  useEffect(() => {
    if (expenseTypes && form.expenseTypeId) {
      setForm((p) => ({
        ...p,
        expenseType:
          expenseTypes.find((type) => type.id === p.expenseTypeId)?.name || ''
      }));
    }
  }, [form.expenseTypeId]);

  const canSubmit = useMemo(() => {
    return (
      form.expenseTypeId !== '' &&
      form.amount.trim() !== '' &&
      form.createInQuickBooks !== '' &&
      (form.expenseType !== 'Soft Costs' ? form.payeeId !== '' : true)
    );
  }, [form.expenseTypeId, form.amount, form.createInQuickBooks, form.payeeId]);

  const handleFileClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleCreateContact = useCallback(
    async (formData: any) => {
      try {
        await createContact.mutateAsync(formData);
        toast.success('Contact created successfully');
        setIsOpenContactModal(false);
      } catch (error) {
        console.error('Error creating contact:', error);
        toast.error('Error creating contact');
      }
    },
    [createContact]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!canSubmit) return;

      const formData = new FormData();
      formData.append('case_id', caseId);
      formData.append('expense_type_id', form.expenseTypeId);
      formData.append('amount', form.amount);
      formData.append('payee_id', form.payeeId);
      formData.append('type', form.type);
      formData.append('invoce_number', form.invoiceNumber);
      formData.append('invoice_date', form.invoiceDate);
      formData.append('description', form.expenseDescription);
      formData.append('memo', form.memo);
      formData.append('notes', form.notes);
      formData.append('create_checking_quickbooks', form.createInQuickBooks);
      formData.append('create_billing_item', form.createBillingItem);
      if (form.expenseType === 'Bill') {
        formData.append('bill_no', form.billNo);
        formData.append('due_date', form.dueDate);
      }
      if (form.attachment) {
        formData.append('attachment', form.attachment);
      }
      if (form.attachmentId) {
        formData.append('attachment_id', form.attachmentId);
      }
      if (form.copyOfCheck) {
        formData.append('copy_of_check', form.copyOfCheck);
      }
      if (form.copyOfCheckId) {
        formData.append('copy_of_check_id', form.copyOfCheckId);
      }
      formData.append(
        'last_updated_from_quickbooks',
        form.lastUpdatedFromQuickBooks
      );

      try {
        await createExpense.mutateAsync({ caseId, payload: formData });
        toast.success('Expense created successfully');
        setForm({
          ...form,
          expenseTypeId: '',
          amount: '',
          payeeId: '',
          payeeName: '',
          type: 'unknown',
          invoiceNumber: '',
          invoiceDate: '',
          expenseDescription: '',
          memo: '',
          notes: '',
          createInQuickBooks: '',
          createBillingItem: 'unknown',
          attachment: null,
          attachmentId: '',
          lastUpdatedFromQuickBooks: ''
        });
        onClose();
      } catch (error) {
        console.error('Error creating expense:', error);
        toast.error('Error creating expense');
      }
    },
    [
      caseId,
      form.expenseTypeId,
      form.amount,
      form.payeeId,
      form.type,
      form.invoiceNumber,
      form.invoiceDate,
      form.expenseDescription,
      form.memo,
      form.notes,
      form.createInQuickBooks,
      form.createBillingItem,
      form.attachment,
      form.attachmentId
    ]
  );

  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className='h-[80vh] w-full !max-w-7xl overflow-y-auto border-2 border-border bg-white py-10 shadow-sm dark:bg-card'>
          <DialogHeader>
            <DialogTitle>Create Expense</DialogTitle>
            <div className='flex items-center justify-between'>
              <div className='text-muted-foreground text-xs'>
                <div className='font-medium'>Table of Contents</div>
                <div>Payment Status</div>
              </div>
              <div className='flex items-center gap-2'>
                <Button
                  variant='outline'
                  onClick={onClose}
                  className='cursor-pointer'
                >
                  Close
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!canSubmit || !!loading}
                  className='cursor-pointer'
                >
                  {loading ? 'Creating…' : 'Create'}
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className='px-1'>
            <h2 className='text-xl font-semibold tracking-wide'>
              EXPENSE REQUEST
            </h2>

            {/* Blurbs Row */}
            <div className='mt-4 grid grid-cols-1 gap-6 md:grid-cols-4'>
              <div className='text-sm'>
                <span className='font-semibold'>CHECK: </span>a check will be
                created in QuickBooks, where it will be reviewed and printed.
              </div>
              <div className='text-sm'>
                <span className='font-semibold'>CREDIT CARD: </span>
                An expense will be created in QuickBooks, where it can be easily
                matched to a credit or debit card transition in the bank{' '}
                <span className='underline'>feed</span>.
              </div>
              <div className='text-sm'>
                <span className='font-semibold'>BILL: </span>
                Bills are an accounts payable transaction in QuickBooks,
                allowing management to follow a review and approval process
                before issuing payment. The bill records a case cost just like a
                check or credit card would without the assumption of when or how
                payment is made. You can use QuickBooks Bill Pay tools to issue
                payments or sync bills to Bill.com.
              </div>
              <div className='text-sm'>
                <span className='font-semibold'>SOFT COSTS: </span>
                Use this for Admin fees, printing costs, etc. These costs are
                not tracked in QuickBooks.
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className='mt-6 space-y-6'>
              {/* Top Row */}
              <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
                {/* Expense Type */}
                <div className='space-y-2'>
                  <Label htmlFor='expenseType'>
                    Expense Type <span className='text-red-500'>*</span>
                  </Label>
                  <Select
                    value={form.expenseTypeId}
                    onValueChange={(v) =>
                      setForm((p) => ({ ...p, expenseTypeId: v }))
                    }
                  >
                    <SelectTrigger className='w-full'>
                      <SelectValue placeholder='Unknown' />
                    </SelectTrigger>
                    {isLoadingExpenseTypes ? (
                      <SelectContent>
                        <SelectItem value='unknown'>Unknown</SelectItem>
                      </SelectContent>
                    ) : (
                      <SelectContent>
                        {expenseTypes?.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    )}
                  </Select>
                </div>

                {/* Amount */}
                <div className='space-y-2'>
                  <Label htmlFor='amount'>
                    Amount <span className='text-red-500'>*</span>
                  </Label>
                  <div className='relative'>
                    <span className='text-muted-foreground pointer-events-none absolute inset-y-0 left-3 flex items-center'>
                      $
                    </span>
                    <Input
                      id='amount'
                      type='number'
                      step='0.01'
                      min='8.00'
                      max='30000.00'
                      placeholder='8.00'
                      value={form.amount}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, amount: e.target.value }))
                      }
                      className='pl-7'
                      required
                    />
                  </div>
                </div>

                {/* Entity Being Paid */}
                {form.expenseType !== 'Soft Costs' && (
                  <div className='space-y-2'>
                    <Label>
                      Entity Being Paid <span className='text-red-500'>*</span>
                    </Label>
                    <div className='flex gap-2'>
                      <div className='relative flex-1'>
                        <Input
                          placeholder='Search for a Contact'
                          value={showingContacts ? searchTerm : form.payeeName}
                          onFocus={() => setShowingContacts(true)}
                          onBlur={() => {
                            setTimeout(() => setShowingContacts(false), 150);
                          }}
                          className='w-full'
                          onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setShowingContacts(true);
                          }}
                        />
                        {showingContacts && (
                          <div className='bg-background absolute right-0 left-0 z-50 mt-1 rounded-md border shadow-lg'>
                            {isTyping || isLoadingContacts ? (
                              <div className='text-muted-foreground flex items-center gap-2 px-3 py-3 text-sm'>
                                <Loader2 className='h-3 w-3 animate-spin' />
                                Searching contacts...
                              </div>
                            ) : contacts && contacts.length > 0 ? (
                              <div className='max-h-60 overflow-auto py-1'>
                                {contacts.map((contact) => (
                                  <div
                                    key={contact.id}
                                    className={`cursor-pointer px-3 py-2 text-sm transition-colors ${
                                      form.payeeId === contact.id
                                        ? 'bg-accent text-accent-foreground'
                                        : 'hover:bg-accent/50'
                                    }`}
                                    onClick={() => {
                                      setForm((p) => ({
                                        ...p,
                                        payeeId: contact.id,
                                        payeeName: contact.full_name
                                      }));
                                      setSearchTerm('');
                                      setShowingContacts(false);
                                    }}
                                  >
                                    <div className='font-medium'>
                                      {contact.full_name}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : searchTerm.length > 0 ? (
                              <div className='text-muted-foreground px-3 py-3 text-sm'>
                                No contacts found for {searchTerm}
                              </div>
                            ) : (
                              <div className='text-muted-foreground px-3 py-3 text-sm'>
                                Start typing to search contacts
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <Button
                        type='button'
                        variant='outline'
                        className='shrink-0'
                        onClick={() => setIsOpenContactModal(true)}
                      >
                        <UserPlus2 className='mr-1' />
                        Add
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Second Row */}
              <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
                {/* Type */}
                <div className='space-y-2'>
                  <Label>Type</Label>
                  <Select
                    value={form.type}
                    onValueChange={(v) => setForm((p) => ({ ...p, type: v }))}
                  >
                    <SelectTrigger className='w-full'>
                      <SelectValue placeholder='Unknown' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='unknown'>Unknown</SelectItem>
                      <SelectItem value='service'>Service</SelectItem>
                      <SelectItem value='product'>Product</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Invoice Number */}
                <div className='space-y-2'>
                  <Label>Invoice Number</Label>
                  <Input
                    placeholder=''
                    value={form.invoiceNumber}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, invoiceNumber: e.target.value }))
                    }
                  />
                </div>

                {/* Invoice Attachment */}
                <div className='space-y-2'>
                  <Label>Invoice Attachment</Label>
                  {!form.attachment && (
                    <div className='flex items-center gap-3'>
                      <Select
                        value={form.attachmentId}
                        onValueChange={(v) =>
                          setForm((p) => ({ ...p, attachmentId: v }))
                        }
                      >
                        <SelectTrigger className='w-[300px]'>
                          <SelectValue placeholder='Select a Document' />
                        </SelectTrigger>
                        <SelectContent>
                          {initialDocuments &&
                            initialDocuments.length > 0 &&
                            initialDocuments.map((document) => (
                              <SelectItem key={document.id} value={document.id}>
                                {document.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <span className='text-muted-foreground text-sm'>or</span>
                      <Button
                        type='button'
                        variant='outline'
                        className='h-9 w-9 p-0'
                        onClick={handleFileClick}
                      >
                        <Upload />
                      </Button>
                      <input
                        ref={fileInputRef}
                        type='file'
                        className='hidden'
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            attachment: e.target.files?.[0] || null
                          }))
                        }
                      />
                    </div>
                  )}
                  {form.attachment && (
                    <div className='flex items-center gap-3'>
                      <div className='text-sm text-green-500'>
                        {form.attachment.name}
                      </div>
                      <Button
                        type='button'
                        variant='outline'
                        className='h-9 w-9 p-0 text-red-500'
                        onClick={() =>
                          setForm((p) => ({ ...p, attachment: null }))
                        }
                      >
                        <Trash />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Third Row */}
              <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
                {/* Date of Invoice */}
                <div className='space-y-2'>
                  <Label>Date of Invoice</Label>
                  <Input
                    type='date'
                    placeholder='mm/dd/yyyy'
                    value={form.invoiceDate}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, invoiceDate: e.target.value }))
                    }
                  />
                </div>

                {form.expenseType === 'Bill' && (
                  <>
                    <div className='space-y-2'>
                      <Label>Due Date</Label>
                      <Input
                        type='date'
                        placeholder='mm/dd/yyyy'
                        value={form.dueDate}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, dueDate: e.target.value }))
                        }
                      />
                    </div>

                    <div className='space-y-2'>
                      <Label>Bill No</Label>
                      <Input
                        type='text'
                        placeholder='Bill No'
                        value={form.billNo}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, billNo: e.target.value }))
                        }
                      />
                    </div>
                  </>
                )}
              </div>

              <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                <div className='col-span-1 space-y-2'>
                  <Label>Expense Description</Label>
                  <Input
                    value={form.expenseDescription}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        expenseDescription: e.target.value
                      }))
                    }
                  />
                </div>
                <div className='col-span-1 space-y-2'>
                  <Label>Memo</Label>
                  <Input
                    value={form.memo}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, memo: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className='space-y-2'>
                <Label>Notes</Label>
                <Textarea
                  rows={6}
                  value={form.notes}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, notes: e.target.value }))
                  }
                />
              </div>

              {/* Toggles */}
              <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
                <div className='col-span-1 space-y-2'>
                  <Label>
                    Create expense in QuickBooks?
                    <span className='text-red-500'>*</span>
                  </Label>
                  <ToggleGroup
                    type='single'
                    value={form.createInQuickBooks}
                    onValueChange={(v) =>
                      setForm((p) => ({
                        ...p,
                        createInQuickBooks: (v as any) || ''
                      }))
                    }
                    className='border-input border'
                  >
                    <ToggleGroupItem value='yes' className='px-6'>
                      Yes
                    </ToggleGroupItem>
                    <ToggleGroupItem value='no' className='px-6'>
                      No
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>
                <div className='col-span-1 space-y-2'>
                  <div className='text-muted-foreground text-sm'>
                    Selecting <span className='font-semibold'>NO</span> &
                    clicking the <span className='font-semibold'>Create</span>{' '}
                    button &gt; this expense{' '}
                    <span className='font-semibold'>WILL NOT</span> be sent to
                    QuickBooks.
                  </div>
                  <div className='text-muted-foreground text-sm'>
                    Selecting <span className='font-semibold'>YES</span> &
                    clicking the <span className='font-semibold'>Create</span>{' '}
                    button &gt; this expense will be{' '}
                    <span className='font-semibold'>SENT</span> to QuickBooks.
                  </div>
                </div>
              </div>
              <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
                <div className='col-span-1 space-y-2'>
                  <Label>Create Billing Item?</Label>
                  <ToggleGroup
                    type='single'
                    value={form.createBillingItem}
                    onValueChange={(v) =>
                      setForm((p) => ({
                        ...p,
                        createBillingItem: (v as any) || 'unknown'
                      }))
                    }
                    className='border-input border'
                  >
                    <ToggleGroupItem value='yes' className='p-4'>
                      Yes
                    </ToggleGroupItem>
                    <ToggleGroupItem value='no' className='p-4'>
                      No
                    </ToggleGroupItem>
                    <ToggleGroupItem value='unknown' className='p-4'>
                      Unknown
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>
                <div className='text-muted-foreground col-span-1 text-sm'>
                  Selecting <span className='font-semibold'>YES</span> will
                  create an billing item in Filevine&apos;s native Time &
                  Billing section, allowing you to recover the expense on the
                  next invoice to this client.
                </div>
              </div>
              {/* Payment Status */}
              <div className='border-t pt-4'>
                <Label className='mb-2 text-sm'>
                  Last Updated From QuickBooks
                </Label>
                <Input
                  type='text'
                  placeholder='Last Updated From QuickBooks'
                  value={form.lastUpdatedFromQuickBooks}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      lastUpdatedFromQuickBooks: e.target.value
                    }))
                  }
                />
              </div>

              {form.expenseType === 'Check' && (
                <div className='flex items-center justify-start gap-2 border-t border-border pt-4'>
                  <div className='space-y-2'>
                    <Label>Add Docs</Label>
                    {!form.copyOfCheck && (
                      <div className='flex items-center gap-3'>
                        <Select
                          value={form.copyOfCheckId}
                          onValueChange={(v) =>
                            setForm((p) => ({ ...p, copyOfCheckId: v }))
                          }
                        >
                          <SelectTrigger className='w-[300px]'>
                            <SelectValue placeholder='Select a Document' />
                          </SelectTrigger>
                          <SelectContent>
                            {initialDocuments &&
                              initialDocuments.length > 0 &&
                              initialDocuments.map((document) => (
                                <SelectItem
                                  key={document.id}
                                  value={document.id}
                                >
                                  {document.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <span className='text-muted-foreground text-sm'>
                          or
                        </span>
                        <Button
                          type='button'
                          variant='outline'
                          className='h-9 w-9 p-0'
                          onClick={handleFileClick}
                        >
                          <Upload />
                        </Button>
                        <input
                          ref={fileInputRef}
                          type='file'
                          className='hidden'
                          onChange={(e) =>
                            setForm((p) => ({
                              ...p,
                              copyOfCheck: e.target.files?.[0] || null
                            }))
                          }
                        />
                      </div>
                    )}
                    {form.copyOfCheck && (
                      <div className='flex items-center gap-3'>
                        <div className='text-sm text-green-500'>
                          {form.copyOfCheck.name}
                        </div>
                        <Button
                          type='button'
                          variant='outline'
                          className='h-9 w-9 p-0 text-red-500'
                          onClick={() =>
                            setForm((p) => ({ ...p, copyOfCheck: null }))
                          }
                        >
                          <Trash />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Footer Buttons (mirrors header for convenience on long forms) */}
              <div className='flex items-center justify-end gap-2 border-t border-border pt-4'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={onClose}
                  className='cursor-pointer'
                >
                  Close
                </Button>
                <Button
                  type='submit'
                  disabled={!canSubmit || !!loading}
                  className='cursor-pointer'
                >
                  {loading ? 'Creating…' : 'Create'}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
      <ContactModal
        open={isOpenContactModal}
        onOpenChange={setIsOpenContactModal}
        onCreate={handleCreateContact}
        availableTypes={contactTypes || []}
        selectedContact={null}
      />
    </>
  );
}
