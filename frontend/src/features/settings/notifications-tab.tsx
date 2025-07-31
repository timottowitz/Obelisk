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
import { Bell } from 'lucide-react';

export function NotificationsTab() {
  return (
    <div className='space-y-6'>
      <Card className='border-0 bg-white/80 shadow-lg backdrop-blur-sm'>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Bell className='h-5 w-5 text-orange-600' />
            Notification Preferences
          </CardTitle>
          <CardDescription>
            Choose how and when you want to be notified
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='space-y-4'>
            <div className='flex items-center justify-between'>
              <div>
                <Label className='text-sm font-medium'>
                  Email Notifications
                </Label>
                <p className='text-sm text-gray-500'>
                  Receive notifications via email
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className='flex items-center justify-between'>
              <div>
                <Label className='text-sm font-medium'>
                  Case Updates
                </Label>
                <p className='text-sm text-gray-500'>
                  Get notified about case status changes
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className='flex items-center justify-between'>
              <div>
                <Label className='text-sm font-medium'>
                  Meeting Reminders
                </Label>
                <p className='text-sm text-gray-500'>
                  Receive reminders for upcoming meetings
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button className='bg-orange-600 hover:bg-orange-700'>
            Save Notification Settings
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 