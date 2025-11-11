-- Migration: add selected_elements JSONB to educational_resources
-- Date: 2025-11-11

begin;

-- Add column if not exists
alter table if exists public.educational_resources
  add column if not exists selected_elements jsonb not null default '[]'::jsonb;

-- Create GIN index for JSONB operations
create index if not exists idx_educational_resources_selected_elements
  on public.educational_resources
  using gin (selected_elements);

commit;