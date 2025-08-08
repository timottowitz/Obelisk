'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Brain, CheckCircle, XCircle, AlertCircle, Bot, Sparkles, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AIInsightStatus } from '@/types/ai-insights';

interface AISuggestionBadgeProps {
  confidence?: number; // 0-1
  status: AIInsightStatus;
  size?: 'sm' | 'md' | 'lg';
  showConfidence?: boolean;
  onClick?: () => void;
  className?: string;
}

export function AISuggestionBadge({
  confidence,
  status,
  size = 'sm',
  showConfidence = true,
  onClick,
  className
}: AISuggestionBadgeProps) {
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-50 border-green-200 dark:bg-green-950/50 dark:text-green-300 dark:border-green-800';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-50 border-yellow-200 dark:bg-yellow-950/50 dark:text-yellow-300 dark:border-yellow-800';
    return 'text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800';
  };

  const getStatusConfig = () => {
    switch (status) {
      case 'accepted':
        return {
          icon: CheckCircle,
          label: 'AI Generated',
          styles: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-950/50 dark:text-green-300 dark:border-green-800'
        };
      case 'rejected':
        return {
          icon: XCircle,
          label: 'AI Rejected',
          styles: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800'
        };
      case 'auto_applied':
        return {
          icon: Zap,
          label: 'Auto Applied',
          styles: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800'
        };
      default: // pending
        return {
          icon: Sparkles,
          label: 'AI Suggestion',
          styles: confidence ? getConfidenceColor(confidence) : 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-sm px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2'
  };

  const iconSizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4'
  };

  const content = (
    <>
      <Icon className={cn(iconSizeClasses[size], 'shrink-0')} />
      <span className="font-medium">{config.label}</span>
      {showConfidence && confidence && status === 'pending' && (
        <>
          <span className="opacity-60">•</span>
          <span className="font-semibold">{Math.round(confidence * 100)}%</span>
          {confidence < 0.7 && (
            <AlertCircle className="h-3 w-3 text-amber-500 ml-0.5" />
          )}
        </>
      )}
    </>
  );

  const badgeClassName = cn(
    'inline-flex items-center font-medium border transition-all select-none',
    config.styles,
    sizeClasses[size],
    onClick && 'cursor-pointer hover:opacity-80',
    className
  );

  if (onClick) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={onClick}
        className={cn(
          'h-auto p-0 hover:bg-transparent',
          badgeClassName
        )}
      >
        {content}
      </Button>
    );
  }

  return (
    <Badge
      variant="outline"
      className={badgeClassName}
    >
      {content}
    </Badge>
  );
}

interface AIConfidenceBarProps {
  confidence: number;
  className?: string;
}

export function AIConfidenceBar({ confidence, className }: AIConfidenceBarProps) {
  const getBarColor = () => {
    if (confidence >= 0.8) return 'bg-green-500';
    if (confidence >= 0.6) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Confidence:</span>
      <div className="flex-1 relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={cn('absolute left-0 top-0 h-full transition-all duration-300', getBarColor())}
          style={{ width: `${confidence * 100}%` }}
        />
      </div>
      <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
        {Math.round(confidence * 100)}%
      </span>
    </div>
  );
}

interface AIInsightIndicatorProps {
  hasInsights: boolean;
  insightCount?: number;
  onClick?: () => void;
}

export function AIInsightIndicator({ hasInsights, insightCount = 0, onClick }: AIInsightIndicatorProps) {
  if (!hasInsights) return null;

  return (
    <button
      onClick={onClick}
      className="relative inline-flex items-center justify-center p-1.5 rounded-full bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/50 transition-colors"
      title="View AI insights"
    >
      <Brain className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      {insightCount > 0 && (
        <span className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center bg-blue-600 dark:bg-blue-500 text-white text-xs font-bold rounded-full">
          {insightCount > 9 ? '9+' : insightCount}
        </span>
      )}
    </button>
  );
}

interface AIInsightCountBadgeProps {
  count: number;
  variant?: 'pending' | 'total';
  className?: string;
}

export function AIInsightCountBadge({
  count,
  variant = 'pending',
  className,
}: AIInsightCountBadgeProps) {
  if (count === 0) return null;

  return (
    <Badge
      variant={variant === 'pending' ? 'destructive' : 'secondary'}
      className={cn(
        'ml-2 px-1.5 py-0.5 text-xs font-bold',
        variant === 'pending' && 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600',
        className
      )}
    >
      {count > 99 ? '99+' : count}
    </Badge>
  );
}
