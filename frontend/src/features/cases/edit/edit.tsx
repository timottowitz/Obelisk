'use client';

import { CaseForm } from '../create/case-form';
import { useCaseOperations } from '@/hooks/useCases';
import { CaseSidebar } from '../create/case-sidebar';
import { Loader2 } from 'lucide-react';

export default function Edit({ caseId }: { caseId: string }) {
  const { getCase } = useCaseOperations(caseId);
  const caseData = getCase.data;
  const caseLoading = getCase.isLoading;

  return (
    <div className='container mx-auto px-4 py-6'>
      <div className='grid grid-cols-1 gap-6 lg:grid-cols-3'>
        {/* Main Form - Left Side */}
        <div className='lg:col-span-2'>
          {caseLoading ? (
            <div className='flex items-center justify-center'>
              <Loader2 className='h-10 w-10 animate-spin' />
            </div>
          ) : (
            <CaseForm initialData={caseData} />
          )}
        </div>

        {/* Right Sidebar */}
        <div className='hidden lg:block'>
          <CaseSidebar />
        </div>
      </div>
    </div>
  );
}
