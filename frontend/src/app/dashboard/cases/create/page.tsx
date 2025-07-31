'use client';

import { GavelIcon, CircleAlertIcon, Link } from 'lucide-react';
import { CaseForm } from '@/features/cases/create/case-form';
import { CaseSidebar } from '@/features/cases/create/case-sidebar';

export default function CreateCasePage() {
  return (
    <div className='h-[calc(100vh-4rem)] overflow-y-auto'>
      <div className='container mx-auto px-4 py-6'>
        <div className='mb-4 flex items-center gap-2'>
          <div className='flex h-15 w-15 items-center justify-center bg-red-100'>
            <GavelIcon className='h-15 w-15 p-2 text-red-600' />
          </div>
          <div>
            <h2 className='text-xl font-semibold'>File A New Case</h2>
            <div className='mt-1 flex items-center gap-1 text-sm text-gray-600'>
              <CircleAlertIcon className='h-4 w-4' />
              <span>
                All fields marked as <p className='inline text-red-500'>*</p>{' '}
                are required.
              </span>
            </div>
          </div>
        </div>
        <div className='grid grid-cols-1 gap-6 lg:grid-cols-3'>
          {/* Main Form - Left Side */}
          <div className='lg:col-span-2'>
            <CaseForm />
          </div>

          {/* Right Sidebar */}
          <div className='hidden lg:block'>
            <CaseSidebar />
          </div>
        </div>
      </div>
    </div>
  );
}
