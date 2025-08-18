'use client';

import Link from 'next/link';
import { ChevronDown, ChevronUp, Eye, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Case } from '@/types/cases';

interface CasesTableProps {
  cases: Case[];
  isLoading: boolean;
  onChangeSort: (sort: string) => void;
  queryParams: any;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800';
    case 'settled (in...)':
      return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800';
    case 'awarded':
      return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-400 dark:border-purple-800';
    case 'inactive':
      return 'bg-muted text-muted-foreground border-border';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
};

const tableColumns = [
  {
    key: 'claimant',
    label: 'Claimant',
    sortable: true,
    className: 'w-[16.67%]'
  },
  {
    key: 'case_number',
    label: 'Case Number',
    sortable: true,
    className: 'w-[16.67%]'
  },
  { key: 'status', label: 'Status', sortable: true, className: 'w-[16.67%]' },
  {
    key: 'respondent',
    label: 'Respondent',
    sortable: true,
    className: 'w-[16.67%]'
  },
  {
    key: 'case_manager',
    label: 'Case Manager',
    sortable: true,
    className: 'w-[8.33%]'
  },
  {
    key: 'next_event',
    label: 'Next Event',
    sortable: true,
    className: 'w-[8.33%]'
  },
  { key: 'tasks', label: 'Tasks', sortable: true, className: 'w-[8.33%]' },
  { key: 'docs', label: 'Docs', sortable: true, className: 'w-[8.33%]' }
];

export function CasesTable({
  cases,
  isLoading,
  onChangeSort,
  queryParams
}: CasesTableProps) {
  return (
    <div className='overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm'>
      <Table>
        <TableHeader className='bg-gray-50'>
          <TableRow className='border-b border-gray-200'>
            {tableColumns.map((column) => (
              <TableHead
                key={column.key}
                className={cn(
                  'px-6 py-4 text-xs font-semibold tracking-wider text-gray-600 uppercase',
                  column.className
                )}
              >
                <div
                  className='flex cursor-pointer items-center gap-2'
                  onClick={() => column.sortable && onChangeSort(column.key)}
                >
                  {column.label}
                  {queryParams.sortBy === column.key &&
                  queryParams.order === 'desc' ? (
                    <ChevronUp className='ml-1 h-3 w-3' />
                  ) : (
                    <ChevronDown className='ml-1 h-3 w-3' />
                  )}
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell
                colSpan={tableColumns.length}
                className='py-4 text-center'
              >
                <div className='flex items-center justify-center'>
                  <div className='h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent' />
                </div>
              </TableCell>
            </TableRow>
          )}
          {!isLoading &&
            cases &&
            cases.length > 0 &&
            cases.map((caseItem) => (
              <TableRow
                key={caseItem.id}
                className='border-b border-gray-200 hover:bg-gray-50'
              >
                <TableCell className='px-6 py-4'>
                  <Link
                    href={`/dashboard/cases/${caseItem.id}`}
                    className='text-sm font-medium text-blue-600 underline hover:text-blue-800'
                  >
                    {caseItem.claimant.full_name.length > 35
                      ? caseItem.claimant.full_name.substring(0, 35) + '...'
                      : caseItem.claimant.full_name}
                  </Link>
                </TableCell>

                <TableCell className='px-6 py-4'>
                  <p className='text-sm font-medium text-gray-900'>
                    {caseItem.case_number}
                  </p>
                </TableCell>

                <TableCell className='px-6 py-4'>
                  <Badge
                    variant='outline'
                    className={cn(
                      'border px-2.5 py-1 text-xs font-medium',
                      getStatusColor(caseItem.status)
                    )}
                  >
                    {caseItem.status}
                  </Badge>
                </TableCell>

                <TableCell className='px-6 py-4'>
                  <p className='text-sm text-gray-700'>
                    {caseItem.respondent.full_name.length > 35
                      ? caseItem.respondent.full_name.substring(0, 35) + '...'
                      : caseItem.respondent.full_name}
                  </p>
                </TableCell>

                <TableCell className='px-6 py-4'>
                  <Button
                    variant='link'
                    className='h-auto p-0 text-sm text-blue-600 underline hover:text-blue-800'
                  >
                    {caseItem.case_manager}
                  </Button>
                </TableCell>

                <TableCell className='px-6 py-4'>
                  <p className='text-sm text-gray-700'>
                    {caseItem.next_event || 'N/A'}
                  </p>
                </TableCell>

                <TableCell className='px-6 py-4'>
                  <div className='flex items-center gap-2'>
                    <Eye className='h-4 w-4 text-gray-400' />
                    {caseItem.case_tasks_count > 0 && (
                      <span className='h-2 w-2 rounded-full bg-red-500' />
                    )}
                  </div>
                </TableCell>

                <TableCell className='px-6 py-4'>
                  <div className='flex items-center gap-2'>
                    <FileText className='h-4 w-4 text-gray-400' />
                    {caseItem.documents_count > 0 && (
                      <span className='h-2 w-2 rounded-full bg-red-500' />
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          {!isLoading && cases && cases.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={tableColumns.length}
                className='py-4 text-center'
              >
                No cases found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
