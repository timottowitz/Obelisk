import React from 'react';
import { ChevronUp, ChevronDown, MapPin } from 'lucide-react';
import { AddressEntry } from '@/types/contacts';

interface AddressDisplayProps {
  addresses: AddressEntry[];
  currentIndex: number;
  onCycleAddress: (delta: number) => void;
  showIcon?: boolean;
}

function formatAddress(a: AddressEntry): string {
  const parts = [];
  if (a.street) parts.push(a.street);
  if (a.street2) parts.push(a.street2);
  if (a.city) parts.push(a.city);
  if (a.zip) parts.push(a.zip);
  if (a.st) parts.push(a.st);
  return parts.filter(Boolean).join(' ');
}

export default function AddressDisplay({
  addresses,
  currentIndex,
  onCycleAddress,
  showIcon = true
}: AddressDisplayProps) {
  if (!addresses || addresses.length === 0) {
    return <span>—</span>;
  }

  const index = Math.min(currentIndex, addresses.length - 1);
  const current = addresses[index];

  return (
    <div className='flex items-center justify-between gap-2'>
      <div className='flex items-center gap-2'>
        {showIcon && (
          <span className='hidden sm:block'>
            <MapPin className='text-muted-foreground h-4 w-4' />
          </span>
        )}
        <span className='truncate whitespace-nowrap'>
          {formatAddress(current)}
        </span>
      </div>
      {addresses.length > 1 && (
        <div className='flex flex-col items-center'>
          <button
            type='button'
            aria-label='Previous address'
            className='text-muted-foreground hover:text-foreground'
            onClick={(e) => {
              e.stopPropagation();
              onCycleAddress(-1);
            }}
          >
            <ChevronUp className='h-4 w-4' />
          </button>
          <button
            type='button'
            aria-label='Next address'
            className='text-muted-foreground hover:text-foreground'
            onClick={(e) => {
              e.stopPropagation();
              onCycleAddress(1);
            }}
          >
            <ChevronDown className='h-4 w-4' />
          </button>
        </div>
      )}
    </div>
  );
}
