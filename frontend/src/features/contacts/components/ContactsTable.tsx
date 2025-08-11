import React, { useCallback, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from '@/components/ui/pagination';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import ContactAvatar from './ContactAvatar';
import PhoneDisplay from './PhoneDisplay';
import { Contact, PhoneEntry } from '@/types/contacts';

interface ContactsTableProps {
  contacts: Contact[];
  selectedContact: Contact | null;
  onContactSelect: (contact: Contact) => void;
  currentPage: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
}

const getPhones = (c: Contact): PhoneEntry[] => {
  if (c.phoneNumbers && c.phoneNumbers.length) {
    return c.phoneNumbers.map((p) =>
      typeof p === 'string' ? { type: 'other' as const, value: p } : p
    );
  }
  return [];
};

export default function ContactsTable({
  contacts,
  selectedContact,
  onContactSelect,
  currentPage,
  pageSize,
  totalCount,
  onPageChange
}: ContactsTableProps) {
  const [phoneIndexes, setPhoneIndexes] = useState<Record<string, number>>({});
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  const cyclePhone = useCallback(
    (id: string, phonesLen: number, delta: number) => {
      if (phonesLen <= 1) return;
      setPhoneIndexes((prev) => {
        const current = prev[id] ?? 0;
        const next = (current + delta + phonesLen) % phonesLen;
        return { ...prev, [id]: next };
      });
    },
    []
  );

  const pageNumbers = React.useMemo(() => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  }, [totalPages, currentPage]);

  return (
    <div className='bg-card overflow-hidden rounded-lg border-2'>
      <Table className='text-sm'>
        <TableHeader>
          <TableRow className='bg-muted/40 text-muted-foreground text-xs tracking-wide uppercase'>
            <TableHead className='w-[45%] md:w-[35%]'>Name</TableHead>
            <TableHead className='w-[30%] md:w-[35%]'>Address</TableHead>
            <TableHead className='w-[15%] md:w-[15%]'>Email</TableHead>
            <TableHead className='w-[15%] md:w-[15%]'>Phone</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.map((c) => (
            <TableRow
              key={c.id}
              data-state={selectedContact?.id === c.id ? 'selected' : undefined}
              className={cn(
                'cursor-pointer',
                selectedContact?.id === c.id &&
                  'border-2 border-blue-300 border-t-0 border-x-0 last:!border-b-2 last:!border-blue-300'
              )}
              onClick={() => onContactSelect(c)}
            >
              <TableCell>
                <div className='flex items-center gap-3'>
                  <ContactAvatar name={c.name} size='sm' />
                  <div className='min-w-0'>
                    <div className='flex min-w-0 items-center gap-2'>
                      <div className='text-foreground font-medium break-words whitespace-normal'>
                        {c.name}
                      </div>
                      <Badge
                        variant='outline'
                        className='shrink-0 border-sky-200 bg-sky-100 text-sky-700 dark:border-sky-800 dark:bg-sky-900/30 dark:text-sky-300'
                      >
                        {c.type}
                      </Badge>
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell className='text-muted-foreground'>
                <div className='truncate whitespace-nowrap' title={c.address}>
                  {c.address}
                </div>
              </TableCell>
              <TableCell className='text-sky-700 dark:text-sky-400'>
                <div
                  className='truncate whitespace-nowrap'
                  title={c.email ?? ''}
                >
                  {c.email ?? '—'}
                </div>
              </TableCell>
              <TableCell className='text-sky-700 dark:text-sky-400'>
                <PhoneDisplay
                  phones={getPhones(c)}
                  currentIndex={phoneIndexes[c.id] ?? 0}
                  onCyclePhone={(delta) =>
                    cyclePhone(c.id, getPhones(c).length, delta)
                  }
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className='bg-card/50 border-t p-3'>
        <div className='flex items-center justify-between'>
          <span className='text-muted-foreground text-xs sm:text-sm'>
            Showing {(currentPage - 1) * pageSize + 1} -
            {` ${Math.min(currentPage * pageSize, totalCount)} of ${totalCount} contacts`}
          </span>
          {totalPages > 1 && (
            <div className='ml-auto'>
              <Pagination className='justify-end'>
                <PaginationContent className='flex items-center gap-1'>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => onPageChange(currentPage - 1)}
                      className={cn(
                        currentPage === 1
                          ? 'pointer-events-none opacity-50'
                          : 'cursor-pointer'
                      )}
                    />
                  </PaginationItem>
                  <div className='hidden items-center gap-1 sm:flex'>
                    {pageNumbers.map((page, index) => (
                      <PaginationItem key={`${page}-${index}`}>
                        {page === '...' ? (
                          <span className='text-muted-foreground px-3'>
                            ...
                          </span>
                        ) : (
                          <PaginationLink
                            onClick={() => onPageChange(Number(page))}
                            className={cn(
                              'cursor-pointer',
                              currentPage === Number(page)
                                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                                : 'hover:bg-accent hover:text-accent-foreground'
                            )}
                          >
                            {page}
                          </PaginationLink>
                        )}
                      </PaginationItem>
                    ))}
                  </div>
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => onPageChange(currentPage + 1)}
                      className={cn(
                        currentPage === totalPages
                          ? 'pointer-events-none opacity-50'
                          : 'cursor-pointer'
                      )}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
