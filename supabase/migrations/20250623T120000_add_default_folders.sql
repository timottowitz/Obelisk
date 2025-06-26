-- Migration: add_default_folders
alter table public.project_templates
  add column default_folders jsonb not null default '[]'::jsonb;
