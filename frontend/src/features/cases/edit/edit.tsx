'use client';

import { useMemo } from 'react';
import { CaseForm } from '../create/case-form';
import { useGetCase } from '@/hooks/useCases';
import { CaseSidebar } from '../create/case-sidebar';
import { Loader2 } from 'lucide-react';
import { useOrganization, useUser } from '@clerk/nextjs';

export default function Edit({ caseId }: { caseId: string }) {
  const { data: caseData, isLoading: caseLoading } = useGetCase(caseId);
  const { organization } = useOrganization();
  const { user } = useUser();
  const role = useMemo(
    () =>
      user?.organizationMemberships.find(
        (membership) => membership.organization.id === organization?.id
      )?.role,
    [user, organization]
  );

  if (role === 'org:member' && caseData?.access === 'admin_only') {
    return (
      <div className='flex h-screen justify-center py-10'>
        <div className='text-2xl font-bold'>
          You are not authorized to edit this case
        </div>
      </div>
    );
  }

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
