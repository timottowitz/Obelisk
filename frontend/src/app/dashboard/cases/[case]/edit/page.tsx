import Edit from '@/features/cases/edit/edit';

type PageProps = { params: Promise<{ case: string }> };

export default async function EditCasePage(props: PageProps) {
  const { case: caseId } = await props.params;

  return <Edit caseId={caseId} />;
}