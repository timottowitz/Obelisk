'use client';

import React from 'react';
import { useAuth, useOrganizationList } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

const OrganizationChecker = ({ children }: { children: React.ReactNode }) => {
  const { orgId, isLoaded: isAuthLoaded } = useAuth();
  const {
    userMemberships,
    setActive: setActiveTenant,
    isLoaded: isOrgLoaded
  } = useOrganizationList({
    userMemberships: true
  });
  const router = useRouter();

  React.useEffect(() => {
    if (isAuthLoaded && isOrgLoaded) {
      if (
        (!userMemberships.isLoading && userMemberships.count === 0) ||
        !orgId
      ) {
        console.log('pushing to create-organization');
        router.push('/create-organization');
      }
    }
  }, [userMemberships, orgId, isAuthLoaded, isOrgLoaded]);

  if (!isAuthLoaded || !isOrgLoaded) {
    return <div>Loading...</div>;
  }

  return <>{children}</>;
};

export default OrganizationChecker;
