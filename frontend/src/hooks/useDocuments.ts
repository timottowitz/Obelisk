import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import StoreDocumentsAPI from '@/services/store-documents-api';

// Type definitions matching the actual API responses
export interface Document {
  id: string;
  name: string;
  mime_type: string;
  size_bytes: number;
  azure_blob_url: string;
  created_at: string;
  updated_at: string;
  folderId?: string;
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  createdBy: string;
  case_id: string;
  case_type_id: string;
  createdAt: string;
  children: Folder[];
  documents: Document[];
}

export interface UploadDocumentData {
  file: File;
  folderId: string;
}

export interface CreateFolderData {
  folderName: string;
  parentId: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Query keys
const QUERY_KEYS = {
  documents: ['documents'] as const,
  folders: ['folders'] as const,
  events: ['events'] as const
} as const;

// Hooks for querying data
export function useDocuments() {
  return useQuery({
    queryKey: [...QUERY_KEYS.documents],
    queryFn: async () => {
      const response = (await StoreDocumentsAPI.getDocuments()) as ApiResponse<
        Document[]
      >;
      return response.data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2
  });
}

export function useFolders(caseId: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.folders, caseId],
    queryFn: async () => {
      const response = (await StoreDocumentsAPI.getFolders(
        caseId
      )) as ApiResponse<Folder[]>;
      return response.data || [];
    },
    enabled: !!caseId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2
  });
}

// Mutation hooks
export function useUploadDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, folderId }: UploadDocumentData) => {
      const response = (await StoreDocumentsAPI.uploadDocument(
        file,
        folderId
      )) as ApiResponse<any>;
      if (!response.success) {
        throw new Error(response.error || 'Upload failed');
      }
      return response;
    },
    onSuccess: () => {
      // Invalidate and refetch both documents and folders
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.documents] });
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.folders] });
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.events] });
    },
    onError: (error) => {
      console.error('Upload failed:', error);
    }
  });
}

export function useCreateFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ folderName, parentId }: CreateFolderData) => {
      const response = (await StoreDocumentsAPI.createFolder(
        folderName,
        parentId
      )) as ApiResponse<any>;
      if (!response.success) {
        throw new Error(response.error || 'Create folder failed');
      }
      return response;
    },
    onSuccess: () => {
      // Invalidate and refetch folders
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.folders] });
    },
    onError: (error) => {
      console.error('Create folder failed:', error);
    }
  });
}

export function useDownloadFile() {
  return useMutation({
    mutationFn: async (fileId: string) => {
      const response = (await StoreDocumentsAPI.downloadFile(
        fileId
      )) as ApiResponse<{ signedUrl: string }>;
      if (!response.success) {
        throw new Error(response.error || 'Download failed');
      }
      return response;
    },
    onError: (error) => {
      console.error('Download failed:', error);
    }
  });
}

export function useDeleteFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (fileId: string) => {
      const response = (await StoreDocumentsAPI.deleteFile(
        fileId
      )) as ApiResponse<any>;
      if (!response.success) {
        throw new Error(response.error || 'Delete file failed');
      }
      return response;
    },
    onSuccess: () => {
      // Invalidate and refetch both documents and folders
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.documents] });
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.folders] });
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.events] });
    },
    onError: (error) => {
      console.error('Delete file failed:', error);
    }
  });
}

export function useDeleteFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (folderId: string) => {
      const response = (await StoreDocumentsAPI.deleteFolder(
        folderId
      )) as ApiResponse<any>;
      if (!response.success) {
        throw new Error(response.error || 'Delete folder failed');
      }
      return response;
    },
    onSuccess: () => {
      // Invalidate and refetch folders
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.folders] });
    },
    onError: (error) => {
      console.error('Delete folder failed:', error);
    }
  });
}

export function useMoveFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      fileId,
      targetFolderId
    }: {
      fileId: string;
      targetFolderId: string;
    }) => {
      const response = (await StoreDocumentsAPI.moveFile(
        fileId,
        targetFolderId
      )) as ApiResponse<any>;
      return response;
    },
    onSuccess: () => {
      // Invalidate and refetch folders
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.folders] });
    },
    onError: (error) => {
      console.error('Move file failed:', error);
    }
  });
}

// Compound hook for all storage operations
export function useStorageOperations() {
  return {
    // Mutations
    uploadDocument: useUploadDocument(),
    createFolder: useCreateFolder(),
    downloadFile: useDownloadFile(),
    deleteFile: useDeleteFile(),
    deleteFolder: useDeleteFolder()
  };
}

export function useFoldersOperations(caseId: string) {
  return {
    folders: useFolders(caseId)
  };
}
