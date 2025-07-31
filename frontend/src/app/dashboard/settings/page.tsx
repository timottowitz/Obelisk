'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, User, Bell, Shield, Building, Gavel } from 'lucide-react';
import { toast } from 'sonner';
import { useCasesOperations } from '@/hooks/useCases';
import { CaseTypesTab } from '@/features/settings/case-types-tab';
import { ProfileTab } from '@/features/settings/profile-tab';
import { OrganizationTab } from '@/features/settings/organization-tab';
import { NotificationsTab } from '@/features/settings/notifications-tab';
import { SecurityTab } from '@/features/settings/security-tab';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('case-types');
  const { caseTypes, } = useCasesOperations();
  const caseTypesData = caseTypes.data;
  const caseTypesLoading = caseTypes.isLoading;

  return (
    <div className='max-h-[calc(100vh-4rem)] overflow-y-auto bg-gradient-to-br from-slate-50 to-blue-50'>
      <div className='container mx-auto px-4 py-8'>
        {/* Header */}
        <div className='mb-8'>
          <div className='mb-2 flex items-center gap-3'>
            <div className='flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100'>
              <Settings className='h-6 w-6 text-blue-600' />
            </div>
            <div>
              <h1 className='text-3xl font-bold text-gray-900'>Settings</h1>
              <p className='text-gray-600'>
                Manage your account and platform preferences
              </p>
            </div>
          </div>
        </div>

        {/* Settings Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className='space-y-6'
        >
          <TabsList className='grid w-full grid-cols-5 rounded-xl border border-gray-200 bg-white/80 p-1 backdrop-blur-sm'>
            <TabsTrigger value='case-types' className='flex items-center gap-2'>
              <Gavel className='h-4 w-4' />
              Case Types
            </TabsTrigger>
            <TabsTrigger value='profile' className='flex items-center gap-2'>
              <User className='h-4 w-4' />
              Profile
            </TabsTrigger>
            <TabsTrigger
              value='organization'
              className='flex items-center gap-2'
            >
              <Building className='h-4 w-4' />
              Organization
            </TabsTrigger>
            <TabsTrigger
              value='notifications'
              className='flex items-center gap-2'
            >
              <Bell className='h-4 w-4' />
              Notifications
            </TabsTrigger>
            <TabsTrigger value='security' className='flex items-center gap-2'>
              <Shield className='h-4 w-4' />
              Security
            </TabsTrigger>
          </TabsList>

          {/* Case Types Management */}
          <TabsContent value='case-types'>
            <CaseTypesTab
              caseTypes={caseTypesData}
              isLoading={caseTypesLoading}
            />
          </TabsContent>

          {/* Profile Settings */}
          <TabsContent value='profile'>
            <ProfileTab />
          </TabsContent>

          {/* Organization Settings */}
          <TabsContent value='organization'>
            <OrganizationTab />
          </TabsContent>

          {/* Notification Settings */}
          <TabsContent value='notifications'>
            <NotificationsTab />
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value='security'>
            <SecurityTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
