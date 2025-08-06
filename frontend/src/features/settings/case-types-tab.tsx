'use client';

import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Folder, Plus, Loader2 } from 'lucide-react';
import { CreateCaseTypeDialog } from './components/create-case-type-dialog';
import { CaseTypeCard } from './components/case-type-card';
import { CaseType } from '@/types/cases';
import { DeleteCaseTypeDialog } from './components/delete-case-type-dialog';
import { useCasesOperations } from '@/hooks/useCases';
interface CaseTypesTabProps {
  caseTypes: CaseType[] | undefined;
  isLoading: boolean;
}

export function CaseTypesTab({ caseTypes, isLoading }: CaseTypesTabProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedCaseType, setSelectedCaseType] = useState<CaseType | null>(
    null
  );
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { createCaseType, deleteCaseType, updateCaseType } =
    useCasesOperations();

  const handleCreateCaseType = useCallback(
    async (caseType: any) => {
      await createCaseType.mutateAsync(caseType);
    },
    [createCaseType]
  );

  const handleUpdateCaseType = useCallback(
    async (caseTypeId: string, caseType: any) => {
      await updateCaseType.mutateAsync({ caseTypeId, caseType });
    },
    [updateCaseType]
  );

  const handleDeleteCaseType = useCallback(
    async (id: string) => {
      await deleteCaseType.mutateAsync(id);
      setShowDeleteDialog(false);
    },
    [deleteCaseType]
  );

  const handleSelectDeleteCaseType = useCallback((caseType: CaseType) => {
    setSelectedCaseType(caseType);
    setShowDeleteDialog(true);
  }, []);

  const handleSelectEditCaseType = useCallback((caseType: CaseType) => {
    setSelectedCaseType(caseType);
    setShowCreateDialog(true);
  }, []);

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-2xl font-bold text-gray-900'>Case Types</h2>
          <p className='text-gray-600'>
            Manage your legal case types and folder templates
          </p>
        </div>
        <CreateCaseTypeDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onCreateCaseType={handleCreateCaseType}
          onEditCaseType={handleUpdateCaseType}
          initialCaseType={selectedCaseType}
        />
      </div>

      {/* Case Types Grid */}
      <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
        {isLoading ? (
          <div className='col-span-full flex items-center justify-center py-12'>
            <Loader2 className='h-8 w-8 animate-spin text-gray-400' />
          </div>
        ) : (
          caseTypes?.map((caseType) => (
            <CaseTypeCard
              key={caseType.id}
              caseType={caseType}
              onSelectDelete={handleSelectDeleteCaseType}
              onSelectEdit={handleSelectEditCaseType}
            />
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
            <Button
              onClick={() => setShowCreateDialog(true)}
              className='cursor-pointer bg-blue-600 hover:bg-blue-700'
            >
              <Plus className='mr-2 h-4 w-4' />
              Create Case Type
            </Button>
          </CardContent>
        </Card>
      )}

      {selectedCaseType && (
        <DeleteCaseTypeDialog
          caseTypeName={selectedCaseType.display_name}
          onDelete={() => handleDeleteCaseType(selectedCaseType.id)}
          open={showDeleteDialog}
          setOpen={setShowDeleteDialog}
        />
      )}
    </div>
  );
}
