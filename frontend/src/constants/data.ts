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
    title: 'Home',
    url: '/dashboard',
    icon: 'home',
    isActive: false,
    shortcut: ['h', 'h'],
    items: []
  },
  {
    title: 'My Cases',
    url: '/dashboard/cases',
    icon: 'page',
    isActive: false,
    shortcut: ['c', 'c'],
    items: [
      {
        title: 'Solar Cases',
        url: '/dashboard/cases?type=solar',
        icon: 'sun',
        isActive: false,
        shortcut: ['c', 'c'],
        items: []
      },
      {
        title: 'Litigation',
        url: '/dashboard/cases?type=litigation',
        icon: 'litigation',
        isActive: false,
        shortcut: ['c', 'c'],
        items: []
      },
      {
        title: 'IMVA',
        url: '/dashboard/cases?type=imva',
        icon: 'imva',
        isActive: false,
        shortcut: ['c', 'c'],
        items: []
      },
    ]
  },
  {
    title: 'My Tasks',
    url: '/dashboard/tasks',
    icon: 'tasks',
    isActive: false,
    shortcut: ['t', 't'],
    items: []
  },
  {
    title: 'Events',
    url: '/dashboard/events',
    icon: 'calendar',
    isActive: false,
    shortcut: ['e', 'c'],
    items: []
  },
  {
    title: 'Call Caps',
    url: '/dashboard/meetings',
    icon: 'callcaps',
    isActive: false,
    shortcut: ['c', 'r'],
    items: []
  },
  {
    title: 'Expenses',
    url: '/dashboard/expenses',
    icon: 'dollar',
    isActive: false,
    shortcut: ['p', 'p'],
    items: []
  }
];

export const practiceAreaItems: NavItem[] = [
  {
    title: 'Solar',
    url: '/dashboard/practice-areas/solar',
    icon: 'sun',
    isActive: false,
    label: '12',
    items: []
  },
  {
    title: 'Litigation',
    url: '/dashboard/practice-areas/litigation',
    icon: 'litigation',
    isActive: false,
    label: '8',
    items: []
  },
  {
    title: 'IMMA',
    url: '/dashboard/practice-areas/imma',
    icon: 'page',
    isActive: false,
    label: '5',
    items: []
  },
  {
    title: 'Tasks',
    url: '/dashboard/tasks',
    icon: 'tasks',
    isActive: false,
    label: '23',
    items: []
  }
];

export const footerItems: NavItem[] = [
  {
    title: 'Settings',
    url: '/dashboard/settings/caseTypes',
    icon: 'settings',
    isActive: false,
    shortcut: ['s', 's'],
    items: []
  },
  {
    title: 'Help & Support',
    url: '/dashboard/help',
    icon: 'help',
    isActive: false,
    shortcut: ['h', 's'],
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
