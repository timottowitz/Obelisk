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
    sortBy: 'asc' | 'desc';
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
            queryParams.sortBy === 'asc' ? 'desc' : 'asc'
          )
        }
        disabled={isLoading}
      >
        Sort by Name
        {queryParams.sortBy === 'asc' ? (
          <ChevronUp className='h-4 w-4' />
        ) : (
          <ChevronDown className='h-4 w-4' />
        )}
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
          className='accent-cyan-500 h-4 w-4'
          checked={queryParams.archived === 'true'}
          onChange={(e) => onQueryChange('archived', e.target.checked ? 'true' : 'false')}
        />
        <label htmlFor='archived'>Show Archived</label>
      </div>
    </div>
  );
}
