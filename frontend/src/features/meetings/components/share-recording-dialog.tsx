import React, { useState } from 'react';
import { X, Users, Calendar, AlertCircle, Building, Link } from 'lucide-react';
import { CallRecording, RecordingClip } from '@/types/callcaps';
import { CallRecordingsAPI } from '@/services/call-recordings-api';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { useMembers } from '@/hooks/useMembers';

interface ShareRecordingDialogProps {
  recording: CallRecording;
  clip?: RecordingClip;
  isOpen: boolean;
  onClose: () => void;
}

export const ShareRecordingDialog: React.FC<ShareRecordingDialogProps> = ({
  recording,
  clip,
  isOpen,
  onClose
}) => {
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [shareWithEntireOrg, setShareWithEntireOrg] = useState(false);
  const [permissionLevel, setPermissionLevel] = useState<
    'view' | 'edit' | 'admin'
  >('view');
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: members, isLoading: isLoadingMembers } = useMembers();
  const handleMemberToggle = (memberId: string) => {
    setSelectedMemberIds((prev) => {
      return prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId];
    });
  };

  const handleShare = async () => {
    const finalMemberIds = shareWithEntireOrg
      ? members?.map((m) => m.id)
      : selectedMemberIds;
    if (!finalMemberIds) {
      setError('No members found');
      return;
    }

    if (finalMemberIds && finalMemberIds.length === 0) {
      setError('Please select at least one member to share with');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      await CallRecordingsAPI.shareRecording(recording.id, {
        memberIds: finalMemberIds,
        permissionLevel,
        expiresAt: expiresAt || undefined
      });

      onClose();
    } catch (err) {
      console.error('Failed to share recording:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to share recording'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedMemberIds([]);
    setShareWithEntireOrg(false);
    setPermissionLevel('view');
    setExpiresAt('');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm'
      onClick={(e) => {
        // stop propagation to prevent clicks on underlying elements
        e.stopPropagation();
        // Only close if clicking on the backdrop itself
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div
        className='bg-card max-h-[90vh] w-full max-w-md overflow-hidden rounded-lg shadow-xl'
        onClick={(e) => {
          // Prevent clicks inside the modal from propagating to backdrop
          e.stopPropagation();
        }}
      >
        {/* Header */}
        <div className='border-border flex items-center justify-between border-b p-6'>
          <h2 className='text-foreground text-lg font-semibold'>
            {clip ? 'Share Clip' : 'Share Recording'}
          </h2>
          <button
            onClick={handleClose}
            className='text-muted-foreground hover:text-foreground transition-colors'
          >
            <X className='h-6 w-6' />
          </button>
        </div>

        {/* Content */}
        <div className='overflow-y-auto p-6'>
          {/* Recording Info */}
          <div className='bg-muted mb-6 rounded-lg p-4'>
            <h3 className='text-foreground mb-2 font-medium'>
              {clip ? clip.title : recording.title}
            </h3>
            <div className='text-muted-foreground flex items-center space-x-4 text-sm'>
              <span className='flex items-center'>
                <Calendar className='mr-1 h-4 w-4' />
                {recording.date}
              </span>
              <span className='flex items-center'>
                <Users className='mr-1 h-4 w-4' />
                {recording.participants.length} participants
              </span>
            </div>
          </div>

          {/* Public Link for Clips */}
          {clip && (
            <div className='mb-6'>
              <label className='text-foreground mb-2 block text-sm font-medium'>
                Public Link
              </label>
              <div className='flex items-center space-x-2'>
                <input
                  type='text'
                  readOnly
                  value={`${window.location.origin}/clips/${clip.share_token}`}
                  className='border-border bg-background text-muted-foreground w-full rounded-md border px-3 py-2 text-sm'
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `${window.location.origin}/clips/${clip.share_token}`
                    );
                    toast.success('Link copied to clipboard!');
                  }}
                  className='text-primary-foreground bg-primary hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-medium'
                >
                  <Link className='h-4 w-4' />
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className='mb-4 rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20'>
              <div className='flex items-center'>
                <AlertCircle className='mr-2 h-4 w-4 text-red-500' />
                <span className='text-sm text-red-700 dark:text-red-400'>
                  {error}
                </span>
              </div>
            </div>
          )}

          {/* Permission Level */}
          <div className='mb-6'>
            <label className='text-foreground mb-2 block text-sm font-medium'>
              Permission Level
            </label>
            <select
              value={permissionLevel}
              onChange={(e) =>
                setPermissionLevel(e.target.value as 'view' | 'edit' | 'admin')
              }
              className='border-border bg-background text-foreground focus:ring-primary w-full rounded-md border px-3 py-2 focus:ring-2 focus:outline-none'
            >
              <option value='view'>View Only</option>
              <option value='edit'>Can Edit</option>
              <option value='admin'>Full Access</option>
            </select>
          </div>

          {/* Expiration Date */}
          <div className='mb-6'>
            <label className='text-foreground mb-2 block text-sm font-medium'>
              Expires At (Optional)
            </label>
            <input
              type='datetime-local'
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className='border-border bg-background text-foreground focus:ring-primary w-full rounded-md border px-3 py-2 focus:ring-2 focus:outline-none'
            />
          </div>

          {/* Member Selection */}
          <div className='mb-6'>
            <label className='text-foreground mb-2 block text-sm font-medium'>
              Share with Members
            </label>

            {/* Share with entire organisation option */}
            <div className='border-border bg-muted mb-4 rounded-md border p-3'>
              <div className='flex items-center space-x-3'>
                <input
                  type='checkbox'
                  checked={shareWithEntireOrg}
                  onChange={(e) => setShareWithEntireOrg(e.target.checked)}
                  className='text-primary border-border focus:ring-primary h-4 w-4 rounded'
                />
                <div className='flex flex-1 items-center space-x-2'>
                  <Building className='text-primary h-5 w-5' />
                  <div className='min-w-0 flex-1'>
                    <p className='text-foreground text-sm font-medium'>
                      Share with entire organisation
                    </p>
                    <p className='text-muted-foreground text-sm'>
                      All {members?.length} members will have access
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Individual member selection */}
            {!shareWithEntireOrg && (
              <div className='border-border max-h-48 overflow-y-auto rounded-md border'>
                {isLoadingMembers ? (
                  <div className='text-muted-foreground p-4 text-center'>
                    Loading members...
                  </div>
                ) : members && members.length === 0 ? (
                  <div className='text-muted-foreground p-4 text-center'>
                    No other members in your organization
                  </div>
                ) : (
                  <div className='divide-border divide-y'>
                    {members &&
                      members.map((member) => {
                        return (
                          <div key={member?.id} className='hover:bg-muted p-3'>
                            <div className='flex items-center space-x-3'>
                              <input
                                type='checkbox'
                                checked={selectedMemberIds.includes(member.id)}
                                onChange={(e) => {
                                  handleMemberToggle(member.id);
                                }}
                                className='text-primary border-border focus:ring-primary h-4 w-4 rounded'
                              />
                              <Avatar className='h-8 w-8'>
                                <AvatarImage
                                  src={`https://api.dicebear.com/7.x/initials/svg?seed=${member.fullName}`}
                                />
                                <AvatarFallback className='text-xs'>
                                  {member.fullName
                                    .split(' ')
                                    .map((n) => n[0])
                                    .join('')
                                    .toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className='min-w-0 flex-1'>
                                <p className='text-foreground text-sm font-medium'>
                                  {member.fullName}
                                </p>
                                <p className='text-muted-foreground text-sm'>
                                  {member.email} • {member.role}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className='border-border flex items-center justify-end space-x-3 border-t p-6'>
          <button
            onClick={handleClose}
            className='text-foreground border-border hover:bg-accent focus:ring-primary cursor-pointer rounded-md border px-4 py-2 text-sm font-medium focus:ring-2 focus:outline-none'
          >
            Cancel
          </button>
          <button
            onClick={handleShare}
            disabled={
              isLoading ||
              (!shareWithEntireOrg && selectedMemberIds.length === 0)
            }
            className='text-primary-foreground bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground focus:ring-primary cursor-pointer rounded-md px-4 py-2 text-sm font-medium focus:ring-2 focus:outline-none disabled:cursor-not-allowed'
          >
            {isLoading ? 'Sharing...' : `Share ${clip ? 'Clip' : 'Recording'}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareRecordingDialog;
