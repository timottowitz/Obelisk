'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  Folder,
  FolderOpen,
  FileText,
  ChevronRight,
  Search,
  ArrowRight,
  FolderInput,
  Loader2,
} from 'lucide-react';
import * as Collapsible from '@radix-ui/react-collapsible';

interface MoveFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  currentFolderId: string;
  currentFolderName: string;
  folders: any[];
  onMove: (targetFolderId: string) => Promise<void>;
  isLoading?: boolean;
}

export function MoveFileModal({
  isOpen,
  onClose,
  fileName,
  currentFolderId,
  currentFolderName,
  folders,
  onMove
}: MoveFileModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set()
  );
  const [isMoving, setIsMoving] = useState(false);

  // Filter out current folder and its children to prevent moving to itself
  const filterFolders = useCallback(
    (folders: any[], excludeId: string): any[] => {
      if (excludeId === folders[0]?.id)
        return folders.map((folder) => ({
          ...folder,
          children: folder.children
            ? filterFolders(folder.children, excludeId)
            : []
        }));
      return folders
        .filter((folder) => folder.id !== excludeId)
        .map((folder) => ({
          ...folder,
          children: folder.children
            ? filterFolders(folder.children, excludeId)
            : []
        }));
    },
    []
  );

  const availableFolders = useMemo(() => {
    return filterFolders(folders, currentFolderId);
  }, [folders, currentFolderId]);

  // Search folders recursively
  const searchFolders = (folders: any[], query: string): any[] => {
    if (!query) return folders;

    return folders.reduce((acc, folder) => {
      const matchesQuery = folder.name
        .toLowerCase()
        .includes(query.toLowerCase());
      const childMatches = folder.children
        ? searchFolders(folder.children, query)
        : [];

      if (matchesQuery || childMatches.length > 0) {
        acc.push({
          ...folder,
          children: childMatches
        });
      }

      return acc;
    }, []);
  };

  const filteredFolders = useMemo(() => {
    return searchFolders(availableFolders, searchQuery);
  }, [availableFolders, searchQuery]);

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  const handleMove = async () => {
    if (!selectedFolderId) return;

    setIsMoving(true);
    try {
      await onMove(selectedFolderId);
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsMoving(false);
      setSelectedFolderId(null);
      setExpandedFolders(new Set());
    }
  };

  const handleClose = () => {
    if (!isMoving) {
      setSearchQuery('');
      setSelectedFolderId(null);
      setExpandedFolders(new Set());
      onClose();
    }
  };

  const getSelectedFolderName = () => {
    const findFolder = (folders: any[], id: string): string | null => {
      for (const folder of folders) {
        if (folder.id === id)
          return folder.name.length > 20
            ? folder.name.slice(0, 20) + '...'
            : folder.name;
        if (folder.children) {
          const found = findFolder(folder.children, id);
          if (found) return found;
        }
      }
      return null;
    };

    return selectedFolderId
      ? findFolder(availableFolders, selectedFolderId)
      : null;
  };

  const renderFolderTree = useCallback(
    (folders: any[], level: number = 0) => {
      return folders.map((folder) => {
        const isExpanded = expandedFolders.has(folder.id);
        const isSelected = selectedFolderId === folder.id;
        const hasChildren = folder.children && folder.children.length > 0;

        return (
          <div key={folder.id} className='w-full'>
            <Collapsible.Root open={isExpanded}>
              <div
                className={cn(
                  'group hover:bg-accent/50 relative flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 transition-colors',
                  isSelected && 'bg-primary/10 border-primary/20 border'
                )}
                onClick={() => setSelectedFolderId(folder.id)}
              >
                {/* Horizontal line connecting to parent */}
                {level > 0 && (
                  <div className='bg-border absolute top-1/2 left-0 h-px w-3 -translate-y-1/2' />
                )}
                {hasChildren && (
                  <Collapsible.Trigger
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFolder(folder.id);
                    }}
                    className='hover:bg-accent/30 rounded p-0.5'
                  >
                    <ChevronRight
                      className={cn(
                        'h-3 w-3 transition-transform',
                        isExpanded && 'rotate-90'
                      )}
                    />
                  </Collapsible.Trigger>
                )}
                {!hasChildren && <div className='w-4' />}

                {isExpanded ? (
                  <FolderOpen className='h-4 w-4 flex-shrink-0 text-blue-500' />
                ) : (
                  <Folder className='h-4 w-4 flex-shrink-0 text-blue-500' />
                )}

                <span className='flex-1 truncate text-sm font-medium'>
                  {folder.name}
                </span>

                {isSelected && (
                  <div className='text-primary flex items-center gap-1 text-xs'>
                    <FolderInput className='h-3 w-3' />
                    <span>Selected</span>
                  </div>
                )}
              </div>

              {hasChildren && (
                <Collapsible.Content className='relative'>
                  {/* Vertical line for subfolder hierarchy */}
                  <div className='bg-border absolute top-0 bottom-0 left-3 w-px' />
                  <div className='pl-3'>
                    {renderFolderTree(folder.children, level + 1)}
                  </div>
                </Collapsible.Content>
              )}
            </Collapsible.Root>
          </div>
        );
      });
    },
    [expandedFolders, selectedFolderId]
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className='flex max-h-[600px] max-w-2xl flex-col p-0'>
        <DialogHeader className='border-b px-6 pt-6 pb-4'>
          <DialogTitle className='flex items-center gap-2 text-xl font-semibold'>
            <FolderInput className='text-primary h-5 w-5' />
            Move File
          </DialogTitle>
          <DialogDescription>
            Select a destination folder for your file
          </DialogDescription>
        </DialogHeader>

        <div className='flex flex-1 flex-col overflow-hidden'>
          {/* File Info Card */}
          <div className='bg-muted/30 border-b px-6 py-4'>
            <div className='flex items-center gap-3'>
              <FileText className='h-5 w-5 flex-shrink-0 text-blue-500' />
              <div className='min-w-0 flex-1'>
                <p className='truncate text-sm font-medium'>{fileName}</p>
                <div className='text-muted-foreground mt-1 flex items-center gap-2 text-xs'>
                  <span>Current location:</span>
                  <div className='flex items-center gap-1'>
                    <Folder className='h-3 w-3' />
                    <span className='font-medium'>{currentFolderName}</span>
                  </div>
                </div>
              </div>
              {selectedFolderId && (
                <div className='text-primary flex items-center gap-2'>
                  <ArrowRight className='h-4 w-4' />
                  <div className='flex items-center gap-1'>
                    <FolderInput className='h-4 w-4' />
                    <span className='text-sm font-medium'>
                      {getSelectedFolderName()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Search Bar */}
          <div className='border-b px-6 py-3'>
            <div className='relative'>
              <Search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
              <Input
                type='search'
                placeholder='Search folders...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className='h-9 pl-9'
              />
            </div>
          </div>

          {/* Folder Tree */}
          <ScrollArea className='flex-1 overflow-y-auto px-6 py-4'>
            <div className='space-y-1'>
              {filteredFolders.length > 0
                ? renderFolderTree(filteredFolders)
                : searchQuery && (
                    <div className='text-muted-foreground py-8 text-center'>
                      <Folder className='mx-auto mb-3 h-12 w-12 opacity-30' />
                      <p className='text-sm'>
                        No folders found matching {searchQuery}
                      </p>
                    </div>
                  )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className='bg-background border-t px-6 py-4'>
          <Button
            variant='outline'
            onClick={handleClose}
            disabled={isMoving}
            className='cursor-pointer'
          >
            Cancel
          </Button>
          <Button
            onClick={handleMove}
            disabled={
              !selectedFolderId ||
              selectedFolderId === currentFolderId ||
              isMoving
            }
            className='min-w-[120px] cursor-pointer'
          >
            {isMoving ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Moving...
              </>
            ) : (
              <>
                <ArrowRight className='mr-2 h-4 w-4' />
                Move File
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
