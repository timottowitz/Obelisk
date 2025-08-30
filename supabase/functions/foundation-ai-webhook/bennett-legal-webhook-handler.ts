// Bennett Legal Foundation AI Webhook Handler
// Specialized webhook processing for Bennett Legal's taxonomy and workflow requirements
// Handles PI and Solar litigation document processing with 15 field-level extraction models

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";

interface BennettLegalWebhookPayload {
  event: "document.processed" | "entities.extracted" | "taxonomy.classified";
  organizationId: string;
  documentId: string;
  data: {
    taxonomy_classification?: TaxonomyClassification;
    extracted_entities?: BennettLegalEntity[];
    workflow_recommendations?: WorkflowRecommendation[];
    quality_metrics?: QualityMetrics;
    timestamp: string;
  };
  signature: string;
}

interface TaxonomyClassification {
  primary_category: string;
  document_type: string;
  litigation_type: 'personal_injury' | 'solar' | 'employment' | 'other';
  confidence_score: number;
  workflow_routing: 'paralegal' | 'lawyer' | 'specialist';
  priority_level: 'urgent' | 'high' | 'normal' | 'low';
  confidentiality_level: 'public' | 'confidential' | 'privileged' | 'work_product';
}

interface BennettLegalEntity {
  label: string;
  value: string;
  context_snippet: string;
  page_number: number;
  start_offset: number;
  end_offset: number;
  confidence: number;
  is_objective_truth: boolean;
  bennett_model: string;
  validation_flags: string[];
  entity_relationships: EntityRelationship[];
}

interface EntityRelationship {
  related_entity_id: string;
  relationship_type: string;
  confidence: number;
}

interface WorkflowRecommendation {
  action_type: 'create_task' | 'create_calendar_event' | 'notify_users' | 'case_linking';
  priority: 'urgent' | 'high' | 'normal' | 'low';
  assigned_to: string;
  due_date?: string;
  metadata: Record<string, any>;
}

interface QualityMetrics {
  entity_completeness_score: number;
  classification_confidence: number;
  validation_required: boolean;
  critical_entities_found: string[];
  missing_entities: string[];
}

/**
 * Enhanced webhook handler for Bennett Legal Foundation AI integration
 * Processes legal documents with specialized taxonomy and workflow automation
 */
export class BennettLegalWebhookHandler {
  private supabase: any;

  constructor() {
    this.supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
  }

  /**
   * Process Bennett Legal webhook payload
   */
  async processWebhook(payload: BennettLegalWebhookPayload) {
    console.log(`Processing Bennett Legal webhook: ${payload.event} for document ${payload.documentId}`);

    // Get organization schema
    const { schema, error: orgError } = await this.getOrganizationSchema(payload.organizationId);
    if (orgError) {
      throw new Error(`Organization not found: ${orgError}`);
    }

    switch (payload.event) {
      case "document.processed":
        return await this.handleDocumentProcessed(payload, schema);
      case "entities.extracted":
        return await this.handleEntitiesExtracted(payload, schema);
      case "taxonomy.classified":
        return await this.handleTaxonomyClassified(payload, schema);
      default:
        throw new Error(`Unknown Bennett Legal event type: ${payload.event}`);
    }
  }

  /**
   * Handle complete document processing with taxonomy classification and entity extraction
   */
  async handleDocumentProcessed(payload: BennettLegalWebhookPayload, schema: string) {
    const { documentId, data } = payload;
    
    // Validate document exists
    const { data: document, error: docError } = await this.supabase
      .schema(schema)
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .single();

    if (docError || !document) {
      throw new Error(`Document not found: ${documentId}`);
    }

    try {
      // Start transaction for atomic processing
      const results = await this.supabase.rpc('begin_transaction');
      
      let processedItems = {
        taxonomy_classified: false,
        entities_extracted: 0,
        tasks_created: 0,
        events_created: 0
      };

      // 1. Process taxonomy classification
      if (data.taxonomy_classification) {
        await this.processDocumentClassification(documentId, data.taxonomy_classification, schema);
        processedItems.taxonomy_classified = true;
      }

      // 2. Process extracted entities with Bennett Legal models
      if (data.extracted_entities) {
        processedItems.entities_extracted = await this.processBennettLegalEntities(
          documentId, 
          data.extracted_entities, 
          schema
        );
      }

      // 3. Process workflow recommendations
      if (data.workflow_recommendations) {
        const workflowResults = await this.processWorkflowRecommendations(
          documentId, 
          data.workflow_recommendations, 
          schema
        );
        processedItems.tasks_created = workflowResults.tasks_created;
        processedItems.events_created = workflowResults.events_created;
      }

      // 4. Update quality metrics
      if (data.quality_metrics) {
        await this.updateQualityMetrics(documentId, data.quality_metrics, schema);
      }

      // 5. Update document status
      await this.supabase
        .schema(schema)
        .from("documents")
        .update({
          status: data.quality_metrics?.validation_required ? 'needs_review' : 'complete',
          completed_at: new Date().toISOString()
        })
        .eq("id", documentId);

      // 6. Trigger workflow rule processing
      const rulesProcessed = await this.supabase.rpc('process_workflow_rules', {
        p_document_id: documentId,
        p_entities: { entities: data.extracted_entities || [] }
      });

      await this.supabase.rpc('commit_transaction');

      console.log(`Bennett Legal document processing completed for ${documentId}:`, processedItems);

      return {
        success: true,
        document_id: documentId,
        processed_items: processedItems,
        workflow_rules_processed: rulesProcessed,
        validation_required: data.quality_metrics?.validation_required || false
      };

    } catch (error) {
      await this.supabase.rpc('rollback_transaction');
      console.error('Bennett Legal document processing failed:', error);
      throw error;
    }
  }

  /**
   * Handle entity extraction results
   */
  async handleEntitiesExtracted(payload: BennettLegalWebhookPayload, schema: string) {
    const { documentId, data } = payload;
    
    if (!data.extracted_entities) {
      throw new Error("No entities data provided");
    }

    const entitiesProcessed = await this.processBennettLegalEntities(
      documentId,
      data.extracted_entities,
      schema
    );

    return {
      success: true,
      document_id: documentId,
      entities_processed: entitiesProcessed
    };
  }

  /**
   * Handle taxonomy classification results
   */
  async handleTaxonomyClassified(payload: BennettLegalWebhookPayload, schema: string) {
    const { documentId, data } = payload;
    
    if (!data.taxonomy_classification) {
      throw new Error("No taxonomy classification data provided");
    }

    await this.processDocumentClassification(
      documentId,
      data.taxonomy_classification,
      schema
    );

    return {
      success: true,
      document_id: documentId,
      taxonomy_classified: true
    };
  }

  /**
   * Process document classification using Bennett Legal taxonomy
   */
  private async processDocumentClassification(
    documentId: string, 
    classification: TaxonomyClassification, 
    schema: string
  ) {
    // Find matching taxonomy
    const { data: taxonomy, error: taxonomyError } = await this.supabase
      .schema(schema)
      .from("legal_document_taxonomy")
      .select("*")
      .eq("category", classification.primary_category)
      .eq("document_type", classification.document_type)
      .eq("is_active", true)
      .single();

    if (taxonomyError) {
      console.warn(`Taxonomy not found for ${classification.primary_category}/${classification.document_type}, creating new entry`);
      
      // Create new taxonomy entry if it doesn't exist
      const { data: newTaxonomy } = await this.supabase
        .schema(schema)
        .from("legal_document_taxonomy")
        .insert({
          category: classification.primary_category,
          document_type: classification.document_type,
          litigation_type: classification.litigation_type,
          workflow_routing: classification.workflow_routing,
          priority_level: classification.priority_level
        })
        .select()
        .single();
      
      if (newTaxonomy) {
        taxonomy = newTaxonomy;
      }
    }

    // Create or update legal document metadata
    const { error: metadataError } = await this.supabase
      .schema(schema)
      .from("legal_document_metadata")
      .insert({
        document_id: documentId,
        taxonomy_id: taxonomy?.id,
        classification_confidence: classification.confidence_score,
        litigation_type: classification.litigation_type,
        confidentiality_level: classification.confidentiality_level,
        workflow_status: 'pending'
      })
      .on_conflict('document_id')
      .merge();

    if (metadataError) {
      console.error('Error creating document metadata:', metadataError);
      throw metadataError;
    }

    // Use the classification function
    await this.supabase.rpc('classify_legal_document', {
      p_document_id: documentId,
      p_document_text: '', // Text already processed
      p_classification_data: classification
    });
  }

  /**
   * Process entities using Bennett Legal's 15 field-level models
   */
  private async processBennettLegalEntities(
    documentId: string,
    entities: BennettLegalEntity[],
    schema: string
  ): Promise<number> {
    let processedCount = 0;

    // Get legal entity types mapping
    const { data: entityTypes, error: typesError } = await this.supabase
      .schema(schema)
      .from("legal_entity_types")
      .select("*")
      .eq("is_active", true);

    if (typesError) {
      console.error('Error fetching legal entity types:', typesError);
      throw typesError;
    }

    const entityTypeMap = new Map(
      entityTypes.map(type => [type.name, type])
    );

    for (const entity of entities) {
      try {
        const entityType = entityTypeMap.get(entity.label);
        
        // Insert entity
        const { data: insertedEntity, error: entityError } = await this.supabase
          .schema(schema)
          .from("entities")
          .insert({
            document_id: documentId,
            label: entity.label,
            value: entity.value,
            context_snippet: entity.context_snippet,
            is_objective_truth: entity.is_objective_truth,
            entity_type_id: entityType?.id,
            bennett_model: entity.bennett_model,
            page_number: entity.page_number,
            start_offset: entity.start_offset,
            end_offset: entity.end_offset,
            validation_flags: entity.validation_flags,
            coordinates_json: {
              page: entity.page_number,
              start: entity.start_offset,
              end: entity.end_offset,
              confidence: entity.confidence
            }
          })
          .select()
          .single();

        if (entityError) {
          console.error('Error inserting entity:', entityError);
          continue;
        }

        // Process entity relationships
        if (entity.entity_relationships && entity.entity_relationships.length > 0) {
          await this.processEntityRelationships(
            insertedEntity.id,
            entity.entity_relationships,
            schema
          );
        }

        processedCount++;

      } catch (error) {
        console.error(`Error processing entity ${entity.label}:`, error);
      }
    }

    return processedCount;
  }

  /**
   * Process entity relationships
   */
  private async processEntityRelationships(
    primaryEntityId: string,
    relationships: EntityRelationship[],
    schema: string
  ) {
    for (const relationship of relationships) {
      try {
        await this.supabase
          .schema(schema)
          .from("legal_entity_relationships")
          .insert({
            primary_entity_id: primaryEntityId,
            related_entity_id: relationship.related_entity_id,
            relationship_type: relationship.relationship_type,
            confidence: relationship.confidence
          })
          .on_conflict('primary_entity_id,related_entity_id,relationship_type')
          .ignore();
      } catch (error) {
        console.error('Error creating entity relationship:', error);
      }
    }
  }

  /**
   * Process workflow recommendations
   */
  private async processWorkflowRecommendations(
    documentId: string,
    recommendations: WorkflowRecommendation[],
    schema: string
  ): Promise<{ tasks_created: number; events_created: number }> {
    let tasksCreated = 0;
    let eventsCreated = 0;

    for (const recommendation of recommendations) {
      try {
        switch (recommendation.action_type) {
          case 'create_task':
            await this.createAutomatedTask(documentId, recommendation, schema);
            tasksCreated++;
            break;
          case 'create_calendar_event':
            await this.createCalendarEvent(documentId, recommendation, schema);
            eventsCreated++;
            break;
          case 'notify_users':
            await this.sendUserNotifications(documentId, recommendation, schema);
            break;
          case 'case_linking':
            await this.processCaseLinking(documentId, recommendation, schema);
            break;
        }
      } catch (error) {
        console.error(`Error processing workflow recommendation ${recommendation.action_type}:`, error);
      }
    }

    return { tasks_created: tasksCreated, events_created: eventsCreated };
  }

  /**
   * Create automated task from workflow recommendation
   */
  private async createAutomatedTask(
    documentId: string,
    recommendation: WorkflowRecommendation,
    schema: string
  ) {
    const { error } = await this.supabase
      .schema(schema)
      .from("legal_automated_tasks")
      .insert({
        document_id: documentId,
        task_type: recommendation.metadata.task_type || 'document_review',
        title: recommendation.metadata.title || 'Automated Legal Task',
        description: recommendation.metadata.description,
        assigned_to: recommendation.assigned_to,
        due_date: recommendation.due_date,
        priority: recommendation.priority,
        metadata: recommendation.metadata
      });

    if (error) {
      throw error;
    }
  }

  /**
   * Create calendar event from workflow recommendation
   */
  private async createCalendarEvent(
    documentId: string,
    recommendation: WorkflowRecommendation,
    schema: string
  ) {
    const { error } = await this.supabase
      .schema(schema)
      .from("legal_calendar_events")
      .insert({
        document_id: documentId,
        event_type: recommendation.metadata.event_type || 'deadline',
        title: recommendation.metadata.title || 'Legal Deadline',
        description: recommendation.metadata.description,
        start_date: recommendation.due_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        attendees: [recommendation.assigned_to],
        metadata: recommendation.metadata
      });

    if (error) {
      throw error;
    }
  }

  /**
   * Send user notifications
   */
  private async sendUserNotifications(
    documentId: string,
    recommendation: WorkflowRecommendation,
    schema: string
  ) {
    // Log notification for now - in production this would integrate with email/Slack
    console.log(`Notification for document ${documentId}:`, {
      assigned_to: recommendation.assigned_to,
      priority: recommendation.priority,
      message: recommendation.metadata.message || 'Legal document requires attention'
    });
  }

  /**
   * Process case linking suggestions
   */
  private async processCaseLinking(
    documentId: string,
    recommendation: WorkflowRecommendation,
    schema: string
  ) {
    // Update document metadata with case linking suggestions
    const { error } = await this.supabase
      .schema(schema)
      .from("legal_document_metadata")
      .update({
        case_link_suggestions: recommendation.metadata.suggested_cases || []
      })
      .eq("document_id", documentId);

    if (error) {
      console.error('Error updating case link suggestions:', error);
    }
  }

  /**
   * Update quality metrics for the document
   */
  private async updateQualityMetrics(
    documentId: string,
    metrics: QualityMetrics,
    schema: string
  ) {
    const { error } = await this.supabase
      .schema(schema)
      .from("legal_document_metadata")
      .update({
        entity_completeness_score: metrics.entity_completeness_score,
        validation_required: metrics.validation_required,
        validation_notes: JSON.stringify({
          critical_entities_found: metrics.critical_entities_found,
          missing_entities: metrics.missing_entities,
          classification_confidence: metrics.classification_confidence
        })
      })
      .eq("document_id", documentId);

    if (error) {
      console.error('Error updating quality metrics:', error);
      throw error;
    }
  }

  /**
   * Get organization schema for tenant isolation
   */
  private async getOrganizationSchema(organizationId: string): Promise<{ schema?: string; error?: string }> {
    try {
      const { data: org, error: orgError } = await this.supabase
        .schema("private")
        .from("organizations")
        .select("schema_name")
        .eq("clerk_organization_id", organizationId)
        .single();

      if (orgError || !org) {
        return { error: "Organization not found" };
      }

      return { schema: org.schema_name.toLowerCase() };
    } catch (error) {
      return { error: "Failed to get organization schema" };
    }
  }

  /**
   * Enhanced signature verification for Bennett Legal
   */
  async verifyBennettLegalSignature(payload: string, signature: string): Promise<boolean> {
    const secret = Deno.env.get("BENNETT_LEGAL_WEBHOOK_SECRET") || Deno.env.get("FOUNDATION_AI_WEBHOOK_SECRET");
    if (!secret) {
      console.warn("No Bennett Legal webhook secret configured");
      return false;
    }

    try {
      const expectedSignature = await this.generateHMACSignature(payload, secret);
      return signature === expectedSignature;
    } catch (error) {
      console.error("Error verifying Bennett Legal signature:", error);
      return false;
    }
  }

  /**
   * Generate HMAC signature for verification
   */
  private async generateHMACSignature(payload: string, secret: string): Promise<string> {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const signature = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
    const hashArray = Array.from(new Uint8Array(signature));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  }
}