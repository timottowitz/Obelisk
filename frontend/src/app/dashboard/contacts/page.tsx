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

const MOCK_CONTACTS: Contact[] = [
  {
    id: '1',
    name: 'A Better Life Chiropractic',
    type: 'Medical Provider',
    address: 'PO Box 53218, Cincinnati, OH 45253-0218',
    email: 'drsmith@abetterchiro.com',
    phoneNumbers: [
      { type: 'main', value: '(513) 385-2273' },
      { type: 'fax', value: '(513) 385-2603' }
    ],
    tags: ['Chiropractic', 'Medical']
  },
  {
    id: '2',
    name: 'A&W Reporting',
    type: 'Business',
    address: 'P.O. Box 271078, Flower Mound, TX 75027',
    email: 'transcripts@aw-reporting.com',
    phoneNumbers: [{ type: 'work', value: '(940) 735-1340' }],
    tags: ['Reporting']
  },
  {
    id: '3',
    name: 'A-Medical Advantage Healthcare System',
    type: 'Medical Provider',
    address: '214 Colorado Blvd., Dallas, TX 75208',
    phoneNumbers: [
      { type: 'main', value: '(214) 941-4550' },
      { type: 'other', value: '(214) 555-0199' }
    ],
    tags: ['Healthcare']
  },
  {
    id: '4',
    name: 'AAA Insurance',
    type: 'Insurance Company',
    address: '5709B Denton Hwy, Haltom City, TX 76148',
    phoneNumbers: [
      { type: 'work', value: '(817) 656-0104' },
      { type: 'workMobile', value: '(800) 672-5246' }
    ],
    tags: ['Insurance']
  },
  {
    id: '5',
    name: 'AARP Medicare Advantage',
    type: 'Insurance Company',
    address: 'PO Box 30508, Salt Lake City, UT',
    phoneNumbers: [
      { type: 'home', value: '(800) 950-9355' },
      { type: 'other', value: '(800) 950-9356' }
    ],
    tags: ['Medicare']
  },
  {
    id: '6',
    name: 'Abacus',
    type: 'Business',
    address: 'Suite 200, 1020 Main St, Dallas, TX 75202',
    email: 'info@abacus.example',
    phoneNumbers: [{ type: 'work', value: '(469) 970-8582' }]
  },
  {
    id: '7',
    name: 'AAA Wrecker',
    type: 'Business',
    address: '120 Service Rd, Irving, TX 75038',
    phoneNumbers: [
      { type: 'work', value: '(214) 623-7182' },
      { type: 'workMobile', value: '(214) 555-8888' }
    ]
  },
  {
    id: '8',
    name: 'AAA Remodeling & Development',
    type: 'Business',
    address: '451 Builder Ave, Plano, TX 75074',
    email: 'contact@aaard.dev'
  },
  {
    id: '9',
    name: 'Aashvi',
    type: 'Person',
    address: 'PO Box 9002, Austin, TX 78767'
  },
  {
    id: '10',
    name: 'Lexa Abadie',
    type: 'Client',
    address: 'Minor Child',
    email: 'Bennettinjury@bill.com'
  },
  {
    id: '11',
    name: 'Zuka Abamba',
    type: 'Person',
    address: '750 Aspen Ct, Allen, TX 75002',
    email: 'zuka@example.com',
    phoneNumbers: ['(214) 222-1001']
  },
  {
    id: '12',
    name: 'Yousuf Abbas',
    type: 'Client',
    address: '305 Melba Street, Apt. 1201, Dallas, TX 75208',
    email: 'yousuf.abbas@example.com',
    phoneNumbers: [{ type: 'cell', value: '(469) 525-6265' }]
  },
  {
    id: '13',
    name: 'Ali Abderrahman',
    type: 'Client',
    address: '7450 Coronado Ave, #207, Dallas, TX 75214',
    email: 'ali.abderrahman@example.com',
    phoneNumbers: [{ type: 'cell', value: '(469) 525-6265' }]
  },
  {
    id: '14',
    name: 'Ali Rahim Abderrahman',
    type: 'Client',
    address: '1749 Oates Dr, #314, Mesquite, TX 75150',
    email: 'alirahimrahman@gmail.com',
    phoneNumbers: ['(469) 525-6265']
  },
  {
    id: '15',
    name: 'Denise Lashell Abdulazeez',
    type: 'Client',
    address: '221 Park Ln, Richardson, TX 75081',
    email: 'dlburns85@yahoo.com',
    phoneNumbers: ['(469) 970-8582']
  },
  {
    id: '16',
    name: 'Able Insurance Group',
    type: 'Business',
    address: '300 Able Way, Fort Worth, TX 76102',
    email: 'support@able-ins.com'
  },
  {
    id: '17',
    name: 'A1 Imaging Dallas',
    type: 'Medical Provider',
    address: '900 Scan Blvd, Dallas, TX 75201',
    phoneNumbers: [
      { type: 'work', value: '(214) 555-0111' },
      { type: 'fax', value: '(214) 555-0222' }
    ]
  },
  {
    id: '18',
    name: 'Aero Dental',
    type: 'Medical Provider',
    address: '1800 Smile St, Garland, TX 75040',
    email: 'frontdesk@aerodental.example'
  },
  {
    id: '19',
    name: 'Allstate Insurance - Dallas',
    type: 'Insurance Company',
    address: '200 Policy Pl, Dallas, TX 75203',
    phoneNumbers: ['(972) 555-0202']
  },
  {
    id: '20',
    name: 'Alpha Reporting',
    type: 'Business',
    address: '77 Court Ave, Fort Worth, TX 76104',
    email: 'alpha@reporting.example'
  },
  {
    id: '21',
    name: 'Apex Rehab Center',
    type: 'Medical Provider',
    address: '990 Recovery Rd, Arlington, TX 76010',
    phoneNumbers: ['(817) 555-0303']
  },
  {
    id: '22',
    name: 'Atlas Legal Services',
    type: 'Business',
    address: '120 Justice Dr, Dallas, TX 75219',
    email: 'hello@atlaslegal.example'
  },
  {
    id: '23',
    name: 'Aurora Clinic',
    type: 'Medical Provider',
    address: '400 Sunrise Way, Richardson, TX 75080'
  },
  {
    id: '24',
    name: 'Avion Law',
    type: 'Business',
    address: '1500 Flight St, Addison, TX 75001',
    phoneNumbers: ['(469) 555-1212']
  },
  {
    id: '25',
    name: 'Azure Diagnostics',
    type: 'Medical Provider',
    address: '88 Cloud Cir, Plano, TX 75024'
  },
  {
    id: '26',
    name: 'Belmont Orthopedics',
    type: 'Medical Provider',
    address: '321 Ortho Pkwy, Dallas, TX 75231'
  },
  {
    id: '27',
    name: 'Brightview Therapy',
    type: 'Medical Provider',
    address: '60 Wellness Ln, Frisco, TX 75034'
  },
  {
    id: '28',
    name: 'Cardinal Insurance',
    type: 'Insurance Company',
    address: '12 Redbird Rd, Allen, TX 75013'
  },
  {
    id: '29',
    name: 'Cedar Health',
    type: 'Medical Provider',
    address: '45 Cedar Ave, Dallas, TX 75206'
  },
  {
    id: '30',
    name: 'ClearSight Optometry',
    type: 'Medical Provider',
    address: '101 Vision Blvd, Plano, TX 75075'
  }
];

export default function ContactsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [queryParams, setQueryParams] = useState({
    search: searchParams.get('search') ?? '',
    page: Number(searchParams.get('page')) ?? 1,
    sortBy: (searchParams.get('sortBy') ?? 'first') as 'first' | 'last',
    typeFilter: searchParams.get('typeFilter') ?? 'all'
  });

  const handleQueryChange = useCallback(
    (key: string, value: string) => {
      setQueryParams({ ...queryParams, [key]: value });
    },
    [queryParams]
  );

  const debouncedSearch = useDebounce(queryParams.search, 1000);

  useEffect(() => {
    setQueryParams({
      ...queryParams,
      page: 1
    });
  }, [debouncedSearch, queryParams.sortBy, queryParams.typeFilter]);

  useEffect(() => {
    router.push(
      `/dashboard/contacts?search=${debouncedSearch}&page=${queryParams.page}&sortBy=${queryParams.sortBy}&typeFilter=${queryParams.typeFilter}`
    );
  }, [
    debouncedSearch,
    queryParams.page,
    queryParams.sortBy,
    queryParams.typeFilter
  ]);

  const [selected, setSelected] = useState<Contact | null>(null);
  const pageSize = 10;

  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    const base = MOCK_CONTACTS.filter((c) =>
      [c.name, c.type, c.address, c.email]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
    const typeFiltered =
      queryParams.typeFilter === 'all'
        ? base
        : base.filter((c) => c.type === queryParams.typeFilter);
    const sorted = [...typeFiltered].sort((a, b) => {
      const getKey = (name: string) => {
        const parts = name.trim().split(/\s+/);
        if (queryParams.sortBy === 'first') return parts[0] ?? '';
        return parts[parts.length - 1] ?? parts[0] ?? '';
      };
      return getKey(a.name).localeCompare(getKey(b.name));
    });
    return sorted;
  }, [debouncedSearch, queryParams.sortBy, queryParams.typeFilter]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;

  const pagedData = useMemo(() => {
    const start = (queryParams.page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, queryParams.page, pageSize]);

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

  const availableTypes = useMemo(
    () => Array.from(new Set(MOCK_CONTACTS.map((c) => c.type))),
    []
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
            availableTypes={availableTypes}
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
              contacts={pagedData}
              selectedContact={selected}
              onContactSelect={handleRowClick}
              currentPage={queryParams.page}
              pageSize={pageSize}
              totalCount={filtered.length}
              onPageChange={handlePageChange}
            />
          </div>

          {selected && <ContactDetails contact={selected} />}
        </div>
      </div>
    </PageContainer>
  );
}
