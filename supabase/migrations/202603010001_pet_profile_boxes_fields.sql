-- Add fields required by redesigned pet profile information/contact sections.
alter table public.pets
  add column if not exists birth_date_text text,
  add column if not exists contact_primary_name text,
  add column if not exists contact_secondary_name text,
  add column if not exists contact_secondary_phone text;
