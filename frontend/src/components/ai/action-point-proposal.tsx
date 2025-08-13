import React, { useState } from 'react';
import {
  CallRecording,
  OrganizationMember,
  MeetingActionItem
} from '@/types/callcaps';
import { useMembers } from '@/hooks/useMembers';
import { useGetCases } from '@/hooks/useCases';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { CheckCircle, Target } from 'lucide-react';
import { Case } from '@/types/cases';

interface ActionPointProposalProps {
  recording: CallRecording;
  actionItems: MeetingActionItem[];
  onTaskCreated: (
    actionItem: MeetingActionItem,
    caseId: string,
    assigneeId: string
  ) => void;
}

export const ActionPointProposal = ({
  recording,
  actionItems,
  onTaskCreated
}: ActionPointProposalProps) => {
  const { data: members = [], isLoading: membersLoading } = useMembers();
  const { data: cases, isLoading: casesLoading } = useGetCases(
    'all',
    1,
    undefined,
    undefined,
    'case_number',
    'asc'
  );
  const [acceptedTasks, setAcceptedTasks] = useState<string[]>([]);
  const [selectedCases, setSelectedCases] = useState<Record<string, string>>(
    {}
  );
  const [selectedAssignees, setSelectedAssignees] = useState<
    Record<string, string>
  >({});  

  const getOwnerId = () => {
    const owner = members.find((m) => m.role === 'owner');
    return owner?.id;
  };

  const getDefaultAssignee = (item: MeetingActionItem) => {
    if (item.assignee) {
      const member = members.find((m) => m.fullName === item.assignee);
      if (member) return member.id;
    }
    return getOwnerId();
  };

  const handleAccept = (item: MeetingActionItem, index: number) => {
    const caseId = selectedCases[index];
    const assigneeId = selectedAssignees[index] || getDefaultAssignee(item);
    if (!caseId || !assigneeId) {
      alert('Please select a case and an assignee.');
      return;
    }
    console.log(
      'Accepted action item:',
      item,
      'caseId:',
      caseId,
      'assigneeId:',
      assigneeId
    );
    setAcceptedTasks([...acceptedTasks, item.task]);
    onTaskCreated(item, caseId, assigneeId);
  };

  if (!actionItems || actionItems.length === 0) {
    return (
      <div className='py-8 text-center'>
        <Target className='text-muted-foreground mx-auto h-12 w-12' />
        <h3 className='text-foreground mt-2 text-lg font-medium'>
          No Action Items
        </h3>
        <p className='text-muted-foreground mt-1 text-sm'>
          The AI did not identify any action items in this recording.
        </p>
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      {actionItems.map((item, index) => {
        const isAccepted = acceptedTasks.includes(item.task);
        return (
          <div
            key={index}
            className='bg-card flex items-center justify-between rounded-lg border p-4'
          >
            <div className='flex-1 space-y-1'>
              <p className='text-foreground font-medium'>{item.task}</p>
              {item.context && (
                <p className='text-muted-foreground text-sm'>
                  Context: {item.context}
                </p>
              )}
            </div>
            <div className='ml-4 flex items-center space-x-4'>
              <div className='w-48'>
                <Select
                  value={selectedCases[index]}
                  onValueChange={(value) =>
                    setSelectedCases({ ...selectedCases, [index]: value })
                  }
                  disabled={isAccepted}
                >
                  <SelectTrigger>
                    <SelectValue placeholder='Select Case...' />
                  </SelectTrigger>
                  <SelectContent>
                    {casesLoading ? (
                      <SelectItem value='loading' disabled>
                        Loading...
                      </SelectItem>
                    ) : (
                      cases?.cases.map((c: Case) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.case_number} - {c.full_name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className='w-48'>
                <Select
                  value={selectedAssignees[index] || getDefaultAssignee(item)}
                  onValueChange={(value) =>
                    setSelectedAssignees({
                      ...selectedAssignees,
                      [index]: value
                    })
                  }
                  disabled={isAccepted}
                >
                  <SelectTrigger>
                    <SelectValue placeholder='Assign to...' />
                  </SelectTrigger>
                  <SelectContent>
                    {membersLoading ? (
                      <SelectItem value='loading' disabled>
                        Loading...
                      </SelectItem>
                    ) : (
                      members.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.fullName}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => handleAccept(item, index)}
                disabled={isAccepted || !selectedCases[index]}
                variant={isAccepted ? 'ghost' : 'default'}
                className='w-32'
              >
                {isAccepted ? (
                  <span className='flex items-center text-green-600'>
                    <CheckCircle className='mr-2 h-4 w-4' />
                    Accepted
                  </span>
                ) : (
                  'Accept'
                )}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
