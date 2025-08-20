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
import {
  ExternalLink,
  Cable,
  CreditCard,
  Database,
  ArrowLeft
} from 'lucide-react';

function IntegrationCard(props: {
  title: string;
  description: string;
  icon: React.ReactNode;
  actionHref?: string;
  actionLabel?: string;
  enabled?: boolean;
  accent?: 'emerald' | 'sky' | 'violet' | 'amber';
}) {
  const {
    title,
    description,
    icon,
    actionHref,
    actionLabel = 'Learn More',
    enabled = true,
    accent = 'emerald'
  } = props;
  const accentBg = {
    emerald: 'bg-emerald-100 dark:bg-emerald-900',
    sky: 'bg-sky-100 dark:bg-sky-900',
    violet: 'bg-violet-100 dark:bg-violet-900',
    amber: 'bg-amber-100 dark:bg-amber-900'
  }[accent];
  const accentText = {
    emerald: 'text-emerald-700 dark:text-emerald-300',
    sky: 'text-sky-700 dark:text-sky-300',
    violet: 'text-violet-700 dark:text-violet-300',
    amber: 'text-amber-700 dark:text-amber-300'
  }[accent];

  return (
    <Card className='group hover:border-primary/40 transition-colors'>
      <CardHeader>
        <div className='flex items-center justify-between gap-4'>
          <div className='flex items-center gap-4'>
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-lg ${accentBg} ${accentText}`}
            >
              {icon}
            </div>
            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
          {actionHref ? (
            <Button
              asChild
              className='bg-blue-600 hover:bg-blue-700'
              disabled={!enabled}
            >
              <Link href={actionHref}>{actionLabel}</Link>
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        <div className='text-muted-foreground flex items-center justify-between text-sm'>
          <span>Secure OAuth, clear status and sandbox support.</span>
          <ExternalLink className='h-4 w-4 opacity-60 group-hover:opacity-100' />
        </div>
      </CardContent>
    </Card>
  );
}

export default function IntegrationsIndexPage() {
  return (
    <div className='space-y-8 p-8'>
      <Button onClick={() => window.history.back()} className='cursor-pointer'>
        <ArrowLeft className='mr-2 h-4 w-4' />
        Back to Settings
      </Button>
      <div>
        <h1 className='text-3xl font-bold tracking-tight'>Integrations</h1>
        <p className='text-muted-foreground'>
          Connect best-in-class tools to extend your workspace.
        </p>
      </div>

      <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
        <IntegrationCard
          title='QuickBooks Online'
          description='Sync expenses, accounts, and classes with QuickBooks.'
          icon={<CreditCard className='h-6 w-6' />}
          actionHref='/dashboard/settings/integrations/quickbooks'
          actionLabel='Open'
          accent='emerald'
        />

        <IntegrationCard
          title='Webhooks'
          description='Send event notifications to your systems.'
          icon={<Cable className='h-6 w-6' />}
          accent='sky'
          enabled={false}
        />

        <IntegrationCard
          title='Data Export'
          description='Export data to your data warehouse securely.'
          icon={<Database className='h-6 w-6' />}
          accent='violet'
          enabled={false}
        />
      </div>
    </div>
  );
}
