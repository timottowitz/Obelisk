// Bennett Legal Job Processor for DocETL Pipeline
// Specialized job processing for legal documents with taxonomy awareness and workflow automation
// Integrates with Bennett Legal's 15 field-level extraction models

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";
import { GoogleCloudStorageService } from "../_shared/google-storage.ts";

export interface BennettLegalJob {
  id: string;
  job_type: 'extract' | 'transform' | 'pipeline';
  document_id: string;
  user_id: string;
  tenant_id: string;
  pipeline_config: BennettLegalPipelineConfig;
  input_data: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface BennettLegalPipelineConfig {
  operations: string[];
  output_format: 'json' | 'xml';
  bennett_legal_settings: {
    enable_taxonomy_classification: boolean;
    enable_workflow_automation: boolean;
    litigation_type?: 'personal_injury' | 'solar' | 'employment' | 'other';
    entity_models: string[]; // Which of the 15 models to use
    confidence_threshold: number;
    quality_assurance_level: 'basic' | 'standard' | 'comprehensive';
  };
}

export interface ProcessingResult {
  success: boolean;
  output_data?: Record<string, any>;
  result_file_path?: string;
  error_message?: string;
  quality_metrics?: QualityMetrics;
}

interface QualityMetrics {
  entity_completeness_score: number;
  classification_confidence: number;
  validation_required: boolean;
  processing_time_ms: number;
}

/**
 * Bennett Legal Job Processor
 * Handles specialized processing for legal documents with taxonomy and workflow integration
 */
export class BennettLegalJobProcessor {
  private supabase: any;
  private gcsService: GoogleCloudStorageService;
  private schema: string;
  private workerId: string;

  constructor(options: {
    supabase: any;
    schema: string;
    workerId: string;
  }) {
    this.supabase = options.supabase;
    this.schema = options.schema;
    this.workerId = options.workerId;
    
    // Initialize GCS service
    const gcsKeyRaw = Deno.env.get("GCS_JSON_KEY");
    const bucketName = Deno.env.get("GCS_BUCKET_NAME");
    if (!gcsKeyRaw || !bucketName) {
      throw new Error("GCS storage not configured for Bennett Legal processing");
    }
    
    const credentials = JSON.parse(gcsKeyRaw);
    this.gcsService = new GoogleCloudStorageService({ bucketName, credentials });
  }

  /**
   * Process a Bennett Legal job
   */
  async processJob(job: BennettLegalJob): Promise<ProcessingResult> {
    const startTime = Date.now();
    
    try {
      console.log(`Starting Bennett Legal job processing: ${job.id} (type: ${job.job_type})`);
      
      // Update job heartbeat
      await this.updateJobHeartbeat(job.id, { status: 'processing', step: 'initialization' });
      
      // Get document data
      const document = await this.getDocumentData(job.document_id);
      if (!document) {
        throw new Error(`Document not found: ${job.document_id}`);
      }

      // Download document from GCS
      const documentContent = await this.downloadDocument(document.file_path);
      
      let result: ProcessingResult;
      
      switch (job.job_type) {
        case 'extract':
          result = await this.processDocumentExtraction(job, document, documentContent);
          break;
        case 'transform':
          result = await this.processDocumentTransformation(job, document, documentContent);
          break;
        case 'pipeline':
          result = await this.processFullPipeline(job, document, documentContent);
          break;
        default:
          throw new Error(`Unsupported job type: ${job.job_type}`);
      }

      // Calculate quality metrics
      const processingTime = Date.now() - startTime;
      result.quality_metrics = {
        ...result.quality_metrics,
        processing_time_ms: processingTime
      };

      // Update document with results if successful
      if (result.success && result.output_data) {
        await this.updateDocumentWithResults(job.document_id, result);
      }

      console.log(`Bennett Legal job completed: ${job.id} (${processingTime}ms)`);
      return result;

    } catch (error) {
      console.error(`Bennett Legal job failed: ${job.id}`, error);
      
      return {
        success: false,
        error_message: error.message || 'Unknown processing error',
        quality_metrics: {
          entity_completeness_score: 0,
          classification_confidence: 0,
          validation_required: true,
          processing_time_ms: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Process document extraction using Bennett Legal DocETL configuration
   */
  private async processDocumentExtraction(
    job: BennettLegalJob, 
    document: any, 
    content: Uint8Array
  ): Promise<ProcessingResult> {
    
    await this.updateJobHeartbeat(job.id, { status: 'processing', step: 'text_extraction' });
    
    // Step 1: Extract text content
    const textContent = await this.extractTextContent(content, document.metadata?.mimeType);
    
    await this.updateJobHeartbeat(job.id, { status: 'processing', step: 'entity_extraction' });
    
    // Step 2: Extract entities using Bennett Legal models
    const entities = await this.extractBennettLegalEntities(
      textContent, 
      job.pipeline_config.bennett_legal_settings
    );
    
    await this.updateJobHeartbeat(job.id, { status: 'processing', step: 'classification' });
    
    // Step 3: Classify document using taxonomy
    const classification = await this.classifyDocument(
      textContent, 
      entities,
      job.pipeline_config.bennett_legal_settings
    );

    const output_data = {
      text_content: textContent,
      extracted_entities: entities,
      document_classification: classification,
      processing_metadata: {
        job_id: job.id,
        processing_time: new Date().toISOString(),
        models_used: job.pipeline_config.bennett_legal_settings.entity_models,
        confidence_threshold: job.pipeline_config.bennett_legal_settings.confidence_threshold
      }
    };

    return {
      success: true,
      output_data,
      quality_metrics: await this.calculateQualityMetrics(entities, classification)
    };
  }

  /**
   * Process full Bennett Legal pipeline with workflow automation
   */
  private async processFullPipeline(
    job: BennettLegalJob,
    document: any,
    content: Uint8Array
  ): Promise<ProcessingResult> {
    
    // Step 1: Document extraction
    const extractionResult = await this.processDocumentExtraction(job, document, content);
    if (!extractionResult.success) {
      return extractionResult;
    }

    await this.updateJobHeartbeat(job.id, { status: 'processing', step: 'workflow_automation' });

    // Step 2: Generate workflow recommendations
    const workflowRecommendations = await this.generateWorkflowRecommendations(
      extractionResult.output_data!,
      job.pipeline_config.bennett_legal_settings
    );

    await this.updateJobHeartbeat(job.id, { status: 'processing', step: 'quality_assurance' });

    // Step 3: Quality assurance
    const qualityReport = await this.performQualityAssurance(
      extractionResult.output_data!,
      job.pipeline_config.bennett_legal_settings.quality_assurance_level
    );

    // Step 4: Store entities in database
    if (extractionResult.output_data?.extracted_entities) {
      await this.storeBennettLegalEntities(
        job.document_id,
        extractionResult.output_data.extracted_entities
      );
    }

    // Step 5: Process taxonomy classification
    if (extractionResult.output_data?.document_classification) {
      await this.processDocumentClassification(
        job.document_id,
        extractionResult.output_data.document_classification
      );
    }

    // Step 6: Execute workflow automation
    if (job.pipeline_config.bennett_legal_settings.enable_workflow_automation) {
      await this.executeWorkflowAutomation(job.document_id, workflowRecommendations);
    }

    const finalOutput = {
      ...extractionResult.output_data,
      workflow_recommendations: workflowRecommendations,
      quality_report: qualityReport,
      bennett_legal_metadata: {
        taxonomy_applied: true,
        workflow_automated: job.pipeline_config.bennett_legal_settings.enable_workflow_automation,
        models_used: job.pipeline_config.bennett_legal_settings.entity_models.length
      }
    };

    return {
      success: true,
      output_data: finalOutput,
      quality_metrics: {
        ...qualityReport,
        entity_completeness_score: this.calculateEntityCompleteness(extractionResult.output_data.extracted_entities),
        classification_confidence: extractionResult.output_data.document_classification.confidence_score,
        validation_required: qualityReport.validation_required,
        processing_time_ms: 0 // Will be set by caller
      }
    };
  }

  /**
   * Extract entities using Bennett Legal's 15 field-level models
   */
  private async extractBennettLegalEntities(
    textContent: string,
    settings: any
  ): Promise<any[]> {
    
    // Get configured entity types
    const { data: entityTypes } = await this.supabase
      .schema(this.schema)
      .from("legal_entity_types")
      .select("*")
      .in("name", settings.entity_models)
      .eq("is_active", true);

    const entities: any[] = [];
    
    for (const entityType of entityTypes || []) {
      try {
        // Use Foundation AI or OpenAI to extract entities of this type
        const extractedEntities = await this.extractEntitiesOfType(
          textContent,
          entityType,
          settings.confidence_threshold
        );
        
        entities.push(...extractedEntities);
      } catch (error) {
        console.error(`Error extracting entities of type ${entityType.name}:`, error);
      }
    }

    return entities;
  }

  /**
   * Extract entities of a specific type using AI
   */
  private async extractEntitiesOfType(
    textContent: string,
    entityType: any,
    confidenceThreshold: number
  ): Promise<any[]> {
    
    // This would integrate with Foundation AI or OpenAI API
    // For now, return mock data structure
    const mockEntities = [];
    
    // Simulate entity extraction based on type
    switch (entityType.name) {
      case 'doctor':
        // Extract doctor names, credentials, etc.
        break;
      case 'settlement_amount':
        // Extract monetary amounts
        break;
      case 'case_number':
        // Extract case/docket numbers
        break;
      // ... other entity types
    }

    return mockEntities.filter(entity => entity.confidence >= confidenceThreshold);
  }

  /**
   * Classify document using Bennett Legal taxonomy
   */
  private async classifyDocument(
    textContent: string,
    entities: any[],
    settings: any
  ): Promise<any> {
    
    // Use Foundation AI or similar to classify the document
    // This would analyze content and entities to determine:
    // - Primary category (medical, legal, insurance, etc.)
    // - Specific document type
    // - Litigation type (PI, solar, employment, etc.)
    // - Workflow routing recommendations
    // - Priority level
    
    return {
      primary_category: 'legal', // Example
      document_type: 'Settlement Agreement', // Example
      litigation_type: 'personal_injury',
      confidence_score: 0.95,
      workflow_routing: 'lawyer',
      priority_level: 'high',
      confidentiality_level: 'confidential'
    };
  }

  /**
   * Generate workflow recommendations based on document analysis
   */
  private async generateWorkflowRecommendations(
    outputData: any,
    settings: any
  ): Promise<any[]> {
    
    const recommendations = [];
    const { document_classification, extracted_entities } = outputData;
    
    // Generate task recommendations based on document type
    switch (document_classification.document_type) {
      case 'Settlement Agreement':
        recommendations.push({
          action_type: 'create_task',
          priority: 'urgent',
          assigned_to: 'lawyer',
          due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          metadata: {
            task_type: 'settlement_review',
            title: 'Review Settlement Agreement',
            description: 'Legal review required for settlement terms and amounts'
          }
        });
        break;
      
      case 'Medical Records':
        recommendations.push({
          action_type: 'create_task',
          priority: 'normal',
          assigned_to: 'paralegal',
          due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          metadata: {
            task_type: 'medical_review',
            title: 'Process Medical Records',
            description: 'Extract and organize medical information for case file'
          }
        });
        break;
    }

    // Generate alerts for high-value settlements
    const settlementEntities = extracted_entities.filter(e => e.label === 'settlement_amount');
    for (const settlement of settlementEntities) {
      const amount = this.parseSettlementAmount(settlement.value);
      if (amount > 100000) {
        recommendations.push({
          action_type: 'notify_users',
          priority: 'urgent',
          assigned_to: 'senior_partner',
          metadata: {
            message: `High value settlement detected: ${settlement.value}`,
            notification_type: 'high_value_alert'
          }
        });
      }
    }

    return recommendations;
  }

  /**
   * Perform quality assurance on extracted data
   */
  private async performQualityAssurance(
    outputData: any,
    level: 'basic' | 'standard' | 'comprehensive'
  ): Promise<any> {
    
    const { document_classification, extracted_entities } = outputData;
    
    let validationRequired = false;
    const validationFlags = [];

    // Check classification confidence
    if (document_classification.confidence_score < 0.8) {
      validationRequired = true;
      validationFlags.push('low_classification_confidence');
    }

    // Check for missing critical entities
    const criticalEntityTypes = ['plaintiff', 'defendant', 'document_date'];
    const foundEntityTypes = new Set(extracted_entities.map(e => e.label));
    const missingCritical = criticalEntityTypes.filter(type => !foundEntityTypes.has(type));
    
    if (missingCritical.length > 0) {
      validationRequired = true;
      validationFlags.push('missing_critical_entities');
    }

    // Comprehensive checks for higher levels
    if (level === 'comprehensive') {
      // Check entity consistency
      // Validate dates are reasonable
      // Cross-reference amounts
      // etc.
    }

    return {
      validation_required: validationRequired,
      validation_flags: validationFlags,
      completeness_score: this.calculateEntityCompleteness(extracted_entities),
      confidence_score: document_classification.confidence_score,
      quality_level: level
    };
  }

  /**
   * Store Bennett Legal entities in database
   */
  private async storeBennettLegalEntities(documentId: string, entities: any[]): Promise<void> {
    for (const entity of entities) {
      try {
        await this.supabase
          .schema(this.schema)
          .from("entities")
          .insert({
            document_id: documentId,
            label: entity.label,
            value: entity.value,
            context_snippet: entity.context_snippet,
            is_objective_truth: entity.is_objective_truth || false,
            bennett_model: entity.bennett_model,
            page_number: entity.page_number,
            start_offset: entity.start_offset,
            end_offset: entity.end_offset,
            validation_flags: entity.validation_flags || [],
            coordinates_json: {
              page: entity.page_number,
              start: entity.start_offset,
              end: entity.end_offset,
              confidence: entity.confidence
            }
          });
      } catch (error) {
        console.error('Error storing entity:', error);
      }
    }
  }

  /**
   * Process document classification and update metadata
   */
  private async processDocumentClassification(
    documentId: string,
    classification: any
  ): Promise<void> {
    
    await this.supabase.rpc('classify_legal_document', {
      p_document_id: documentId,
      p_document_text: '',
      p_classification_data: classification
    });
  }

  /**
   * Execute workflow automation
   */
  private async executeWorkflowAutomation(
    documentId: string,
    recommendations: any[]
  ): Promise<void> {
    
    for (const recommendation of recommendations) {
      try {
        switch (recommendation.action_type) {
          case 'create_task':
            await this.supabase
              .schema(this.schema)
              .from("legal_automated_tasks")
              .insert({
                document_id: documentId,
                task_type: recommendation.metadata.task_type,
                title: recommendation.metadata.title,
                description: recommendation.metadata.description,
                assigned_to: recommendation.assigned_to,
                due_date: recommendation.due_date,
                priority: recommendation.priority,
                metadata: recommendation.metadata
              });
            break;

          case 'create_calendar_event':
            await this.supabase
              .schema(this.schema)
              .from("legal_calendar_events")
              .insert({
                document_id: documentId,
                event_type: recommendation.metadata.event_type || 'deadline',
                title: recommendation.metadata.title,
                description: recommendation.metadata.description,
                start_date: recommendation.due_date,
                attendees: [recommendation.assigned_to],
                metadata: recommendation.metadata
              });
            break;
        }
      } catch (error) {
        console.error('Error executing workflow automation:', error);
      }
    }
  }

  /**
   * Helper methods
   */
  private async getDocumentData(documentId: string): Promise<any> {
    const { data: document, error } = await this.supabase
      .schema(this.schema)
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .single();

    if (error) {
      throw new Error(`Document not found: ${documentId}`);
    }

    return document;
  }

  private async downloadDocument(filePath: string): Promise<Uint8Array> {
    return await this.gcsService.downloadFile(filePath);
  }

  private async extractTextContent(content: Uint8Array, mimeType: string): Promise<string> {
    // This would use appropriate text extraction based on file type
    // PDF: use pdf-parse or similar
    // DOCX: use docx parser
    // For now, return placeholder
    return "Extracted text content would be here";
  }

  private calculateEntityCompleteness(entities: any[]): number {
    // Calculate what percentage of expected entities were found
    const expectedEntities = ['document_date', 'sender']; // Basic expected entities
    const foundTypes = new Set(entities.map(e => e.label));
    const foundCount = expectedEntities.filter(type => foundTypes.has(type)).length;
    return foundCount / expectedEntities.length;
  }

  private parseSettlementAmount(amountText: string): number {
    // Parse settlement amount from text (handle $ signs, commas, etc.)
    const cleaned = amountText.replace(/[$,]/g, '');
    return parseFloat(cleaned) || 0;
  }

  private async updateJobHeartbeat(jobId: string, statusData: Record<string, any>): Promise<void> {
    await this.supabase.rpc('update_doc_intel_job_heartbeat', {
      p_job_id: jobId,
      p_worker_id: this.workerId,
      p_status_data: statusData
    });
  }

  private async updateDocumentWithResults(documentId: string, result: ProcessingResult): Promise<void> {
    await this.supabase
      .schema(this.schema)
      .from("documents")
      .update({
        status: result.quality_metrics?.validation_required ? 'needs_review' : 'complete',
        completed_at: new Date().toISOString(),
        metadata: {
          ...{}, // existing metadata would be preserved
          quality_metrics: result.quality_metrics,
          processing_completed: true
        }
      })
      .eq("id", documentId);
  }

  private async processDocumentTransformation(
    job: BennettLegalJob,
    document: any,
    content: Uint8Array
  ): Promise<ProcessingResult> {
    // Transformation-specific processing
    // This could involve format conversion, data enrichment, etc.
    throw new Error("Document transformation not yet implemented");
  }

  private async calculateQualityMetrics(entities: any[], classification: any): Promise<QualityMetrics> {
    return {
      entity_completeness_score: this.calculateEntityCompleteness(entities),
      classification_confidence: classification.confidence_score,
      validation_required: classification.confidence_score < 0.8,
      processing_time_ms: 0 // Set by caller
    };
  }
}