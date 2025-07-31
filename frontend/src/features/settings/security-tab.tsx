'use client';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { Shield } from 'lucide-react';

export function SecurityTab() {
  return (
    <div className='space-y-6'>
      <Card className='border-0 bg-white/80 shadow-lg backdrop-blur-sm'>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Shield className='h-5 w-5 text-red-600' />
            Security Settings
          </CardTitle>
          <CardDescription>
            Manage your account security and privacy
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='flex items-center justify-between'>
            <div>
              <Label className='text-sm font-medium'>
                Two-Factor Authentication
              </Label>
              <p className='text-sm text-gray-500'>
                Add an extra layer of security
              </p>
            </div>
            <Switch />
          </div>

          <div className='flex items-center justify-between'>
            <div>
              <Label className='text-sm font-medium'>
                Login Notifications
              </Label>
              <p className='text-sm text-gray-500'>
                Get notified of new login attempts
              </p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
        <CardFooter>
          <Button className='bg-red-600 hover:bg-red-700'>
            Save Security Settings
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 