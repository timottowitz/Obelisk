'use client';
import { CreateOrganizationForm } from '@/components/organization/create-organization-form';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
const DASHBOARD_ROUTE = '/dashboard/overview';

/**
 * Create Organization Page
 * - Shows Clerk's OrganizationList component for creating/joining organizations
 * - If user is already in an org, redirect to dashboard
 * - Uses shadcn/ui for consistent styling
 */
export default function CreateOrganizationPage() {
  const { orgId, userId, isLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;
    if (!userId) {
      router.push('/auth/sign-in');
    }
  }, [orgId, router, userId, isLoaded]);

  if (!isLoaded) return <div>Loading...</div>;

  return (
    <div className='flex min-h-screen flex-col items-center justify-center p-4'>
      <div className='bg-background w-full max-w-md space-y-6 rounded-lg border p-8 shadow-lg'>
        <h1 className='mb-4 text-center text-2xl font-bold'>
          Create or Join an Organization
        </h1>
        <p className='text-muted-foreground mb-6 text-center'>
          You must belong to an organization to access the dashboard.
        </p>
        <CreateOrganizationForm />
        <div className='mt-6 flex justify-center'>
          <form action='/auth/sign-out' method='post'>
            <Button type='submit' variant='outline'>
              Sign out
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
