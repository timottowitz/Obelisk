'use client';

import { useMemo, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from '@/components/ui/pagination';
import {
  Edit,
  Trash2,
  Brain,
  MessageCircle,
  Calendar,
  User,
  AlertTriangle,
  CheckCircle2,
  Circle
} from 'lucide-react';
import { Task } from '@/types/cases';
import { cn } from '@/lib/utils';
import {
  AISuggestionBadge,
  AIInsightIndicator
} from '@/components/ai/ai-suggestion-badge';
import { useAIInsightsForCase } from '@/hooks/useAIInsights';
import type { AITaskInsightWithDetails } from '@/types/ai-insights';

interface EnhancedCaseTasksTableProps {
  tasks: Task[];
  isLoading: boolean;
  count: number;
  currentPage: number;
  caseId: string;
  onPageChange: (page: number) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
}

function TaskRow({
  task,
  onEditTask,
  onDeleteTask,
  aiInsights,
  onOpenAIPanel
}: {
  task: Task;
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  aiInsights?: AITaskInsightWithDetails[];
  onOpenAIPanel?: (insight: AITaskInsightWithDetails) => void;
}) {
  const getDueDateStatus = (dueDate: string) => {
    if (!dueDate) return null;

    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0)
      return { status: 'overdue', text: 'Overdue', class: 'text-red-600' };
    if (diffDays === 0)
      return { status: 'today', text: 'Due today', class: 'text-orange-600' };
    if (diffDays <= 3)
      return {
        status: 'soon',
        text: `Due in ${diffDays}d`,
        class: 'text-yellow-600'
      };
    return {
      status: 'future',
      text: `Due ${due.toLocaleDateString()}`,
      class: 'text-muted-foreground'
    };
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-muted text-foreground border-border';
    }
  };

  const dueDateStatus = getDueDateStatus(task.due_date);
  const taskAIInsights =
    aiInsights?.filter((insight) => insight.task_id === task.id) || [];
  const pendingInsights = taskAIInsights.filter(
    (insight) => insight.status === 'pending'
  );
  const hasAIInsights = taskAIInsights.length > 0;

  return (
    <TableRow className='transition-colors hover:bg-muted/40 dark:hover:bg-muted/20'>
      {/* Task Name & Status */}
      <TableCell className='max-w-xs'>
        <div className='flex items-start space-x-3'>
          <div className='mt-1 flex-shrink-0'>
            {task.is_completed ? (
              <CheckCircle2 className='h-4 w-4 text-green-600' />
            ) : (
              <Circle className='h-4 w-4 text-muted-foreground' />
            )}
          </div>
          <div className='min-w-0 flex-1'>
            <div className='flex items-center space-x-2'>
              <p className='truncate font-medium text-foreground'>{task.name}</p>
              {/* AI Indicators */}
              {taskAIInsights.length > 0 && (
                <div className='flex items-center gap-1'>
                  {taskAIInsights.map((insight) => (
                    <AISuggestionBadge
                      key={insight.id}
                      status={insight.status}
                      confidence={insight.confidence_score}
                      size='sm'
                      onClick={() => onOpenAIPanel?.(insight)}
                    />
                  ))}
                </div>
              )}
              {task.ai_generated && taskAIInsights.length === 0 && (
                <Badge variant='secondary' className='text-xs'>
                  <Brain className='mr-1 h-3 w-3' />
                  AI
                </Badge>
              )}
              {/* Chat Indicator */}
              {task.created_from_chat && (
                <Badge variant='outline' className='text-xs'>
                  <MessageCircle className='mr-1 h-3 w-3' />
                  Chat
                </Badge>
              )}
            </div>
          </div>
        </div>
      </TableCell>

      {/* Priority */}
      <TableCell>
        <Badge
          variant='outline'
          className={cn('text-xs font-medium', getPriorityColor(task.priority))}
        >
          {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
        </Badge>
      </TableCell>

      {/* Assignee */}
      <TableCell>
        <div className='flex items-center space-x-2'>
          <div className='flex h-8 w-8 items-center justify-center rounded-full bg-muted'>
            <User className='h-4 w-4 text-muted-foreground' />
          </div>
          <span className='text-sm text-foreground'>
            {task.assignee || 'Unassigned'}
          </span>
        </div>
      </TableCell>

      {/* Due Date */}
      <TableCell>
        {task.due_date ? (
          <div className='flex items-center space-x-2'>
            <Calendar className='h-4 w-4 text-muted-foreground' />
            <span className={cn('text-sm', dueDateStatus?.class)}>
              {dueDateStatus?.text}
            </span>
            {dueDateStatus?.status === 'overdue' && (
              <AlertTriangle className='h-4 w-4 text-red-500' />
            )}
          </div>
        ) : (
          <span className='text-sm text-muted-foreground'>No due date</span>
        )}
      </TableCell>

      {/* Status */}
      <TableCell>
        <Badge
          variant={task.is_completed ? 'default' : 'secondary'}
          className='text-xs'
        >
          {task.is_completed ? 'Completed' : task.status}
        </Badge>
      </TableCell>

      {/* Actions */}
      <TableCell>
        <div className='flex items-center space-x-2'>
          {hasAIInsights && (
            <AIInsightIndicator
              hasInsights={hasAIInsights}
              insightCount={pendingInsights.length}
              onClick={() =>
                pendingInsights[0] && onOpenAIPanel?.(pendingInsights[0])
              }
            />
          )}
          <Button
            variant='ghost'
            size='sm'
            onClick={() => onEditTask(task)}
            className='h-8 w-8 p-0'
          >
            <Edit className='h-4 w-4' />
          </Button>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => onDeleteTask(task)}
            className='h-8 w-8 p-0 text-destructive hover:text-destructive'
          >
            <Trash2 className='h-4 w-4' />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function LoadingRow({ showSelection }: { showSelection?: boolean }) {
  return (
    <TableRow>
      <TableCell colSpan={showSelection ? 7 : 6}>
        <div className='flex items-center justify-center py-8'>
          <div className='flex items-center space-x-2'>
            <div className='h-4 w-4 animate-spin rounded-full border-b-2 border-primary'></div>
            <span className='text-sm text-muted-foreground'>Loading tasks...</span>
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
}

function EmptyState({ showSelection }: { showSelection?: boolean }) {
  return (
    <TableRow>
      <TableCell colSpan={showSelection ? 7 : 6}>
        <div className='flex flex-col items-center justify-center py-12'>
          <div className='rounded-full bg-muted p-3'>
            <CheckCircle2 className='h-6 w-6 text-muted-foreground' />
          </div>
          <h3 className='mt-4 text-sm font-medium text-foreground'>
            No tasks yet
          </h3>
          <p className='mt-2 text-sm text-muted-foreground'>
            Get started by creating your first task for this case.
          </p>
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function EnhancedCaseTasksTable({
  tasks,
  isLoading,
  count,
  currentPage,
  caseId,
  onPageChange,
  onEditTask,
  onDeleteTask
}: EnhancedCaseTasksTableProps) {
  // Get AI insights for this case
  const { data: aiInsights = [] } = useAIInsightsForCase(caseId);
  const totalPages = Math.ceil(count / 5);

  // Filter AI insights to only pending ones for bulk selection
  const pendingInsights = aiInsights.filter(
    (insight) => insight.status === 'pending'
  );

  const showSelectionColumn = pendingInsights.length > 0;

  const pageNumbers = useMemo(() => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  }, [totalPages, currentPage]);

  return (
    <>
      <div className='space-y-4'>
        {/* Table */}
        <div className='rounded-lg border border-border bg-white shadow-sm dark:bg-card'>
          <Table>
            <TableHeader>
              <TableRow className='bg-muted/60 text-foreground'>
                {showSelectionColumn && <TableHead className='w-8'></TableHead>}
                <TableHead className='font-semibold'>
                  Task
                </TableHead>
                <TableHead className='font-semibold'>
                  Priority
                </TableHead>
                <TableHead className='font-semibold'>
                  Assignee
                </TableHead>
                <TableHead className='font-semibold'>
                  Due Date
                </TableHead>
                <TableHead className='font-semibold'>
                  Status
                </TableHead>
                <TableHead className='w-20 font-semibold'>
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <LoadingRow showSelection={showSelectionColumn} />
              ) : tasks.length > 0 ? (
                tasks.map((task) => {
                  return (
                    <TaskRow
                      key={task.id}
                      task={task}
                      onEditTask={onEditTask}
                      onDeleteTask={onDeleteTask}
                      aiInsights={aiInsights}
                    />
                  );
                })
              ) : (
                <EmptyState showSelection={showSelectionColumn} />
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className='flex items-center justify-between'>
            <p className='text-sm text-muted-foreground'>
              Showing {(currentPage - 1) * 5 + 1}-
              {Math.min(currentPage * 5, count)} of {count} tasks
            </p>

            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    className={cn(
                      'cursor-pointer rounded-lg px-3 transition-all duration-200',
                      currentPage === 1 && 'pointer-events-none opacity-50'
                    )}
                  />
                </PaginationItem>

                {pageNumbers.map((page, index) => (
                  <PaginationItem key={index}>
                    {page === '...' ? (
                      <span className='cursor-pointer px-3 py-2 text-sm text-muted-foreground'>
                        ...
                      </span>
                    ) : (
                      <PaginationLink
                        onClick={() => onPageChange(Number(page))}
                        isActive={currentPage === Number(page)}
                        className='cursor-pointer rounded-lg px-3 transition-all duration-200'
                      >
                        {page}
                      </PaginationLink>
                    )}
                  </PaginationItem>
                ))}

                <PaginationItem>
                  <PaginationNext
                    onClick={() =>
                      onPageChange(Math.min(totalPages, currentPage + 1))
                    }
                    className={cn(
                      'cursor-pointer rounded-lg px-3 transition-all duration-200',
                      currentPage === totalPages &&
                        'pointer-events-none opacity-50'
                    )}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>
    </>
  );
}
