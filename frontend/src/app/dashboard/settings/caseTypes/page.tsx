'use client';

import { CaseTypesTab } from '@/features/settings/case-types-tab';
import { useCasesOperations } from '@/hooks/useCases';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function CaseTypesPage() {
  const { caseTypes } = useCasesOperations();
  const caseTypesData = caseTypes.data;
  return (
    <div className='max-h-[calc(100vh-100px)] space-y-6 overflow-y-auto p-10'>
      <Button
        onClick={() => window.history.back()}
        className='cursor-pointer'
      >
        <ArrowLeft className='mr-2 h-4 w-4' />
        Back to Settings
      </Button>
      <CaseTypesTab caseTypes={caseTypesData} isLoading={caseTypes.isLoading} />
    </div>
  );
}
