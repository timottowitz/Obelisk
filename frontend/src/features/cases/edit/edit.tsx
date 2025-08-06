'use client';

import { useMemo } from 'react';
import { CaseForm } from '../form/case-form';
import { useGetCase } from '@/hooks/useCases';
import { Loader2 } from 'lucide-react';
import { useOrganization, useUser } from '@clerk/nextjs';

export default function EditCase({ caseId }: { caseId: string }) {
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
    <div className='w-[80%] mx-auto px-10 py-10'>
          {caseLoading ? (
            <div className='flex items-center justify-center'>
              <Loader2 className='h-10 w-10 animate-spin' />
            </div>
          ) : (
            <CaseForm initialData={caseData} />
          )}
    </div>
  );
}
