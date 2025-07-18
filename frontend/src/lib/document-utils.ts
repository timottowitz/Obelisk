import { CheckCircle, AlertCircle, Clock, XCircle } from 'lucide-react';

// Format file size
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Format date
export function formatDate(date: Date): string {
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - new Date(date).getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays === 1) return 'Today';
  if (diffDays === 2) return 'Yesterday';
  if (diffDays <= 7) return `${diffDays - 1}d ago`;
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}


// Count documents in a folder
export function countDocuments(folder: any): number {
  const count = folder.documents?.length || 0;

  if (folder.children && folder.children.length > 0) {
    return folder.children.reduce(
      (acc: number, child: any) => acc + countDocuments(child),
      count
    );
  }

  return count;
}

// Count all documents in folders
export function countAllDocuments(folders: any): number {
  return folders.reduce(
    (count: number, folder: any) => count + countDocuments(folder),
    0
  );
} 

// Get status color and icon
export function getStatusDisplay(status: string) {
    switch (status) {
      case 'complete':
        return {
          color: 'text-green-600',
          bg: 'bg-green-100',
          icon: CheckCircle
        };
      case 'under-review':
        return {
          color: 'text-yellow-600',
          bg: 'bg-yellow-100',
          icon: AlertCircle
        };
      case 'pending':
        return {
          color: 'text-blue-600',
          bg: 'bg-blue-100',
          icon: Clock
        };
      case 'missing':
        return {
          color: 'text-red-600',
          bg: 'bg-red-100',
          icon: XCircle
        };
      default:
        return {
          color: 'text-gray-600',
          bg: 'bg-gray-100',
          icon: AlertCircle
        };
    }
  }