import React from 'react';
import { SidebarTrigger } from '../ui/sidebar';
import { Separator } from '../ui/separator';
import { Button } from '../ui/button';
import { Bell, ChevronDown } from 'lucide-react';
import { Badge } from '../ui/badge';
import { UserNav } from './user-nav';
import { ThemeSelector } from '../theme-selector';
import { ModeToggle } from './ThemeToggle/theme-toggle';
import * as NavigationMenu from '@radix-ui/react-navigation-menu';

export default function Header() {
  const notifications = 3; // Could be passed as prop or from context

  return (
    <header className='flex h-16 shrink-0 items-center justify-between gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12'>
      {/* Left section - Sidebar trigger + Org/Navigation switcher */}
      <div className='flex items-center gap-2 px-4'>
        <SidebarTrigger className='-ml-1' />
        <Separator orientation='vertical' className='mr-2 h-4' />
        
        <div className='flex items-center gap-1'>
          <NavigationMenu.Root>
            <NavigationMenu.List className='flex items-center gap-1 md:gap-2 lg:gap-4 xl:gap-6'>
              <NavigationMenu.Item>
                <NavigationMenu.Link asChild>
                  <Button
                    variant='ghost'
                    className='hover:bg-primary/10 h-7 rounded-full px-3 text-xs font-semibold transition-colors'
                  >
                    Cases
                  </Button>
                </NavigationMenu.Link>
              </NavigationMenu.Item>
              <NavigationMenu.Item>
                <NavigationMenu.Link asChild>
                  <Button
                    variant='ghost'
                    className='hover:bg-primary/10 h-7 rounded-full px-3 text-xs font-semibold transition-colors'
                  >
                    Arbitration
                  </Button>
                </NavigationMenu.Link>
              </NavigationMenu.Item>
              <NavigationMenu.Item>
                <NavigationMenu.Link asChild>
                  <Button
                    variant='ghost'
                    className='hover:bg-primary/10 h-7 rounded-full px-3 text-xs font-semibold transition-colors'
                  >
                    Clients
                  </Button>
                </NavigationMenu.Link>
              </NavigationMenu.Item>
              <NavigationMenu.Item>
                <NavigationMenu.Link asChild>
                  <Button
                    variant='ghost'
                    className='hover:bg-primary/10 h-7 rounded-full px-3 text-xs font-semibold transition-colors'
                  >
                    Reports
                  </Button>
                </NavigationMenu.Link>
              </NavigationMenu.Item>
            </NavigationMenu.List>
          </NavigationMenu.Root>
        </div>
      </div>

      {/* Right section - Notifications + User menu */}
      <div className='flex items-center gap-2 px-4'>
        {/* Notifications */}
        <Button
          variant='ghost'
          size='icon'
          className='relative h-7 w-7'
        >
          <Bell className='h-3 w-3' />
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
