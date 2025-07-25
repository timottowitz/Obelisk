import React, { useState, useEffect } from 'react';
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
import { Settings, Plus } from 'lucide-react';
import { MeetingType, MeetingTypesAPI } from '@/services/meeting-types-api';
import { MeetingTypesManagementModal } from './MeetingTypesManagementModal';

export interface RecordingProcessOptions {
  title: string;
  meetingTypeId: string;
  taskType: string;
}

const taskTypes = [
  { label: 'Full Analysis', value: 'all' },
  { label: 'Transcribe Only', value: 'transcribe' },
  { label: 'Analyze Only', value: 'analyze' }
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
  const [meetingTypeId, setMeetingTypeId] = useState('');
  const [taskType, setTaskType] = useState(taskTypes[0].value);
  const [meetingTypes, setMeetingTypes] = useState<MeetingType[]>([]);
  const [loading, setLoading] = useState(false);
  const [showManagementModal, setShowManagementModal] = useState(false);

  // Load meeting types when modal opens
  useEffect(() => {
    if (open) {
      loadMeetingTypes();
    }
  }, [open]);

  const loadMeetingTypes = async () => {
    setLoading(true);
    try {
      const { meetingTypes: types, error } = await MeetingTypesAPI.getMeetingTypes();
      if (!error && types.length > 0) {
        setMeetingTypes(types);
        // Set first meeting type as default since there are no default flags
        setMeetingTypeId(types[0].id);
      } else {
        setMeetingTypes([]);
      }
    } catch (error) {
      console.error('Error loading meeting types:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (!meetingTypeId) {
      alert('Please select a meeting type');
      return;
    }
    onSubmit({ title, meetingTypeId, taskType });
    onClose();
  };

  const handleMeetingTypeCreated = (newMeetingType: MeetingType) => {
    setMeetingTypes(prev => [...prev, newMeetingType]);
    setMeetingTypeId(newMeetingType.id);
  };

  return (
    <>
      <MeetingTypesManagementModal
        open={showManagementModal}
        onClose={() => setShowManagementModal(false)}
        onMeetingTypeCreated={handleMeetingTypeCreated}
      />
      
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
              <div className="flex items-center justify-between mb-1">
                <Label htmlFor='meetingType'>Meeting Type</Label>
                <div className="flex items-center space-x-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowManagementModal(true)}
                    className="h-6 px-2 text-xs"
                  >
                    <Settings className="h-3 w-3 mr-1" />
                    Manage
                  </Button>
                </div>
              </div>
              <Select 
                value={meetingTypeId} 
                onValueChange={setMeetingTypeId}
                disabled={loading || meetingTypes.length === 0}
              >
                <SelectTrigger id='meetingType' className='w-full'>
                  <SelectValue placeholder={loading ? 'Loading...' : 'Select meeting type'} />
                </SelectTrigger>
                <SelectContent>
                  {meetingTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{type.display_name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {meetingTypes.length === 0 && !loading && (
                <p className="text-xs text-muted-foreground mt-1">
                  No meeting types found. Click "Manage" to create one.
                </p>
              )}
            </div>
            
            <div>
              <Label htmlFor='taskType' className='mb-1 block'>Processing Type</Label>
              <Select value={taskType} onValueChange={setTaskType}>
                <SelectTrigger id='taskType' className='w-full'>
                  <SelectValue placeholder='Select processing type' />
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
            
            {meetingTypes.find(t => t.id === meetingTypeId) && (
              <div className="p-3 bg-muted rounded-md">
                <Label className="text-xs font-medium mb-1 block">Selected Type:</Label>
                <p className="text-sm">{meetingTypes.find(t => t.id === meetingTypeId)?.display_name}</p>
                {meetingTypes.find(t => t.id === meetingTypeId)?.description && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {meetingTypes.find(t => t.id === meetingTypeId)?.description}
                  </p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={handleSubmit} disabled={!meetingTypeId || loading}>
              Process
            </Button>
            <Button variant='outline' onClick={onClose} type='button'>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
