'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PageContainer from '@/components/layout/page-container';
import { Heading } from '@/components/ui/heading';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import ContactFilters from '../../../features/contacts/components/ContactFilters';
import ContactActions from '../../../features/contacts/components/ContactActions';
import ContactsTable from '../../../features/contacts/components/ContactsTable';
import ContactDetails from '../../../features/contacts/components/ContactDetails';
import { Contact } from '@/types/contacts';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDebounce } from '@/hooks/use-debounce';
import { useContactTypes, useContacts } from '@/hooks/useContacts';

export default function ContactsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
            onEdit={() => console.log('Edit', selected)}
            onArchive={() => console.log('Archive', selected)}
            onDelete={() => console.log('Delete', selected)}
            onAddNew={() => console.log('Add new contact')}
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
      </div>
    </PageContainer>
  );
}
