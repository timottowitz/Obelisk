import React, { useState } from 'react';
import { CallRecording, OrganizationMember, MeetingActionItem } from '@/types/callcaps';
import { useOrganizationMembers } from '@/hooks/use-organization-members';
import { useCases } from '@/hooks/use-cases';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { CheckCircle, Target } from 'lucide-react';

interface ActionPointProposalProps {
  recording: CallRecording;
  actionItems: MeetingActionItem[];
  onTaskCreated: (actionItem: MeetingActionItem, caseId: string, assigneeId: string) => void;
}

export const ActionPointProposal = ({
  recording,
  actionItems,
  onTaskCreated,
}: ActionPointProposalProps) => {
  const { data: members = [], isLoading: membersLoading } = useOrganizationMembers();
  const { data: cases = [], isLoading: casesLoading } = useCases();
  const [acceptedTasks, setAcceptedTasks] = useState<string[]>([]);
  const [selectedCases, setSelectedCases] = useState<Record<string, string>>({});
  const [selectedAssignees, setSelectedAssignees] = useState<Record<string, string>>({});

  const getOwnerId = () => {
    // This is a placeholder. We need a reliable way to get the recording owner's ID.
    // Assuming the owner is the first participant for now.
    // A better approach would be to have the owner_id on the recording object.
    const owner = members.find(m => m.fullName === recording.participants[0]);
    return owner?.id;
  }

  const getDefaultAssignee = (item: MeetingActionItem) => {
    if (item.assignee) {
      const member = members.find(m => m.fullName === item.assignee);
      if (member) return member.id;
    }
    return getOwnerId();
  }

  const handleAccept = (item: MeetingActionItem, index: number) => {
    const caseId = selectedCases[index];
    const assigneeId = selectedAssignees[index] || getDefaultAssignee(item);
    if (!caseId || !assigneeId) {
      alert("Please select a case and an assignee.");
      return;
    }
    console.log('Accepted action item:', item, 'caseId:', caseId, 'assigneeId:', assigneeId);
    setAcceptedTasks([...acceptedTasks, item.task]);
    onTaskCreated(item, caseId, assigneeId);
  };

  if (!actionItems || actionItems.length === 0) {
    return (
      <div className="text-center py-8">
        <Target className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-2 text-lg font-medium text-foreground">No Action Items</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          The AI did not identify any action items in this recording.
        p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {actionItems.map((item, index) => {
        const isAccepted = acceptedTasks.includes(item.task);
        return (
          <div
            key={index}
            className="flex items-center justify-between p-4 rounded-lg bg-card border"
          >
            <div className="flex-1 space-y-1">
              <p className="text-foreground font-medium">{item.task}</p>
              {item.context && (
                <p className="text-muted-foreground text-sm">
                  Context: {item.context}
                </p>
              )}
            </div>
            <div className="flex items-center space-x-4 ml-4">
              <div className="w-48">
                <Select
                  value={selectedCases[index]}
                  onValueChange={(value) => setSelectedCases({ ...selectedCases, [index]: value })}
                  disabled={isAccepted}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Case..." />
                  </SelectTrigger>
                  <SelectContent>
                    {casesLoading ? (
                      <SelectItem value="loading" disabled>Loading...</SelectItem>
                    ) : (
                      cases.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.case_number} - {c.full_name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-48">
                <Select
                  value={selectedAssignees[index] || getDefaultAssignee(item)}
                  onValueChange={(value) => setSelectedAssignees({ ...selectedAssignees, [index]: value })}
                  disabled={isAccepted}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Assign to..." />
                  </SelectTrigger>
                  <SelectContent>
                    {membersLoading ? (
                      <SelectItem value="loading" disabled>Loading...</SelectItem>
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
                className="w-32"
              >
                {isAccepted ? (
                  <span className="flex items-center text-green-600">
                    <CheckCircle className="mr-2 h-4 w-4" />
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
