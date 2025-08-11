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

interface ContactFiltersProps {
  queryParams: {
    search: string;
    page: number;
    sortBy: 'first' | 'last';
    typeFilter: string;
  };
  onQueryChange: (key: string, value: string) => void;
  availableTypes: string[];
}

export default function ContactFilters({
  queryParams,
  onQueryChange,
  availableTypes
}: ContactFiltersProps) {
  return (
    <div className='flex flex-wrap items-center gap-2'>
      <Select
        value={queryParams.sortBy}
        onValueChange={(value) => onQueryChange('sortBy', value)}
      >
        <SelectTrigger size='sm'>
          <SelectValue placeholder='Sort by' />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Sort by</SelectLabel>
            <SelectItem value='first'>First Name</SelectItem>
            <SelectItem value='last'>Last Name</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>

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
            {availableTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      <Input
        value={queryParams.search}
        onChange={(e) => onQueryChange('search', e.target.value)}
        placeholder='Search by name, address, email'
        className='bg-background/60 w-42 md:w-60'
      />

      <div className='text-muted-foreground ml-2 hidden items-center gap-2 text-sm md:flex'>
        <input type='checkbox' id='archived' className='accent-cyan-500' />
        <label htmlFor='archived'>Show Archived</label>
      </div>
    </div>
  );
}
