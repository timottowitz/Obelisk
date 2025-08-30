/**
 * TypeScript types for Document Intelligence system
 * These types correspond to the database schema defined in doc_intel_schema.sql
 */

// Document processing status types
export type DocumentStatus = 
  | 'uploading' 
  | 'processing' 
  | 'needs_review' 
  | 'in_review' 
  | 'complete' 
  | 'failed';

// Entity status types
export type EntityStatus = 
  | 'pending' 
  | 'confirmed' 
  | 'rejected';

// Document metadata interface (stored as JSONB in database)
export interface DocumentMetadata {
  // File information
  originalSize?: number;
  mimeType?: string;
  pageCount?: number;
  
  // Processing metadata
  processingStartedAt?: string;
  processingCompletedAt?: string;
  processingEngine?: string;
  processingVersion?: string;
  
  // OCR/extraction metadata
  ocrConfidence?: number;
  extractedEntityCount?: number;
  
  // Error information
  errorMessage?: string;
  errorCode?: string;
  
  // Custom fields for extensibility
  [key: string]: any;
}

// Coordinate information for entity locations in document
export interface EntityCoordinates {
  // Bounding box coordinates (normalized 0-1)
  x: number;
  y: number;
  width: number;
  height: number;
  
  // Page number (1-indexed)
  page?: number;
  
  // Additional coordinate metadata
  confidence?: number;
  [key: string]: any;
}

// Main Document interface
export interface Document {
  id: string;
  filename: string;
  status: DocumentStatus;
  uploaded_at: string;
  completed_at: string | null;
  user_id: string;
  file_path: string;
  extracted_text: string | null;
  metadata: DocumentMetadata;
  created_at: string;
  updated_at: string;
}

// Main Entity interface
export interface Entity {
  id: string;
  document_id: string;
  label: string;
  value: string;
  context_snippet: string | null;
  coordinates_json: EntityCoordinates | null;
  status: EntityStatus;
  is_objective_truth: boolean;
  created_at: string;
  updated_at: string;
}

// Extended Document interface with related entities
export interface DocumentWithEntities extends Document {
  entities: Entity[];
  entity_count?: number;
  confirmed_entity_count?: number;
  pending_entity_count?: number;
}

// Entity with document information
export interface EntityWithDocument extends Entity {
  document: Pick<Document, 'id' | 'filename' | 'status'>;
}

// Document upload data
export interface DocumentUploadData {
  filename: string;
  file_path: string;
  metadata?: Partial<DocumentMetadata>;
}

// Entity creation data
export interface EntityCreateData {
  document_id: string;
  label: string;
  value: string;
  context_snippet?: string;
  coordinates_json?: EntityCoordinates;
  status?: EntityStatus;
  is_objective_truth?: boolean;
}

// Entity update data
export interface EntityUpdateData {
  label?: string;
  value?: string;
  context_snippet?: string;
  coordinates_json?: EntityCoordinates;
  status?: EntityStatus;
  is_objective_truth?: boolean;
}

// Document update data
export interface DocumentUpdateData {
  filename?: string;
  status?: DocumentStatus;
  extracted_text?: string;
  metadata?: Partial<DocumentMetadata>;
}

// Filter options for documents
export interface DocumentFilterOptions {
  status?: DocumentStatus | DocumentStatus[];
  user_id?: string;
  search?: string; // For filename or extracted text search
  uploaded_after?: string;
  uploaded_before?: string;
  completed_after?: string;
  completed_before?: string;
}

// Filter options for entities
export interface EntityFilterOptions {
  document_id?: string;
  label?: string | string[];
  status?: EntityStatus | EntityStatus[];
  is_objective_truth?: boolean;
  search?: string; // For value or context search
  created_after?: string;
  created_before?: string;
}

// Statistics and analytics interfaces
export interface DocumentStatistics {
  total_documents: number;
  by_status: Record<DocumentStatus, number>;
  total_entities: number;
  avg_entities_per_document: number;
  processing_success_rate: number;
}

export interface EntityStatistics {
  total_entities: number;
  by_status: Record<EntityStatus, number>;
  by_label: Record<string, number>;
  objective_truth_count: number;
  objective_truth_percentage: number;
}

// Bulk operations interfaces
export interface BulkEntityUpdate {
  entity_ids: string[];
  updates: Partial<EntityUpdateData>;
}

export interface BulkEntityStatusChange {
  entity_ids: string[];
  status: EntityStatus;
  is_objective_truth?: boolean;
}

// Document processing result
export interface DocumentProcessingResult {
  document_id: string;
  success: boolean;
  extracted_text?: string;
  entities: Omit<EntityCreateData, 'document_id'>[];
  metadata: DocumentMetadata;
  error?: string;
}

// API response types
export interface DocumentsResponse {
  documents: Document[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface EntitiesResponse {
  entities: Entity[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// Search result types
export interface DocumentSearchResult extends Document {
  relevance_score?: number;
  matching_text_snippets?: string[];
}

export interface EntitySearchResult extends Entity {
  relevance_score?: number;
  document_filename?: string;
}

// Export all types for easy importing
export type {
  DocumentStatus,
  EntityStatus,
  DocumentMetadata,
  EntityCoordinates,
  Document,
  Entity,
  DocumentWithEntities,
  EntityWithDocument,
  DocumentUploadData,
  EntityCreateData,
  EntityUpdateData,
  DocumentUpdateData,
  DocumentFilterOptions,
  EntityFilterOptions,
  DocumentStatistics,
  EntityStatistics,
  BulkEntityUpdate,
  BulkEntityStatusChange,
  DocumentProcessingResult,
  DocumentsResponse,
  EntitiesResponse,
  DocumentSearchResult,
  EntitySearchResult,
};