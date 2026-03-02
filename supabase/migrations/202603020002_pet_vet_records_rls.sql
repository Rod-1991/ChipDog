alter table public.pet_vet_records enable row level security;

create policy "pet_vet_records owner read"
on public.pet_vet_records
for select
using (
  exists (
    select 1
    from public.pets p
    where p.id = pet_vet_records.pet_id
      and p.owner_profile_id = auth.uid()
  )
);

create policy "pet_vet_records owner insert"
on public.pet_vet_records
for insert
with check (
  exists (
    select 1
    from public.pets p
    where p.id = pet_vet_records.pet_id
      and p.owner_profile_id = auth.uid()
  )
);

create policy "pet_vet_records owner update"
on public.pet_vet_records
for update
using (
  exists (
    select 1
    from public.pets p
    where p.id = pet_vet_records.pet_id
      and p.owner_profile_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.pets p
    where p.id = pet_vet_records.pet_id
      and p.owner_profile_id = auth.uid()
  )
);

create policy "pet_vet_records owner delete"
on public.pet_vet_records
for delete
using (
  exists (
    select 1
    from public.pets p
    where p.id = pet_vet_records.pet_id
      and p.owner_profile_id = auth.uid()
  )
);
