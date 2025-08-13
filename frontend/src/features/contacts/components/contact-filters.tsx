import React from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { ContactType } from '@/types/contacts';
import { Button } from '@/components/ui/button';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface ContactFiltersProps {
  queryParams: {
    search: string;
    page: number;
    sortBy: 'sort_by_first' | 'sort_by_last';
    typeFilter: string;
    archived: string;
  };
  onQueryChange: (key: string, value: string) => void;
  availableTypes: ContactType[] | undefined;
  isLoading: boolean;
}

export default function ContactFilters({
  queryParams,
  onQueryChange,
  availableTypes,
  isLoading
}: ContactFiltersProps) {
  return (
    <div className='flex flex-wrap items-center gap-2'>
      <Button
        variant='outline'
        size='sm'
        className='flex items-center gap-2'
        onClick={() =>
          onQueryChange(
            'sortBy',
            queryParams.sortBy === 'sort_by_first'
              ? 'sort_by_last'
              : 'sort_by_first'
          )
        }
        disabled={isLoading}
      >
        Sort by{' '}
        {queryParams.sortBy === 'sort_by_first' ? 'First Name' : 'Last Name'}
      </Button>

      <Select
        value={queryParams.typeFilter}
        onValueChange={(value) => onQueryChange('typeFilter', value)}
      >
        <SelectTrigger size='sm'>
          <SelectValue placeholder='Contact Types' />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Contact Types</SelectLabel>
            <SelectItem value='all'>All Types</SelectItem>
            {availableTypes?.map((type) => (
              <SelectItem key={type.id} value={type.name}>
                {type.name.charAt(0).toUpperCase() + type.name.slice(1)}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      <Input
        value={queryParams.search}
        onChange={(e) => onQueryChange('search', e.target.value)}
        placeholder='Search by name'
        className='bg-background/60 w-42 md:w-60'
      />

      <div className='text-muted-foreground ml-2 hidden items-center gap-2 text-sm md:flex'>
        <Input
          type='checkbox'
          id='archived'
          className='h-4 w-4 accent-cyan-500'
          checked={queryParams.archived === 'true'}
          onChange={(e) =>
            onQueryChange('archived', e.target.checked ? 'true' : 'false')
          }
        />
        <label htmlFor='archived'>Show Archived</label>
      </div>
    </div>
  );
}
