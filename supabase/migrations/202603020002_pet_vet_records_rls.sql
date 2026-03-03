alter table public.pet_vet_records enable row level security;

drop policy if exists "pet_vet_records owner read" on public.pet_vet_records;
drop policy if exists "pet_vet_records owner insert" on public.pet_vet_records;
drop policy if exists "pet_vet_records owner update" on public.pet_vet_records;
drop policy if exists "pet_vet_records owner delete" on public.pet_vet_records;

do $$
declare
  owner_col text;
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'pets'
      and column_name = 'owner_profile_id'
  ) then
    owner_col := 'owner_profile_id';
  elsif exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'pets'
      and column_name = 'owner_id'
  ) then
    owner_col := 'owner_id';
  else
    raise exception 'No owner column found on public.pets. Expected owner_profile_id or owner_id';
  end if;

  execute format($f$
    create policy "pet_vet_records owner read"
    on public.pet_vet_records
    for select
    using (
      exists (
        select 1
        from public.pets p
        where p.id = pet_vet_records.pet_id
          and p.%I = auth.uid()
      )
    )
  $f$, owner_col);

  execute format($f$
    create policy "pet_vet_records owner insert"
    on public.pet_vet_records
    for insert
    with check (
      exists (
        select 1
        from public.pets p
        where p.id = pet_vet_records.pet_id
          and p.%I = auth.uid()
      )
    )
  $f$, owner_col);

  execute format($f$
    create policy "pet_vet_records owner update"
    on public.pet_vet_records
    for update
    using (
      exists (
        select 1
        from public.pets p
        where p.id = pet_vet_records.pet_id
          and p.%I = auth.uid()
      )
    )
    with check (
      exists (
        select 1
        from public.pets p
        where p.id = pet_vet_records.pet_id
          and p.%I = auth.uid()
      )
    )
  $f$, owner_col, owner_col);

  execute format($f$
    create policy "pet_vet_records owner delete"
    on public.pet_vet_records
    for delete
    using (
      exists (
        select 1
        from public.pets p
        where p.id = pet_vet_records.pet_id
          and p.%I = auth.uid()
      )
    )
  $f$, owner_col);
end $$;
