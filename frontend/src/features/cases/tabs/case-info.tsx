import { Card, CardContent } from '@/components/ui/card';
import { Mail, Phone, MapPin } from 'lucide-react';
import dayjs from 'dayjs';
import { Case } from '@/types/cases';
import Link from 'next/link';

export default function CaseInfo({ caseData }: { caseData: Case }) {
  return (
    <div className='space-y-6'>
      {/* Case Details Section */}
      <Card className='border-border bg-white shadow-sm dark:bg-card'>
        <CardContent className='px-4'>
          <h3 className='mb-3 text-sm font-semibold text-foreground'>
            Case Details
          </h3>
          <div className='space-y-0 text-xs'>
            {/* ADR Process */}
            <div className='grid grid-cols-2 border-b border-border py-4'>
              <span className='font-medium text-muted-foreground'>ADR Process</span>
              <span className='text-foreground'>{caseData.adr_process}</span>
            </div>

            {/* Applicable Rules */}
            <div className='grid grid-cols-2 border-b border-border py-4'>
              <span className='font-medium text-muted-foreground'>
                Applicable Rules
              </span>
              <a
                href='#'
                className='text-primary underline hover:opacity-90'
              >
                {caseData.applicable_rules}
              </a>
            </div>

            {/* File Date */}
            <div className='grid grid-cols-2 border-b border-border py-4'>
              <span className='font-medium text-muted-foreground'>File Date</span>
              <span className='text-foreground'>
                {dayjs(caseData.created_at).format('DD/MM/YYYY')}
              </span>
            </div>

            {/* Track */}
            <div className='grid grid-cols-2 border-b border-border py-4'>
              <span className='font-medium text-muted-foreground'>Track</span>
              <span className='text-foreground'>{caseData.track}</span>
            </div>

            {/* Claim Amount */}
            <div className='grid grid-cols-2 border-b border-border py-4'>
              <span className='font-medium text-muted-foreground'>Claim Amount</span>
              <div className='flex flex-row items-start gap-2'>
                <span className='font-semibold text-foreground'>
                  {caseData.claim_amount}
                </span>
                <br />
                <a
                  href='#'
                  className='text-xs text-primary underline hover:opacity-90'
                >
                  (View Document)
                </a>
              </div>
            </div>

            {/* Hearing Locale */}
            <div className='grid grid-cols-2 border-b border-border py-4'>
              <span className='font-medium text-muted-foreground'>Hearing Locale</span>
              <span className='text-foreground'>{caseData.hearing_locale}</span>
            </div>

            {/* Case Manager */}
            <div className='grid grid-cols-2 border-b border-border py-4'>
              <span className='font-medium text-muted-foreground'>Case Manager</span>
              <span className='text-foreground'>{caseData.case_manager}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Event Section */}
      <Card className='border-border bg-white shadow-sm dark:bg-card'>
        <CardContent>
          <h3 className='text-sm font-semibold text-foreground'>
            Upcoming Event
          </h3>
        </CardContent>
      </Card>

      {/* Parties Section */}
      <Card className='border-border bg-white shadow-sm dark:bg-card'>
        <CardContent>
          <h3 className='mb-4 text-sm font-semibold text-foreground'>Parties</h3>

          <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
            {/* Claimant */}
            <div className='space-y-3'>
              <div className='flex items-center gap-2 border-b border-border pb-2'>
                <div className='h-2 w-2 rounded-full bg-blue-500'></div>
                <h4 className='text-sm font-semibold text-foreground'>Claimant</h4>
              </div>

              <div className='text-xs'>
                <div className='flex items-start gap-2'>
                  <span className='min-w-[60px] font-medium text-muted-foreground'>Name:</span>
                  <span className='font-medium text-foreground'>
                    {caseData.claimant?.full_name || 'N/A'}
                  </span>
                </div>

                {caseData.claimant?.emails?.length > 0 && (
                  <div className='flex items-start gap-2'>
                    <Mail className='mt-0.5 h-3 w-3 flex-shrink-0 text-muted-foreground' />
                    <span className='break-all text-foreground'>
                      {caseData.claimant.emails.map((email: any) => email.address).join(', ')}
                    </span>
                  </div>
                )}

                {caseData.claimant?.phones?.length > 0 && (
                  <div className='flex items-start gap-2'>
                    <Phone className='mt-0.5 h-3 w-3 flex-shrink-0 text-muted-foreground' />
                    <span className='text-foreground'>
                      {caseData.claimant.phones.map((phone: any) => (
                        <Link href={`tel:${phone.number}`} key={phone.id} className='text-primary underline hover:opacity-90 phone-number_dynamic-number dynamicNumber'>{phone.number}</Link>
                      ))}
                    </span>
                  </div>
                )}

                {caseData.claimant?.addresses?.length > 0 && (
                  <div className='flex items-start gap-2'>
                    <MapPin className='mt-0.5 h-3 w-3 flex-shrink-0 text-muted-foreground' />
                    <span className='text-wrap text-foreground'>
                      {caseData.claimant.addresses.map((address: any) => address.fullAddress).join(', ')}
                    </span>
                  </div>
                )}

                {(!caseData.claimant?.emails?.length && !caseData.claimant?.phones?.length && !caseData.claimant?.addresses?.length) && (
                  <p className='text-xs italic text-muted-foreground'>No contact information available</p>
                )}
              </div>
            </div>

            {/* Respondent */}
            <div className='space-y-3'>
              <div className='flex items-center gap-2 border-b border-border pb-2'>
                <div className='h-2 w-2 rounded-full bg-red-500'></div>
                <h4 className='text-sm font-semibold text-foreground'>Respondent</h4>
              </div>

              <div className='text-xs'>
                <div className='flex items-start gap-2'>
                  <span className='min-w-[60px] font-medium text-muted-foreground'>Name:</span>
                  <span className='font-medium text-foreground'>
                    {caseData.respondent?.full_name || 'N/A'}
                  </span>
                </div>

                {caseData.respondent?.emails?.length > 0 && (
                  <div className='flex items-start gap-2'>
                    <Mail className='mt-0.5 h-3 w-3 flex-shrink-0 text-muted-foreground' />
                    <span className='break-all text-foreground'>
                      {caseData.respondent.emails.map((email: any) => email.address).join(', ')}
                    </span>
                  </div>
                )}

                {caseData.respondent?.phones?.length > 0 && (
                  <div className='flex items-start gap-2'>
                    <Phone className='mt-0.5 h-3 w-3 flex-shrink-0 text-muted-foreground' />
                    <span className='text-foreground'>
                      {caseData.respondent.phones.map((phone: any) => (
                          <Link href={`tel:${phone.number}`} key={phone.id} className='text-primary underline hover:opacity-90 phone-number_dynamic-number dynamicNumber'>{phone.number}</Link>
                      ))}
                    </span>
                  </div>
                )}

                {caseData.respondent?.addresses?.length > 0 && (
                  <div className='flex items-start gap-2'>
                    <MapPin className='mt-0.5 h-3 w-3 flex-shrink-0 text-muted-foreground' />
                    <span className='text-wrap text-foreground'>
                      {caseData.respondent.addresses.map((address: any) => address.fullAddress).join(', ')}
                    </span>
                  </div>
                )}

                {(!caseData.respondent?.emails?.length && !caseData.respondent?.phones?.length && !caseData.respondent?.addresses?.length) && (
                  <p className='text-xs italic text-muted-foreground'>No contact information available</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
