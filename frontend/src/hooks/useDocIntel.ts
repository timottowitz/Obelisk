import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import DocIntelAPI from '@/services/doc-intel';
import {
  Document,
  DocumentWithEntities,
  Entity,
  DocumentsResponse,
  EntitiesResponse,
  DocumentFilterOptions,
  EntityFilterOptions,
  EntityUpdateData,
  DocumentUpdateData,
  DocumentStatus,
  EntityStatus
} from '@/types/doc-intel';

const QUERY_KEYS = {
  documents: ['doc-intel', 'documents'] as const,
  document: ['doc-intel', 'document'] as const,
  entities: ['doc-intel', 'entities'] as const,
  documentEntities: ['doc-intel', 'document-entities'] as const,
  search: ['doc-intel', 'search'] as const
};

// Documents hooks
export function useDocuments(
  filters: DocumentFilterOptions & { limit?: number; offset?: number } = {}
) {
  const { isSignedIn } = useAuth();
  
  return useQuery({
    queryKey: [...QUERY_KEYS.documents, filters],
    queryFn: () => DocIntelAPI.getDocuments(filters),
    enabled: isSignedIn,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2
  });
}

export function useDocument(documentId: string) {
  const { isSignedIn } = useAuth();
  
  return useQuery({
    queryKey: [...QUERY_KEYS.document, documentId],
    queryFn: () => DocIntelAPI.getDocument(documentId),
    enabled: isSignedIn && !!documentId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2
  });
}

export function useDocumentEntities(
  documentId: string,
  filters: EntityFilterOptions & { limit?: number; offset?: number } = {}
) {
  const { isSignedIn } = useAuth();
  
  return useQuery({
    queryKey: [...QUERY_KEYS.documentEntities, documentId, filters],
    queryFn: () => DocIntelAPI.getDocumentEntities(documentId, filters),
    enabled: isSignedIn && !!documentId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2
  });
}

// File upload hook
export function useUploadDocument() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (file: File) => DocIntelAPI.uploadDocument(file),
    onSuccess: (document) => {
      // Invalidate documents list to show the new document
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.documents });
    },
    onError: (error) => {
      console.error('Document upload failed:', error);
    }
  });
}

// Document update hooks
export function useUpdateDocument() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      documentId, 
      updates 
    }: { 
      documentId: string; 
      updates: DocumentUpdateData; 
    }) => DocIntelAPI.updateDocument(documentId, updates),
    onSuccess: (updatedDocument) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.document, updatedDocument.id] });
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.documentEntities, updatedDocument.id] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.documents });
    },
    onError: (error) => {
      console.error('Document update failed:', error);
    }
  });
}

// Entity update hooks
export function useUpdateEntity() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      entityId, 
      updates 
    }: { 
      entityId: string; 
      updates: EntityUpdateData; 
    }) => DocIntelAPI.updateEntity(entityId, updates),
    onSuccess: (updatedEntity) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.documentEntities, updatedEntity.document_id] });
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.document, updatedEntity.document_id] });
    },
    onError: (error) => {
      console.error('Entity update failed:', error);
    }
  });
}

export function useUpdateEntityStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      entityId, 
      status 
    }: { 
      entityId: string; 
      status: EntityStatus; 
    }) => DocIntelAPI.updateEntityStatus(entityId, status),
    onSuccess: (updatedEntity) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.documentEntities, updatedEntity.document_id] });
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.document, updatedEntity.document_id] });
    },
    onError: (error) => {
      console.error('Entity status update failed:', error);
    }
  });
}

export function useSetEntityObjectiveTruth() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      entityId, 
      isObjectiveTruth 
    }: { 
      entityId: string; 
      isObjectiveTruth: boolean; 
    }) => DocIntelAPI.setEntityObjectiveTruth(entityId, isObjectiveTruth),
    onSuccess: (updatedEntity) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.documentEntities, updatedEntity.document_id] });
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.document, updatedEntity.document_id] });
    },
    onError: (error) => {
      console.error('Entity objective truth update failed:', error);
    }
  });
}

// Bulk operations hooks
export function useBulkUpdateEntities() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      entityIds, 
      updates 
    }: { 
      entityIds: string[]; 
      updates: EntityUpdateData; 
    }) => DocIntelAPI.bulkUpdateEntities(entityIds, updates),
    onSuccess: (updatedEntities) => {
      // Get unique document IDs from updated entities
      const documentIds = [...new Set(updatedEntities.map(entity => entity.document_id))];
      
      // Invalidate queries for all affected documents
      documentIds.forEach(documentId => {
        queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.documentEntities, documentId] });
        queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.document, documentId] });
      });
    },
    onError: (error) => {
      console.error('Bulk entity update failed:', error);
    }
  });
}

export function useBulkUpdateEntityStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      entityIds, 
      status 
    }: { 
      entityIds: string[]; 
      status: EntityStatus; 
    }) => DocIntelAPI.bulkUpdateEntityStatus(entityIds, status),
    onSuccess: (updatedEntities) => {
      // Get unique document IDs from updated entities
      const documentIds = [...new Set(updatedEntities.map(entity => entity.document_id))];
      
      // Invalidate queries for all affected documents
      documentIds.forEach(documentId => {
        queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.documentEntities, documentId] });
        queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.document, documentId] });
      });
    },
    onError: (error) => {
      console.error('Bulk entity status update failed:', error);
    }
  });
}

// Search hook
export function useSearchContent(
  query: string,
  options: {
    include_documents?: boolean;
    include_entities?: boolean;
    limit?: number;
    offset?: number;
  } = {}
) {
  const { isSignedIn } = useAuth();
  
  return useQuery({
    queryKey: [...QUERY_KEYS.search, query, options],
    queryFn: () => DocIntelAPI.searchContent(query, options),
    enabled: isSignedIn && query.length > 0,
    staleTime: 1 * 60 * 1000, // 1 minute for search results
    retry: 1
  });
}

// Utility hooks for common patterns

/**
 * Hook that combines document data with filtered entities
 */
export function useDocumentWithFilteredEntities(
  documentId: string,
  entityFilters: EntityFilterOptions = {}
) {
  const documentQuery = useDocument(documentId);
  const entitiesQuery = useDocumentEntities(documentId, entityFilters);
  
  return {
    document: documentQuery.data,
    entities: entitiesQuery.data?.entities,
    isLoading: documentQuery.isLoading || entitiesQuery.isLoading,
    error: documentQuery.error || entitiesQuery.error,
    refetch: () => {
      documentQuery.refetch();
      entitiesQuery.refetch();
    }
  };
}

/**
 * Hook for paginated documents with status filtering
 */
export function usePaginatedDocuments(
  page: number = 1,
  pageSize: number = 10,
  status?: DocumentStatus | DocumentStatus[],
  search?: string
) {
  const offset = (page - 1) * pageSize;
  
  return useDocuments({
    limit: pageSize,
    offset,
    status,
    search
  });
}

/**
 * Hook for paginated entities with filtering
 */
export function usePaginatedDocumentEntities(
  documentId: string,
  page: number = 1,
  pageSize: number = 20,
  filters: EntityFilterOptions = {}
) {
  const offset = (page - 1) * pageSize;
  
  return useDocumentEntities(documentId, {
    ...filters,
    limit: pageSize,
    offset
  });
}

/**
 * Combined operations hook for a specific document
 */
export function useDocumentOperations(documentId: string) {
  return {
    // Queries
    document: useDocument(documentId),
    entities: useDocumentEntities(documentId),
    
    // Mutations
    updateDocument: useUpdateDocument(),
    updateEntity: useUpdateEntity(),
    updateEntityStatus: useUpdateEntityStatus(),
    setEntityObjectiveTruth: useSetEntityObjectiveTruth(),
    bulkUpdateEntities: useBulkUpdateEntities(),
    bulkUpdateEntityStatus: useBulkUpdateEntityStatus()
  };
}

/**
 * Combined operations hook for all document intelligence features
 */
export function useDocIntelOperations() {
  return {
    // Queries
    documents: useDocuments(),
    searchContent: (query: string, options?: any) => useSearchContent(query, options),
    
    // Mutations
    uploadDocument: useUploadDocument(),
    updateDocument: useUpdateDocument(),
    updateEntity: useUpdateEntity(),
    updateEntityStatus: useUpdateEntityStatus(),
    setEntityObjectiveTruth: useSetEntityObjectiveTruth(),
    bulkUpdateEntities: useBulkUpdateEntities(),
    bulkUpdateEntityStatus: useBulkUpdateEntityStatus()
  };
}