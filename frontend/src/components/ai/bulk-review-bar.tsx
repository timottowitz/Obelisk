'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  XCircle, 
  X,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBulkReviewAITasks } from '@/hooks/useAIInsights';
import { toast } from 'sonner';

interface BulkReviewBarProps {
  selectedInsightIds: string[];
  onClearSelection: () => void;
  onBulkAction?: (action: 'accept' | 'reject', count: number) => void;
  className?: string;
}

export function BulkReviewBar({
  selectedInsightIds,
  onClearSelection,
  onBulkAction,
  className
}: BulkReviewBarProps) {
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const bulkReviewMutation = useBulkReviewAITasks();

  if (selectedInsightIds.length === 0) {
    return null;
  }

  const handleBulkAccept = async () => {
    try {
      await bulkReviewMutation.mutateAsync({
        insight_ids: selectedInsightIds,
        decision: 'accept',
      });
      onBulkAction?.('accept', selectedInsightIds.length);
      onClearSelection();
      setShowRejectReason(false);
    } catch (error) {
      console.error('Failed to bulk accept suggestions:', error);
    }
  };

  const handleBulkReject = async () => {
    try {
      await bulkReviewMutation.mutateAsync({
        insight_ids: selectedInsightIds,
        decision: 'reject',
        reason: rejectReason || undefined,
      });
      onBulkAction?.('reject', selectedInsightIds.length);
      onClearSelection();
      setShowRejectReason(false);
      setRejectReason('');
    } catch (error) {
      console.error('Failed to bulk reject suggestions:', error);
    }
  };

  const isLoading = bulkReviewMutation.isPending;

  return (
    <div className={cn('fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50', className)}>
      <Card className="border-2 border-blue-200 bg-white shadow-lg">
        <div className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                {selectedInsightIds.length} selected
              </Badge>
              <span className="text-sm font-medium">
                AI suggestion{selectedInsightIds.length > 1 ? 's' : ''}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
              disabled={isLoading}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              onClick={handleBulkAccept}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Accept Selected
            </Button>

            <Button
              variant="outline"
              onClick={() => setShowRejectReason(!showRejectReason)}
              disabled={isLoading}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject Selected
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
              disabled={isLoading}
              className="text-gray-500 hover:text-gray-700"
            >
              Cancel
            </Button>
          </div>

          {/* Reject Reason Input */}
          {showRejectReason && (
            <div className="space-y-3 pt-2 border-t">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Rejection Reason (Optional)
                </label>
                <Textarea
                  placeholder="Explain why you're rejecting these suggestions..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="min-h-[80px]"
                  disabled={isLoading}
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleBulkReject}
                  disabled={isLoading}
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <XCircle className="h-4 w-4 mr-2" />
                  )}
                  Confirm Rejection
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowRejectReason(false);
                    setRejectReason('');
                  }}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Warning for bulk actions */}
          <div className="flex items-start gap-2 p-2 bg-amber-50 border border-amber-200 rounded-md text-xs">
            <AlertTriangle className="h-3 w-3 text-amber-600 mt-0.5 shrink-0" />
            <div className="text-amber-800">
              <span className="font-medium">Bulk Action:</span> This will apply the same action to all {selectedInsightIds.length} selected suggestions.
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

interface BulkSelectCheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function BulkSelectCheckbox({
  checked,
  onCheckedChange,
  disabled = false,
  className
}: BulkSelectCheckboxProps) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
      disabled={disabled}
      className={cn(
        'h-4 w-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 focus:ring-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
    />
  );
}

interface BulkSelectHeaderProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: (checked: boolean) => void;
  disabled?: boolean;
}

export function BulkSelectHeader({
  selectedCount,
  totalCount,
  onSelectAll,
  disabled = false
}: BulkSelectHeaderProps) {
  const isIndeterminate = selectedCount > 0 && selectedCount < totalCount;
  const isChecked = selectedCount === totalCount && totalCount > 0;

  return (
    <div className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={isChecked}
        ref={(el) => {
          if (el) el.indeterminate = isIndeterminate;
        }}
        onChange={(e) => onSelectAll(e.target.checked)}
        disabled={disabled}
        className="h-4 w-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
      />
      <span className="text-sm text-gray-600">
        {selectedCount > 0 ? (
          `${selectedCount} of ${totalCount} selected`
        ) : (
          `Select all ${totalCount}`
        )}
      </span>
    </div>
  );
}