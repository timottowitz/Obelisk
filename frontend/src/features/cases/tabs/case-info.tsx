import { Card, CardContent } from '@/components/ui/card';
import dayjs from 'dayjs';

export default function CaseInfo({ caseData }: any) {
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
              <span className='text-gray-900'>{caseData.adr_process}</span>
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
                {caseData.applicable_rules}
              </a>
            </div>

            {/* File Date */}
            <div className='grid grid-cols-2 border-b border-gray-100 py-4'>
              <span className='font-medium text-gray-600'>File Date</span>
              <span className='text-gray-900'>
                {dayjs(caseData.created_at).format('DD/MM/YYYY')}
              </span>
            </div>

            {/* Track */}
            <div className='grid grid-cols-2 border-b border-gray-100 py-4'>
              <span className='font-medium text-gray-600'>Track</span>
              <span className='text-gray-900'>{caseData.track}</span>
            </div>

            {/* Claim Amount */}
            <div className='grid grid-cols-2 border-b border-gray-100 py-4'>
              <span className='font-medium text-gray-600'>Claim Amount</span>
              <div className='flex flex-row items-start gap-2'>
                <span className='font-semibold text-gray-900'>
                  {caseData.claim_amount}
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
              <span className='text-gray-900'>{caseData.hearing_locale}</span>
            </div>
            
            {/* Case Manager */}
            <div className='grid grid-cols-2 border-b border-gray-100 py-4'>
              <span className='font-medium text-gray-600'>Case Manager</span>
              <span className='text-gray-900'>{caseData.case_manager}</span>
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
    </div>
  );
}
