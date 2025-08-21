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
    <div className='overflow-hidden rounded-xl border border-border bg-card shadow dark:shadow-sm'>
      <Table>
        <TableHeader className='bg-accent text-accent-foreground dark:bg-muted dark:text-muted-foreground'>
          <TableRow className='border-b border-border'>
            {tableColumns.map((column) => (
              <TableHead
                key={column.key}
                className={cn(
                  'px-6 py-4 text-xs font-semibold tracking-wider uppercase text-accent-foreground dark:text-muted-foreground',
                  column.className
                )}
              >
                <div
                  className={cn(
                    'flex cursor-pointer items-center gap-2',
                    queryParams.sortBy === column.key && 'text-foreground'
                  )}
                  onClick={() => column.sortable && onChangeSort(column.key)}
                >
                  {column.label}
                  {queryParams.sortBy === column.key &&
                  queryParams.order === 'desc' ? (
                    <ChevronUp className={cn('ml-1 h-3 w-3', 'text-blue-600 dark:text-blue-400')} />
                  ) : (
                    <ChevronDown className={cn('ml-1 h-3 w-3', queryParams.sortBy === column.key ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground')} />
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
                  <div className='h-4 w-4 animate-spin rounded-full border-2 border-foreground/50 dark:border-muted-foreground border-t-transparent' />
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
                className='border-b border-border odd:bg-background even:bg-muted/40 hover:bg-accent/60 dark:odd:bg-card dark:even:bg-muted/30 dark:hover:bg-accent'
              >
                <TableCell className='px-6 py-4'>
                  <Link
                    href={`/dashboard/cases/${caseItem.id}`}
                    className='text-sm font-medium text-blue-500 underline hover:text-blue-500/80'
                  >
                    {caseItem.claimant.full_name.length > 23
                      ? caseItem.claimant.full_name.substring(0, 23) + '...'
                      : caseItem.claimant.full_name}
                  </Link>
                </TableCell>

                <TableCell className='px-6 py-4'>
                  <p className='text-sm font-medium text-foreground'>
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
                  <p className='text-sm text-foreground dark:text-muted-foreground'>
                    {caseItem.respondent.full_name.length > 23
                      ? caseItem.respondent.full_name.substring(0, 23) + '...'
                      : caseItem.respondent.full_name}
                  </p>
                </TableCell>

                <TableCell className='px-6 py-4'>
                  <Button
                    variant='link'
                    className='h-auto p-0 text-sm text-blue-500 underline hover:text-blue-500/80'
                  >
                    {caseItem.case_manager}
                  </Button>
                </TableCell>

                <TableCell className='px-6 py-4'>
                  <p className='text-sm text-foreground dark:text-muted-foreground'>
                    {caseItem.next_event || 'N/A'}
                  </p>
                </TableCell>

                <TableCell className='px-6 py-4'>
                  <div className='flex items-center gap-2'>
                    <Eye className='h-4 w-4 text-foreground/70 dark:text-muted-foreground' />
                    {caseItem.case_tasks_count > 0 && (
                      <span className='h-2 w-2 rounded-full bg-destructive' />
                    )}
                  </div>
                </TableCell>

                <TableCell className='px-6 py-4'>
                  <div className='flex items-center gap-2'>
                    <FileText className='h-4 w-4 text-foreground/70 dark:text-muted-foreground' />
                    {caseItem.documents_count > 0 && (
                      <span className='h-2 w-2 rounded-full bg-destructive' />
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
