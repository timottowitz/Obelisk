-- Tenant-specific email tables
-- This migration runs for each tenant schema

-- Email folders table
create table if not exists email_folders (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,                         -- References private.email_accounts(id)
  folder_id text not null,                          -- Microsoft Graph folder ID
  display_name text not null,
  parent_folder_id text,
  child_folder_count integer default 0,
  unread_item_count integer default 0,
  total_item_count integer default 0,
  is_hidden boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(account_id, folder_id)
);

-- Email messages table
create table if not exists emails (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,                         -- References private.email_accounts(id)
  message_id text not null,                         -- Microsoft Graph message ID
  conversation_id text,
  folder_id text,
  subject text,
  body_preview text,
  body_content text,
  body_type text check (body_type in ('text', 'html')),
  from_address text,
  from_name text,
  to_recipients jsonb,                              -- Array of {address, name}
  cc_recipients jsonb,
  bcc_recipients jsonb,
  reply_to jsonb,
  importance text check (importance in ('low', 'normal', 'high')),
  is_read boolean default false,
  is_draft boolean default false,
  has_attachments boolean default false,
  categories text[],
  flag_status text,
  internet_message_id text,
  web_link text,
  sent_at timestamptz,
  received_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- Case and contact linking
  case_id uuid,
  contact_ids uuid[],
  
  -- Full-text search
  search_vector tsvector,
  
  unique(account_id, message_id)
);

-- Email attachments table
create table if not exists email_attachments (
  id uuid primary key default gen_random_uuid(),
  email_id uuid not null references emails(id) on delete cascade,
  attachment_id text not null,                      -- Microsoft Graph attachment ID
  name text not null,
  content_type text,
  size integer,
  is_inline boolean default false,
  content_id text,                                  -- For inline attachments
  content_location text,
  storage_file_id uuid,                             -- Reference to storage_files if downloaded
  created_at timestamptz not null default now(),
  unique(email_id, attachment_id)
);

-- Email labels/tags for organization
create table if not exists email_labels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text,
  description text,
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(name)
);

-- Many-to-many relationship for email labels
create table if not exists email_label_assignments (
  id uuid primary key default gen_random_uuid(),
  email_id uuid not null references emails(id) on delete cascade,
  label_id uuid not null references email_labels(id) on delete cascade,
  assigned_by text not null,
  assigned_at timestamptz not null default now(),
  unique(email_id, label_id)
);

-- Email rules for automatic processing
create table if not exists email_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  is_active boolean default true,
  conditions jsonb not null,                        -- Rule conditions
  actions jsonb not null,                           -- Rule actions
  priority integer default 0,
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create indexes for performance
create index if not exists idx_email_folders_account_id on email_folders(account_id);
create index if not exists idx_emails_account_id on emails(account_id);
create index if not exists idx_emails_folder_id on emails(folder_id);
create index if not exists idx_emails_conversation_id on emails(conversation_id);
create index if not exists idx_emails_case_id on emails(case_id);
create index if not exists idx_emails_received_at on emails(received_at desc);
create index if not exists idx_emails_sent_at on emails(sent_at desc);
create index if not exists idx_emails_is_read on emails(is_read);
create index if not exists idx_emails_search_vector on emails using gin(search_vector);
create index if not exists idx_email_attachments_email_id on email_attachments(email_id);
create index if not exists idx_email_label_assignments_email_id on email_label_assignments(email_id);
create index if not exists idx_email_label_assignments_label_id on email_label_assignments(label_id);

-- Full-text search trigger
create or replace function update_email_search_vector()
returns trigger as $$
begin
  new.search_vector := 
    setweight(to_tsvector('english', coalesce(new.subject, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(new.from_name, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(new.from_address, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(new.body_preview, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(new.body_content, '')), 'D');
  return new;
end;
$$ language plpgsql;

create trigger trigger_update_email_search_vector
  before insert or update on emails
  for each row execute procedure update_email_search_vector();

-- Function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create triggers for updated_at
create trigger update_email_folders_updated_at
  before update on email_folders
  for each row execute procedure update_updated_at_column();

create trigger update_emails_updated_at
  before update on emails
  for each row execute procedure update_updated_at_column();

create trigger update_email_labels_updated_at
  before update on email_labels
  for each row execute procedure update_updated_at_column();

create trigger update_email_rules_updated_at
  before update on email_rules
  for each row execute procedure update_updated_at_column();

-- RLS policies (tenant isolation is handled by schema separation)
alter table email_folders enable row level security;
alter table emails enable row level security;
alter table email_attachments enable row level security;
alter table email_labels enable row level security;
alter table email_label_assignments enable row level security;
alter table email_rules enable row level security;

-- Basic RLS policies (actual tenant isolation is via schema)
create policy "All operations for authenticated users" on email_folders
  for all using (true);

create policy "All operations for authenticated users" on emails
  for all using (true);

create policy "All operations for authenticated users" on email_attachments
  for all using (true);

create policy "All operations for authenticated users" on email_labels
  for all using (true);

create policy "All operations for authenticated users" on email_label_assignments
  for all using (true);

create policy "All operations for authenticated users" on email_rules
  for all using (true);