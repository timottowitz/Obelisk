'use client';

import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Folder, Plug2 } from 'lucide-react';

export default function SettingsHomePage() {
  return (
    <div className='space-y-8 p-8'>
      <div>
        <h1 className='text-3xl font-bold tracking-tight'>Settings</h1>
        <p className='text-muted-foreground'>
          Configure your workspace preferences and connected services.
        </p>
      </div>

      <div className='grid gap-6 md:grid-cols-2'>
        <Card className='hover:border-primary/40 transition-colors'>
          <CardHeader>
            <div className='flex items-center justify-between gap-4'>
              <div className='flex items-center gap-4'>
                <div className='flex h-12 w-12 items-center justify-center rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300'>
                  <Folder className='h-6 w-6' />
                </div>
                <div>
                  <CardTitle>Case Types</CardTitle>
                  <CardDescription>
                    Manage legal case categories and default folder templates.
                  </CardDescription>
                </div>
              </div>
              <Button asChild className='bg-sky-600 text-white hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-600'>
                <Link href='/dashboard/settings/caseTypes'>Manage</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className='text-muted-foreground text-sm'>
              Create, edit, and organize the types of matters your team handles.
              Configure folder templates for each case type.
            </p>
          </CardContent>
        </Card>

        <Card className='hover:border-primary/40 transition-colors'>
          <CardHeader>
            <div className='flex items-center justify-between gap-4'>
              <div className='flex items-center gap-4'>
                <div className='flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'>
                  <Plug2 className='h-6 w-6' />
                </div>
                <div>
                  <CardTitle>Integrations</CardTitle>
                  <CardDescription>
                    Connect external services to automate workflows.
                  </CardDescription>
                </div>
              </div>
              <Button asChild className='bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600'>
                <Link href='/dashboard/settings/integrations'>Learn More</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className='text-muted-foreground text-sm'>
              Explore available integrations like QuickBooks and more. Manage
              connections and data syncing.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
