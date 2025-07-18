import React, { useState, useEffect } from 'react';
import { X, Users, Calendar, AlertCircle, CheckCircle, Building } from 'lucide-react';
import { CallRecording, OrganizationMember } from '@/types/callcaps';
import { CallRecordingsAPI } from '@/services/call-recordings-api';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface ShareRecordingDialogProps {
  recording: CallRecording;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ShareRecordingDialog: React.FC<ShareRecordingDialogProps> = ({
  recording,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [shareWithEntireOrg, setShareWithEntireOrg] = useState(false);
  const [permissionLevel, setPermissionLevel] = useState<'view' | 'edit' | 'admin'>('view');
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  // Load organization members
  useEffect(() => {
    if (isOpen) {
      loadMembers();
    }
  }, [isOpen]);

  const loadMembers = async () => {
    try {
      setIsLoadingMembers(true);
      setError(null);
      const response = await CallRecordingsAPI.getOrganizationMembers();
      setMembers(response.members);
    } catch (err) {
      console.error('Failed to load organization members:', err);
      setError('Failed to load organization members');
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const handleMemberToggle = (memberId: string) => {
    setSelectedMemberIds(prev => 
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleShare = async () => {
    const finalMemberIds = shareWithEntireOrg ? members.map(m => m.id) : selectedMemberIds;
    
    if (finalMemberIds.length === 0) {
      setError('Please select at least one member to share with');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      await CallRecordingsAPI.shareRecording(recording.id, {
        memberIds: finalMemberIds,
        permissionLevel,
        expiresAt: expiresAt || undefined,
      });

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to share recording:', err);
      setError(err instanceof Error ? err.message : 'Failed to share recording');
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
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
        className="bg-card rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden"
        onClick={(e) => {
          // Prevent clicks inside the modal from propagating to backdrop
          e.stopPropagation();
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Share Recording</h2>
          <button
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          {/* Recording Info */}
          <div className="bg-muted rounded-lg p-4 mb-6">
            <h3 className="font-medium text-foreground mb-2">{recording.title}</h3>
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <span className="flex items-center">
                <Calendar className="mr-1 h-4 w-4" />
                {recording.date}
              </span>
              <span className="flex items-center">
                <Users className="mr-1 h-4 w-4" />
                {recording.participants.length} participants
              </span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md dark:bg-red-900/20 dark:border-red-800">
              <div className="flex items-center">
                <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                <span className="text-sm text-red-700 dark:text-red-400">{error}</span>
              </div>
            </div>
          )}

          {/* Permission Level */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-2">
              Permission Level
            </label>
            <select
              value={permissionLevel}
              onChange={(e) => setPermissionLevel(e.target.value as 'view' | 'edit' | 'admin')}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="view">View Only</option>
              <option value="edit">Can Edit</option>
              <option value="admin">Full Access</option>
            </select>
          </div>

          {/* Expiration Date */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-2">
              Expires At (Optional)
            </label>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Member Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-2">
              Share with Members
            </label>
            
            {/* Share with entire organisation option */}
            <div className="mb-4 p-3 border border-border rounded-md bg-muted">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={shareWithEntireOrg}
                  onChange={(e) => setShareWithEntireOrg(e.target.checked)}
                  className="h-4 w-4 text-primary rounded border-border focus:ring-primary"
                />
                <div className="flex items-center space-x-2 flex-1">
                  <Building className="h-5 w-5 text-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      Share with entire organisation
                    </p>
                    <p className="text-sm text-muted-foreground">
                      All {members.length} members will have access
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Individual member selection */}
            {!shareWithEntireOrg && (
              <div className="border border-border rounded-md max-h-48 overflow-y-auto">
                {isLoadingMembers ? (
                  <div className="p-4 text-center text-muted-foreground">
                    Loading members...
                  </div>
                ) : members.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    No other members in your organization
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className="p-3 hover:bg-muted cursor-pointer"
                        onClick={() => handleMemberToggle(member.id)}
                      >
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={selectedMemberIds.includes(member.id)}
                            onChange={() => handleMemberToggle(member.id)}
                            className="h-4 w-4 text-primary rounded border-border focus:ring-primary"
                          />
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${member.fullName}`} />
                            <AvatarFallback className="text-xs">
                              {member.fullName.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">
                              {member.fullName}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {member.email} • {member.role}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-border">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-foreground border border-border rounded-md hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary"
          >
            Cancel
          </button>
          <button
            onClick={handleShare}
            disabled={isLoading || (!shareWithEntireOrg && selectedMemberIds.length === 0)}
            className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {isLoading ? 'Sharing...' : 'Share Recording'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareRecordingDialog; 