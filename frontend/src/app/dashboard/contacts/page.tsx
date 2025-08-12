'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PageContainer from '@/components/layout/page-container';
import { Heading } from '@/components/ui/heading';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import ContactFilters from '../../../features/contacts/components/contact-filters';
import ContactActions from '../../../features/contacts/components/contact-actions';
import ContactsTable from '../../../features/contacts/components/contacts-table';
import ContactDetails from '../../../features/contacts/components/contact-details';
import { Contact } from '@/types/contacts';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDebounce } from '@/hooks/use-debounce';
import {
  useContactTypes,
  useContacts,
  useCreateContact,
  useDeleteContact,
  useUpdateContact,
  useArchiveContact
} from '@/hooks/useContacts';
import ContactModal from '@/features/contacts/components/contact-modal';
import { toast } from 'sonner';
import { AlertModal } from '@/components/modal/alert-modal';

export default function ContactsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const createContact = useCreateContact();
  const updateContact = useUpdateContact();
  const deleteContact = useDeleteContact();
  const archiveContact = useArchiveContact();
  const [queryParams, setQueryParams] = useState({
    search: searchParams.get('search') ?? '',
    page: Number(searchParams.get('page')) ?? 1,
    sortBy: (searchParams.get('sortBy') ?? 'asc') as 'asc' | 'desc',
    typeFilter: searchParams.get('typeFilter') ?? 'all',
    archived: searchParams.get('archived') ?? 'false'
  });
  const debouncedSearch = useDebounce(queryParams.search, 1000);
  const { data: contacts, isLoading } = useContacts(
    queryParams.page,
    queryParams.sortBy,
    queryParams.typeFilter,
    queryParams.archived,
    debouncedSearch
  );

  const handleQueryChange = useCallback(
    (key: string, value: string) => {
      setQueryParams({ ...queryParams, [key]: value });
    },
    [queryParams]
  );

  useEffect(() => {
    setQueryParams({
      ...queryParams,
      page: 1
    });
  }, [
    debouncedSearch,
    queryParams.sortBy,
    queryParams.typeFilter,
    queryParams.archived
  ]);

  useEffect(() => {
    router.push(
      `/dashboard/contacts?search=${debouncedSearch}&page=${queryParams.page}&sortBy=${queryParams.sortBy}&typeFilter=${queryParams.typeFilter}&archived=${queryParams.archived}`
    );
  }, [
    debouncedSearch,
    queryParams.page,
    queryParams.sortBy,
    queryParams.typeFilter,
    queryParams.archived
  ]);

  const [selected, setSelected] = useState<Contact | null>(null);
  const [open, setOpen] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const pageSize = 5;

  const totalPages = Math.ceil((contacts?.count ?? 0) / pageSize) || 1;

  const handlePageChange = useCallback(
    (page: number) => {
      if (page < 1 || page > totalPages) return;
      setQueryParams({ ...queryParams, page });
    },
    [totalPages]
  );

  const handleRowClick = useCallback((contact: Contact) => {
    setSelected(contact);
  }, []);

  const { data: contactTypes, isLoading: contactTypesLoading } =
    useContactTypes();

  const handleAddNew = useCallback(() => {
    setOpen(true);
  }, []);

  const handleEdit = useCallback((contact: Contact) => {
    setSelected(contact);
    setOpen(true);
  }, []);

  const handleCreateContact = useCallback(
    async (formData: any) => {
      try {
        await createContact.mutateAsync(formData);
        toast.success('Contact created successfully');
      } catch (error) {
        console.error('Error creating contact:', error);
        toast.error('Error creating contact');
      }
    },
    [createContact]
  );

  const handleUpdateContact = useCallback(
    async (contactId: string, formData: any) => {
      try {
        await updateContact.mutateAsync({ contactId, contact: formData });
        toast.success('Contact updated successfully');
      } catch (error) {
        console.error('Error updating contact:', error);
        toast.error('Error updating contact');
      }
    },
    [updateContact]
  );

  const handleDeleteContact = useCallback(
    async (contactId: string) => {
      try {
        await deleteContact.mutateAsync(contactId);
        toast.success('Contact deleted successfully');
        setSelected(null);
      } catch (error) {
        console.error('Error deleting contact:', error);
        toast.error('Error deleting contact');
      }
    },
    [deleteContact]
  );

  const handleArchiveContact = useCallback(
    async (contactId: string) => {
      try {
        await archiveContact.mutateAsync(contactId);
        toast.success('Contact archived successfully');
      } catch (error) {
        console.error('Error archiving contact:', error);
        toast.error('Error archiving contact');
      }
    },
    [archiveContact]
  );

  return (
    <PageContainer scrollable={true}>
      <div className='mt-4 flex w-full flex-col'>
        <div className='flex items-center justify-between'>
          <Heading
            title='Address Book'
            description='Find and manage contacts'
          />
        </div>

        <Separator />

        <div className='my-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
          <ContactFilters
            queryParams={queryParams}
            onQueryChange={handleQueryChange}
            availableTypes={contactTypes ?? []}
            isLoading={contactTypesLoading}
          />

          <ContactActions
            selectedContact={selected}
            onEdit={handleEdit}
            onArchive={() => handleArchiveContact(selected?.id ?? '')}
            onDelete={() => setOpenDelete(true)}
            onAddNew={handleAddNew}
            onInfo={() => console.log('Show info')}
          />
        </div>

        <Separator />

        <div className='my-4 grid grid-cols-1 gap-3 md:grid-cols-12'>
          <div
            className={cn(
              'bg-card overflow-hidden rounded-lg border-2',
              selected ? 'md:col-span-9' : 'md:col-span-12'
            )}
          >
            <ContactsTable
              contacts={contacts?.data ?? []}
              isLoading={isLoading}
              selectedContact={selected}
              onContactSelect={handleRowClick}
              currentPage={queryParams.page}
              pageSize={pageSize}
              totalCount={contacts?.count ?? 0}
              onPageChange={handlePageChange}
            />
          </div>

          {selected && <ContactDetails contact={selected} />}
        </div>
        <ContactModal
          open={open}
          onOpenChange={setOpen}
          onCreate={handleCreateContact}
          onUpdate={handleUpdateContact}
          availableTypes={contactTypes ?? []}
          selectedContact={selected}
        />
        {selected && (
          <AlertModal
            isOpen={openDelete}
            onClose={() => setOpenDelete(false)}
            onConfirm={() => handleDeleteContact(selected?.id ?? '')}
            loading={deleteContact.isPending}
            deleteTargetType='contact'
          />
        )}
      </div>
    </PageContainer>
  );
}
