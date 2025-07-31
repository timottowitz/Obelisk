'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { User } from 'lucide-react';
import { useUser } from '@clerk/nextjs';

export function ProfileTab() {
  const { user } = useUser();

  return (
    <div className='space-y-6'>
      <Card className='border-0 bg-white/80 shadow-lg backdrop-blur-sm'>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <User className='h-5 w-5 text-blue-600' />
            Personal Information
          </CardTitle>
          <CardDescription>
            Update your personal details and contact information
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <Label htmlFor='firstName'>First Name</Label>
              <Input
                id='firstName'
                defaultValue={user?.firstName || ''}
                className='mt-1'
              />
            </div>
            <div>
              <Label htmlFor='lastName'>Last Name</Label>
              <Input
                id='lastName'
                defaultValue={user?.lastName || ''}
                className='mt-1'
              />
            </div>
          </div>
          <div>
            <Label htmlFor='email'>Email Address</Label>
            <Input
              id='email'
              type='email'
              defaultValue={user?.emailAddresses[0]?.emailAddress || ''}
              className='mt-1'
            />
          </div>
          <div>
            <Label htmlFor='bio'>Bio</Label>
            <Textarea
              id='bio'
              placeholder='Tell us about yourself...'
              className='mt-1'
              rows={3}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button className='bg-blue-600 hover:bg-blue-700'>
            Save Changes
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 