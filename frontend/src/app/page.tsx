import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

// Route path constants
const SIGN_IN_ROUTE = '/auth/sign-in';
const DASHBOARD_ROUTE = '/dashboard/overview';
const CREATE_ORG_ROUTE = '/create-organization';

/**
 * Root page logic:
 * - If not signed in, redirect to sign-in
 * - If signed in but not in an org, redirect to create-organization
 * - If signed in and in an org, redirect to dashboard
 */
export default async function Page() {
  const { userId, sessionClaims } = await auth();
  const orgId = sessionClaims ? (sessionClaims as any)['o']?.id : "";

  if (!userId) {
    return redirect(SIGN_IN_ROUTE);
  }
  if (!orgId) {
    return redirect(CREATE_ORG_ROUTE);
  }
  return redirect(DASHBOARD_ROUTE);
}
