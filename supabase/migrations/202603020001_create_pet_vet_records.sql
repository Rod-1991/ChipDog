create table if not exists public.pet_vet_records (
  id bigint generated always as identity primary key,
  pet_id bigint not null references public.pets (id) on delete cascade,
  visit_date text not null,
  doctor_name text,
  clinic_name text,
  reason text not null,
  symptoms jsonb not null default '[]'::jsonb,
  diagnosis text,
  treatment text,
  description text,
  attachments jsonb not null default '[]'::jsonb,
  reference_photos jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists pet_vet_records_pet_id_created_at_idx
  on public.pet_vet_records (pet_id, created_at desc);
