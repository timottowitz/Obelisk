-- Bennett Legal Taxonomy Integration Schema Migration
-- Extends Doc Intel system with Bennett Legal's taxonomy and workflow automation
-- Replace {{schema_name}} with the actual tenant schema name when running

SET search_path TO {{schema_name}};

-- =============================================================================
-- BENNETT LEGAL TAXONOMY TABLES
-- =============================================================================

-- LEGAL ENTITY TYPES TABLE
-- Maps Bennett Legal's 15 field-level extraction models
CREATE TABLE IF NOT EXISTS legal_entity_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT,
    validation_patterns JSONB DEFAULT '[]'::jsonb,
    confidence_threshold DECIMAL(3,2) DEFAULT 0.75 CHECK (confidence_threshold >= 0.0 AND confidence_threshold <= 1.0),
    is_active BOOLEAN DEFAULT TRUE,
    bennett_model_id TEXT, -- Maps to Bennett Legal's 15 models
    category TEXT CHECK (category IN ('person', 'organization', 'date', 'amount', 'identifier', 'location', 'medical', 'legal')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert Bennett Legal's 15 field-level extraction models
INSERT INTO legal_entity_types (name, display_name, description, confidence_threshold, bennett_model_id, category, validation_patterns) VALUES
('doctor', 'Doctor', 'Medical professionals, physicians, specialists', 0.80, 'doctor_model', 'person', '["MD", "DO", "Dr.", "Doctor"]'::jsonb),
('sender', 'Sender', 'Document sender, author, originating party', 0.70, 'sender_model', 'person', '[]'::jsonb),
('document_date', 'Document Date', 'Primary document date, creation date, effective date', 0.90, 'document_date_model', 'date', '["date_format"]'::jsonb),
('event_date', 'Event Date', 'Incident date, accident date, significant event dates', 0.90, 'event_date_model', 'date', '["date_format"]'::jsonb),
('insurance_company', 'Insurance Company', 'Insurance carriers, underwriters, claims departments', 0.80, 'insurance_company_model', 'organization', '[]'::jsonb),
('policy_number', 'Policy Number', 'Insurance policy numbers, claim numbers', 0.85, 'policy_number_model', 'identifier', '["alphanumeric", "policy_format"]'::jsonb),
('plaintiff', 'Plaintiff', 'Injured party, claimant in litigation', 0.90, 'plaintiff_model', 'person', '[]'::jsonb),
('defendant', 'Defendant', 'Accused party, respondent in litigation', 0.90, 'defendant_model', 'person', '[]'::jsonb),
('attorney', 'Attorney', 'Legal counsel, law firm representatives', 0.80, 'attorney_model', 'person', '["Esq.", "Attorney", "Counsel"]'::jsonb),
('medical_facility', 'Medical Facility', 'Hospitals, clinics, medical centers', 0.80, 'medical_facility_model', 'organization', '[]'::jsonb),
('injury_type', 'Injury Type', 'Type of injury, medical condition, damages', 0.70, 'injury_type_model', 'medical', '[]'::jsonb),
('settlement_amount', 'Settlement Amount', 'Settlement figures, monetary damages', 0.95, 'settlement_amount_model', 'amount', '["currency_format"]'::jsonb),
('case_number', 'Case Number', 'Court case numbers, docket numbers', 0.90, 'case_number_model', 'identifier', '["case_number_format"]'::jsonb),
('court', 'Court', 'Court names, jurisdictions, venues', 0.80, 'court_model', 'organization', '[]'::jsonb),
('solar_company', 'Solar Company', 'Solar installation companies, contractors', 0.80, 'solar_company_model', 'organization', '[]'::jsonb);

-- DOCUMENT TAXONOMY TABLE  
-- Maps Bennett Legal's 132+ document types across 15+ categories
CREATE TABLE IF NOT EXISTS legal_document_taxonomy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL,
    document_type TEXT NOT NULL,
    litigation_type TEXT CHECK (litigation_type IN ('personal_injury', 'solar', 'employment', 'real_estate', 'corporate', 'other')),
    workflow_routing TEXT NOT NULL CHECK (workflow_routing IN ('paralegal', 'lawyer', 'specialist')),
    priority_level TEXT NOT NULL CHECK (priority_level IN ('urgent', 'high', 'normal', 'low')),
    required_entities JSONB DEFAULT '[]'::jsonb, -- List of required entity types
    optional_entities JSONB DEFAULT '[]'::jsonb, -- List of optional entity types
    processing_notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(category, document_type)
);

-- Insert Bennett Legal document taxonomy (sample of key document types)
INSERT INTO legal_document_taxonomy (category, document_type, litigation_type, workflow_routing, priority_level, required_entities, optional_entities, processing_notes) VALUES
-- Medical Documents
('medical', 'Medical Records', 'personal_injury', 'paralegal', 'normal', '["doctor", "medical_facility", "document_date"]'::jsonb, '["patient", "injury_type"]'::jsonb, 'Routine medical record processing'),
('medical', 'Physician Reports', 'personal_injury', 'lawyer', 'high', '["doctor", "document_date", "injury_type"]'::jsonb, '["medical_facility"]'::jsonb, 'Requires legal review for expert testimony'),
('medical', 'Hospital Records', 'personal_injury', 'paralegal', 'normal', '["medical_facility", "document_date"]'::jsonb, '["doctor", "injury_type"]'::jsonb, 'Standard hospital record processing'),
('medical', 'Medical Bills', 'personal_injury', 'paralegal', 'high', '["medical_facility", "document_date", "settlement_amount"]'::jsonb, '["doctor"]'::jsonb, 'Important for damages calculation'),

-- Legal Documents  
('legal', 'Complaint', 'personal_injury', 'lawyer', 'urgent', '["plaintiff", "defendant", "court", "case_number"]'::jsonb, '["attorney", "event_date"]'::jsonb, 'Court filing - urgent processing required'),
('legal', 'Answer', 'personal_injury', 'lawyer', 'urgent', '["defendant", "attorney", "court", "case_number"]'::jsonb, '["plaintiff"]'::jsonb, 'Response to complaint - urgent'),
('legal', 'Settlement Agreement', 'personal_injury', 'lawyer', 'urgent', '["plaintiff", "defendant", "settlement_amount", "document_date"]'::jsonb, '["attorney"]'::jsonb, 'Final settlement - requires lawyer review'),
('legal', 'Deposition', 'personal_injury', 'lawyer', 'high', '["attorney", "document_date"]'::jsonb, '["plaintiff", "defendant", "court"]'::jsonb, 'Key testimony - legal review required'),
('legal', 'Motion', 'personal_injury', 'lawyer', 'high', '["attorney", "court", "case_number"]'::jsonb, '["defendant", "plaintiff"]'::jsonb, 'Court motion - legal review required'),

-- Insurance Documents
('insurance', 'Insurance Policy', 'personal_injury', 'paralegal', 'normal', '["insurance_company", "policy_number", "document_date"]'::jsonb, '[]'::jsonb, 'Policy review for coverage analysis'),
('insurance', 'Claims File', 'personal_injury', 'paralegal', 'high', '["insurance_company", "policy_number"]'::jsonb, '["settlement_amount", "plaintiff"]'::jsonb, 'Critical for claim processing'),
('insurance', 'Settlement Offers', 'personal_injury', 'lawyer', 'urgent', '["insurance_company", "settlement_amount", "document_date"]'::jsonb, '["attorney", "policy_number"]'::jsonb, 'Settlement negotiation - lawyer review'),
('insurance', 'Denial Letters', 'personal_injury', 'lawyer', 'urgent', '["insurance_company", "policy_number", "document_date"]'::jsonb, '["attorney"]'::jsonb, 'Coverage denial - urgent legal review'),

-- Personal Injury Specific
('personal_injury', 'Accident Report', 'personal_injury', 'paralegal', 'high', '["event_date", "plaintiff"]'::jsonb, '["defendant", "injury_type"]'::jsonb, 'Critical incident documentation'),
('personal_injury', 'Police Report', 'personal_injury', 'paralegal', 'high', '["event_date", "document_date"]'::jsonb, '["plaintiff", "defendant"]'::jsonb, 'Official incident report'),
('personal_injury', 'Witness Statements', 'personal_injury', 'lawyer', 'high', '["document_date"]'::jsonb, '["event_date", "plaintiff", "defendant"]'::jsonb, 'Witness testimony - legal review'),
('personal_injury', 'Expert Reports', 'personal_injury', 'lawyer', 'high', '["doctor", "document_date"]'::jsonb, '["injury_type", "settlement_amount"]'::jsonb, 'Expert opinion - requires lawyer review'),

-- Solar Litigation Documents
('solar_litigation', 'Solar Installation Contract', 'solar', 'lawyer', 'normal', '["solar_company", "document_date"]'::jsonb, '["settlement_amount"]'::jsonb, 'Contract review for solar litigation'),
('solar_litigation', 'Solar Lease Agreement', 'solar', 'lawyer', 'normal', '["solar_company", "document_date"]'::jsonb, '["settlement_amount"]'::jsonb, 'Lease terms review'),
('solar_litigation', 'Performance Reports', 'solar', 'specialist', 'normal', '["solar_company", "document_date"]'::jsonb, '[]'::jsonb, 'Technical performance analysis required'),
('solar_litigation', 'Warranty Documents', 'solar', 'paralegal', 'normal', '["solar_company", "document_date"]'::jsonb, '[]'::jsonb, 'Warranty claims processing'),

-- Financial Documents
('financial', 'Bank Statements', 'personal_injury', 'paralegal', 'normal', '["document_date"]'::jsonb, '["settlement_amount"]'::jsonb, 'Financial records review'),
('financial', 'Tax Returns', 'personal_injury', 'paralegal', 'normal', '["document_date"]'::jsonb, '["settlement_amount"]'::jsonb, 'Income verification'),

-- Employment Documents  
('employment', 'Employment Contract', 'employment', 'lawyer', 'normal', '["document_date"]'::jsonb, '["settlement_amount"]'::jsonb, 'Employment terms review'),
('employment', 'Termination Letters', 'employment', 'lawyer', 'high', '["document_date"]'::jsonb, '["settlement_amount"]'::jsonb, 'Wrongful termination review');

-- WORKFLOW AUTOMATION RULES TABLE
-- Defines automated workflow rules based on document types and extracted entities
CREATE TABLE IF NOT EXISTS legal_workflow_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    taxonomy_id UUID NOT NULL REFERENCES legal_document_taxonomy(id) ON DELETE CASCADE,
    rule_name TEXT NOT NULL,
    trigger_conditions JSONB NOT NULL, -- Conditions that trigger this rule
    actions JSONB NOT NULL,           -- Actions to take when triggered
    priority INTEGER DEFAULT 0,       -- Rule execution priority
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample workflow automation rules
INSERT INTO legal_workflow_rules (taxonomy_id, rule_name, trigger_conditions, actions) 
SELECT 
    t.id,
    'Settlement Amount Alert',
    '{"required_entities": ["settlement_amount"], "min_amount": 100000}'::jsonb,
    '{"notify_users": ["lawyer", "senior_partner"], "create_calendar_event": true, "priority": "urgent", "email_subject": "High Value Settlement Detected"}'::jsonb
FROM legal_document_taxonomy t 
WHERE t.document_type IN ('Settlement Agreement', 'Settlement Offers');

INSERT INTO legal_workflow_rules (taxonomy_id, rule_name, trigger_conditions, actions)
SELECT 
    t.id,
    'Court Filing Deadline Alert', 
    '{"required_entities": ["document_date", "court"], "days_threshold": 30}'::jsonb,
    '{"create_task": true, "assign_to": "lawyer", "due_date_offset": -7, "task_type": "court_filing_preparation"}'::jsonb
FROM legal_document_taxonomy t
WHERE t.document_type IN ('Complaint', 'Answer', 'Motion');

-- ENTITY RELATIONSHIPS TABLE
-- Tracks relationships between entities (e.g., doctor works at medical facility)
CREATE TABLE IF NOT EXISTS legal_entity_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    primary_entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    related_entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    relationship_type TEXT NOT NULL,
    confidence DECIMAL(3,2) DEFAULT 0.50,
    context_snippet TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(primary_entity_id, related_entity_id, relationship_type)
);

-- DOCUMENT PROCESSING METADATA TABLE
-- Stores Bennett Legal specific processing metadata
CREATE TABLE IF NOT EXISTS legal_document_metadata (
    document_id UUID PRIMARY KEY REFERENCES documents(id) ON DELETE CASCADE,
    taxonomy_id UUID REFERENCES legal_document_taxonomy(id),
    classification_confidence DECIMAL(3,2),
    workflow_status TEXT DEFAULT 'pending' CHECK (workflow_status IN ('pending', 'in_progress', 'review_required', 'completed', 'escalated')),
    assigned_to TEXT, -- User ID or role
    assigned_at TIMESTAMP WITH TIME ZONE,
    priority_override TEXT CHECK (priority_override IN ('urgent', 'high', 'normal', 'low')),
    
    -- Bennett Legal specific metadata
    litigation_type TEXT,
    case_link_suggestions JSONB DEFAULT '[]'::jsonb,
    privilege_flags JSONB DEFAULT '[]'::jsonb,
    confidentiality_level TEXT CHECK (confidentiality_level IN ('public', 'confidential', 'privileged', 'work_product')),
    
    -- Quality metrics
    entity_completeness_score DECIMAL(3,2),
    validation_required BOOLEAN DEFAULT FALSE,
    validation_completed_at TIMESTAMP WITH TIME ZONE,
    validation_notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- AUTOMATED TASKS TABLE
-- Stores tasks automatically generated from workflow rules
CREATE TABLE IF NOT EXISTS legal_automated_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    rule_id UUID REFERENCES legal_workflow_rules(id),
    task_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    assigned_to TEXT, -- User ID or role
    due_date TIMESTAMP WITH TIME ZONE,
    priority TEXT CHECK (priority IN ('urgent', 'high', 'normal', 'low')) DEFAULT 'normal',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    
    -- Task metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    completion_notes TEXT,
    completed_at TIMESTAMP WITH TIME ZONE,
    completed_by TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- CALENDAR EVENTS TABLE  
-- Stores calendar events generated from document processing
CREATE TABLE IF NOT EXISTS legal_calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    task_id UUID REFERENCES legal_automated_tasks(id),
    event_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE,
    all_day BOOLEAN DEFAULT FALSE,
    
    -- Attendees and notifications
    attendees JSONB DEFAULT '[]'::jsonb,
    notification_settings JSONB DEFAULT '{}'::jsonb,
    
    -- Event metadata
    location TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Legal entity types indexes
CREATE INDEX IF NOT EXISTS idx_legal_entity_types_name ON legal_entity_types(name);
CREATE INDEX IF NOT EXISTS idx_legal_entity_types_category ON legal_entity_types(category);
CREATE INDEX IF NOT EXISTS idx_legal_entity_types_active ON legal_entity_types(is_active);

-- Document taxonomy indexes
CREATE INDEX IF NOT EXISTS idx_legal_document_taxonomy_category ON legal_document_taxonomy(category);
CREATE INDEX IF NOT EXISTS idx_legal_document_taxonomy_type ON legal_document_taxonomy(document_type);
CREATE INDEX IF NOT EXISTS idx_legal_document_taxonomy_litigation ON legal_document_taxonomy(litigation_type);
CREATE INDEX IF NOT EXISTS idx_legal_document_taxonomy_routing ON legal_document_taxonomy(workflow_routing);
CREATE INDEX IF NOT EXISTS idx_legal_document_taxonomy_priority ON legal_document_taxonomy(priority_level);

-- Workflow rules indexes
CREATE INDEX IF NOT EXISTS idx_legal_workflow_rules_taxonomy ON legal_workflow_rules(taxonomy_id);
CREATE INDEX IF NOT EXISTS idx_legal_workflow_rules_active ON legal_workflow_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_legal_workflow_rules_priority ON legal_workflow_rules(priority DESC);

-- Entity relationships indexes
CREATE INDEX IF NOT EXISTS idx_legal_entity_relationships_primary ON legal_entity_relationships(primary_entity_id);
CREATE INDEX IF NOT EXISTS idx_legal_entity_relationships_related ON legal_entity_relationships(related_entity_id);
CREATE INDEX IF NOT EXISTS idx_legal_entity_relationships_type ON legal_entity_relationships(relationship_type);

-- Document metadata indexes  
CREATE INDEX IF NOT EXISTS idx_legal_document_metadata_taxonomy ON legal_document_metadata(taxonomy_id);
CREATE INDEX IF NOT EXISTS idx_legal_document_metadata_status ON legal_document_metadata(workflow_status);
CREATE INDEX IF NOT EXISTS idx_legal_document_metadata_assigned ON legal_document_metadata(assigned_to);
CREATE INDEX IF NOT EXISTS idx_legal_document_metadata_litigation ON legal_document_metadata(litigation_type);
CREATE INDEX IF NOT EXISTS idx_legal_document_metadata_confidentiality ON legal_document_metadata(confidentiality_level);

-- Automated tasks indexes
CREATE INDEX IF NOT EXISTS idx_legal_automated_tasks_document ON legal_automated_tasks(document_id);
CREATE INDEX IF NOT EXISTS idx_legal_automated_tasks_assigned ON legal_automated_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_legal_automated_tasks_due_date ON legal_automated_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_legal_automated_tasks_status ON legal_automated_tasks(status);
CREATE INDEX IF NOT EXISTS idx_legal_automated_tasks_priority ON legal_automated_tasks(priority);

-- Calendar events indexes
CREATE INDEX IF NOT EXISTS idx_legal_calendar_events_document ON legal_calendar_events(document_id);
CREATE INDEX IF NOT EXISTS idx_legal_calendar_events_task ON legal_calendar_events(task_id);
CREATE INDEX IF NOT EXISTS idx_legal_calendar_events_start_date ON legal_calendar_events(start_date);
CREATE INDEX IF NOT EXISTS idx_legal_calendar_events_type ON legal_calendar_events(event_type);

-- =============================================================================
-- ENHANCED ENTITIES TABLE (Extend existing entities table)
-- =============================================================================

-- Add Bennett Legal specific columns to existing entities table
ALTER TABLE entities 
ADD COLUMN IF NOT EXISTS entity_type_id UUID REFERENCES legal_entity_types(id),
ADD COLUMN IF NOT EXISTS bennett_model TEXT,
ADD COLUMN IF NOT EXISTS page_number INTEGER,
ADD COLUMN IF NOT EXISTS start_offset INTEGER,  
ADD COLUMN IF NOT EXISTS end_offset INTEGER,
ADD COLUMN IF NOT EXISTS validation_flags JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS entity_relationships JSONB DEFAULT '[]'::jsonb;

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_entities_entity_type ON entities(entity_type_id);
CREATE INDEX IF NOT EXISTS idx_entities_bennett_model ON entities(bennett_model);
CREATE INDEX IF NOT EXISTS idx_entities_page_number ON entities(page_number);

-- =============================================================================
-- FUNCTIONS FOR BENNETT LEGAL WORKFLOW AUTOMATION  
-- =============================================================================

-- Function to classify document using Bennett Legal taxonomy
CREATE OR REPLACE FUNCTION classify_legal_document(
    p_document_id UUID,
    p_document_text TEXT,
    p_classification_data JSONB
)
RETURNS UUID AS $$
DECLARE
    taxonomy_id UUID;
    metadata_id UUID;
BEGIN
    -- Find matching taxonomy based on classification
    SELECT id INTO taxonomy_id
    FROM legal_document_taxonomy
    WHERE category = p_classification_data->>'primary_category'
    AND document_type = p_classification_data->>'document_type'
    AND is_active = TRUE
    LIMIT 1;
    
    -- Create or update document metadata
    INSERT INTO legal_document_metadata (
        document_id,
        taxonomy_id,
        classification_confidence,
        litigation_type,
        workflow_status,
        confidentiality_level
    ) VALUES (
        p_document_id,
        taxonomy_id,
        (p_classification_data->>'confidence_score')::DECIMAL,
        p_classification_data->>'litigation_type',
        'pending',
        COALESCE(p_classification_data->>'confidentiality_level', 'confidential')
    )
    ON CONFLICT (document_id) DO UPDATE SET
        taxonomy_id = EXCLUDED.taxonomy_id,
        classification_confidence = EXCLUDED.classification_confidence,
        litigation_type = EXCLUDED.litigation_type,
        updated_at = CURRENT_TIMESTAMP
    RETURNING document_id INTO metadata_id;
    
    RETURN taxonomy_id;
END;
$$ LANGUAGE plpgsql;

-- Function to process workflow rules for a document
CREATE OR REPLACE FUNCTION process_workflow_rules(
    p_document_id UUID,
    p_entities JSONB
)
RETURNS INTEGER AS $$
DECLARE
    rule_record RECORD;
    entity_record RECORD;
    rules_processed INTEGER := 0;
BEGIN
    -- Get document metadata
    FOR rule_record IN 
        SELECT wr.*, dt.workflow_routing, dt.priority_level
        FROM legal_workflow_rules wr
        JOIN legal_document_metadata dm ON dm.taxonomy_id = wr.taxonomy_id
        JOIN legal_document_taxonomy dt ON dt.id = wr.taxonomy_id
        WHERE dm.document_id = p_document_id
        AND wr.is_active = TRUE
        ORDER BY wr.priority DESC
    LOOP
        -- Check if rule conditions are met
        IF check_rule_conditions(rule_record.trigger_conditions, p_entities) THEN
            -- Execute rule actions
            PERFORM execute_rule_actions(p_document_id, rule_record.id, rule_record.actions);
            rules_processed := rules_processed + 1;
        END IF;
    END LOOP;
    
    RETURN rules_processed;
END;
$$ LANGUAGE plpgsql;

-- Function to check if rule conditions are satisfied
CREATE OR REPLACE FUNCTION check_rule_conditions(
    p_conditions JSONB,
    p_entities JSONB
)
RETURNS BOOLEAN AS $$
DECLARE
    required_entities JSONB;
    entity_name TEXT;
    entity_found BOOLEAN;
BEGIN
    -- Check for required entities
    IF p_conditions ? 'required_entities' THEN
        required_entities := p_conditions->'required_entities';
        
        FOR entity_name IN SELECT jsonb_array_elements_text(required_entities)
        LOOP
            entity_found := FALSE;
            
            -- Check if entity exists in extracted entities
            IF EXISTS (
                SELECT 1 
                FROM jsonb_array_elements(p_entities->'entities') AS entity
                WHERE entity->>'label' = entity_name
            ) THEN
                entity_found := TRUE;
            END IF;
            
            -- If required entity not found, condition fails
            IF NOT entity_found THEN
                RETURN FALSE;
            END IF;
        END LOOP;
    END IF;
    
    -- Add additional condition checks here (amounts, dates, etc.)
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to execute rule actions
CREATE OR REPLACE FUNCTION execute_rule_actions(
    p_document_id UUID,
    p_rule_id UUID,
    p_actions JSONB
)
RETURNS VOID AS $$
DECLARE
    task_data JSONB;
    calendar_data JSONB;
BEGIN
    -- Create automated task if specified
    IF p_actions ? 'create_task' AND (p_actions->>'create_task')::BOOLEAN THEN
        task_data := p_actions->'task_data';
        
        INSERT INTO legal_automated_tasks (
            document_id,
            rule_id,
            task_type,
            title,
            description,
            assigned_to,
            due_date,
            priority,
            metadata
        ) VALUES (
            p_document_id,
            p_rule_id,
            COALESCE(task_data->>'task_type', 'document_review'),
            COALESCE(task_data->>'title', 'Automated Task'),
            task_data->>'description',
            task_data->>'assign_to',
            CASE WHEN task_data ? 'due_date_offset' 
                THEN CURRENT_TIMESTAMP + ((task_data->>'due_date_offset')::INTEGER || ' days')::INTERVAL
                ELSE NULL 
            END,
            COALESCE(task_data->>'priority', 'normal'),
            task_data
        );
    END IF;
    
    -- Create calendar event if specified
    IF p_actions ? 'create_calendar_event' AND (p_actions->>'create_calendar_event')::BOOLEAN THEN
        calendar_data := p_actions->'calendar_data';
        
        INSERT INTO legal_calendar_events (
            document_id,
            event_type,
            title,
            description,
            start_date,
            attendees,
            metadata
        ) VALUES (
            p_document_id,
            COALESCE(calendar_data->>'event_type', 'deadline'),
            COALESCE(calendar_data->>'title', 'Document Deadline'),
            calendar_data->>'description',
            COALESCE(
                (calendar_data->>'start_date')::TIMESTAMP WITH TIME ZONE,
                CURRENT_TIMESTAMP + INTERVAL '7 days'
            ),
            COALESCE(calendar_data->'attendees', p_actions->'notify_users'),
            calendar_data
        );
    END IF;
    
    -- Log rule execution
    INSERT INTO doc_intel_job_logs (job_id, level, message, details)
    SELECT 
        dq.id,
        'info',
        'Workflow rule executed: ' || p_rule_id,
        jsonb_build_object(
            'rule_id', p_rule_id,
            'actions_executed', p_actions,
            'document_id', p_document_id
        )
    FROM doc_intel_job_queue dq
    WHERE dq.document_id = p_document_id
    ORDER BY dq.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to get document workflow status with Bennett Legal context
CREATE OR REPLACE FUNCTION get_document_workflow_status(p_document_id UUID)
RETURNS TABLE(
    document_id UUID,
    taxonomy_category TEXT,
    document_type TEXT,
    workflow_status TEXT,
    assigned_to TEXT,
    priority_level TEXT,
    pending_tasks INTEGER,
    overdue_tasks INTEGER,
    completion_percentage DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id,
        dt.category,
        dt.document_type,
        dm.workflow_status,
        dm.assigned_to,
        COALESCE(dm.priority_override, dt.priority_level),
        (SELECT COUNT(*)::INTEGER FROM legal_automated_tasks WHERE document_id = d.id AND status = 'pending'),
        (SELECT COUNT(*)::INTEGER FROM legal_automated_tasks WHERE document_id = d.id AND status = 'pending' AND due_date < CURRENT_TIMESTAMP),
        CASE 
            WHEN (SELECT COUNT(*) FROM legal_automated_tasks WHERE document_id = d.id) = 0 THEN 100.0
            ELSE (
                SELECT (COUNT(*) FILTER (WHERE status = 'completed')::DECIMAL / COUNT(*)::DECIMAL * 100.0)
                FROM legal_automated_tasks 
                WHERE document_id = d.id
            )
        END
    FROM documents d
    LEFT JOIN legal_document_metadata dm ON dm.document_id = d.id
    LEFT JOIN legal_document_taxonomy dt ON dt.id = dm.taxonomy_id
    WHERE d.id = p_document_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION handle_bennett_legal_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_legal_entity_types_updated_at
    BEFORE UPDATE ON legal_entity_types
    FOR EACH ROW EXECUTE FUNCTION handle_bennett_legal_updated_at();

CREATE TRIGGER update_legal_document_taxonomy_updated_at
    BEFORE UPDATE ON legal_document_taxonomy  
    FOR EACH ROW EXECUTE FUNCTION handle_bennett_legal_updated_at();

CREATE TRIGGER update_legal_workflow_rules_updated_at
    BEFORE UPDATE ON legal_workflow_rules
    FOR EACH ROW EXECUTE FUNCTION handle_bennett_legal_updated_at();

CREATE TRIGGER update_legal_document_metadata_updated_at
    BEFORE UPDATE ON legal_document_metadata
    FOR EACH ROW EXECUTE FUNCTION handle_bennett_legal_updated_at();

CREATE TRIGGER update_legal_automated_tasks_updated_at
    BEFORE UPDATE ON legal_automated_tasks
    FOR EACH ROW EXECUTE FUNCTION handle_bennett_legal_updated_at();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS on all new tables
ALTER TABLE legal_entity_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_document_taxonomy ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_workflow_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_entity_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_document_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_automated_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_calendar_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Allow all authenticated users to read reference tables
CREATE POLICY legal_entity_types_read ON legal_entity_types FOR SELECT USING (TRUE);
CREATE POLICY legal_document_taxonomy_read ON legal_document_taxonomy FOR SELECT USING (TRUE);

-- RLS Policies - User-specific data access
CREATE POLICY legal_document_metadata_user_access ON legal_document_metadata
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM documents 
            WHERE documents.id = legal_document_metadata.document_id 
            AND documents.user_id = auth.uid()
        )
    );

CREATE POLICY legal_automated_tasks_user_access ON legal_automated_tasks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM documents 
            WHERE documents.id = legal_automated_tasks.document_id 
            AND documents.user_id = auth.uid()
        )
    );

CREATE POLICY legal_calendar_events_user_access ON legal_calendar_events
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM documents 
            WHERE documents.id = legal_calendar_events.document_id 
            AND documents.user_id = auth.uid()
        )
    );

CREATE POLICY legal_entity_relationships_user_access ON legal_entity_relationships
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM entities e1
            JOIN documents d ON d.id = e1.document_id
            WHERE e1.id = legal_entity_relationships.primary_entity_id 
            AND d.user_id = auth.uid()
        )
    );

-- =============================================================================
-- PERMISSIONS
-- =============================================================================

-- Grant service_role permissions for all tables
GRANT ALL ON legal_entity_types TO service_role;
GRANT ALL ON legal_document_taxonomy TO service_role;
GRANT ALL ON legal_workflow_rules TO service_role;
GRANT ALL ON legal_entity_relationships TO service_role;
GRANT ALL ON legal_document_metadata TO service_role;
GRANT ALL ON legal_automated_tasks TO service_role;
GRANT ALL ON legal_calendar_events TO service_role;

-- Grant function permissions
GRANT EXECUTE ON FUNCTION classify_legal_document(UUID, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION process_workflow_rules(UUID, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION check_rule_conditions(JSONB, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION execute_rule_actions(UUID, UUID, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION get_document_workflow_status(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION handle_bennett_legal_updated_at() TO service_role;

-- Grant authenticated user permissions
GRANT SELECT ON legal_entity_types TO authenticated;
GRANT SELECT ON legal_document_taxonomy TO authenticated;
GRANT SELECT, INSERT, UPDATE ON legal_document_metadata TO authenticated;
GRANT SELECT, INSERT, UPDATE ON legal_automated_tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE ON legal_calendar_events TO authenticated;
GRANT SELECT, INSERT, UPDATE ON legal_entity_relationships TO authenticated;

-- =============================================================================
-- REALTIME PUBLICATIONS
-- =============================================================================

DO $$
BEGIN
    -- Add tables to realtime publication
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE {{schema_name}}.legal_document_metadata;
    EXCEPTION WHEN duplicate_object THEN 
        RAISE NOTICE 'Table already in publication';
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE {{schema_name}}.legal_automated_tasks;
    EXCEPTION WHEN duplicate_object THEN 
        RAISE NOTICE 'Table already in publication';
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE {{schema_name}}.legal_calendar_events;
    EXCEPTION WHEN duplicate_object THEN 
        RAISE NOTICE 'Table already in publication';
    END;
END $$;

-- Reset search_path
RESET search_path;