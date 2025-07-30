import CaseDetailsTable from './table';
import { documentsColumns } from './columns';
import { DocumentFilterGroup } from './components/filters';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';

export default function Documents() {
  return (
    <div className='flex flex-col gap-4'>
      <h2 className='text-2xl font-bold'>Documents</h2>
      {/* Document Filters */}
      <DocumentFilterGroup />
      {/* Document Table */}
      <div className='flex flex-row gap-4 border border-gray-200 p-2'>
        {/* Actions Dropdown */}
        <Select>
          <SelectTrigger className='h-3 w-40 rounded-md border border-gray-200 bg-white'>
            <SelectValue className='text-xs' placeholder='Actions' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='add-flag' className='text-xs'>
              Add Flag
            </SelectItem>
            <SelectItem value='remove-flag' className='text-xs'>
              Remove Flag
            </SelectItem>
            <SelectItem value='mark-all-as-read' className='text-xs'>
              Mark All as Read
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Action Links */}
        <div className='flex items-center gap-6'>
          <Button variant='outline' size='sm'>
            <svg
              className='h-3 w-3'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
              />
            </svg>
            Refresh
          </Button>

          <Button variant='outline' size='sm'>
            <svg
              className='h-3 w-3'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z'
              />
            </svg>
            Print Document List
          </Button>

          <Button variant='outline' size='sm'>
            <svg
              className='h-3 w-3'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
              />
            </svg>
            Download
          </Button>

          <a
            href='#'
            className='flex items-center gap-1 text-xs text-blue-600 transition-colors hover:text-blue-800'
          >
            <svg
              className='h-3 w-3'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
              />
            </svg>
            What is Clearbrief?
          </a>
        </div>
      </div>
      <CaseDetailsTable columns={documentsColumns} data={[]} />
    </div>
  );
}
