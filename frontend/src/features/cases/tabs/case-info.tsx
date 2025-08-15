import { Card, CardContent } from '@/components/ui/card';
import { Mail, Phone, MapPin } from 'lucide-react';
import dayjs from 'dayjs';
import { Case } from '@/types/cases';

export default function CaseInfo({ caseData }: { caseData: Case }) {
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

      {/* Parties Section */}
      <Card>
        <CardContent>
          <h3 className='text-sm font-semibold text-gray-900 mb-4'>Parties</h3>
          
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            {/* Claimant */}
            <div className='space-y-3'>
              <div className='flex items-center gap-2 pb-2 border-b border-gray-200'>
                <div className='h-2 w-2 rounded-full bg-blue-500'></div>
                <h4 className='font-semibold text-gray-900 text-sm'>Claimant</h4>
              </div>
              
              <div className='space-y-2 text-xs'>
                <div className='flex items-start gap-2'>
                  <span className='font-medium text-gray-600 min-w-[60px]'>Name:</span>
                  <span className='text-gray-900 font-medium'>
                    {caseData.claimant?.full_name || 'N/A'}
                  </span>
                </div>
                
                {caseData.claimant?.emails?.length > 0 && (
                  <div className='flex items-start gap-2'>
                    <Mail className='h-3 w-3 text-gray-500 mt-0.5 flex-shrink-0' />
                    <span className='text-gray-900 break-all'>
                      {caseData.claimant.emails.map((email: any) => email.address).join(', ')}
                    </span>
                  </div>
                )}
                
                {caseData.claimant?.phones?.length > 0 && (
                  <div className='flex items-start gap-2'>
                    <Phone className='h-3 w-3 text-gray-500 mt-0.5 flex-shrink-0' />
                    <span className='text-gray-900'>
                      {caseData.claimant.phones.map((phone: any) => phone.number).join(', ')}
                    </span>
                  </div>
                )}
                
                {caseData.claimant?.addresses?.length > 0 && (
                  <div className='flex items-start gap-2'>
                    <MapPin className='h-3 w-3 text-gray-500 mt-0.5 flex-shrink-0' />
                    <span className='text-gray-900 text-wrap'>
                      {caseData.claimant.addresses.map((address: any) => address.fullAddress).join(', ')}
                    </span>
                  </div>
                )}
                
                {(!caseData.claimant?.emails?.length && !caseData.claimant?.phones?.length && !caseData.claimant?.addresses?.length) && (
                  <p className='text-gray-500 italic text-xs'>No contact information available</p>
                )}
              </div>
            </div>

            {/* Respondent */}
            <div className='space-y-3'>
              <div className='flex items-center gap-2 pb-2 border-b border-gray-200'>
                <div className='h-2 w-2 rounded-full bg-red-500'></div>
                <h4 className='font-semibold text-gray-900 text-sm'>Respondent</h4>
              </div>
              
              <div className='space-y-2 text-xs'>
                <div className='flex items-start gap-2'>
                  <span className='font-medium text-gray-600 min-w-[60px]'>Name:</span>
                  <span className='text-gray-900 font-medium'>
                    {caseData.respondent?.full_name || 'N/A'}
                  </span>
                </div>
                
                {caseData.respondent?.emails?.length > 0 && (
                  <div className='flex items-start gap-2'>
                    <Mail className='h-3 w-3 text-gray-500 mt-0.5 flex-shrink-0' />
                    <span className='text-gray-900 break-all'>
                      {caseData.respondent.emails.map((email: any) => email.address).join(', ')}
                    </span>
                  </div>
                )}
                
                {caseData.respondent?.phones?.length > 0 && (
                  <div className='flex items-start gap-2'>
                    <Phone className='h-3 w-3 text-gray-500 mt-0.5 flex-shrink-0' />
                    <span className='text-gray-900'>
                      {caseData.respondent.phones.map((phone: any) => phone.number).join(', ')}
                    </span>
                  </div>
                )}
                
                {caseData.respondent?.addresses?.length > 0 && (
                  <div className='flex items-start gap-2'>
                    <MapPin className='h-3 w-3 text-gray-500 mt-0.5 flex-shrink-0' />
                    <span className='text-gray-900 text-wrap'>
                      {caseData.respondent.addresses.map((address: any) => address.fullAddress).join(', ')}
                    </span>
                  </div>
                )}
                
                {(!caseData.respondent?.emails?.length && !caseData.respondent?.phones?.length && !caseData.respondent?.addresses?.length) && (
                  <p className='text-gray-500 italic text-xs'>No contact information available</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
