'use client';

import { useSignIn } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Mail } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export function ConnectMicrosoftButton() {
  const { isLoaded, signIn } = useSignIn();
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    if (!isLoaded || !signIn) {
      toast.error('Authentication not ready. Please refresh the page.');
      return;
    }

    try {
      setIsConnecting(true);
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_microsoft',
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/dashboard/email',
      });
    } catch (error: any) {
      console.error('Failed to initiate Microsoft connection:', error);
      
      // Handle specific error cases
      if (error?.code === 'oauth_error') {
        toast.error('Microsoft OAuth is not properly configured. Please contact support.');
      } else if (error?.message?.includes('redirect_uri')) {
        toast.error('OAuth redirect configuration error. Please contact support.');
      } else if (error?.message?.includes('unauthorized')) {
        toast.error('You don\'t have permission to connect Microsoft accounts.');
      } else {
        toast.error('Failed to connect to Microsoft. Please try again or contact support.');
      }
      
      setIsConnecting(false);
    }
  };

  return (
    <Button
      onClick={handleConnect}
      disabled={!isLoaded || isConnecting}
      size="lg"
      className="gap-2"
    >
      <Mail className="h-5 w-5" />
      {isConnecting ? 'Connecting...' : 'Connect Outlook (Microsoft 365)'}
    </Button>
  );
}