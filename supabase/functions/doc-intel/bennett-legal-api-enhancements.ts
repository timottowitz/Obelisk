// Bennett Legal API Enhancements for Doc Intel System
// Extends the existing Doc Intel API with taxonomy-aware processing and workflow automation

import { Hono } from "jsr:@hono/hono";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";

/**
 * Bennett Legal API Extensions
 * Adds specialized endpoints for legal document processing with taxonomy awareness
 */
export function createBennettLegalRoutes(app: Hono) {
  
  // GET /bennett-legal/taxonomy - Get available document taxonomy
  app.get("/bennett-legal/taxonomy", async (c) => {
    try {
      const orgId = c.get("orgId");
      const userId = c.get("userId");
      
      const supabase = getSupabaseClient();
      const { user, schema } = await getOrganizationInfo(supabase, orgId, userId);

      // Parse query parameters
      const url = new URL(c.req.url);
      const category = url.searchParams.get("category");
      const litigationType = url.searchParams.get("litigation_type");
      const workflowRouting = url.searchParams.get("workflow_routing");

      // Build taxonomy query
      let query = supabase
        .schema(schema)
        .from("legal_document_taxonomy")
        .select(`
          *,
          legal_workflow_rules!taxonomy_id (
            id, rule_name, trigger_conditions, actions, is_active
          )
        `)
        .eq("is_active", true);

      // Apply filters
      if (category) query = query.eq("category", category);
      if (litigationType) query = query.eq("litigation_type", litigationType);
      if (workflowRouting) query = query.eq("workflow_routing", workflowRouting);

      const { data: taxonomy, error } = await query.order("category", { ascending: true });

      if (error) {
        console.error("Error fetching taxonomy:", error);
        return c.json({ error: "Failed to fetch taxonomy" }, 500);
      }

      // Group by category for easier consumption
      const groupedTaxonomy = (taxonomy || []).reduce((acc: any, item: any) => {
        if (!acc[item.category]) {
          acc[item.category] = [];
        }
        acc[item.category].push(item);
        return acc;
      }, {});

      return c.json({
        success: true,
        taxonomy: groupedTaxonomy,
        total_types: taxonomy?.length || 0,
        categories: Object.keys(groupedTaxonomy)
      });

    } catch (error: any) {
      console.error("Error in Bennett Legal taxonomy endpoint:", error);
      return c.json({ 
        success: false,
        error: "Failed to fetch taxonomy data",
        code: "TAXONOMY_FETCH_ERROR"
      }, 500);
    }
  });

  // GET /bennett-legal/entity-types - Get Bennett Legal entity types (15 models)
  app.get("/bennett-legal/entity-types", async (c) => {
    try {
      const orgId = c.get("orgId");
      const userId = c.get("userId");
      
      const supabase = getSupabaseClient();
      const { user, schema } = await getOrganizationInfo(supabase, orgId, userId);

      const { data: entityTypes, error } = await supabase
        .schema(schema)
        .from("legal_entity_types")
        .select("*")
        .eq("is_active", true)
        .order("category", { ascending: true });

      if (error) {
        console.error("Error fetching entity types:", error);
        return c.json({ error: "Failed to fetch entity types" }, 500);
      }

      // Group by category
      const groupedTypes = (entityTypes || []).reduce((acc: any, type: any) => {
        if (!acc[type.category]) {
          acc[type.category] = [];
        }
        acc[type.category].push(type);
        return acc;
      }, {});

      return c.json({
        success: true,
        entity_types: groupedTypes,
        total_types: entityTypes?.length || 0,
        bennett_models: entityTypes?.filter(t => t.bennett_model_id).length || 0
      });

    } catch (error: any) {
      console.error("Error in entity types endpoint:", error);
      return c.json({ 
        success: false,
        error: "Failed to fetch entity types",
        code: "ENTITY_TYPES_FETCH_ERROR"
      }, 500);
    }
  });

  // POST /bennett-legal/classify - Classify document using Bennett Legal taxonomy
  app.post("/bennett-legal/classify", async (c) => {
    try {
      const orgId = c.get("orgId");
      const userId = c.get("userId");
      
      const supabase = getSupabaseClient();
      const { user, schema } = await getOrganizationInfo(supabase, orgId, userId);

      // Parse request body
      const body = await c.req.json();
      const { document_id, document_text, classification_override } = body;

      if (!document_id) {
        return c.json({
          success: false,
          error: "document_id is required",
          code: "MISSING_DOCUMENT_ID"
        }, 400);
      }

      // Verify document exists and belongs to user
      const { data: document, error: docError } = await supabase
        .schema(schema)
        .from("documents")
        .select("*")
        .eq("id", document_id)
        .eq("user_id", user.id)
        .single();

      if (docError || !document) {
        return c.json({ error: "Document not found" }, 404);
      }

      let classificationData;

      if (classification_override) {
        // Use provided classification
        classificationData = classification_override;
      } else if (document_text) {
        // Perform AI classification (placeholder for actual AI integration)
        classificationData = await performAIClassification(document_text);
      } else {
        return c.json({
          success: false,
          error: "Either document_text or classification_override is required",
          code: "MISSING_CLASSIFICATION_DATA"
        }, 400);
      }

      // Apply classification using the database function
      const { data: taxonomyId, error: classifyError } = await supabase
        .rpc('classify_legal_document', {
          p_document_id: document_id,
          p_document_text: document_text || '',
          p_classification_data: classificationData
        });

      if (classifyError) {
        console.error("Classification error:", classifyError);
        return c.json({ error: "Failed to classify document" }, 500);
      }

      // Get the updated metadata
      const { data: metadata, error: metaError } = await supabase
        .schema(schema)
        .from("legal_document_metadata")
        .select(`
          *,
          legal_document_taxonomy (*)
        `)
        .eq("document_id", document_id)
        .single();

      if (metaError) {
        console.error("Metadata fetch error:", metaError);
        return c.json({ error: "Failed to fetch updated metadata" }, 500);
      }

      return c.json({
        success: true,
        document_id,
        taxonomy_id: taxonomyId,
        classification: classificationData,
        metadata
      });

    } catch (error: any) {
      console.error("Error in classification endpoint:", error);
      return c.json({ 
        success: false,
        error: "Failed to classify document",
        code: "CLASSIFICATION_ERROR"
      }, 500);
    }
  });

  // GET /bennett-legal/workflow-status/:document_id - Get document workflow status
  app.get("/bennett-legal/workflow-status/:document_id", async (c) => {
    try {
      const orgId = c.get("orgId");
      const userId = c.get("userId");
      const documentId = c.req.param("document_id");
      
      const supabase = getSupabaseClient();
      const { user, schema } = await getOrganizationInfo(supabase, orgId, userId);

      // Get workflow status using database function
      const { data: workflowStatus, error } = await supabase
        .rpc('get_document_workflow_status', {
          p_document_id: documentId
        });

      if (error) {
        console.error("Workflow status error:", error);
        return c.json({ error: "Failed to fetch workflow status" }, 500);
      }

      if (!workflowStatus || workflowStatus.length === 0) {
        return c.json({ error: "Document not found or no workflow data" }, 404);
      }

      const status = workflowStatus[0];

      // Get associated tasks and calendar events
      const [tasksResult, eventsResult] = await Promise.all([
        supabase
          .schema(schema)
          .from("legal_automated_tasks")
          .select("*")
          .eq("document_id", documentId)
          .order("created_at", { ascending: false }),
        
        supabase
          .schema(schema)
          .from("legal_calendar_events")
          .select("*")
          .eq("document_id", documentId)
          .order("start_date", { ascending: true })
      ]);

      return c.json({
        success: true,
        document_id: documentId,
        workflow_status: status,
        automated_tasks: tasksResult.data || [],
        calendar_events: eventsResult.data || [],
        summary: {
          total_tasks: tasksResult.data?.length || 0,
          pending_tasks: status.pending_tasks || 0,
          overdue_tasks: status.overdue_tasks || 0,
          completion_percentage: status.completion_percentage || 0,
          upcoming_events: eventsResult.data?.length || 0
        }
      });

    } catch (error: any) {
      console.error("Error in workflow status endpoint:", error);
      return c.json({ 
        success: false,
        error: "Failed to fetch workflow status",
        code: "WORKFLOW_STATUS_ERROR"
      }, 500);
    }
  });

  // POST /bennett-legal/tasks - Create automated task
  app.post("/bennett-legal/tasks", async (c) => {
    try {
      const orgId = c.get("orgId");
      const userId = c.get("userId");
      
      const supabase = getSupabaseClient();
      const { user, schema } = await getOrganizationInfo(supabase, orgId, userId);

      const body = await c.req.json();
      const {
        document_id,
        task_type,
        title,
        description,
        assigned_to,
        due_date,
        priority = 'normal',
        metadata = {}
      } = body;

      if (!document_id || !task_type || !title) {
        return c.json({
          success: false,
          error: "document_id, task_type, and title are required",
          code: "MISSING_REQUIRED_FIELDS"
        }, 400);
      }

      // Verify document exists
      const { data: document, error: docError } = await supabase
        .schema(schema)
        .from("documents")
        .select("id")
        .eq("id", document_id)
        .eq("user_id", user.id)
        .single();

      if (docError || !document) {
        return c.json({ error: "Document not found" }, 404);
      }

      // Create task
      const { data: task, error: taskError } = await supabase
        .schema(schema)
        .from("legal_automated_tasks")
        .insert({
          document_id,
          task_type,
          title,
          description,
          assigned_to,
          due_date,
          priority,
          metadata
        })
        .select()
        .single();

      if (taskError) {
        console.error("Task creation error:", taskError);
        return c.json({ error: "Failed to create task" }, 500);
      }

      return c.json({
        success: true,
        task
      });

    } catch (error: any) {
      console.error("Error in task creation endpoint:", error);
      return c.json({ 
        success: false,
        error: "Failed to create task",
        code: "TASK_CREATION_ERROR"
      }, 500);
    }
  });

  // PUT /bennett-legal/tasks/:task_id - Update task status
  app.put("/bennett-legal/tasks/:task_id", async (c) => {
    try {
      const orgId = c.get("orgId");
      const userId = c.get("userId");
      const taskId = c.req.param("task_id");
      
      const supabase = getSupabaseClient();
      const { user, schema } = await getOrganizationInfo(supabase, orgId, userId);

      const body = await c.req.json();
      const { status, completion_notes, assigned_to, due_date } = body;

      // Verify task exists and user has access
      const { data: existingTask, error: taskError } = await supabase
        .schema(schema)
        .from("legal_automated_tasks")
        .select(`
          *,
          documents!inner(user_id)
        `)
        .eq("id", taskId)
        .eq("documents.user_id", user.id)
        .single();

      if (taskError || !existingTask) {
        return c.json({ error: "Task not found" }, 404);
      }

      // Build update object
      const updateData: any = { updated_at: new Date().toISOString() };
      
      if (status) {
        updateData.status = status;
        if (status === 'completed') {
          updateData.completed_at = new Date().toISOString();
          updateData.completed_by = user.id;
        }
      }
      if (completion_notes) updateData.completion_notes = completion_notes;
      if (assigned_to) updateData.assigned_to = assigned_to;
      if (due_date) updateData.due_date = due_date;

      // Update task
      const { data: updatedTask, error: updateError } = await supabase
        .schema(schema)
        .from("legal_automated_tasks")
        .update(updateData)
        .eq("id", taskId)
        .select()
        .single();

      if (updateError) {
        console.error("Task update error:", updateError);
        return c.json({ error: "Failed to update task" }, 500);
      }

      return c.json({
        success: true,
        task: updatedTask
      });

    } catch (error: any) {
      console.error("Error in task update endpoint:", error);
      return c.json({ 
        success: false,
        error: "Failed to update task",
        code: "TASK_UPDATE_ERROR"
      }, 500);
    }
  });

  // GET /bennett-legal/analytics - Get analytics for legal document processing
  app.get("/bennett-legal/analytics", async (c) => {
    try {
      const orgId = c.get("orgId");
      const userId = c.get("userId");
      
      const supabase = getSupabaseClient();
      const { user, schema } = await getOrganizationInfo(supabase, orgId, userId);

      const url = new URL(c.req.url);
      const days = parseInt(url.searchParams.get("days") || "30");
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));

      // Get document processing statistics
      const [documentsResult, tasksResult, entityResult] = await Promise.all([
        // Document statistics
        supabase
          .schema(schema)
          .from("legal_document_metadata")
          .select(`
            litigation_type,
            workflow_status,
            classification_confidence,
            entity_completeness_score,
            validation_required,
            created_at,
            legal_document_taxonomy (
              category,
              document_type,
              priority_level
            )
          `)
          .gte("created_at", startDate.toISOString()),

        // Task statistics
        supabase
          .schema(schema)
          .from("legal_automated_tasks")
          .select("status, priority, task_type, created_at, due_date, completed_at")
          .gte("created_at", startDate.toISOString()),

        // Entity extraction statistics
        supabase
          .schema(schema)
          .from("entities")
          .select(`
            label,
            is_objective_truth,
            bennett_model,
            created_at,
            documents!inner(
              legal_document_metadata!inner(litigation_type)
            )
          `)
          .gte("created_at", startDate.toISOString())
      ]);

      const documents = documentsResult.data || [];
      const tasks = tasksResult.data || [];
      const entities = entityResult.data || [];

      // Calculate analytics
      const analytics = {
        document_processing: {
          total_processed: documents.length,
          by_litigation_type: groupBy(documents, 'litigation_type'),
          by_workflow_status: groupBy(documents, 'workflow_status'),
          average_classification_confidence: calculateAverage(documents, 'classification_confidence'),
          average_entity_completeness: calculateAverage(documents, 'entity_completeness_score'),
          validation_required_percentage: (documents.filter(d => d.validation_required).length / documents.length) * 100 || 0
        },
        task_management: {
          total_tasks: tasks.length,
          by_status: groupBy(tasks, 'status'),
          by_priority: groupBy(tasks, 'priority'),
          by_type: groupBy(tasks, 'task_type'),
          overdue_tasks: tasks.filter(t => t.status !== 'completed' && new Date(t.due_date) < new Date()).length,
          average_completion_time: calculateAverageCompletionTime(tasks)
        },
        entity_extraction: {
          total_entities: entities.length,
          by_model: groupBy(entities, 'bennett_model'),
          by_label: groupBy(entities, 'label'),
          objective_truth_percentage: (entities.filter(e => e.is_objective_truth).length / entities.length) * 100 || 0,
          by_litigation_type: groupBy(entities.map(e => ({ 
            litigation_type: e.documents?.legal_document_metadata?.[0]?.litigation_type 
          })), 'litigation_type')
        },
        time_series: generateTimeSeries(documents, tasks, startDate, endDate),
        period: {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          days: days
        }
      };

      return c.json({
        success: true,
        analytics
      });

    } catch (error: any) {
      console.error("Error in analytics endpoint:", error);
      return c.json({ 
        success: false,
        error: "Failed to fetch analytics",
        code: "ANALYTICS_ERROR"
      }, 500);
    }
  });

  // POST /bennett-legal/process-workflow - Trigger workflow rule processing
  app.post("/bennett-legal/process-workflow", async (c) => {
    try {
      const orgId = c.get("orgId");
      const userId = c.get("userId");
      
      const supabase = getSupabaseClient();
      const { user, schema } = await getOrganizationInfo(supabase, orgId, userId);

      const body = await c.req.json();
      const { document_id, entities } = body;

      if (!document_id) {
        return c.json({
          success: false,
          error: "document_id is required",
          code: "MISSING_DOCUMENT_ID"
        }, 400);
      }

      // Verify document access
      const { data: document, error: docError } = await supabase
        .schema(schema)
        .from("documents")
        .select("id")
        .eq("id", document_id)
        .eq("user_id", user.id)
        .single();

      if (docError || !document) {
        return c.json({ error: "Document not found" }, 404);
      }

      // Process workflow rules
      const { data: rulesProcessed, error: workflowError } = await supabase
        .rpc('process_workflow_rules', {
          p_document_id: document_id,
          p_entities: { entities: entities || [] }
        });

      if (workflowError) {
        console.error("Workflow processing error:", workflowError);
        return c.json({ error: "Failed to process workflow rules" }, 500);
      }

      return c.json({
        success: true,
        document_id,
        rules_processed: rulesProcessed || 0
      });

    } catch (error: any) {
      console.error("Error in workflow processing endpoint:", error);
      return c.json({ 
        success: false,
        error: "Failed to process workflow",
        code: "WORKFLOW_PROCESSING_ERROR"
      }, 500);
    }
  });

  return app;
}

// Helper functions
function getSupabaseClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );
}

async function getOrganizationInfo(supabase: any, orgId: string, userId: string) {
  const { data: org, error: orgError } = await supabase
    .schema("private")
    .from("organizations")
    .select("*")
    .eq("clerk_organization_id", orgId)
    .single();

  if (orgError || !org) {
    throw new Error("Organization not found");
  }

  const { data: user, error: userError } = await supabase
    .schema("private")
    .from("users")
    .select("*")
    .eq("clerk_user_id", userId)
    .single();

  if (userError || !user) {
    throw new Error("User not found");
  }

  const { data: member, error: memberError } = await supabase
    .schema("private")
    .from("organization_members")
    .select("*")
    .eq("user_id", user.id)
    .eq("organization_id", org.id)
    .single();

  if (memberError || !member) {
    throw new Error("User is not a member of this organization");
  }

  return {
    org,
    user,
    member,
    schema: org.schema_name.toLowerCase()
  };
}

// Placeholder for AI classification - would integrate with Foundation AI or OpenAI
async function performAIClassification(documentText: string) {
  // This would integrate with your AI service to classify the document
  // For now, return a sample classification
  return {
    primary_category: 'legal',
    document_type: 'Settlement Agreement',
    litigation_type: 'personal_injury',
    confidence_score: 0.95,
    workflow_routing: 'lawyer',
    priority_level: 'high',
    confidentiality_level: 'confidential'
  };
}

// Analytics helper functions
function groupBy(array: any[], key: string) {
  return array.reduce((groups: any, item) => {
    const value = item[key] || 'unknown';
    groups[value] = (groups[value] || 0) + 1;
    return groups;
  }, {});
}

function calculateAverage(array: any[], key: string) {
  const values = array.map(item => item[key]).filter(val => val != null);
  return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
}

function calculateAverageCompletionTime(tasks: any[]) {
  const completedTasks = tasks.filter(t => t.completed_at && t.created_at);
  if (completedTasks.length === 0) return 0;

  const totalTime = completedTasks.reduce((sum, task) => {
    const created = new Date(task.created_at).getTime();
    const completed = new Date(task.completed_at).getTime();
    return sum + (completed - created);
  }, 0);

  return totalTime / completedTasks.length; // Average time in milliseconds
}

function generateTimeSeries(documents: any[], tasks: any[], startDate: Date, endDate: Date) {
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
  const series = [];

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate.getTime() + (i * 24 * 60 * 60 * 1000));
    const dateStr = date.toISOString().split('T')[0];

    const docsOnDate = documents.filter(d => 
      d.created_at && d.created_at.startsWith(dateStr)
    ).length;

    const tasksOnDate = tasks.filter(t => 
      t.created_at && t.created_at.startsWith(dateStr)
    ).length;

    series.push({
      date: dateStr,
      documents_processed: docsOnDate,
      tasks_created: tasksOnDate
    });
  }

  return series;
}