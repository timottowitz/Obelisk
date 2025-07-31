import { Card, CardContent } from '@/components/ui/card';
import CaseDetailsTable from './table';
import { casePanelistsColumns, caseParticipantsColumns } from './columns';

interface CaseInfoProps {
  caseData: {
    adrProcess: string;
    applicableRules: string;
    fileDate: string;
    track: string;
    claimAmount: string;
    hearingLocale: string;
    caseManager: {
      name: string;
      address: string;
      phone: string;
      email: string;
    };
    panelists: {
      name: string;
      phone: string;
      email: string;
    }[];
    caseParticipants: {
      party_name: string;
      position: string;
      lead_representative: string;
      secondary_representative: string;
      claim_information: string;
    }[];
  };
}

export default function CaseInfo({ caseData }: CaseInfoProps) {
  return (
    <div className='space-y-6'>
      {/* Case Details Section */}
      <Card>
        <CardContent className='px-4'>
          <h3 className='mb-3 text-sm font-semibold text-gray-900'>
            Case Details
          </h3>
          <div className='space-y-0 text-xs'>
            {/* ADR Process */}
            <div className='grid grid-cols-2 border-b border-gray-100 py-4'>
              <span className='font-medium text-gray-600'>ADR Process</span>
              <span className='text-gray-900'>{caseData.adrProcess}</span>
            </div>

            {/* Applicable Rules */}
            <div className='grid grid-cols-2 border-b border-gray-100 py-4'>
              <span className='font-medium text-gray-600'>
                Applicable Rules
              </span>
              <a
                href='#'
                className='text-blue-600 underline hover:text-blue-800'
              >
                {caseData.applicableRules}
              </a>
            </div>

            {/* File Date */}
            <div className='grid grid-cols-2 border-b border-gray-100 py-4'>
              <span className='font-medium text-gray-600'>File Date</span>
              <span className='text-gray-900'>{caseData.fileDate}</span>
            </div>

            {/* Track */}
            <div className='grid grid-cols-2 border-b border-gray-100 py-4'>
              <span className='font-medium text-gray-600'>Track</span>
              <span className='text-gray-900'>{caseData.track}</span>
            </div>

            {/* Claim Amount */}
            <div className='grid grid-cols-2 border-b border-gray-100 py-4'>
              <span className='font-medium text-gray-600'>Claim Amount</span>
              <div className='flex flex-col items-start'>
                <span className='font-semibold text-gray-900'>
                  {caseData.claimAmount}
                </span>
                <br />
                <a
                  href='#'
                  className='text-xs text-blue-600 underline hover:text-blue-800'
                >
                  (View Document)
                </a>
              </div>
            </div>

            {/* Hearing Locale */}
            <div className='grid grid-cols-2 border-b border-gray-100 py-4'>
              <span className='font-medium text-gray-600'>Hearing Locale</span>
              <span className='text-gray-900'>{caseData.hearingLocale}</span>
            </div>

            {/* Case Manager */}
            <div className='grid grid-cols-2 py-4'>
              <span className='font-medium text-gray-600'>Case Manager</span>
              <div className='flex flex-col items-start'>
                <div className='font-semibold text-gray-900'>
                  {caseData.caseManager.name}
                </div>
                <div className='text-gray-900'>
                  {caseData.caseManager.address}
                </div>
                <div className='text-gray-900'>
                  {caseData.caseManager.phone},{' '}
                  <a
                    href={`mailto:${caseData.caseManager.email}`}
                    className='text-blue-600 underline hover:text-blue-800'
                  >
                    {caseData.caseManager.email}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Event Section */}
      <Card>
        <CardContent>
          <h3 className='text-sm font-semibold text-gray-900'>
            Upcoming Event
          </h3>
        </CardContent>
      </Card>

      {/* Panelist(s) Section */}
      <CaseDetailsTable
        title='Panelist(s)'
        data={caseData.panelists}
        columns={casePanelistsColumns}
      />

      {/* Case Participants Section */}
      <CaseDetailsTable
        title='Case Participants'
        data={caseData.caseParticipants}
        columns={caseParticipantsColumns}
      />
    </div>
  );
}
