/**
 * Meeting Data Table Columns
 * Extends existing call recording table columns for meeting intelligence
 * Maintains backward compatibility with legal SaaS patterns
 */

'use client';

import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTableColumnHeader } from '@/components/ui/table/data-table-column-header';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  MoreHorizontal,
  Play,
  Download,
  Eye,
  Users,
  Clock,
  FileText,
  Zap
} from 'lucide-react';

// Extended interface for meeting recordings
export interface MeetingRecording {
  id: string;
  title: string;
  meetingType: 'meeting' | 'call' | 'interview' | 'consultation';
  startTime: string;
  duration: number; // in seconds
  status: 'processed' | 'uploaded' | 'processing' | 'failed' | 'in_progress';
  participantCount: number;
  memberName: string;
  ai_summary?: string;
  transcriptText?: string;
  gcsVideoUrl?: string;
  speakersMetadata?: any;
  actionItemCount?: number;
  decisionCount?: number;
  topicCount?: number;
  meetingDurationMinutes?: number;
  accessType: 'full' | 'view_only' | 'restricted';
}

// Meeting type configuration
const getMeetingTypeConfig = (type: string) => {
  const configs = {
    meeting: {
      variant: 'default' as const,
      label: 'Meeting',
      icon: Users,
      color: 'text-blue-600'
    },
    call: {
      variant: 'secondary' as const,
      label: 'Legal Call',
      icon: FileText,
      color: 'text-green-600'
    },
    interview: {
      variant: 'outline' as const,
      label: 'Interview',
      icon: Users,
      color: 'text-purple-600'
    },
    consultation: {
      variant: 'destructive' as const,
      label: 'Consultation',
      icon: FileText,
      color: 'text-orange-600'
    }
  };

  return configs[type as keyof typeof configs] || configs.meeting;
};

// Format duration helper
const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m`;
  }
  return `${Math.round(seconds)}s`;
};

// Status badge configuration
const getStatusConfig = (status: string) => {
  const configs = {
    completed: {
      variant: 'default' as const,
      label: 'Completed',
      color: 'text-green-600'
    },
    processing: {
      variant: 'secondary' as const,
      label: 'Processing',
      color: 'text-yellow-600'
    },
    failed: {
      variant: 'destructive' as const,
      label: 'Failed',
      color: 'text-red-600'
    },
    in_progress: {
      variant: 'outline' as const,
      label: 'In Progress',
      color: 'text-blue-600'
    }
  };

  return configs[status as keyof typeof configs] || configs.completed;
};

// Change export to a function that takes onViewDetails and onProcessRecording
export const meetingColumns = (
  onViewDetails: (recording: any) => void,
  onProcessRecording?: (recording: any) => void
): ColumnDef<MeetingRecording>[] => [
  // Selection checkbox
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label='Select all'
        className='translate-y-[2px]'
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label='Select row'
        className='translate-y-[2px]'
      />
    ),
    enableSorting: false,
    enableHiding: false
  },

  // Meeting Type
  {
    accessorKey: 'meetingType',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Type' />
    ),
    cell: ({ row }) => {
      const type = row.getValue('meetingType') as string;
      const config = getMeetingTypeConfig(type);
      const Icon = config.icon;

      return (
        <div className='flex items-center space-x-2'>
          <Icon className={`h-4 w-4 ${config.color}`} />
          <Badge variant={config.variant} className='text-xs'>
            {config.label}
          </Badge>
        </div>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    }
  },

  // Title and Details
  {
    accessorKey: 'title',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Meeting' />
    ),
    cell: ({ row }) => {
      const title = row.getValue('title') as string;
      const memberName = row.original.memberName;

      return (
        <div className='max-w-[300px]'>
          <div className='truncate font-medium'>{title}</div>
          <div className='text-muted-foreground truncate text-xs'>
            Host: {memberName}
          </div>
        </div>
      );
    }
  },

  // Date and Time
  {
    accessorKey: 'start_time',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Date & Time' />
    ),
    cell: ({ row }) => {
      const startTime = new Date(row.getValue('start_time'));

      return (
        <div className='text-sm'>
          <div>{format(startTime, 'MMM dd, yyyy')}</div>
          <div className='text-muted-foreground text-xs'>
            {format(startTime, 'HH:mm')}
          </div>
        </div>
      );
    }
  },

  // Duration and Participants
  {
    accessorKey: 'duration',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Duration' />
    ),
    cell: ({ row }) => {
      const duration = row.getValue('duration') as number;
      const participantCount = row.original.participantCount;

      return (
        <div className='text-sm'>
          <div className='flex items-center space-x-1'>
            <Clock className='text-muted-foreground h-3 w-3' />
            <span>{formatDuration(duration / 1000)}</span>
          </div>
          <div className='text-muted-foreground flex items-center space-x-1 text-xs'>
            <Users className='h-3 w-3' />
            <span>
              {participantCount} participant{participantCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      );
    }
  },

  // AI Insights
  {
    id: 'insights',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='AI Insights' />
    ),
    cell: ({ row }) => {
      const actionItems = row.original.actionItemCount || 0;
      const decisions = row.original.decisionCount || 0;
      const topics = row.original.topicCount || 0;

      return (
        <div className='flex flex-wrap gap-1'>
          {actionItems > 0 && (
            <Badge variant='outline' className='text-xs'>
              {actionItems} action{actionItems !== 1 ? 's' : ''}
            </Badge>
          )}
          {decisions > 0 && (
            <Badge variant='outline' className='text-xs'>
              {decisions} decision{decisions !== 1 ? 's' : ''}
            </Badge>
          )}
          {topics > 0 && (
            <Badge variant='outline' className='text-xs'>
              {topics} topic{topics !== 1 ? 's' : ''}
            </Badge>
          )}
          {actionItems === 0 && decisions === 0 && topics === 0 && (
            <span className='text-muted-foreground text-xs'>
              No insights yet
            </span>
          )}
        </div>
      );
    }
  },

  // Status
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Status' />
    ),
    cell: ({ row }) => {
      const status = row.getValue('status') as string;
      const config = getStatusConfig(status);

      return (
        <Badge variant={config.variant} className='text-xs'>
          {config.label}
        </Badge>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    }
  },

  // Actions
  {
    id: 'actions',
    enableHiding: false,
    cell: ({ row }) => {
      const recording = row.original;
      const canPlay = recording.status === 'processed' && recording.gcsVideoUrl;
      const canView = recording.accessType !== 'restricted';
      const needsProcessing =
        recording.status === 'uploaded' || recording.status === 'failed';

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='ghost' className='h-8 w-8 p-0'>
              <span className='sr-only'>Open menu</span>
              <MoreHorizontal className='h-4 w-4' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {needsProcessing && onProcessRecording && (
              <DropdownMenuItem onClick={() => onProcessRecording(recording)}>
                <Zap className='mr-2 h-4 w-4' />
                Process Recording
              </DropdownMenuItem>
            )}
            {canView && (
              <DropdownMenuItem onClick={() => onViewDetails(recording)}>
                <Eye className='mr-2 h-4 w-4' />
                View Details
              </DropdownMenuItem>
            )}
            {canPlay && (
              <DropdownMenuItem>
                <Play className='mr-2 h-4 w-4' />
                Play Recording
              </DropdownMenuItem>
            )}
            {recording.transcriptText && (
              <DropdownMenuItem>
                <FileText className='mr-2 h-4 w-4' />
                View Transcript
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Download className='mr-2 h-4 w-4' />
              Export Data
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }
  }
];
