'use client';

import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { Headphones } from 'lucide-react';

const formTypes = [
  'Amended Demand or Claims',
  'Brief',
  'Checklist for Conflicts',
  'Counterclaim or Answer',
  'Exhibit List',
  'Miscellaneous Pleadings',
  'Motion',
  'Stipulation',
  'Submissions',
  'Subpoena',
  'Subpoena Duces Tecum',
  'Witness List'
];

export default function FormGenerator() {
  const handleFormClick = (formType: string) => {
    console.log(`Generating form: ${formType}`);
  };

  return (
    <div className='bg-background min-h-screen p-4'>
      <div className='mx-auto max-w-7xl'>
        <div className='grid grid-cols-1 gap-6 lg:grid-cols-3'>
          {/* Left Section: Form Generator */}
          <div className='lg:col-span-2'>
            <div className='space-y-4'>
              {/* Title */}
              <h1 className='text-foreground text-xl font-bold'>
                Form Generator
              </h1>

              {/* Description */}
              <p className='text-muted-foreground text-sm leading-tight'>
                The AAA provides these forms as a courtesy to the users of our
                services. The use of these forms do not constitute legal advice
                or remove any party&apos;s obligation of service to all parties
                in an arbitration or mediation.
              </p>

              {/* Call to Action */}
              <p className='text-foreground text-sm font-medium'>
                I need to generate a :
              </p>

              {/* Form Types List */}
              <div className='space-y-1'>
                {formTypes.map((formType, index) => (
                  <Link
                    key={index}
                    href='#'
                    className='text-blue-500 block w-full cursor-pointer py-0.5 text-left text-sm transition-colors hover:underline'
                  >
                    {formType}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Right Section: Help & Support */}
          <div className='lg:col-span-1'>
            <Card className='border-border dark:bg-card bg-white shadow-sm'>
              <CardContent className='p-4'>
                <div className='space-y-3'>
                  {/* Title */}
                  <h2 className='text-foreground text-base font-bold'>
                    Help & Support
                  </h2>

                  {/* Content */}
                  <div className='space-y-2'>
                    <div className='flex items-start space-x-2'>
                      <Headphones className='text-muted-foreground mt-0.5 h-4 w-4 flex-shrink-0' />
                      <div className='text-muted-foreground text-xs leading-tight'>
                        <p>
                          For case-related questions and assistance, please
                          contact your case manager. For other questions, please
                          email Customer Service at
                        </p>
                        <a
                          href='mailto:CustomerService@adr.org'
                          className='text-primary mt-0.5 block underline hover:opacity-90'
                        >
                          CustomerService@adr.org
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
