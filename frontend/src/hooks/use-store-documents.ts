
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import StoreDocumentsAPI from '@/services/store-documents-api';

const QUERY_KEYS = {
  documents: 'documents',
  folders: 'folders',
};

export const useGetDocuments = () => {
  return useQuery<any, Error>({
    queryKey: [QUERY_KEYS.documents],
    queryFn: () => StoreDocumentsAPI.getDocuments(),
  });
};

export const useGetFolders = () => {
  return useQuery<any, Error>({
    queryKey: [QUERY_KEYS.folders],
    queryFn: () => StoreDocumentsAPI.getFolders(),
  });
};

export const useUploadDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: { file: File; folderId: string }) =>
      StoreDocumentsAPI.uploadDocument(variables.file, variables.folderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.documents] });
    },
  });
};

export const useCreateFolder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: { folderName: string; parentId: string }) =>
      StoreDocumentsAPI.createFolder(variables.folderName, variables.parentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.folders] });
    },
  });
};

export const useDownloadFile = () => {
  return useMutation({
    mutationFn: (fileId: string) => StoreDocumentsAPI.downloadFile(fileId),
  });
};

export const useDeleteFile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (fileId: string) => StoreDocumentsAPI.deleteFile(fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.documents] });
    },
  });
};

export const useDeleteFolder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (folderId: string) => StoreDocumentsAPI.deleteFolder(folderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.folders] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.documents] });
    },
  });
};
