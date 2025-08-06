'use client';

import { CaseTypesTab } from '@/features/settings/case-types-tab';
import { useCasesOperations } from '@/hooks/useCases';

export default function CaseTypesPage() {
  const { caseTypes } = useCasesOperations();
  const caseTypesData = caseTypes.data;
  return (
    <div className='max-h-[calc(100vh-100px)] space-y-6 overflow-y-auto p-10'>
      <CaseTypesTab caseTypes={caseTypesData} isLoading={caseTypes.isLoading} />
    </div>
  );
}
