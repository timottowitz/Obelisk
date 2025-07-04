import { NavItem } from '@/types';

export type Product = {
  photo_url: string;
  name: string;
  description: string;
  created_at: string;
  price: number;
  id: number;
  category: string;
  updated_at: string;
};

//Info: The following data is used for the sidebar navigation and Cmd K bar.
export const navItems: NavItem[] = [
  {
    title: 'Overview',
    url: '/dashboard/overview',
    icon: 'dashboard',
    isActive: true,
    shortcut: ['o', 'o'],
    items: []
  },
  {
    title: 'Cases',
    url: '#',
    icon: 'page',
    isActive: false,
    shortcut: ['c', 'c'],
    items: [
      {
        title: 'Active Cases',
        url: '/dashboard/cases/active',
        icon: 'page',
        shortcut: ['c', 'a']
      },
      {
        title: 'Closed Cases',
        url: '/dashboard/cases/closed',
        icon: 'page',
        shortcut: ['c', 'c']
      }
    ]
  },
  {
    title: 'Documents',
    url: '#',
    icon: 'post',
    isActive: false,
    shortcut: ['d', 'd'],
    items: [
      {
        title: 'All Documents',
        url: '/dashboard/documents',
        icon: 'post',
        shortcut: ['d', 'a']
      },
      {
        title: 'Contracts',
        url: '/dashboard/documents/contracts',
        icon: 'post',
        shortcut: ['d', 'c']
      },
      {
        title: 'Evidence',
        url: '/dashboard/documents/evidence',
        icon: 'post',
        shortcut: ['d', 'e']
      }
    ]
  },
  {
    title: 'Legal Research',
    url: '#',
    icon: 'help',
    isActive: false,
    shortcut: ['l', 'r'],
    items: [
      {
        title: 'Case Law',
        url: '/dashboard/research/case-law',
        icon: 'help',
        shortcut: ['l', 'c']
      },
      {
        title: 'Statutes',
        url: '/dashboard/research/statutes',
        icon: 'post',
        shortcut: ['l', 's']
      }
    ]
  },
  {
    title: 'Financial',
    url: '#',
    icon: 'billing',
    isActive: false,
    shortcut: ['f', 'f'],
    items: [
      {
        title: 'Invoices',
        url: '/dashboard/financial/invoices',
        icon: 'billing',
        shortcut: ['f', 'i']
      },
      {
        title: 'Expenses',
        url: '/dashboard/financial/expenses',
        icon: 'billing',
        shortcut: ['f', 'e']
      },
      {
        title: 'Reports',
        url: '/dashboard/financial/reports',
        icon: 'post',
        shortcut: ['f', 'r']
      }
    ]
  },
  {
    title: 'AI Assistant',
    url: '/dashboard/ai-assistant',
    icon: 'callcaps',
    isActive: false,
    shortcut: ['a', 'i'],
    items: []
  },
  {
    title: 'Analytics',
    url: '#',
    icon: 'dashboard',
    isActive: false,
    shortcut: ['a', 'n'],
    items: [
      {
        title: 'Performance',
        url: '/dashboard/analytics/performance',
        icon: 'dashboard',
        shortcut: ['a', 'p']
      },
      {
        title: 'Insights',
        url: '/dashboard/analytics/insights',
        icon: 'dashboard',
        shortcut: ['a', 'i']
      }
    ]
  },
  {
    title: 'Communications',
    url: '#',
    icon: 'media',
    isActive: false,
    shortcut: ['c', 'm'],
    items: [
      {
        title: 'Emails',
        url: '/dashboard/communications/emails',
        icon: 'media',
        shortcut: ['c', 'e']
      },
      {
        title: 'Notes',
        url: '/dashboard/communications/notes',
        icon: 'post',
        shortcut: ['c', 'n']
      }
    ]
  },
  {
    title: 'Clients',
    url: '/dashboard/clients',
    icon: 'user',
    isActive: false,
    shortcut: ['c', 'l'],
    items: []
  },
  {
    title: 'Settings',
    url: '/dashboard/settings',
    icon: 'settings',
    isActive: false,
    shortcut: ['s', 's'],
    items: []
  }
];

export interface SaleUser {
  id: number;
  name: string;
  email: string;
  amount: string;
  image: string;
  initials: string;
}

export const recentSalesData: SaleUser[] = [
  {
    id: 1,
    name: 'Olivia Martin',
    email: 'olivia.martin@email.com',
    amount: '+$1,999.00',
    image: 'https://api.slingacademy.com/public/sample-users/1.png',
    initials: 'OM'
  },
  {
    id: 2,
    name: 'Jackson Lee',
    email: 'jackson.lee@email.com',
    amount: '+$39.00',
    image: 'https://api.slingacademy.com/public/sample-users/2.png',
    initials: 'JL'
  },
  {
    id: 3,
    name: 'Isabella Nguyen',
    email: 'isabella.nguyen@email.com',
    amount: '+$299.00',
    image: 'https://api.slingacademy.com/public/sample-users/3.png',
    initials: 'IN'
  },
  {
    id: 4,
    name: 'William Kim',
    email: 'will@email.com',
    amount: '+$99.00',
    image: 'https://api.slingacademy.com/public/sample-users/4.png',
    initials: 'WK'
  },
  {
    id: 5,
    name: 'Sofia Davis',
    email: 'sofia.davis@email.com',
    amount: '+$39.00',
    image: 'https://api.slingacademy.com/public/sample-users/5.png',
    initials: 'SD'
  }
];
