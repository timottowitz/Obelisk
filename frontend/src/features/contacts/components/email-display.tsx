import React from 'react';
import { ChevronUp, ChevronDown, Mail as MailIcon } from 'lucide-react';
import { EmailEntry } from '@/types/contacts';

interface EmailDisplayProps {
  emails: EmailEntry[];
  currentIndex: number;
  onCycleEmail: (delta: number) => void;
  showIcon?: boolean;
}

export default function EmailDisplay({
  emails,
  currentIndex,
  onCycleEmail,
  showIcon = true
}: EmailDisplayProps) {
  if (!emails || emails.length === 0) {
    return <span>—</span>;
  }

  const index = Math.min(currentIndex, emails.length - 1);
  const current = emails[index];

  return (
    <div className='flex items-center justify-between gap-2'>
      <div className='flex items-center gap-2'>
        {showIcon && (
          <span className='hidden sm:block'>
            <MailIcon className='text-muted-foreground h-4 w-4' />
          </span>
        )}
        <span className='truncate whitespace-nowrap'>{current.address}</span>
      </div>
      {emails.length > 1 && (
        <div className='flex flex-col items-center'>
          <button
            type='button'
            aria-label='Previous email'
            className='text-muted-foreground hover:text-foreground'
            onClick={(e) => {
              e.stopPropagation();
              onCycleEmail(-1);
            }}
          >
            <ChevronUp className='h-4 w-4' />
          </button>
          <button
            type='button'
            aria-label='Next email'
            className='text-muted-foreground hover:text-foreground'
            onClick={(e) => {
              e.stopPropagation();
              onCycleEmail(1);
            }}
          >
            <ChevronDown className='h-4 w-4' />
          </button>
        </div>
      )}
    </div>
  );
}
