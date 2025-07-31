import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  CircleAlertIcon,
  ExternalLinkIcon,
  CalculatorIcon,
  HelpCircle
} from 'lucide-react';
import Link from 'next/link';

export function CaseSidebar() {
  return (
    <div className='space-y-6'>
      {/* Instructions Card */}
      <Card className='bg-gray-50'>
        <CardHeader>
          <CardTitle className='text-base'>
            To file a new case, you will need to:
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-3'>
          <div className='flex items-start gap-2'>
            <div className='mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gray-400'></div>
            <p className='text-xs text-gray-700'>
              Upload your Demand for Arbitration, Request for Mediation, and/or
              complete filing form.
            </p>
          </div>
          <div className='flex items-start gap-2'>
            <div className='mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gray-400'></div>
            <p className='text-xs text-gray-700'>
              Upload a copy of the arbitration or mediation agreement, contract,
              or court order.
            </p>
          </div>
          <div className='flex items-start gap-2'>
            <div className='mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gray-400'></div>
            <p className='text-xs text-gray-700'>Pay the appropriate fee.</p>
          </div>
          <div className='flex items-start gap-2'>
            <div className='mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gray-400'></div>
            <p className='text-xs text-gray-700'>
              Send a copy of the filing documents to all other parties involved.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Helpful Links Card */}
      <Card className='bg-gray-50'>
        <CardHeader>
          <CardTitle className='text-base'>Helpful Links</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='flex items-start gap-2'>
            <CircleAlertIcon className='mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600' />
            <div>
              <p className='mb-1 text-xs text-gray-700'>
                View and download Arbitration and/or Mediation forms
              </p>
              <Link
                href='#'
                className='flex h-auto items-center p-0 text-xs text-blue-600'
              >
                <p className='underline'>View Forms</p>
                <ExternalLinkIcon className='ml-1 h-3 w-3' />
              </Link>
            </div>
          </div>

          <div className='flex items-start gap-2'>
            <CircleAlertIcon className='mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600' />
            <div>
              <p className='mb-1 text-xs text-gray-700'>
                AAA Rules and Applicable Fees
              </p>
              <Link
                href='#'
                className='flex h-auto items-center p-0 text-xs text-blue-600'
              >
                <p className='underline'>View Fees</p>
                <ExternalLinkIcon className='ml-1 h-3 w-3' />
              </Link>
            </div>
          </div>

          <div className='flex items-start gap-2'>
            <CalculatorIcon className='mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600' />
            <div>
              <p className='mb-1 text-xs text-gray-700'>
                Need help estimating administrative fees?
              </p>
              <Link
                href='#'
                className='flex h-auto items-center p-0 text-xs text-blue-600'
              >
                <p className='underline'>
                  Fee AAA /ICDR® Arbitration Administrative Fee Calculator
                </p>
                <ExternalLinkIcon className='ml-1 h-3 w-3' />
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Need Help Card */}
      <Card className='bg-gray-50'>
        <CardHeader>
          <CardTitle className='text-base'>Need Help?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='flex items-start gap-2'>
            <HelpCircle className='mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600' />
            <div>
              <p className='mb-2 text-xs text-gray-700'>
                For case-related questions and assistance, please contact your
                case manager. For other questions, please email Customer Service
                at:
              </p>
              <Button
                variant='link'
                className='h-auto p-0 text-xs text-blue-600'
              >
                CustomerService@adr.org
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
