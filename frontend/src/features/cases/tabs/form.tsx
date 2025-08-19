'use client';

import { Card, CardContent } from '@/components/ui/card';
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
    <div className='min-h-screen bg-background p-4'>
      <div className='mx-auto max-w-7xl'>
        <div className='grid grid-cols-1 gap-6 lg:grid-cols-3'>
          {/* Left Section: Form Generator */}
          <div className='lg:col-span-2'>
            <div className='space-y-4'>
              {/* Title */}
              <h1 className='text-xl font-bold text-foreground'>Form Generator</h1>

              {/* Description */}
              <p className='text-sm leading-tight text-muted-foreground'>
                The AAA provides these forms as a courtesy to the users of our
                services. The use of these forms do not constitute legal advice
                or remove any party&apos;s obligation of service to all parties in an
                arbitration or mediation.
              </p>

              {/* Call to Action */}
              <p className='text-sm font-medium text-foreground'>I need to generate a :</p>

              {/* Form Types List */}
              <div className='space-y-1'>
                {formTypes.map((formType, index) => (
                  <button
                    key={index}
                    onClick={() => handleFormClick(formType)}
                    className='block w-full py-0.5 text-left text-sm text-primary transition-colors hover:underline'
                  >
                    {formType}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Section: Help & Support */}
          <div className='lg:col-span-1'>
            <Card className='border-border bg-white shadow-sm dark:bg-card'>
              <CardContent className='p-4'>
                <div className='space-y-3'>
                  {/* Title */}
                  <h2 className='text-base font-bold text-foreground'>
                    Help & Support
                  </h2>

                  {/* Content */}
                  <div className='space-y-2'>
                    <div className='flex items-start space-x-2'>
                      <Headphones className='mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground' />
                      <div className='text-xs leading-tight text-muted-foreground'>
                        <p>
                          For case-related questions and assistance, please
                          contact your case manager. For other questions, please
                          email Customer Service at
                        </p>
                        <a
                          href='mailto:CustomerService@adr.org'
                          className='mt-0.5 block text-primary underline hover:opacity-90'
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
