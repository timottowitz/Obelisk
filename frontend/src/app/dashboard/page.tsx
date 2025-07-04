import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function Dashboard() {
  const { userId, orgId } = await auth();

  if (!userId) {
    return redirect('/auth/sign-in');
  } else {
    if (orgId) {
      redirect('/dashboard/overview');
    } else {
      redirect('/create-organization');
    }
  }
}
