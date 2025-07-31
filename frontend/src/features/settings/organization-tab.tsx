'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Building } from 'lucide-react';

export function OrganizationTab() {
  return (
    <div className='space-y-6'>
      <Card className='border-0 bg-white/80 shadow-lg backdrop-blur-sm'>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Building className='h-5 w-5 text-purple-600' />
            Organization Details
          </CardTitle>
          <CardDescription>
            Manage your organization's information and settings
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid gap-4 md:grid-cols-2'>
            <div>
              <Label htmlFor='orgName'>Organization Name</Label>
              <Input
                id='orgName'
                defaultValue='Legal Practice LLC'
                className='mt-1'
              />
            </div>
            <div>
              <Label htmlFor='industry'>Industry</Label>
              <Select defaultValue='Legal Services'>
                <SelectTrigger className='mt-1'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='Legal Services'>
                    Legal Services
                  </SelectItem>
                  <SelectItem value='Healthcare'>Healthcare</SelectItem>
                  <SelectItem value='Technology'>Technology</SelectItem>
                  <SelectItem value='Finance'>Finance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor='address'>Address</Label>
            <Input
              id='address'
              defaultValue='123 Legal Street, Suite 100'
              className='mt-1'
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button className='bg-purple-600 hover:bg-purple-700'>
            Save Organization Settings
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 