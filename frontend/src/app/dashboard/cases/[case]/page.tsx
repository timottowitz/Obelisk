import CaseDetailClient from '@/features/cases/case-detail-client';

interface CaseDetail {
  id: string;
  caseNumber: string;
  title: string;
  manager: {
    name: string;
    phone: string;
    email: string;
  };
  status: string;
  type: string;
  filingDate: string;
  court: string;
  description: string;
}

// Mock data - replace with actual API call
const mockCaseData: CaseDetail = {
  id: '1',
  caseNumber: '01-21-0016-7676',
  title: 'Tammy Lee as Legal Representative of... et al',
  manager: {
    name: 'Janelle Manuel',
    phone: '(866) 293-4053',
    email: 'JanelleManuel@adr.org'
  },
  status: 'Active',
  type: 'Civil Case',
  filingDate: '2024-01-15',
  court: 'Superior Court',
  description: 'This case involves...'
};

type PageProps = { params: Promise<{ case: string }> };

export default async function Page(props: PageProps) {
  const { case: caseId } = await props.params;
  
  return <CaseDetailClient caseMockData={mockCaseData} caseId={caseId} />;
}
