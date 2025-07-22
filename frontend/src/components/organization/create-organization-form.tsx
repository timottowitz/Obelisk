'use client';
import { useAuth, useOrganizationList } from '@clerk/nextjs';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';

const DASHBOARD_ROUTE = '/dashboard/overview';

export function CreateOrganizationForm() {
  const { createOrganization, setActive } = useOrganizationList();
  const [organizationName, setOrganizationName] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationName) return;
    if (!createOrganization) return;
    const organization = await createOrganization({ name: organizationName });
    if (!organization) return;
    await setActive({ organization: organization.id });
    router.push(DASHBOARD_ROUTE);
  };

  return (
    <form onSubmit={handleSubmit} className='space-y-4'>
      <Input
        type='text'
        placeholder='Organization name'
        value={organizationName}
        onChange={(e) => setOrganizationName(e.target.value)}
      />
      <Button type='submit' disabled={!organizationName}>
        Create Organization
      </Button>
    </form>
  );
}
