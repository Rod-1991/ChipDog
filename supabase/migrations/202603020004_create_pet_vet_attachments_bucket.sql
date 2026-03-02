-- Storage bucket + RLS for veterinary attachments (photos/PDF).
insert into storage.buckets (id, name, public)
values ('pet-vet-attachments', 'pet-vet-attachments', false)
on conflict (id) do nothing;

-- Read only own folder objects: <auth.uid()>/...
drop policy if exists "pet vet attachments read own" on storage.objects;
drop policy if exists "pet vet attachments insert own" on storage.objects;
drop policy if exists "pet vet attachments update own" on storage.objects;
drop policy if exists "pet vet attachments delete own" on storage.objects;

create policy "pet vet attachments read own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'pet-vet-attachments'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "pet vet attachments insert own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'pet-vet-attachments'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "pet vet attachments update own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'pet-vet-attachments'
  and split_part(name, '/', 1) = auth.uid()::text
)
with check (
  bucket_id = 'pet-vet-attachments'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "pet vet attachments delete own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'pet-vet-attachments'
  and split_part(name, '/', 1) = auth.uid()::text
);
