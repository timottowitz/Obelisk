'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  FolderOpen,
  Search,
  ChevronDown,
  CheckCircle,
  FileText,
  Receipt,
  Pencil,
  Trash
} from 'lucide-react';
import Link from 'next/link';
import { useCasesOperations } from '@/hooks/useCases';
import { useRouter } from 'next/navigation';
import { AlertModal } from '@/components/modal/alert-modal';
import { toast } from 'sonner';
import {
  SelectItem,
  SelectContent,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Select } from '@/components/ui/select';

export default function CasesPage() {
  const { getCases, deleteCase } = useCasesOperations();
  const casesData = getCases.data;
  const casesLoading = getCases.isLoading;
  const casesError = getCases.error;
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();
  const getStatusBadge = (status: string) => {
    if (status === 'Active') {
      return (
        <Badge className='bg-blue-100 text-blue-800 hover:bg-blue-100'>
          Active
        </Badge>
      );
    }
    return <span className='text-gray-600'>{status}</span>;
  };

  const [isOpen, setIsOpen] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const handleConfirmDelete = async () => {
    if (selectedCaseId) {
      await deleteCase.mutateAsync(selectedCaseId);
      toast.success('Case deleted successfully');
    }
    setIsOpen(false);
  };

  return (
    <div className='h-[calc(100vh-4rem)] overflow-y-auto bg-gray-50'>
      {/* Header */}
      <div className='border-b border-gray-200 bg-white px-6 py-4'>
        <div className='flex items-center space-x-3'>
          <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-red-100'>
            <FolderOpen className='h-6 w-6 text-red-600' />
          </div>
          <h1 className='text-2xl font-bold text-gray-900'>My Cases</h1>
        </div>
      </div>

      {/* Controls */}
      <div className='border-b border-gray-200 bg-white px-6 py-4'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center space-x-4'>
            {/* Search */}
            <div className='relative'>
              <Search className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400' />
              <Input
                placeholder='Find by keyword or number'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className='w-80 pl-10'
              />
            </div>

            {/* Filter */}
            <Select
              onValueChange={(value) => setStatusFilter(value)}
              value={statusFilter}
            >
              <SelectTrigger className='w-40'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All Cases</SelectItem>
                <SelectItem value='active'>Active</SelectItem>
                <SelectItem value='settled'>Settled</SelectItem>
                <SelectItem value='awarded'>Awarded</SelectItem>
                <SelectItem value='inactive'>Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Switch View Button */}
          <Button variant='outline' className='flex items-center space-x-2'>
            Switch to Recently Filed Cases
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className='bg-white'>
        <div className='px-6 py-4'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className='text-center font-semibold text-gray-900'>
                  Case Number
                  <ChevronDown className='ml-1 inline h-4 w-4' />
                </TableHead>
                <TableHead className='text-center font-semibold text-gray-900'>
                  Status
                  <ChevronDown className='ml-1 inline h-4 w-4' />
                </TableHead>
                <TableHead className='text-center font-semibold text-gray-900'>
                  Claimant
                  <ChevronDown className='ml-1 inline h-4 w-4' />
                </TableHead>
                <TableHead className='text-center font-semibold text-gray-900'>
                  Respondent
                  <ChevronDown className='ml-1 inline h-4 w-4' />
                </TableHead>
                <TableHead className='text-center font-semibold text-gray-900'>
                  Case Manager
                  <ChevronDown className='ml-1 inline h-4 w-4' />
                </TableHead>
                <TableHead className='text-center font-semibold text-gray-900'>
                  Tasks
                </TableHead>
                <TableHead className='text-center font-semibold text-gray-900'>
                  Docs
                </TableHead>
                <TableHead className='text-center font-semibold text-gray-900'>
                  Invoices
                </TableHead>
                <TableHead className='text-center font-semibold text-gray-900'>
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {casesLoading ? (
                <TableRow>
                  <TableCell colSpan={10} className='text-center'>
                    Loading...
                  </TableCell>
                </TableRow>
              ) : casesError ? (
                <TableRow>
                  <TableCell colSpan={10} className='text-center'>
                    Error loading cases
                  </TableCell>
                </TableRow>
              ) : (
                casesData?.cases
                  .filter((caseItem) => {
                    if (statusFilter === 'all') return true;
                    return caseItem.status === statusFilter;
                  })
                  .map((caseItem) => (
                    <TableRow key={caseItem.id} className='hover:bg-gray-50'>
                      <TableCell className='text-center'>
                        <Link
                          href={`/dashboard/cases/${caseItem.id}`}
                          className='text-blue-600 underline hover:text-blue-800'
                        >
                          {caseItem.case_number}
                        </Link>
                      </TableCell>
                      <TableCell className='text-center'>
                        {getStatusBadge(caseItem.status)}
                      </TableCell>
                      <TableCell className='text-center text-gray-900'>
                        {caseItem.claimant}
                      </TableCell>
                      <TableCell className='text-center text-gray-900'>
                        {caseItem.respondent}
                      </TableCell>
                      <TableCell className='text-center'>
                        <Link
                          href='#'
                          className='text-blue-600 underline hover:text-blue-800'
                        >
                          {caseItem.case_manager}
                        </Link>
                      </TableCell>
                      <TableCell className='text-center'>
                        <div className='flex items-center justify-center'>
                          <CheckCircle className='h-5 w-5 text-green-600' />
                        </div>
                      </TableCell>
                      <TableCell className='text-center'>
                        <div className='relative flex items-center justify-center'>
                          <FileText className='h-5 w-5 text-gray-600' />
                        </div>
                      </TableCell>
                      <TableCell className='text-center'>
                        <div className='flex items-center justify-center'>
                          <Receipt className='h-5 w-5 text-gray-600' />
                        </div>
                      </TableCell>
                      <TableCell className='flex items-center justify-center gap-2 text-center'>
                        <Button
                          variant='outline'
                          className='flex cursor-pointer items-center space-x-2'
                          onClick={() =>
                            router.push(`/dashboard/cases/${caseItem.id}/edit`)
                          }
                        >
                          <Pencil className='h-4 w-4' />
                          Edit
                        </Button>
                        <Button
                          variant='outline'
                          className='flex cursor-pointer items-center space-x-2'
                          onClick={() => {
                            setIsOpen(true);
                            setSelectedCaseId(caseItem.id);
                          }}
                        >
                          <Trash className='h-4 w-4 text-red-500' />
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      <AlertModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onConfirm={handleConfirmDelete}
        loading={false}
        deleteTargetType='case'
      />
    </div>
  );
}
