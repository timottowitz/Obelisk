'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Folder, Loader2 } from 'lucide-react';
import { CaseTypeCard } from './components/case-type-card';
import { CaseType } from '@/types/cases';
interface CaseTypesTabProps {
  caseTypes: CaseType[] | undefined;
  isLoading: boolean;
}

export function CaseTypesTab({ caseTypes, isLoading }: CaseTypesTabProps) {
  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-2xl font-bold text-gray-900'>Case Types</h2>
          <p className='text-gray-600'>
            Manage your legal case types and folder templates
          </p>
        </div>
      </div>

      {/* Case Types Grid */}
      <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
        {isLoading ? (
          <div className='col-span-full flex items-center justify-center py-12'>
            <Loader2 className='h-8 w-8 animate-spin text-gray-400' />
          </div>
        ) : (
          caseTypes?.map((caseType) => (
            <CaseTypeCard key={caseType.id} caseType={caseType} />
          ))
        )}
      </div>

      {/* Empty State */}
      {caseTypes?.length === 0 && !isLoading && (
        <Card className='border-0 bg-white/80 shadow-lg backdrop-blur-sm'>
          <CardContent className='flex flex-col items-center justify-center py-12'>
            <Folder className='mb-4 h-12 w-12 text-gray-400' />
            <h3 className='mb-2 text-lg font-medium text-gray-900'>
              No case types yet
            </h3>
            <p className='mb-4 text-center text-gray-600'>
              Create your first case type to get started with custom folder
              templates
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
