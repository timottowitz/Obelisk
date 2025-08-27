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
    } catch (error) {
      console.error('Failed to initiate Microsoft connection:', error);
      toast.error('Failed to connect to Microsoft. Please try again.');
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