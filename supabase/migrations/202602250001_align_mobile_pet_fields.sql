-- Align pets schema with fields used by mobile app profile/detail screens.
alter table public.pets
  add column if not exists sex text,
  add column if not exists weight_kg numeric(6,2),
  add column if not exists owner_phone text,
  add column if not exists owner_whatsapp text,
  add column if not exists public_notes text,
  add column if not exists allergies text,
  add column if not exists medications text,
  add column if not exists conditions text,
  add column if not exists vet_name text,
  add column if not exists vet_phone text;
