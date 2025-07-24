import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

export interface RecordingProcessOptions {
  title: string;
  analysisType: string;
  meetingType: string;
  taskType: string;
}

const analysisTypes = [
  { label: 'Executive Summary', value: 'executive_summary' },
  { label: 'Meeting Minutes', value: 'meeting_minutes' },
  { label: 'Action Items', value: 'action_items' },
  { label: 'Decision Log', value: 'decision_log' },
  { label: 'Topic Analysis', value: 'topic_analysis' },
  { label: 'Participant Analysis', value: 'participant_analysis' },
  { label: 'Follow-Up Items', value: 'follow_up_items' },
  { label: 'Legal Meeting', value: 'legal_meeting' },
  { label: 'Client Consultation', value: 'client_consultation' },
  { label: 'Team Standup', value: 'team_standup' },
  { label: 'Sales Call', value: 'sales_call' }
];

const meetingTypes = [
  { label: 'Meeting', value: 'meeting' },
  { label: 'Call', value: 'call' },
  { label: 'Interview', value: 'interview' },
  { label: 'Consultation', value: 'consultation' }
];

const taskTypes = [
  { label: 'All', value: 'all' },
  { label: 'Transcribe', value: 'transcribe' },
  { label: 'Analyze', value: 'analyze' }
];

export function RecordingProcessModal({
  open,
  onClose,
  onSubmit
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (opts: RecordingProcessOptions) => void;
}) {
  const [title, setTitle] = useState(`Screen Recording - ${new Date().toLocaleTimeString()}`);
  const [analysisType, setAnalysisType] = useState(analysisTypes[0].value);
  const [meetingType, setMeetingType] = useState(meetingTypes[0].value);
  const [taskType, setTaskType] = useState(taskTypes[0].value);

  const handleSubmit = () => {
    onSubmit({ title, analysisType, meetingType, taskType });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogTitle>Process Recording</DialogTitle>
        <div className='space-y-4'>
          <div>
            <Label htmlFor='title' className='mb-1 block'>Recording Name</Label>
            <Input
              id='title'
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder='Enter recording name'
              className='w-full'
            />
          </div>
          <div>
            <Label htmlFor='analysisType' className='mb-1 block'>Analysis Type</Label>
            <Select value={analysisType} onValueChange={setAnalysisType}>
              <SelectTrigger id='analysisType' className='w-full'>
                <SelectValue placeholder='Select analysis type' />
              </SelectTrigger>
              <SelectContent>
                {analysisTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor='meetingType' className='mb-1 block'>Meeting Type</Label>
            <Select value={meetingType} onValueChange={setMeetingType}>
              <SelectTrigger id='meetingType' className='w-full'>
                <SelectValue placeholder='Select meeting type' />
              </SelectTrigger>
              <SelectContent>
                {meetingTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor='taskType' className='mb-1 block'>Task Type</Label>
            <Select value={taskType} onValueChange={setTaskType}>
              <SelectTrigger id='taskType' className='w-full'>
                <SelectValue placeholder='Select task type' />
              </SelectTrigger>
              <SelectContent>
                {taskTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit}>Process</Button>
          <Button variant='outline' onClick={onClose} type='button'>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
