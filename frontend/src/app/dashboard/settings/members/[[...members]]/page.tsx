'use client';

import { Button } from '@/components/ui/button';
import { OrganizationProfile } from '@clerk/nextjs';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function MembersPage() {
  return (
    <div className='bg-background min-h-screen'>
      {/* Top Bar */}
      <div className='bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50'>
        <div className='flex h-16 items-center justify-between px-6'>
          <div className='flex items-center gap-4'>
            <Link href='/dashboard/settings'>
              <Button className='cursor-pointer'>
                <ArrowLeft className='mr-2 h-4 w-4' />
                Back to Settings
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className='flex items-center justify-center px-6 py-8'>
        <div className='w-full max-w-4xl'>
          <OrganizationProfile
            appearance={{
              elements: {
                card: 'shadow-xl border border-border rounded-lg',
                rootBox: 'mx-auto',
                scrollBox: 'max-h-[calc(100vh-8rem)]'
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
