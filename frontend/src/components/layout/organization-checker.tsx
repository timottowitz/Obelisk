'use client';

import React from 'react';
import { useAuth, useOrganizationList } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

const OrganizationChecker = ({ children }: { children: React.ReactNode }) => {
  const { orgId, isLoaded: isAuthLoaded } = useAuth();
  const { setActive, isLoaded: isOrgListLoaded, userMemberships } = useOrganizationList();
  const router = useRouter();
  const isLoaded = isAuthLoaded && isOrgListLoaded && !userMemberships.isLoading;

  React.useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (orgId) {
      return;
    }

    if (userMemberships.count === 0) {
      router.push('/create-organization');
      return;
    }

    if (userMemberships.count > 0 && !orgId) {
      if (userMemberships.data?.length === 1 && setActive) {
        setActive({
          organization: userMemberships.data[0].organization.id
        }).catch((err) => {
          console.error('Error setting active organization:', err);
        });
      }
    }
  }, [isLoaded, userMemberships, orgId, router, setActive]);

  if (!isLoaded || !orgId) {
    return <div>Loading...</div>;
  }

  return <>{children}</>;
};

export default OrganizationChecker;
