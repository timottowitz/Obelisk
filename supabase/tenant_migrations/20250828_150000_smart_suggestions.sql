-- Smart Assignment Suggestions Schema
-- This migration adds tables for AI-powered case suggestions and learning feedback

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Email Analysis Results Table
-- Stores the results of AI analysis on email content
CREATE TABLE email_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email_id VARCHAR NOT NULL, -- Microsoft Graph email ID
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  analysis_version VARCHAR NOT NULL DEFAULT '1.0',
  
  -- AI Analysis Results
  summary TEXT,
  intent VARCHAR(100), -- 'new_case_inquiry', 'case_update', 'document_request', etc.
  urgency_level VARCHAR(50) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  topic_classification TEXT[],
  
  -- Extracted Entities
  extracted_entities JSONB DEFAULT '{}', -- {names: [], organizations: [], amounts: [], dates: [], case_numbers: []}
  detected_language VARCHAR(10) DEFAULT 'en',
  
  -- Content Metadata
  content_hash VARCHAR(64), -- SHA-256 of email content for deduplication
  has_attachments BOOLEAN DEFAULT false,
  attachment_types TEXT[],
  
  -- Processing Status
  analysis_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  analysis_provider VARCHAR(50), -- 'openai', 'anthropic', 'local'
  analysis_model VARCHAR(100),
  processing_time_ms INTEGER,
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_email_analysis UNIQUE (tenant_id, email_id)
);

-- Case Suggestions Table
-- Stores AI-generated case suggestions for emails
CREATE TABLE case_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email_analysis_id UUID NOT NULL REFERENCES email_analysis(id) ON DELETE CASCADE,
  suggested_case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  
  -- Suggestion Details
  confidence_score DECIMAL(5,2) CHECK (confidence_score >= 0 AND confidence_score <= 100),
  suggestion_reason VARCHAR(100) NOT NULL, -- 'content_analysis', 'client_match', 'case_number_match', 'pattern_match', 'recent_activity'
  match_criteria JSONB DEFAULT '{}', -- Details about what matched
  
  -- Ranking and Ordering
  rank_position INTEGER NOT NULL, -- 1-5, position in suggestion list
  algorithm_version VARCHAR(50) DEFAULT '1.0',
  
  -- User Interaction Tracking
  user_action VARCHAR(50), -- 'accepted', 'rejected', 'ignored', null (not acted upon)
  user_feedback TEXT,
  interaction_timestamp TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Suggestion Learning Data Table
-- Tracks user behavior for improving suggestions
CREATE TABLE suggestion_learning_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, -- Clerk user ID
  email_analysis_id UUID NOT NULL REFERENCES email_analysis(id) ON DELETE CASCADE,
  
  -- User Assignment Decision
  assigned_case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  assignment_timestamp TIMESTAMPTZ DEFAULT NOW(),
  
  -- Suggestion Performance
  top_suggestion_id UUID REFERENCES case_suggestions(id) ON DELETE SET NULL,
  suggestion_accepted BOOLEAN DEFAULT false,
  suggestion_rank_accepted INTEGER, -- Which ranked suggestion was accepted (if any)
  
  -- Learning Features
  email_features JSONB DEFAULT '{}', -- Extracted features used for learning
  user_context JSONB DEFAULT '{}', -- User-specific context (recent cases, preferences)
  assignment_context JSONB DEFAULT '{}', -- Context at time of assignment
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Suggestion Performance Analytics Table
-- Aggregated data for tracking suggestion accuracy and improvement
CREATE TABLE suggestion_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Time Period
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  period_type VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly'
  
  -- Performance Metrics
  total_suggestions INTEGER DEFAULT 0,
  suggestions_accepted INTEGER DEFAULT 0,
  suggestions_rejected INTEGER DEFAULT 0,
  suggestions_ignored INTEGER DEFAULT 0,
  
  -- Accuracy Metrics by Rank
  rank_1_accuracy DECIMAL(5,2) DEFAULT 0, -- % of rank 1 suggestions accepted
  rank_2_accuracy DECIMAL(5,2) DEFAULT 0,
  rank_3_accuracy DECIMAL(5,2) DEFAULT 0,
  rank_4_accuracy DECIMAL(5,2) DEFAULT 0,
  rank_5_accuracy DECIMAL(5,2) DEFAULT 0,
  
  -- Algorithm Performance
  algorithm_version VARCHAR(50),
  avg_confidence_accepted DECIMAL(5,2),
  avg_confidence_rejected DECIMAL(5,2),
  
  -- Response Time Metrics
  avg_analysis_time_ms INTEGER,
  avg_suggestion_time_ms INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_analytics_period UNIQUE (tenant_id, period_start, period_end, period_type)
);

-- AI Model Configuration Table
-- Stores configuration for different AI models and providers
CREATE TABLE ai_model_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Model Details
  provider VARCHAR(50) NOT NULL, -- 'openai', 'anthropic', 'local'
  model_name VARCHAR(100) NOT NULL,
  model_version VARCHAR(50),
  
  -- Configuration
  config JSONB DEFAULT '{}', -- Model-specific configuration
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  
  -- Usage Limits
  daily_request_limit INTEGER,
  monthly_cost_limit DECIMAL(10,2),
  
  -- Performance Tracking
  total_requests INTEGER DEFAULT 0,
  successful_requests INTEGER DEFAULT 0,
  failed_requests INTEGER DEFAULT 0,
  avg_response_time_ms INTEGER,
  total_cost DECIMAL(10,2) DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_tenant_default_model UNIQUE (tenant_id, is_default) DEFERRABLE INITIALLY DEFERRED
);

-- Create indexes for performance
CREATE INDEX idx_email_analysis_tenant_email ON email_analysis(tenant_id, email_id);
CREATE INDEX idx_email_analysis_status ON email_analysis(analysis_status) WHERE analysis_status != 'completed';
CREATE INDEX idx_email_analysis_content_hash ON email_analysis(content_hash);

CREATE INDEX idx_case_suggestions_email_analysis ON case_suggestions(email_analysis_id);
CREATE INDEX idx_case_suggestions_case ON case_suggestions(suggested_case_id);
CREATE INDEX idx_case_suggestions_confidence ON case_suggestions(confidence_score DESC);
CREATE INDEX idx_case_suggestions_rank ON case_suggestions(rank_position);

CREATE INDEX idx_learning_data_tenant_user ON suggestion_learning_data(tenant_id, user_id);
CREATE INDEX idx_learning_data_email_analysis ON suggestion_learning_data(email_analysis_id);
CREATE INDEX idx_learning_data_assignment_time ON suggestion_learning_data(assignment_timestamp DESC);

CREATE INDEX idx_analytics_tenant_period ON suggestion_analytics(tenant_id, period_start, period_end);
CREATE INDEX idx_analytics_period_type ON suggestion_analytics(period_type, period_start DESC);

CREATE INDEX idx_ai_config_tenant_active ON ai_model_config(tenant_id, is_active) WHERE is_active = true;

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_email_analysis_updated_at 
    BEFORE UPDATE ON email_analysis 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_case_suggestions_updated_at 
    BEFORE UPDATE ON case_suggestions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_model_config_updated_at 
    BEFORE UPDATE ON ai_model_config 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to get case suggestions for an email
CREATE OR REPLACE FUNCTION get_case_suggestions_for_email(
  p_tenant_id UUID,
  p_email_id VARCHAR
)
RETURNS TABLE (
  suggestion_id UUID,
  case_id UUID,
  case_number VARCHAR,
  case_title VARCHAR,
  client_name VARCHAR,
  confidence_score DECIMAL,
  suggestion_reason VARCHAR,
  match_criteria JSONB,
  rank_position INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cs.id,
    cs.suggested_case_id,
    c.case_number,
    c.title,
    c.client_name,
    cs.confidence_score,
    cs.suggestion_reason,
    cs.match_criteria,
    cs.rank_position
  FROM case_suggestions cs
  JOIN email_analysis ea ON cs.email_analysis_id = ea.id
  JOIN cases c ON cs.suggested_case_id = c.id
  WHERE ea.tenant_id = p_tenant_id 
    AND ea.email_id = p_email_id
    AND ea.analysis_status = 'completed'
  ORDER BY cs.rank_position ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record suggestion feedback
CREATE OR REPLACE FUNCTION record_suggestion_feedback(
  p_tenant_id UUID,
  p_user_id UUID,
  p_suggestion_id UUID,
  p_action VARCHAR,
  p_feedback TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_suggestion_exists BOOLEAN := false;
BEGIN
  -- Check if suggestion exists and belongs to tenant
  SELECT EXISTS(
    SELECT 1 FROM case_suggestions cs
    JOIN email_analysis ea ON cs.email_analysis_id = ea.id
    WHERE cs.id = p_suggestion_id AND ea.tenant_id = p_tenant_id
  ) INTO v_suggestion_exists;
  
  IF NOT v_suggestion_exists THEN
    RETURN false;
  END IF;
  
  -- Update the suggestion with user feedback
  UPDATE case_suggestions 
  SET 
    user_action = p_action,
    user_feedback = p_feedback,
    interaction_timestamp = NOW(),
    updated_at = NOW()
  WHERE id = p_suggestion_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get suggestion analytics for a tenant
CREATE OR REPLACE FUNCTION get_suggestion_analytics(
  p_tenant_id UUID,
  p_period_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  total_suggestions INTEGER,
  acceptance_rate DECIMAL,
  avg_confidence_accepted DECIMAL,
  rank_1_accuracy DECIMAL,
  top_suggestion_reasons TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(cs.id)::INTEGER as total_suggestions,
    ROUND(
      COUNT(cs.id) FILTER (WHERE cs.user_action = 'accepted')::DECIMAL / 
      NULLIF(COUNT(cs.id), 0) * 100, 2
    ) as acceptance_rate,
    ROUND(AVG(cs.confidence_score) FILTER (WHERE cs.user_action = 'accepted'), 2) as avg_confidence_accepted,
    ROUND(
      COUNT(cs.id) FILTER (WHERE cs.rank_position = 1 AND cs.user_action = 'accepted')::DECIMAL / 
      NULLIF(COUNT(cs.id) FILTER (WHERE cs.rank_position = 1), 0) * 100, 2
    ) as rank_1_accuracy,
    ARRAY_AGG(DISTINCT cs.suggestion_reason ORDER BY cs.suggestion_reason) FILTER (WHERE cs.user_action = 'accepted') as top_suggestion_reasons
  FROM case_suggestions cs
  JOIN email_analysis ea ON cs.email_analysis_id = ea.id
  WHERE ea.tenant_id = p_tenant_id
    AND cs.created_at >= NOW() - INTERVAL '1 day' * p_period_days;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Row Level Security (RLS) Policies
ALTER TABLE email_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE suggestion_learning_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE suggestion_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_model_config ENABLE ROW LEVEL SECURITY;

-- Email Analysis Policies
CREATE POLICY "Users can view email analysis for their tenant" ON email_analysis
  FOR SELECT USING (tenant_id = (SELECT tenant_id FROM public.user_tenant_access WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert email analysis for their tenant" ON email_analysis
  FOR INSERT WITH CHECK (tenant_id = (SELECT tenant_id FROM public.user_tenant_access WHERE user_id = auth.uid()));

CREATE POLICY "Users can update email analysis for their tenant" ON email_analysis
  FOR UPDATE USING (tenant_id = (SELECT tenant_id FROM public.user_tenant_access WHERE user_id = auth.uid()));

-- Case Suggestions Policies
CREATE POLICY "Users can view suggestions for their tenant" ON case_suggestions
  FOR SELECT USING (tenant_id = (SELECT tenant_id FROM public.user_tenant_access WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert suggestions for their tenant" ON case_suggestions
  FOR INSERT WITH CHECK (tenant_id = (SELECT tenant_id FROM public.user_tenant_access WHERE user_id = auth.uid()));

CREATE POLICY "Users can update suggestions for their tenant" ON case_suggestions
  FOR UPDATE USING (tenant_id = (SELECT tenant_id FROM public.user_tenant_access WHERE user_id = auth.uid()));

-- Learning Data Policies
CREATE POLICY "Users can view learning data for their tenant" ON suggestion_learning_data
  FOR SELECT USING (tenant_id = (SELECT tenant_id FROM public.user_tenant_access WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert learning data for their tenant" ON suggestion_learning_data
  FOR INSERT WITH CHECK (tenant_id = (SELECT tenant_id FROM public.user_tenant_access WHERE user_id = auth.uid()));

-- Analytics Policies (read-only for most users)
CREATE POLICY "Users can view analytics for their tenant" ON suggestion_analytics
  FOR SELECT USING (tenant_id = (SELECT tenant_id FROM public.user_tenant_access WHERE user_id = auth.uid()));

-- AI Model Config Policies (admin-only)
CREATE POLICY "Admins can manage AI config for their tenant" ON ai_model_config
  FOR ALL USING (
    tenant_id = (SELECT tenant_id FROM public.user_tenant_access WHERE user_id = auth.uid()) 
    AND EXISTS (
      SELECT 1 FROM public.user_tenant_access 
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON email_analysis TO authenticated;
GRANT SELECT, INSERT, UPDATE ON case_suggestions TO authenticated;
GRANT SELECT, INSERT ON suggestion_learning_data TO authenticated;
GRANT SELECT ON suggestion_analytics TO authenticated;
GRANT SELECT ON ai_model_config TO authenticated;
GRANT INSERT, UPDATE ON ai_model_config TO authenticated; -- For admins only via RLS

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Insert default AI model configuration
INSERT INTO ai_model_config (tenant_id, provider, model_name, model_version, config, is_active, is_default)
SELECT 
  t.id as tenant_id,
  'openai' as provider,
  'gpt-4' as model_name,
  'gpt-4-0125-preview' as model_version,
  '{"temperature": 0.1, "max_tokens": 2000, "top_p": 1}' as config,
  true as is_active,
  true as is_default
FROM public.tenants t
ON CONFLICT (tenant_id, is_default) DO NOTHING;

COMMENT ON TABLE email_analysis IS 'Stores AI analysis results for email content including entity extraction and intent classification';
COMMENT ON TABLE case_suggestions IS 'AI-generated case suggestions for emails with confidence scores and user feedback';
COMMENT ON TABLE suggestion_learning_data IS 'Tracks user assignment decisions to improve suggestion algorithms';
COMMENT ON TABLE suggestion_analytics IS 'Aggregated analytics data for tracking suggestion performance and accuracy';
COMMENT ON TABLE ai_model_config IS 'Configuration settings for different AI models and providers';