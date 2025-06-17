-- Template migration for tenant schema
-- Replace {{schema_name}} with the actual tenant schema name when running

CREATE SCHEMA IF NOT EXISTS {{schema_name}};

SET search_path TO {{schema_name}};

-- USERS (per-tenant)
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id text NOT NULL,
  email text NOT NULL,
  name text NOT NULL,
  bar_number text,
  bar_state text,
  bar_verified_at timestamp,
  bar_expires_at timestamp,
  last_login_at timestamp,
  is_system_admin boolean NOT NULL DEFAULT false,
  suspended_at timestamp,
  created_at timestamp NOT NULL,
  updated_at timestamp NOT NULL
);

CREATE INDEX idx_users_bar_verified ON users(bar_verified_at);
CREATE INDEX idx_users_clerk_id ON users(clerk_user_id);
CREATE INDEX idx_users_suspended_at ON users(suspended_at);

-- MEMBERS (per-tenant)
CREATE TABLE members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL,
  permissions text[] NOT NULL,
  mfa_enabled boolean NOT NULL,
  created_at timestamp NOT NULL,
  updated_at timestamp NOT NULL
);

-- CASES (per-tenant)
CREATE TABLE cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number text NOT NULL,
  title text NOT NULL,
  status text NOT NULL,
  client_name_encrypted text NOT NULL,
  opposing_party_encrypted text,
  lead_attorney_id uuid NOT NULL REFERENCES users(id),
  team_member_ids uuid[] NOT NULL,
  client_id uuid REFERENCES users(id),
  client_portal_enabled boolean NOT NULL,
  conflict_check_completed_at timestamp,
  conflict_check_completed_by uuid REFERENCES users(id),
  retention_policy text NOT NULL,
  destroy_after_date timestamp,
  created_at timestamp NOT NULL,
  updated_at timestamp NOT NULL
);

CREATE INDEX idx_cases_status ON cases(status);
CREATE INDEX idx_cases_case_number ON cases(case_number);
CREATE INDEX idx_cases_lead_attorney ON cases(lead_attorney_id);
CREATE INDEX idx_cases_retention_policy ON cases(retention_policy);
CREATE INDEX idx_cases_destroy_date ON cases(destroy_after_date);

-- DOCUMENTS (per-tenant)
CREATE TABLE documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  storage_id uuid NOT NULL,
  checksum text NOT NULL,
  size_bytes bigint NOT NULL,
  mime_type text NOT NULL,
  title text NOT NULL,
  type text NOT NULL,
  privileged boolean NOT NULL,
  work_product boolean NOT NULL,
  confidentiality_level text NOT NULL,
  encryption_key_version text NOT NULL,
  encrypted_at timestamp NOT NULL,
  version int NOT NULL,
  previous_version_id uuid REFERENCES documents(id),
  last_accessed_at timestamp,
  access_count int NOT NULL,
  uploaded_by uuid NOT NULL REFERENCES users(id),
  created_at timestamp NOT NULL
);

CREATE INDEX idx_documents_case ON documents(case_id);
CREATE INDEX idx_documents_privileged ON documents(privileged);
CREATE INDEX idx_documents_confidentiality ON documents(confidentiality_level);
CREATE INDEX idx_documents_version ON documents(previous_version_id);

-- AUDIT LOGS (per-tenant)
CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  event_type text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  ip_address text NOT NULL,
  user_agent text NOT NULL,
  session_id text,
  mfa_verified boolean NOT NULL,
  previous_value text,
  new_value text,
  privileged_access boolean NOT NULL,
  export_operation boolean NOT NULL,
  client_data_modified boolean NOT NULL,
  metadata jsonb,
  created_at timestamp NOT NULL
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_time ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_privileged_access ON audit_logs(privileged_access);
CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);

-- TRUST ACCOUNTS (per-tenant)
CREATE TABLE trust_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  account_number_encrypted text NOT NULL,
  routing_number_encrypted text NOT NULL,
  bank_name text NOT NULL,
  ledger_balance bigint NOT NULL,
  bank_balance bigint NOT NULL,
  last_reconciled_at timestamp,
  quickbooks_account_id text,
  is_active boolean NOT NULL,
  created_at timestamp NOT NULL
);

CREATE INDEX idx_trust_accounts_active ON trust_accounts(is_active);

-- CLIENT TRUST LEDGERS (per-tenant)
CREATE TABLE client_trust_ledgers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES users(id),
  trust_account_id uuid NOT NULL REFERENCES trust_accounts(id),
  balance bigint NOT NULL,
  last_transaction_at timestamp,
  created_at timestamp NOT NULL
);

CREATE INDEX idx_client_trust_ledgers_trust_account ON client_trust_ledgers(trust_account_id);
CREATE INDEX idx_client_trust_ledgers_client ON client_trust_ledgers(client_id);

-- TRUST TRANSACTIONS (per-tenant)
CREATE TABLE trust_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trust_account_id uuid NOT NULL REFERENCES trust_accounts(id),
  client_ledger_id uuid NOT NULL REFERENCES client_trust_ledgers(id),
  type text NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'transfer')),
  amount bigint NOT NULL,
  description text NOT NULL,
  check_number text,
  bank_transaction_id text,
  quickbooks_transaction_id text,
  cleared_at timestamp,
  created_by uuid NOT NULL REFERENCES users(id),
  approved_by uuid REFERENCES users(id),
  voided_at timestamp,
  void_reason text,
  created_at timestamp NOT NULL
);

CREATE INDEX idx_trust_transactions_trust_account ON trust_transactions(trust_account_id);
CREATE INDEX idx_trust_transactions_client_ledger ON trust_transactions(client_ledger_id);
CREATE INDEX idx_trust_transactions_time ON trust_transactions(created_at);
CREATE INDEX idx_trust_transactions_cleared_status ON trust_transactions(cleared_at);

-- SECURITY EVENTS (per-tenant)
CREATE TABLE security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  severity text NOT NULL,
  category text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  user_id uuid REFERENCES users(id),
  ip_address text NOT NULL,
  user_agent text,
  acknowledged boolean NOT NULL,
  acknowledged_by uuid REFERENCES users(id),
  acknowledged_at timestamp,
  resolved boolean NOT NULL,
  resolved_at timestamp,
  created_at timestamp NOT NULL
);

CREATE INDEX idx_security_events_severity ON security_events(severity);
CREATE INDEX idx_security_events_unresolved ON security_events(resolved);
CREATE INDEX idx_security_events_time ON security_events(created_at);

-- Reset search_path
RESET search_path; 