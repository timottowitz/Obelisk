'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { ConnectMicrosoftButton } from '@/components/email/ConnectMicrosoftButton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Mail, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface EmailStatus {
  connected: boolean;
  email?: string;
  displayName?: string;
  provider?: string;
}

export default function EmailDashboard() {
  const { userId, orgId } = useAuth();
  const [status, setStatus] = useState<EmailStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkEmailStatus();
  }, [userId, orgId]);

  const checkEmailStatus = async () => {
    if (!userId || !orgId) {
      setLoading(false);
      setError('User or organization not found');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/email/status', {
        headers: {
          'X-Org-Id': orgId,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          setStatus({ connected: false });
        } else {
          throw new Error(`Failed to fetch email status: ${response.statusText}`);
        }
      } else {
        const data = await response.json();
        setStatus(data);
      }
    } catch (err) {
      console.error('Failed to check email status:', err);
      setError('Failed to check email connection status');
      setStatus({ connected: false });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading email status...</p>
        </div>
      </div>
    );
  }

  if (error && !status) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!status?.connected) {
    return (
      <div className="container mx-auto py-8">
        <div className="mx-auto max-w-2xl">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">Connect Your Email</CardTitle>
              <CardDescription>
                Connect your Microsoft 365 or Outlook.com account to access your emails directly from Obelisk
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-6">
              <div className="text-center text-sm text-muted-foreground">
                <p className="mb-2">After connecting, you'll be able to:</p>
                <ul className="space-y-1 text-left">
                  <li>• Read and manage your emails</li>
                  <li>• Send emails from within Obelisk</li>
                  <li>• Search through your email history</li>
                  <li>• Organize emails by folders</li>
                  <li>• Link emails to cases and contacts</li>
                </ul>
              </div>
              <ConnectMicrosoftButton />
              <p className="text-center text-xs text-muted-foreground">
                By connecting, you grant Obelisk permission to access your Microsoft email account.
                You can revoke this access at any time.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Import ZeroMailShell at top of file when ready
  // import { ZeroMailShell } from '@/components/email/ZeroMailShell';
  
  return (
    <div className="h-full">
      {/* For now, show connected state - uncomment ZeroMailShell when ready to test */}
      <div className="container mx-auto py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Email</h1>
          <p className="text-muted-foreground">
            Connected as {status.email} ({status.displayName})
          </p>
        </div>
        
        <Alert>
          <Mail className="h-4 w-4" />
          <AlertTitle>Email Integration Ready</AlertTitle>
          <AlertDescription>
            Your Microsoft email account is connected. Full email interface is ready for testing.
          </AlertDescription>
        </Alert>

        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Email Features Available</CardTitle>
              <CardDescription>
                Full email integration with Microsoft Graph API
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>✅ Microsoft OAuth connection established</li>
                <li>✅ Inbox and folder management</li>
                <li>✅ Email composition and sending</li>
                <li>✅ Search functionality</li>
                <li>✅ Zero-compatible UI components</li>
                <li>✅ Mobile responsive design</li>
              </ul>
              <div className="mt-4">
                <p className="text-sm text-muted-foreground">
                  Uncomment ZeroMailShell in the page component to activate the full email interface.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Uncomment this when ready to activate full email UI */}
      {/* <ZeroMailShell /> */}
    </div>
  );
}