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
    // Handle form generation logic here
  };

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Section: Form Generator */}
          <div className="lg:col-span-2">
            <div className="space-y-6">
              {/* Title */}
              <h1 className="text-3xl font-bold text-black">
                Form Generator
              </h1>

              {/* Description */}
              <p className="text-black leading-relaxed">
                The AAA provides these forms as a courtesy to the users of our services. 
                The use of these forms do not constitute legal advice or remove any party&apos;s 
                obligation of service to all parties in an arbitration or mediation.
              </p>

              {/* Call to Action */}
              <p className="text-black font-medium">
                I need to generate a :
              </p>

              {/* Form Types List */}
              <div className="space-y-2">
                {formTypes.map((formType, index) => (
                  <button
                    key={index}
                    onClick={() => handleFormClick(formType)}
                    className="block w-full text-left text-blue-600 hover:text-blue-800 hover:underline transition-colors py-1"
                  >
                    {formType}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Section: Help & Support */}
          <div className="lg:col-span-1">
            <Card className="bg-gray-50 border-gray-200">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Title */}
                  <h2 className="text-lg font-bold text-black">
                    Help & Support
                  </h2>

                  {/* Content */}
                  <div className="space-y-3">
                    <div className="flex items-start space-x-2">
                      <Headphones className="h-5 w-5 text-gray-600 mt-0.5 flex-shrink-0" />
                      <div className="text-black text-sm leading-relaxed">
                        <p>
                          For case-related questions and assistance, please contact your case manager. 
                          For other questions, please email Customer Service at
                        </p>
                        <a 
                          href="mailto:CustomerService@adr.org"
                          className="text-blue-600 hover:text-blue-800 underline block mt-1"
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