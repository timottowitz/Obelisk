'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Plus,
  Trash2,
  Folder,
  GripVertical,
  Loader2,
  ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';
import { FolderTemplate } from '@/types/cases';
import { useCaseType } from '@/hooks/useCases';
import { useCasesOperations } from '@/hooks/useCases';

export function ManageFolderTemplates({ caseTypeId }: { caseTypeId: string }) {
  const router = useRouter();
  const [folders, setFolders] = useState<FolderTemplate[]>([]);
  const [newFolderName, setNewFolderName] = useState('');
  const { updateFolderTemplates, deleteFolderTemplate } = useCasesOperations();
  const { data: caseTypeData, isLoading: caseTypeDataLoading } =
    useCaseType(caseTypeId);

  // Update folders state when caseTypeData is loaded
  useEffect(() => {
    if (caseTypeData?.folder_templates) {
      setFolders(caseTypeData.folder_templates);
    }
  }, [caseTypeData]);

  const legalFormatRegex = /^[A-Z][a-z]+(\s+[A-Z][a-z]+)*$/;

  // Memoized sorted folders
  const sortedFolders = useMemo(
    () => [...folders].sort((a, b) => a.sort_order - b.sort_order),
    [folders]
  );

  const handleAddFolder = useCallback(async () => {
    if (!legalFormatRegex.test(newFolderName)) {
      toast.error('Please enter a valid folder name');
      return;
    }
    // Check for duplicates
    if (
      folders.some(
        (folder) => folder.name.toLowerCase() === newFolderName.toLowerCase()
      )
    ) {
      toast.error('A folder with this name already exists');
      return;
    }

    const newFolderData = {
      name: newFolderName,
      path: `/${newFolderName.toLowerCase().replace(/\s+/g, '-')}`,
      sort_order: folders.length + 1,
      is_required: true
    };

    try {
      await updateFolderTemplates.mutateAsync({
        caseTypeId,
        formData: newFolderData
      });
      toast.success('Folder added successfully');
      setNewFolderName('');
    } catch (error) {
      toast.error('Failed to add folder');
    }
  }, [newFolderName, folders, updateFolderTemplates, caseTypeId]);

  const handleRemoveFolder = useCallback(
    async (folderId: string) => {
      try {
        await deleteFolderTemplate.mutateAsync(folderId);
        toast.success('Folder removed successfully');
      } catch (error) {
        toast.error('Failed to remove folder');
      }
    },
    [deleteFolderTemplate]
  );

  return (
    <Card className='container mx-auto mt-10 flex w-1/3 flex-col items-center justify-center gap-4'>
      {/* Go Back Button */}
      <div className='mb-4 w-full'>
        <Button
          variant='ghost'
          onClick={() => router.back()}
          className='flex items-center gap-2'
        >
          <ArrowLeft className='h-4 w-4' />
          Go Back
        </Button>
      </div>

      <h1 className='text-center text-2xl font-bold'>
        Manage Folder Templates
      </h1>
      {caseTypeDataLoading ? (
        <p className='text-center'>Loading case type...</p>
      ) : (
        <p className='text-center'>
          Add and manage folder templates for "{caseTypeData?.display_name}"
          case type
        </p>
      )}
      <div className='space-y-4'>
        {/* Add New Folder Section */}
        <Card className='border-0 bg-gray-50/50'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2 text-lg'>
              <Plus className='h-4 w-4 text-green-600' />
              Add New Folder
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='flex gap-3'>
              <div className='flex-1'>
                <Label htmlFor='folderName'>Folder Name</Label>
                <Input
                  id='folderName'
                  placeholder='e.g., Client Documents, Legal Research...'
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className='mt-1'
                />
              </div>
              <div className='flex items-end'>
                <Button
                  onClick={handleAddFolder}
                  disabled={!legalFormatRegex.test(newFolderName)}
                  className='bg-green-600 hover:bg-green-700'
                >
                  <Plus className='mr-2 h-4 w-4' />
                  Add
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Folders List Section */}
        <Card className='border-0 bg-white/80'>
          <CardHeader>
            <CardTitle className='flex items-center justify-between text-lg'>
              <div className='flex items-center gap-2'>
                <Folder className='h-4 w-4 text-blue-600' />
                Folder Templates
              </div>
              <Badge variant='secondary' className='text-sm'>
                {folders.length} {folders.length === 1 ? 'folder' : 'folders'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sortedFolders.length === 0 ? (
              <div className='py-8 text-center text-gray-500'>
                <Folder className='mx-auto mb-3 h-12 w-12 text-gray-300' />
                <p>No folder templates added yet</p>
                <p className='text-sm'>Add your first folder template above</p>
              </div>
            ) : (
              <div className='space-y-3'>
                {caseTypeDataLoading ? (
                  <div className='py-8 text-center text-gray-500'>
                    <Loader2 className='mx-auto mb-3 h-12 w-12 animate-spin text-gray-300' />
                    <p>Loading folder templates...</p>
                  </div>
                ) : (
                  sortedFolders.map((folder: FolderTemplate) => (
                    <div
                      key={folder.id}
                      className='flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3 transition-colors hover:border-gray-300'
                    >
                      <div className='flex flex-1 items-center gap-3'>
                        <GripVertical className='h-4 w-4 cursor-move text-gray-400' />
                        <div className='flex items-center gap-2'>
                          <Folder className='h-4 w-4 text-blue-500' />
                          <span className='font-medium'>{folder.name}</span>
                        </div>
                      </div>
                      <div className='flex items-center gap-2'>
                        <Button
                          variant='ghost'
                          size='sm'
                          onClick={() => handleRemoveFolder(folder.id)}
                          className='text-red-500 hover:text-red-700'
                        >
                          <Trash2 className='h-4 w-4' />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Card>
  );
}
