import { Button } from '@/components/ui/button';
import dayjs from 'dayjs';

export const caseParticipantsColumns = [
  { key: 'party_name', label: 'Party Name' },
  { key: 'position', label: 'Position' },
  { key: 'lead_representative', label: 'Lead Representative' },
  { key: 'secondary_representative', label: 'Secondary Representative' },
  { key: 'claim_information', label: 'Claim Information' }
];

export const casePanelistsColumns = [
  { key: 'name', label: 'Panelist' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' }
];

export const tasksColumns = [
  { key: 'name', label: 'Task Name' },
  { key: 'description', label: 'Task Description' },
  {
    key: 'due_date',
    label: 'Due Date',
    render: (value: string) => dayjs(value).format('YYYY-MM-DD')
  },
  { key: 'status', label: 'Status' },
  {
    key: 'actions',
    label: 'Actions',
    render: (
      row: any,
      onEdit?: (row: any) => void,
      onDelete?: (row: any) => void
    ) => (
      <div className='flex gap-2'>
        <Button variant='outline' size='sm' onClick={() => onEdit?.(row)}>
          Edit
        </Button>
        <Button variant='destructive' size='sm' onClick={() => onDelete?.(row)}>
          Delete
        </Button>
      </div>
    )
  }
];

export const eventsColumns = [
  { key: 'event_type', label: 'Event Type' },
  { key: 'description', label: 'Description' },
  { key: 'date', label: 'Date' },
  { key: 'time', label: 'Time' }
];

export const hearingExhibitColumns = [
  { key: 'view', label: 'View' },
  { key: 'new', label: 'New' },
  { key: 'exhibit_no_description', label: 'Exhibit No. & Description' },
  { key: 'joint', label: 'Joint' },
  { key: 'source', label: 'Source' },
  { key: 'upload_date', label: 'Upload Date' },
  { key: 'flag', label: 'Flag' }
];

export const financesColumns = [
  { key: 'bill_line', label: 'Bill Line' },
  { key: 'party_name', label: 'Party Name' },
  { key: 'due_date', label: 'Due Date' },
  { key: 'description', label: 'Description' },
  { key: 'amount', label: 'Amount' },
  { key: 'balance', label: 'Balance' },
  { key: 'payment', label: 'Payment' }
];

export const offerHistoryColumns = [
  { key: 'submitted_on', label: 'Submitted On' },
  { key: 'submitted_by', label: 'Submitted By' },
  { key: 'submitting_party', label: 'Submitting Party' },
  { key: 'amount', label: 'Amount' },
  { key: 'offer_type', label: 'Offer Type' },
  { key: 'offer_details', label: 'Offer Details' },
  { key: 'attachment_included', label: 'Attachment Included' },
  { key: 'status', label: 'Status' },
  { key: 'responded_by', label: 'Responded By' },
  { key: 'responded_on', label: 'Responded On' }
];
