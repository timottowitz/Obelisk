'use client';

import { useEffect, useState, useRef } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  ExternalLink,
  ArrowLeft
} from 'lucide-react';
import { useOrganization } from '@clerk/nextjs';
import { quickbooksService } from '@/services/quickbooks-service';
import { toast } from 'sonner';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';

interface QuickBooksStatus {
  connected: boolean;
  realm_id?: string;
  is_sandbox?: boolean;
  expired?: boolean;
  expires_at?: string;
}

export default function IntegrationsPage() {
  const { organization } = useOrganization();
  const [qbStatus, setQbStatus] = useState<QuickBooksStatus>({
    connected: false
  });
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const handledRef = useRef(false);

  useEffect(() => {
    if (organization) {
      fetchQuickBooksStatus();
    }
  }, [organization]);

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const realmId = searchParams.get('realmId');
    const error = searchParams.get('error') || '';
    if (handledRef.current) return;
    if (code && state && realmId && error === '') {
      handledRef.current = true;
      handleCallback(code, state, realmId, error);
    }
  }, [searchParams, router]);

  const handleCallback = async (
    code: string,
    state: string,
    realmId: string,
    error: string
  ) => {
    try {
      await quickbooksService.getCallbackUrl(code, state, realmId, error);
      toast.success('Successfully connected to QuickBooks.');
      fetchQuickBooksStatus();
      router.push('/dashboard/settings/integrations/quickbooks');
    } catch (error) {
      console.error('Failed to get callback URL:', error);
      toast.error('Failed to connect to QuickBooks. Please try again.');
    }
  };

  const fetchQuickBooksStatus = async () => {
    try {
      const response = await quickbooksService.getStatus();
      setQbStatus(response as QuickBooksStatus);
    } catch (error) {
      console.error('Failed to fetch QuickBooks status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const response = await quickbooksService.getAuthUrl();
      if (response.authUrl) {
        window.location.href = response.authUrl;
      }
    } catch (error) {
      console.error('Failed to initiate QuickBooks connection:', error);
      toast.error('Failed to connect to QuickBooks. Please try again.');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await quickbooksService.disconnect();
      setQbStatus({ connected: false });
      toast.success('Successfully disconnected from QuickBooks.');
    } catch (error) {
      console.error('Failed to disconnect QuickBooks:', error);
      toast.error('Failed to disconnect from QuickBooks. Please try again.');
    } finally {
      setDisconnecting(false);
    }
  };

  const handleRefreshToken = async () => {
    try {
      await quickbooksService.refreshToken();
      await fetchQuickBooksStatus();
      toast.success('Successfully refreshed QuickBooks access token.');
    } catch (error) {
      console.error('Failed to refresh token:', error);
      toast.error('Failed to refresh QuickBooks token. Please reconnect.');
    }
  };

  const getStatusBadge = () => {
    if (!qbStatus.connected) {
      return <Badge variant='secondary'>Not Connected</Badge>;
    }
    if (qbStatus.expired) {
      return <Badge variant='destructive'>Token Expired</Badge>;
    }
    return (
      <Badge variant='default' className='bg-green-600'>
        Connected
      </Badge>
    );
  };

  const getEnvironmentBadge = () => {
    if (!qbStatus.connected) return null;
    return qbStatus.is_sandbox ? (
      <Badge variant='outline'>Sandbox</Badge>
    ) : (
      <Badge variant='outline'>Production</Badge>
    );
  };

  if (loading) {
    return (
      <div className='flex min-h-[400px] items-center justify-center'>
        <Loader2 className='h-8 w-8 animate-spin' />
      </div>
    );
  }

  return (
    <div className='space-y-6 p-8'>
      <Button onClick={() => window.history.back()} className='cursor-pointer'>
        <ArrowLeft className='mr-2 h-4 w-4' />
        Back to Integrations
      </Button>
      <div className='mb-4'>
        <h1 className='text-3xl font-bold tracking-tight'>
          QuickBooks Integrations
        </h1>
        <p className='text-muted-foreground'>
          Connect your account with external services to automate workflows.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div className='flex items-center space-x-4'>
              <div className='flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900'>
                <svg
                  className='h-8 w-8 text-green-600 dark:text-green-400'
                  viewBox='0 0 24 24'
                  fill='currentColor'
                >
                  <path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z' />
                  <path d='M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z' />
                  <circle cx='12' cy='12' r='2' />
                </svg>
              </div>
              <div>
                <CardTitle>QuickBooks Online</CardTitle>
                <CardDescription>
                  Sync your financial data with QuickBooks accounting software
                </CardDescription>
              </div>
            </div>
            <div className='flex items-center space-x-2'>
              {getEnvironmentBadge()}
              {getStatusBadge()}
            </div>
          </div>
        </CardHeader>
        <CardContent className='space-y-4'>
          {qbStatus.connected ? (
            <>
              <div className='space-y-2 rounded-lg border p-4'>
                <div className='flex items-center justify-between'>
                  <span className='text-sm font-medium'>Company ID</span>
                  <span className='text-muted-foreground text-sm'>
                    {qbStatus.realm_id}
                  </span>
                </div>
                {qbStatus.expires_at && (
                  <div className='flex items-center justify-between'>
                    <span className='text-sm font-medium'>Token Expires</span>
                    <span className='text-muted-foreground text-sm'>
                      {new Date(qbStatus.expires_at).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              {qbStatus.expired && (
                <Alert>
                  <AlertCircle className='h-4 w-4' />
                  <AlertDescription>
                    Your QuickBooks connection has expired. Please refresh the
                    token or reconnect.
                  </AlertDescription>
                </Alert>
              )}

              <div className='flex space-x-2'>
                {qbStatus.expired && (
                  <Button onClick={handleRefreshToken} variant='outline'>
                    Refresh Token
                  </Button>
                )}
                <Button
                  onClick={handleDisconnect}
                  variant='destructive'
                  disabled={disconnecting}
                >
                  {disconnecting ? (
                    <>
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                      Disconnecting...
                    </>
                  ) : (
                    'Disconnect'
                  )}
                </Button>
              </div>
            </>
          ) : (
            <div className='space-y-4'>
              <div className='bg-muted rounded-lg p-4'>
                <h4 className='mb-2 font-medium'>Features</h4>
                <ul className='text-muted-foreground space-y-1 text-sm'>
                  <li className='flex items-center'>
                    <CheckCircle className='mr-2 h-4 w-4 text-green-600' />
                    Sync case expenses to QuickBooks
                  </li>
                  <li className='flex items-center'>
                    <CheckCircle className='mr-2 h-4 w-4 text-green-600' />
                    Track clients and matters as customers
                  </li>
                  <li className='flex items-center'>
                    <CheckCircle className='mr-2 h-4 w-4 text-green-600' />
                    Map cost types to QuickBooks accounts
                  </li>
                  <li className='flex items-center'>
                    <CheckCircle className='mr-2 h-4 w-4 text-green-600' />
                    Automatic vendor creation
                  </li>
                </ul>
              </div>

              <Button
                onClick={handleConnect}
                disabled={connecting}
                className='w-full cursor-pointer'
              >
                {connecting ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Connecting...
                  </>
                ) : (
                  <>
                    Connect to QuickBooks
                    <ExternalLink className='ml-2 h-4 w-4' />
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {qbStatus.connected && (
        <Card>
          <CardHeader>
            <CardTitle>Account Mappings</CardTitle>
            <CardDescription>
              Map your cost types to QuickBooks accounts and classes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant='outline' asChild>
              <a href='/dashboard/settings/integrations/quickbooks/mappings'>
                Configure Mappings
              </a>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
