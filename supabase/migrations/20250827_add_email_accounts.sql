-- Migration: Add email accounts and OAuth tokens for email integration
-- Date: 2025-08-27
-- Description: Support for Microsoft Graph email integration with Clerk OAuth

-- Create email_accounts table in private schema (global)
create table if not exists private.email_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,                            -- Clerk userId
  organization_id text not null,                    -- Organization ID for multi-tenancy
  provider text not null check (provider in ('microsoft')),
  provider_account_id text not null,                -- Graph user id
  email_address text not null,
  display_name text,
  scopes text[],                                    -- Array of granted scopes
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_sync_at timestamptz,
  sync_status text check (sync_status in ('idle', 'syncing', 'failed')),
  sync_error text,
  unique(user_id, organization_id, provider)
);

-- Create indexes for email_accounts
create index if not exists idx_email_accounts_user_id on private.email_accounts(user_id);
create index if not exists idx_email_accounts_org_id on private.email_accounts(organization_id);
create index if not exists idx_email_accounts_provider on private.email_accounts(provider);
create index if not exists idx_email_accounts_email on private.email_accounts(email_address);

-- Optional: OAuth token storage (if we need to persist tokens beyond Clerk)
-- This is useful for background sync operations
create table if not exists private.oauth_email_tokens (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references private.email_accounts(id) on delete cascade,
  provider text not null,
  scope text not null,
  access_token_encrypted text,                      -- Encrypted at application layer
  expires_at timestamptz,
  refresh_token_encrypted text,                     -- Encrypted at application layer
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create index for oauth_email_tokens
create index if not exists idx_oauth_email_tokens_account_id on private.oauth_email_tokens(account_id);
create index if not exists idx_oauth_email_tokens_expires_at on private.oauth_email_tokens(expires_at);

-- Email sync state tracking
create table if not exists private.email_sync_cursors (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references private.email_accounts(id) on delete cascade,
  folder_id text not null,
  delta_link text,                                  -- Microsoft Graph delta link for incremental sync
  last_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(account_id, folder_id)
);

-- Create index for email_sync_cursors
create index if not exists idx_email_sync_cursors_account_id on private.email_sync_cursors(account_id);

-- RLS policies for email_accounts (users can only see their own accounts)
alter table private.email_accounts enable row level security;

create policy "Users can view their own email accounts"
  on private.email_accounts for select
  using (auth.uid()::text = user_id);

create policy "Users can insert their own email accounts"
  on private.email_accounts for insert
  with check (auth.uid()::text = user_id);

create policy "Users can update their own email accounts"
  on private.email_accounts for update
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

create policy "Users can delete their own email accounts"
  on private.email_accounts for delete
  using (auth.uid()::text = user_id);

-- RLS policies for oauth_email_tokens
alter table private.oauth_email_tokens enable row level security;

create policy "Service role only for oauth_email_tokens"
  on private.oauth_email_tokens for all
  using (auth.role() = 'service_role');

-- RLS policies for email_sync_cursors
alter table private.email_sync_cursors enable row level security;

create policy "Service role only for email_sync_cursors"
  on private.email_sync_cursors for all
  using (auth.role() = 'service_role');

-- Function to update updated_at timestamp
create or replace function private.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create triggers for updated_at
create trigger update_email_accounts_updated_at
  before update on private.email_accounts
  for each row execute procedure private.update_updated_at_column();

create trigger update_oauth_email_tokens_updated_at
  before update on private.oauth_email_tokens
  for each row execute procedure private.update_updated_at_column();

create trigger update_email_sync_cursors_updated_at
  before update on private.email_sync_cursors
  for each row execute procedure private.update_updated_at_column();

-- Grant permissions to authenticated users
grant select, insert, update, delete on private.email_accounts to authenticated;
grant select on private.oauth_email_tokens to authenticated;
grant select on private.email_sync_cursors to authenticated;

-- Grant full permissions to service role for background operations
grant all on private.email_accounts to service_role;
grant all on private.oauth_email_tokens to service_role;
grant all on private.email_sync_cursors to service_role;