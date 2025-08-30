import { API_CONFIG, getAuthHeaders, handleApiResponse } from '@/config/api';
import {
  Document,
  DocumentWithEntities,
  Entity,
  DocumentsResponse,
  EntitiesResponse,
  DocumentFilterOptions,
  EntityFilterOptions,
  EntityUpdateData,
  DocumentUpdateData
} from '@/types/doc-intel';

const DOC_INTEL_BASE_URL = API_CONFIG.DOC_INTEL_BASE_URL;

// Utility function to create upload headers (removes content-type for FormData)
function createUploadHeaders(headers: HeadersInit): Record<string, string> {
  const uploadHeaders: Record<string, string> = {};
  if (typeof headers === 'object' && headers !== null) {
    Object.entries(headers).forEach(([key, value]) => {
      if (key.toLowerCase() !== 'content-type') {
        uploadHeaders[key] = value as string;
      }
    });
  }
  return uploadHeaders;
}

export default class DocIntelAPI {
  /**
   * Upload a document file for processing
   */
  static async uploadDocument(file: File): Promise<Document> {
    const headers = await getAuthHeaders();
    const uploadHeaders = createUploadHeaders(headers);

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${DOC_INTEL_BASE_URL}/upload`, {
      method: 'POST',
      headers: uploadHeaders,
      body: formData
    });

    const result = await handleApiResponse<{ success: boolean; document: Document }>(response);
    return result.document;
  }

  /**
   * Get all documents for the current user with optional filtering
   */
  static async getDocuments(
    options: DocumentFilterOptions & {
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<DocumentsResponse> {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams();

    // Add filter parameters
    if (options.status) {
      if (Array.isArray(options.status)) {
        options.status.forEach(status => params.append('status', status));
      } else {
        params.append('status', options.status);
      }
    }
    
    if (options.search) params.append('search', options.search);
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.offset) params.append('offset', options.offset.toString());
    if (options.uploaded_after) params.append('uploaded_after', options.uploaded_after);
    if (options.uploaded_before) params.append('uploaded_before', options.uploaded_before);

    const response = await fetch(`${DOC_INTEL_BASE_URL}/documents?${params.toString()}`, {
      method: 'GET',
      headers
    });

    const result = await handleApiResponse<{
      success: boolean;
      documents: Document[];
      total: number;
      limit: number;
      offset: number;
    }>(response);

    return {
      documents: result.documents,
      total: result.total,
      page: Math.floor(result.offset / result.limit) + 1,
      page_size: result.limit,
      total_pages: Math.ceil(result.total / result.limit)
    };
  }

  /**
   * Get a single document with its entities and statistics
   */
  static async getDocument(documentId: string): Promise<DocumentWithEntities> {
    const headers = await getAuthHeaders();

    const response = await fetch(`${DOC_INTEL_BASE_URL}/documents/${documentId}`, {
      method: 'GET',
      headers
    });

    const result = await handleApiResponse<{
      success: boolean;
      document: DocumentWithEntities;
    }>(response);

    return result.document;
  }

  /**
   * Get all entities for a specific document with optional filtering
   */
  static async getDocumentEntities(
    documentId: string,
    options: EntityFilterOptions & {
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<EntitiesResponse> {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams();

    // Add filter parameters
    if (options.status) {
      if (Array.isArray(options.status)) {
        options.status.forEach(status => params.append('status', status));
      } else {
        params.append('status', options.status);
      }
    }

    if (options.label) {
      if (Array.isArray(options.label)) {
        options.label.forEach(label => params.append('label', label));
      } else {
        params.append('label', options.label);
      }
    }

    if (options.is_objective_truth !== undefined) {
      params.append('is_objective_truth', options.is_objective_truth.toString());
    }

    if (options.search) params.append('search', options.search);
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.offset) params.append('offset', options.offset.toString());

    const response = await fetch(
      `${DOC_INTEL_BASE_URL}/documents/${documentId}/entities?${params.toString()}`,
      {
        method: 'GET',
        headers
      }
    );

    const result = await handleApiResponse<{
      success: boolean;
      entities: Entity[];
      total: number;
      limit: number;
      offset: number;
    }>(response);

    return {
      entities: result.entities,
      total: result.total,
      page: Math.floor(result.offset / result.limit) + 1,
      page_size: result.limit,
      total_pages: Math.ceil(result.total / result.limit)
    };
  }

  /**
   * Update a document's properties
   */
  static async updateDocument(
    documentId: string,
    updates: DocumentUpdateData
  ): Promise<Document> {
    const headers = await getAuthHeaders();

    const response = await fetch(`${DOC_INTEL_BASE_URL}/documents/${documentId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(updates)
    });

    const result = await handleApiResponse<{
      success: boolean;
      document: Document;
    }>(response);

    return result.document;
  }

  /**
   * Update an entity's properties
   */
  static async updateEntity(
    entityId: string,
    updates: EntityUpdateData
  ): Promise<Entity> {
    const headers = await getAuthHeaders();

    const response = await fetch(`${DOC_INTEL_BASE_URL}/entities/${entityId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(updates)
    });

    const result = await handleApiResponse<{
      success: boolean;
      entity: Entity;
    }>(response);

    return result.entity;
  }

  /**
   * Set the objective truth flag for an entity
   */
  static async setEntityObjectiveTruth(
    entityId: string,
    isObjectiveTruth: boolean
  ): Promise<Entity> {
    const headers = await getAuthHeaders();

    const response = await fetch(
      `${DOC_INTEL_BASE_URL}/entities/${entityId}/set-objective-truth`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ is_objective_truth: isObjectiveTruth })
      }
    );

    const result = await handleApiResponse<{
      success: boolean;
      entity: Entity;
    }>(response);

    return result.entity;
  }

  /**
   * Bulk update entity statuses
   */
  static async updateEntityStatus(
    entityId: string,
    status: 'pending' | 'confirmed' | 'rejected'
  ): Promise<Entity> {
    return this.updateEntity(entityId, { status });
  }

  /**
   * Bulk operations - update multiple entities at once
   */
  static async bulkUpdateEntities(
    entityIds: string[],
    updates: EntityUpdateData
  ): Promise<Entity[]> {
    // Since our API doesn't have a bulk endpoint, we'll make individual requests
    // In a production environment, you might want to add a bulk endpoint to the backend
    const promises = entityIds.map(id => this.updateEntity(id, updates));
    return Promise.all(promises);
  }

  /**
   * Bulk status change for multiple entities
   */
  static async bulkUpdateEntityStatus(
    entityIds: string[],
    status: 'pending' | 'confirmed' | 'rejected'
  ): Promise<Entity[]> {
    return this.bulkUpdateEntities(entityIds, { status });
  }

  /**
   * Get entities across all documents with filtering
   */
  static async getAllEntities(): Promise<EntitiesResponse> {
    // This would require a new endpoint on the backend that searches across all user documents
    // For now, we'll throw an error to indicate this feature needs backend implementation
    throw new Error('getAllEntities requires a new backend endpoint. Please implement GET /entities first.');
  }

  /**
   * Search documents and entities by text content
   */
  static async searchContent(
    query: string,
    options: {
      include_documents?: boolean;
      include_entities?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{
    documents?: Document[];
    entities?: Entity[];
    total_documents?: number;
    total_entities?: number;
  }> {
    // Use the existing getDocuments method with search parameter
    const { include_documents = true, include_entities = false } = options;
    
    const results: any = {};
    
    if (include_documents) {
      const docResults = await this.getDocuments({
        search: query,
        limit: options.limit,
        offset: options.offset
      });
      results.documents = docResults.documents;
      results.total_documents = docResults.total;
    }

    if (include_entities) {
      // This would require the getAllEntities method or a search-specific endpoint
      throw new Error('Entity search requires backend implementation of entity search endpoint.');
    }

    return results;
  }
}