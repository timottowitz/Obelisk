/**
 * Meeting Intelligence Dashboard
 * Extends existing call recording patterns for meeting management
 * Maintains full backward compatibility with legal SaaS features
 */

import { Metadata } from 'next';
import { Suspense } from 'react';
import PageContainer from '@/components/layout/page-container';
import { Heading } from '@/components/ui/heading';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MeetingDataTable } from '@/features/meetings/components/meeting-data-table';
import { RecentMeetings } from '@/features/meetings/components/recent-meetings';
import { MeetingInsights } from '@/features/meetings/components/meeting-insights';
import { DataTableSkeleton } from '@/components/ui/table/data-table-skeleton';

export const metadata: Metadata = {
  title: 'Meetings | Dashboard',
  description: 'Meeting intelligence and analytics dashboard'
};

export default function MeetingsPage() {
  return (
    <PageContainer scrollable>
      <div className="w-full space-y-4">
        {/* Header Section */}
        <div className="flex items-center justify-between space-y-2">
          <Heading
            title="Meeting Intelligence"
            description="Manage and analyze your meetings with AI-powered insights"
          />
        </div>
        
        <Separator />

        {/* Main Content Tabs */}
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All Recordings</TabsTrigger>
            <TabsTrigger value="meetings">Meetings</TabsTrigger>
            <TabsTrigger value="calls">Legal Calls</TabsTrigger>
            <TabsTrigger value="interviews">Interviews</TabsTrigger>
            <TabsTrigger value="consultations">Consultations</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>

          {/* All Recordings Tab */}
          <TabsContent value="all" className="space-y-4">
            <Suspense fallback={<DataTableSkeleton columnCount={10} />}>
              <MeetingDataTable meetingType="all" />
            </Suspense>
          </TabsContent>

          {/* Meetings Only Tab */}
          <TabsContent value="meetings" className="space-y-4">
            <Suspense fallback={<DataTableSkeleton columnCount={10} />}>
              <MeetingDataTable meetingType="meeting" />
            </Suspense>
          </TabsContent>

          {/* Legal Calls Tab (Backward Compatibility) */}
          <TabsContent value="calls" className="space-y-4">
            <Suspense fallback={<DataTableSkeleton columnCount={10} />}>
              <MeetingDataTable meetingType="call" />
            </Suspense>
          </TabsContent>

          {/* Interviews Tab */}
          <TabsContent value="interviews" className="space-y-4">
            <Suspense fallback={<DataTableSkeleton columnCount={10} />}>
              <MeetingDataTable meetingType="interview" />
            </Suspense>
          </TabsContent>

          {/* Consultations Tab */}
          <TabsContent value="consultations" className="space-y-4">
            <Suspense fallback={<DataTableSkeleton columnCount={10} />}>
              <MeetingDataTable meetingType="consultation" />
            </Suspense>
          </TabsContent>

          {/* Insights Tab */}
          <TabsContent value="insights" className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <div className="col-span-4">
              <Suspense fallback={<div className="h-64 bg-muted animate-pulse rounded-lg" />}>
                <MeetingInsights />
              </Suspense>
            </div>
            <div className="col-span-3">
              <Suspense fallback={<div className="h-64 bg-muted animate-pulse rounded-lg" />}>
                <RecentMeetings />
              </Suspense>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </PageContainer>
  );
}