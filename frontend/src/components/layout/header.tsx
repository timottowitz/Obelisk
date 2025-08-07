import React from 'react';
import { SidebarTrigger } from '../ui/sidebar';
import { Separator } from '../ui/separator';
import { Button } from '../ui/button';
import { Bell } from 'lucide-react';
import { Badge } from '../ui/badge';
import { UserNav } from './user-nav';
import { ThemeSelector } from '../theme-selector';
import { ModeToggle } from './ThemeToggle/theme-toggle';
import { AINotificationCenter } from '../ai/ai-notification-center';

export default function Header() {
  const notifications = 3;

  return (
    <header className='flex h-16 shrink-0 items-center justify-between gap-2 border-b border-dark bg-background transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12'>
      <div className='flex items-center gap-2 px-4'>
        <SidebarTrigger className='-ml-1' />
        <Separator orientation='vertical' className='mr-2 h-4' />
      </div>

      <div className='flex items-center gap-2 px-4'>
        <AINotificationCenter />
        
        <Button variant='ghost' className='relative h-8 w-8'>
          <Bell />
          {notifications > 0 && (
            <Badge
              variant='destructive'
              className='absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full p-0 text-xs'
            >
              {notifications}
            </Badge>
          )}
        </Button>

        <UserNav />
        <ModeToggle />
        <ThemeSelector />
      </div>
    </header>
  );
}
