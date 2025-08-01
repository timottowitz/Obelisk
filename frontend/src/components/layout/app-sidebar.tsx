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
  SidebarRail,
  useSidebar
} from '@/components/ui/sidebar';
import { UserAvatarProfile } from '@/components/user-avatar-profile';
import { navItems, footerItems } from '@/constants/data';
import { useMediaQuery } from '@/hooks/use-media-query';
import { Button } from '@/components/ui/button';
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
import { cn } from '@/lib/utils';

export default function AppSidebar() {
  const pathname = usePathname();
  const { state } = useSidebar();
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

  return (
    <Sidebar collapsible='icon'>
      <SidebarHeader className='px-3 py-4'>
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
        <div className='px-3 py-4'>
          <Link href='/dashboard/cases/create'>
            <Button
              className='w-full cursor-pointer rounded-lg bg-black text-white hover:bg-gray-800'
              size='lg'
            >
              <Icons.add className='h-4 w-4' />
              {state === 'expanded' && 'File a New Case'}
            </Button>
          </Link>
        </div>

        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarMenu>
            {navItems.map((item) => {
              const Icon = item.icon ? Icons[item.icon] : Icons.logo;
              const isActive = pathname === item.url;
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    className={cn(
                      'text-md flex w-full items-center rounded-lg px-4 py-5 text-left transition-colors',
                      isActive
                        ? 'border border-blue-200 bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    )}
                  >
                    <Link href={item.url}>
                      <Icon size={24} />
                      <span>{item.title}</span>
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
              const isActive = pathname === item.url;
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    className={cn(
                      'text-md flex w-full items-center rounded-lg px-4 py-5 text-left transition-colors',
                      isActive
                        ? 'border border-blue-200 bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    )}
                  >
                    <Link href={item.url}>
                      <Icon size={24} />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>

        {/* Support Section */}
        {state === 'expanded' && (
          <div className='text-muted-foreground px-6 py-4 text-xs'>
            <p className='mb-2'>
              For case-related questions and assistance, please contact your
              case manager. For other questions, please email Customer Service
              at:
            </p>
            <a
              href='mailto:CustomerService@adr.org'
              className='text-blue-400 hover:text-blue-300'
            >
              CustomerService@adr.org
            </a>
          </div>
        )}
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
