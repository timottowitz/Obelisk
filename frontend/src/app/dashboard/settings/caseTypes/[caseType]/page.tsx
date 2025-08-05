import { ManageFolderTemplates } from '@/features/settings/manage-folder-templates';

export default async function CaseTypePage(props: {
  params: Promise<{ caseType: string }>;
}) {
  const { caseType } = await props.params;

  return (
    <div className='max-h-[calc(100vh-100px)] space-y-6 overflow-y-auto p-10'>
      <ManageFolderTemplates caseTypeId={caseType} />
    </div>
  );
}
