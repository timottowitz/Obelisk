'use client';

import { CaseForm } from '@/features/cases/form/case-form';

export default function CreateCasePage() {
  return (
    <div className='h-[calc(100vh-4rem)] overflow-y-auto'>
      <div className='w-[80%] mx-auto px-10 py-10'>
        <CaseForm />
      </div>
    </div>
  );
}
