import CaseDetailClient from '@/features/cases/case-detail-client';

type PageProps = { params: Promise<{ case: string }> };

export default async function Page(props: PageProps) {
  const { case: caseId } = await props.params;
  
  return <CaseDetailClient caseId={caseId} />;
}
