import React from 'react';
import {
  ChevronUp,
  ChevronDown,
  Building2,
  Smartphone,
  Printer,
  Home as HomeIcon,
  Briefcase,
  Mail as MailIcon
} from 'lucide-react';
import { PhoneType, PhoneEntry } from '@/types/contacts';

const phoneTypeIcon = (type: PhoneType) => {
  const common = 'text-muted-foreground h-4 w-4';
  switch (type) {
    case 'cell':
      return <Smartphone className={common} />;
    case 'fax':
      return <Printer className={common} />;
    case 'home':
      return <HomeIcon className={common} />;
    case 'main':
      return <Building2 className={common} />;
    case 'work':
      return <Briefcase className={common} />;
    case 'workMobile':
      return <Smartphone className={common} />;
    case 'other':
    default:
      return <MailIcon className={common} />;
  }
};

export const phoneTypeToLabel: Record<PhoneType, string> = {
  cell: 'Cell Phone',
  fax: 'Fax',
  home: 'Home',
  main: 'Main',
  work: 'Work',
  workMobile: 'Work Mobile',
  other: 'Other'
};

interface PhoneDisplayProps {
  phones: PhoneEntry[];
  currentIndex: number;
  onCyclePhone: (delta: number) => void;
  showIcon?: boolean;
}

export default function PhoneDisplay({
  phones,
  currentIndex,
  onCyclePhone,
  showIcon = true
}: PhoneDisplayProps) {
  if (phones.length === 0) {
    return <span>—</span>;
  }

  const currentPhone = phones[Math.min(currentIndex, phones.length - 1)];

  return (
    <div className='flex items-center justify-between gap-2'>
      <div className='flex items-center gap-2'>
        {showIcon && (
          <span className='hidden sm:block'>
            {phoneTypeIcon(currentPhone.type)}
          </span>
        )}
        <span className='truncate whitespace-nowrap'>
          {currentPhone.value}
        </span>
      </div>
      {phones.length > 1 && (
        <div className='flex flex-col items-center'>
          <button
            type='button'
            aria-label='Previous phone'
            className='text-muted-foreground hover:text-foreground'
            onClick={(e) => {
              e.stopPropagation();
              onCyclePhone(-1);
            }}
          >
            <ChevronUp className='h-4 w-4' />
          </button>
          <button
            type='button'
            aria-label='Next phone'
            className='text-muted-foreground hover:text-foreground'
            onClick={(e) => {
              e.stopPropagation();
              onCyclePhone(1);
            }}
          >
            <ChevronDown className='h-4 w-4' />
          </button>
        </div>
      )}
    </div>
  );
}

export { phoneTypeIcon };