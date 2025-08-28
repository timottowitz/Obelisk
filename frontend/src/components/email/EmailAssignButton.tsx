'use client';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FolderPlus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EmailAssignButtonProps {
  emailId: string;
  isAssigned?: boolean;
  isLoading?: boolean;
  onAssign: (emailId: string) => void;
  variant?: 'default' | 'icon' | 'compact';
  className?: string;
  disabled?: boolean;
}

export function EmailAssignButton({
  emailId,
  isAssigned = false,
  isLoading = false,
  onAssign,
  variant = 'default',
  className,
  disabled = false
}: EmailAssignButtonProps) {
  const handleClick = () => {
    if (!disabled && !isLoading && !isAssigned) {
      onAssign(emailId);
    }
  };

  const getButtonContent = () => {
    if (isLoading) {
      return (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {variant !== 'icon' && <span className="ml-2">Assigning...</span>}
        </>
      );
    }

    if (isAssigned) {
      return (
        <>
          <FolderPlus className="h-4 w-4 text-green-600" />
          {variant !== 'icon' && <span className="ml-2">Assigned</span>}
        </>
      );
    }

    return (
      <>
        <FolderPlus className="h-4 w-4" />
        {variant !== 'icon' && <span className="ml-2">Assign to Case</span>}
      </>
    );
  };

  const getTooltipText = () => {
    if (isLoading) return 'Assigning email to case...';
    if (isAssigned) return 'Email is assigned to a case';
    if (disabled) return 'No cases available';
    return 'Assign email to a case';
  };

  const buttonVariant = isAssigned ? 'outline' : 'secondary';
  const isButtonDisabled = disabled || isLoading || isAssigned;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={buttonVariant}
            size={variant === 'compact' ? 'sm' : 'default'}
            className={cn(
              'gap-2',
              variant === 'icon' && 'px-2',
              isAssigned && 'border-green-200 bg-green-50 hover:bg-green-100',
              className
            )}
            onClick={handleClick}
            disabled={isButtonDisabled}
            aria-label={getTooltipText()}
            type="button"
          >
            {getButtonContent()}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{getTooltipText()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}