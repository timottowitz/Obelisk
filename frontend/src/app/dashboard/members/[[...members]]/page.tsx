'use client';

import { OrganizationProfile } from '@clerk/nextjs';

export default function MembersPage() {
  return (
    <div className='flex min-h-[60vh] flex-col items-center justify-center py-8'>
      <div className='w-full max-w-xl'>
        <OrganizationProfile
          appearance={{
            elements: {
              card: 'shadow-lg border border-gray-200'
            }
          }}
        />
      </div>
    </div>
  );
}
