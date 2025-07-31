'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CaseInfo from '@/features/cases/tabs/case-info';
import { ArrowLeft, Upload, FileText, Scale, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Tasks from '@/features/cases/tabs/tasks';
import Events from '@/features/cases/tabs/events';
import FormGenerator from '@/features/cases/tabs/form';
import Documents from '@/features/cases/tabs/documents';
import HearingExhibits from '@/features/cases/tabs/hearing-exhibits';
import Finances from '@/features/cases/tabs/finances';
import OfferHistory from '@/features/cases/tabs/offer-history';
import { useGetCase } from '@/hooks/useCases';

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

interface CaseDetailClientProps {
  caseMockData: CaseDetail;
  caseId: string;
}

export default function CaseDetailClient({
  caseMockData,
  caseId
}: CaseDetailClientProps) {
  const [activeTab, setActiveTab] = useState('case-information');
  const { data: caseData, isLoading: caseDataLoading, error: caseDataError } = useGetCase(caseId);

  return (
    <div className='h-[calc(100vh-4rem)] overflow-y-auto bg-gray-50'>
      {/* Header */}
      <div className='border-b border-gray-200 bg-white px-6 py-4'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center space-x-4'>
            <Link
              href='/dashboard/cases'
              className='flex items-center space-x-2 text-gray-600 transition-colors hover:text-gray-900'
            >
              <ArrowLeft className='h-4 w-4' />
              <span>Back to My Cases</span>
            </Link>
          </div>

          <div className='flex items-center space-x-3'>
            <Button variant='outline' className='flex items-center space-x-2'>
              <Upload className='h-4 w-4' />
              <span>Upload New Document</span>
            </Button>
            <Button className='flex items-center space-x-2 bg-red-600 hover:bg-red-700'>
              <FileText className='h-4 w-4' />
              <span>File Additional Claim/Counterclaim</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Case Information Header */}
      <div className='bg-white px-6 py-6'>
        <div className='flex items-start space-x-4'>
          <div className='flex-shrink-0'>
            <div className='flex h-12 w-12 items-center justify-center rounded-lg bg-red-100'>
              <Scale className='h-6 w-6 text-red-600' />
            </div>
          </div>

          <div className='flex-1'>
            <h2 className='mb-2 text-2xl font-bold text-gray-900'>
              {caseMockData.title}
            </h2>

            <div className='flex flex-row space-y-1 text-sm text-gray-600'>
              <span>Case Number: {caseMockData.caseNumber}</span>
              <span>, Manager: {caseMockData.manager.name}</span>
              <span>, Phone: {caseMockData.manager.phone}</span>
              <span>
                , Email:{' '}
                <a
                  href={`mailto:${caseMockData.manager.email}`}
                  className='text-blue-600 hover:text-blue-800'
                >
                  {caseMockData.manager.email}
                </a>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className='w-full border-b border-gray-200 bg-transparent'>
        <div className='px-6'>
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className='w-full'
          >
            <TabsList className='flex justify-start gap-2'>
              <TabsTrigger
                value='case-information'
                className='data-[state=active]:border-bottom data-[state=active]:text-bold data-[state=active]:border-b-blue-600'
              >
                Case Information
              </TabsTrigger>
              <TabsTrigger
                value='tasks'
                className='data-[state=active]:border-bottom data-[state=active]:text-bold data-[state=active]:border-b-blue-600'
              >
                Tasks
              </TabsTrigger>
              <TabsTrigger
                value='events'
                className='data-[state=active]:border-bottom data-[state=active]:text-bold data-[state=active]:border-b-blue-600'
              >
                Events
              </TabsTrigger>
              <TabsTrigger
                value='forms'
                className='data-[state=active]:border-bottom data-[state=active]:text-bold data-[state=active]:border-b-blue-600'
              >
                Forms
              </TabsTrigger>
              <TabsTrigger
                value='documents'
                className='data-[state=active]:border-bottom data-[state=active]:text-bold data-[state=active]:border-b-blue-600'
              >
                Documents
              </TabsTrigger>
              <TabsTrigger
                value='hearing-exhibits'
                className='data-[state=active]:border-bottom data-[state=active]:text-bold data-[state=active]:border-b-blue-600'
              >
                Hearing Exhibits
              </TabsTrigger>
              <TabsTrigger
                value='finances'
                className='data-[state=active]:border-bottom data-[state=active]:text-bold data-[state=active]:border-b-blue-600'
              >
                Finances
              </TabsTrigger>
              <TabsTrigger
                value='view-offer-history'
                className='data-[state=active]:border-bottom data-[state=active]:text-bold data-[state=active]:border-b-blue-600'
              >
                View Offer History
              </TabsTrigger>
            </TabsList>
            {/* Content Area */}
            {caseDataLoading ? (
              <div className='px-6 py-8'>
                <div className='flex h-full items-center justify-center'>
                  <Loader2 className='h-4 w-4 animate-spin' />
                </div>
              </div>
            ) : caseDataError ? (
              <div className='px-6 py-8'>
                <div className='flex h-full items-center justify-center text-red-600'>
                  Error loading case data. Please try again.
                </div>
              </div>
            ) : (
              <div className='px-6 py-8'>
                <TabsContent value='case-information' className='space-y-6'>
                  <CaseInfo caseData={caseData} />
                </TabsContent>

                <TabsContent value='tasks' className='space-y-6'>
                  <Tasks caseId={caseId} />
                </TabsContent>

                <TabsContent value='events' className='space-y-6'>
                  <Events />
                </TabsContent>

                <TabsContent value='forms' className='space-y-6'>
                  <FormGenerator />
                </TabsContent>

                <TabsContent value='documents' className='space-y-6'>
                  <Documents caseId={caseId} />
                </TabsContent>

                <TabsContent value='hearing-exhibits' className='space-y-6'>
                  <HearingExhibits />
                </TabsContent>

                <TabsContent value='finances' className='space-y-6'>
                  <Finances />
                </TabsContent>

                <TabsContent value='view-offer-history' className='space-y-6'>
                  <OfferHistory />
                </TabsContent>
              </div>
            )}
          </Tabs>
        </div>
      </div>
    </div>
  );
}
