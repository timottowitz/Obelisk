'use client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail
} from '@/components/ui/sidebar';
import { UserAvatarProfile } from '@/components/user-avatar-profile';
import { navItems, practiceAreaItems, footerItems } from '@/constants/data';
import { useMediaQuery } from '@/hooks/use-media-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUser, useOrganizationList, useAuth } from '@clerk/nextjs';
import {
  IconBell,
  IconChevronsDown,
  IconCreditCard,
  IconLogout,
  IconUserCircle
} from '@tabler/icons-react';
import { SignOutButton } from '@clerk/nextjs';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';
import { Icons } from '../icons';
import { OrgSwitcher } from '../org-switcher';
import { Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export default function AppSidebar() {
  const pathname = usePathname();
  const { isOpen } = useMediaQuery();
  const { user } = useUser();
  const { userMemberships, setActive: setActiveTenant } = useOrganizationList({
    userMemberships: {
      infinite: true
    }
  });
  const auth = useAuth();
  
  const router = useRouter();
  const queryClient = useQueryClient();

  const handleSwitchTenant = async (_tenantId: string) => {
    if (setActiveTenant) {
      await setActiveTenant({
        organization: _tenantId
      });
    }
    queryClient.clear();
  };

  React.useEffect(() => {
    router.refresh();
  }, []);

  const activeTenant = userMemberships.data?.find(
    (membership) => membership.organization.id === auth.orgId
  );

  React.useEffect(() => {
    // Side effects based on sidebar state changes
  }, [isOpen]);

  return (
    <Sidebar collapsible='icon'>
      <SidebarHeader>
        {userMemberships.isLoading || !activeTenant ? (
          <div className='flex h-full items-center justify-center'>
            <Loader2 className='h-4 w-4 animate-spin' />
          </div>
        ) : (
          <OrgSwitcher
            tenants={(userMemberships.data || []).map((membership) => ({
              name: membership.organization.name,
              id: membership.organization.id
            }))}
            defaultTenant={{
              name: activeTenant.organization.name,
              id: activeTenant.organization.id
            }}
            onTenantSwitch={handleSwitchTenant}
          />
        )}
      </SidebarHeader>
      <SidebarContent className='overflow-x-hidden'>
        {/* File a New Case Button */}
        <div className='px-3 py-2'>
          <Link href='/dashboard/cases/create'>
            <Button className='w-full bg-black text-white hover:bg-gray-800 rounded-lg cursor-pointer' size='sm'>
              <Icons.add className='mr-2 h-4 w-4' />
              File a New Case
            </Button>
          </Link>
        </div>

        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarMenu>
            {navItems.map((item) => {
              const Icon = item.icon ? Icons[item.icon] : Icons.logo;
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    isActive={pathname === item.url}
                  >
                    <Link href={item.url}>
                      <Icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>

        {/* Practice Areas Section */}
        <SidebarGroup>
          <SidebarMenu>
            {practiceAreaItems.map((item) => {
              const Icon = item.icon ? Icons[item.icon] : Icons.logo;
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    isActive={pathname === item.url}
                  >
                    <Link href={item.url} className='flex items-center justify-between w-full'>
                      <div className='flex items-center'>
                        <Icon />
                        <span>{item.title}</span>
                      </div>
                      {item.label && (
                        <Badge variant='secondary' className='ml-auto text-xs'>
                          {item.label}
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>

        {/* Footer Navigation */}
        <SidebarGroup className='mt-auto'>
          <SidebarMenu>
            {footerItems.map((item) => {
              const Icon = item.icon ? Icons[item.icon] : Icons.logo;
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    isActive={pathname === item.url}
                  >
                    <Link href={item.url}>
                      <Icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>

        {/* Support Section */}
        <div className='px-3 py-4 text-xs text-muted-foreground'>
          <p className='mb-2'>For case-related questions and assistance, please contact your case manager. For other questions, please email Customer Service at:</p>
          <a href='mailto:CustomerService@adr.org' className='text-blue-400 hover:text-blue-300'>
            CustomerService@adr.org
          </a>
        </div>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size='lg'
                  className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
                >
                  {user && (
                    <UserAvatarProfile
                      className='h-8 w-8 rounded-lg'
                      showInfo
                      user={user}
                    />
                  )}
                  <IconChevronsDown className='ml-auto size-4' />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className='w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg'
                side='bottom'
                align='end'
                sideOffset={4}
              >
                <DropdownMenuLabel className='p-0 font-normal'>
                  <div className='px-1 py-1.5'>
                    {user && (
                      <UserAvatarProfile
                        className='h-8 w-8 rounded-lg'
                        showInfo
                        user={user}
                      />
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onClick={() => router.push('/dashboard/profile')}
                  >
                    <IconUserCircle className='mr-2 h-4 w-4' />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <IconCreditCard className='mr-2 h-4 w-4' />
                    Billing
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <IconBell className='mr-2 h-4 w-4' />
                    Notifications
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <IconLogout className='mr-2 h-4 w-4' />
                  <SignOutButton redirectUrl='/auth/sign-in' />
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
