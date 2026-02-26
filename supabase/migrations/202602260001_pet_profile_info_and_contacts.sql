-- Add fields required by mobile pet profile info/contact detail screens.
alter table public.pets
  add column if not exists birth_date date,
  add column if not exists owner_contacts jsonb not null default '[]'::jsonb,
  add column if not exists extra_info_fields jsonb not null default '[]'::jsonb;
