'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Edit,
  Folder,
  Gavel,
  FileText,
  Briefcase,
  Scale,
  Trash
} from 'lucide-react';
import { CaseType } from '@/types/cases';
import { useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface CaseTypeCardProps {
  caseType: CaseType;
  onSelectDelete: (caseType: CaseType) => void;
  onSelectEdit: (caseType: CaseType) => void;
}

export function CaseTypeCard({
  caseType,
  onSelectDelete,
  onSelectEdit
}: CaseTypeCardProps) {
  const router = useRouter();
  const getIconComponent = useCallback((iconName: string) => {
    const icons: { [key: string]: any } = {
      gavel: Gavel,
      'file-text': FileText,
      briefcase: Briefcase,
      folder: Folder,
      scale: Scale
    };
    return icons[iconName] || Folder;
  }, []);

  const IconComponent = getIconComponent(caseType.icon);

  return (
    <Card className='border-0 bg-white/80 shadow-lg backdrop-blur-sm transition-shadow hover:shadow-xl'>
      <CardHeader>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <div
              className='flex h-10 w-10 items-center justify-center rounded-lg'
              style={{ backgroundColor: caseType.color + '20' }}
            >
              <IconComponent
                className='h-5 w-5'
                style={{ color: caseType.color }}
              />
            </div>
            <div>
              <CardTitle className='text-lg'>{caseType.display_name}</CardTitle>
            </div>
          </div>
          <div className='flex items-center gap-2'>
            <Button
              variant='ghost'
              size='sm'
              onClick={() => onSelectEdit(caseType)}
              className='cursor-pointer'
            >
              <Edit className='h-4 w-4' />
            </Button>
            <Button
              variant='ghost'
              size='sm'
              onClick={() => onSelectDelete(caseType)}
              className='cursor-pointer'
            >
              <Trash className='h-4 w-4 text-red-500' />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className='mb-4 text-sm text-gray-600'>{caseType.description}</p>
        <div className='flex items-center justify-between text-sm'>
          <span className='text-gray-500'>
            {caseType.folder_templates.length || 0} folder templates
          </span>
          <Button
            variant='outline'
            size='sm'
            onClick={() =>
              router.push(`/dashboard/settings/caseTypes/${caseType.id}`)
            }
            className='cursor-pointer'
          >
            Manage Folders
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
