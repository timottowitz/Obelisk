import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Calendar, ChevronDown, Eye, Filter, Search } from 'lucide-react';

export const DocumentFilterGroup = () => {
  return (
    <div className='flex flex-row items-center gap-2'>
      {/* Quantity Dropdown */}
      <Select defaultValue='10'>
        <SelectTrigger className='h-7 w-16 rounded-md border border-gray-200 bg-white'>
          <SelectValue className='text-xs' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='10'>10</SelectItem>
          <SelectItem value='25'>25</SelectItem>
          <SelectItem value='50'>50</SelectItem>
          <SelectItem value='100'>100</SelectItem>
        </SelectContent>
      </Select>

      {/* Search Input */}
      <div className='max-w-sm flex-1'>
        <Search className='absolute top-1/2 left-2 h-3 w-3 -translate-y-1/2 transform text-gray-400' />
        <Input
          placeholder='Find by keyword or number'
          className='h-9 rounded-md border border-gray-200 bg-white pl-8 text-xs'
        />
      </div>

      {/* All Documents Filter */}
      <Select>
        <SelectTrigger className='h-7 min-w-[120px] rounded-md border border-gray-200 bg-white'>
          <div className='flex items-center gap-1'>
            <Filter className='h-3 w-3 text-black' />
            <span className='text-xs text-black'>All Documents</span>
          </div>
          <ChevronDown className='h-3 w-3 text-black' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='all'>All Documents</SelectItem>
          <SelectItem value='recent'>Recent Documents</SelectItem>
          <SelectItem value='favorites'>Favorites</SelectItem>
        </SelectContent>
      </Select>

      {/* Viewing Privilege Filter */}
      <Select>
        <SelectTrigger className='h-7 min-w-[130px] rounded-md border border-gray-200 bg-white'>
          <div className='flex items-center gap-1'>
            <Eye className='h-3 w-3 text-black' />
            <span className='text-xs text-black'>Viewing Privilege</span>
          </div>
          <ChevronDown className='h-3 w-3 text-black' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='all'>All Privileges</SelectItem>
          <SelectItem value='read'>Read Only</SelectItem>
          <SelectItem value='write'>Read & Write</SelectItem>
          <SelectItem value='admin'>Admin</SelectItem>
        </SelectContent>
      </Select>

      {/* Document Group Filter */}
      <Select>
        <SelectTrigger className='h-7 min-w-[120px] rounded-md border border-gray-200 bg-white'>
          <div className='flex items-center gap-1'>
            <Filter className='h-3 w-3 text-black' />
            <span className='text-xs text-black'>Document Group</span>
          </div>
          <ChevronDown className='h-3 w-3 text-black' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='all'>All Groups</SelectItem>
          <SelectItem value='legal'>Legal</SelectItem>
          <SelectItem value='financial'>Financial</SelectItem>
          <SelectItem value='correspondence'>Correspondence</SelectItem>
        </SelectContent>
      </Select>

      {/* Document Type Filter */}
      <Select>
        <SelectTrigger className='h-7 min-w-[120px] rounded-md border border-gray-200 bg-white'>
          <div className='flex items-center gap-1'>
            <Filter className='h-3 w-3 text-black' />
            <span className='text-xs text-black'>Document Type</span>
          </div>
          <ChevronDown className='h-3 w-3 text-black' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='all'>All Types</SelectItem>
          <SelectItem value='pdf'>PDF</SelectItem>
          <SelectItem value='doc'>Word Document</SelectItem>
          <SelectItem value='xls'>Spreadsheet</SelectItem>
          <SelectItem value='img'>Image</SelectItem>
        </SelectContent>
      </Select>

      {/* Date Filter */}
      <Select>
        <SelectTrigger className='h-7 min-w-[80px] rounded-md border border-gray-200 bg-white'>
          <div className='flex items-center gap-1'>
            <Calendar className='h-3 w-3 text-black' />
            <span className='text-xs text-black'>Date</span>
          </div>
          <ChevronDown className='h-3 w-3 text-black' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='all'>All Dates</SelectItem>
          <SelectItem value='today'>Today</SelectItem>
          <SelectItem value='week'>This Week</SelectItem>
          <SelectItem value='month'>This Month</SelectItem>
          <SelectItem value='year'>This Year</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export const HearingExhibitFilterGroup = ({
  searchQuery,
  setSearchQuery,
  selectedFilter,
  setSelectedFilter,
  selectedDate,
  setSelectedDate
}: {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  selectedFilter: string;
  setSelectedFilter: (value: string) => void;
  selectedDate: string;
  setSelectedDate: (value: string) => void;
}) => {
  return (
    <div className='flex items-center gap-2'>
      {/* Search Input */}
      <div className='relative'>
        <Search className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400' />
        <Input
          placeholder='keyword'
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className='h-9 w-48 pl-10'
        />
      </div>

      {/* Filter Dropdown */}
      <Select value={selectedFilter} onValueChange={setSelectedFilter}>
        <SelectTrigger className='h-9 w-40'>
          <Filter className='mr-2 h-4 w-4' />
          <SelectValue placeholder='All Exhibits' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='all'>All Exhibits</SelectItem>
          <SelectItem value='new'>New</SelectItem>
          <SelectItem value='flagged'>Flagged</SelectItem>
          <SelectItem value='joint'>Joint</SelectItem>
        </SelectContent>
      </Select>

      {/* Date Input */}
      <div className='relative'>
        <Calendar className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400' />
        <Input
          type='text'
          placeholder='Date'
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className='h-9 w-28 pl-10'
        />
      </div>
    </div>
  );
};

export const FinancesFilterGroup = ({
  searchQuery,
  setSearchQuery
}: {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
}) => {
  return (
    <div className='relative'>
      <Search className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400' />
      <Input
        placeholder='Find by keyword or number'
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className='h-9 w-48 border-gray-300 pl-10'
      />
    </div>
  );
};
