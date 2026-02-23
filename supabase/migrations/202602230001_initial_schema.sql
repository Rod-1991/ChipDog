create extension if not exists "pgcrypto";

create table if not exists public.organizations (
  id bigint generated always as identity primary key,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  organization_id bigint not null references public.organizations (id) on delete restrict,
  role text not null check (role in ('owner', 'municipal_admin', 'staff')),
  full_name text not null,
  phone text,
  created_at timestamptz not null default now()
);

create table if not exists public.pets (
  id bigint generated always as identity primary key,
  organization_id bigint not null references public.organizations (id) on delete restrict,
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  species text not null,
  breed text,
  color text,
  birth_year int,
  is_lost boolean not null default false,
  photo_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.tags (
  id bigint generated always as identity primary key,
  organization_id bigint not null references public.organizations (id) on delete restrict,
  code text not null unique,
  pet_id bigint references public.pets (id) on delete set null,
  status text not null default 'available' check (status in ('available', 'linked', 'disabled')),
  created_at timestamptz not null default now()
);

create table if not exists public.scans (
  id bigint generated always as identity primary key,
  organization_id bigint not null references public.organizations (id) on delete restrict,
  tag_id bigint not null references public.tags (id) on delete cascade,
  scanned_at timestamptz not null default now(),
  approx_lat double precision,
  approx_lng double precision,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.pets enable row level security;
alter table public.tags enable row level security;
alter table public.scans enable row level security;

create or replace function public.current_org_id()
returns bigint
language sql
stable
as $$
  select organization_id from public.profiles where id = auth.uid()
$$;

create or replace function public.is_municipal_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'municipal_admin'
  )
$$;

create policy "profiles self select"
on public.profiles
for select
using (id = auth.uid());

create policy "profiles self upsert"
on public.profiles
for all
using (id = auth.uid())
with check (id = auth.uid());

create policy "profiles municipal admin read org"
on public.profiles
for select
using (
  public.is_municipal_admin()
  and organization_id = public.current_org_id()
);

create policy "pets owner read"
on public.pets
for select
using (owner_profile_id = auth.uid());

create policy "pets owner write"
on public.pets
for all
using (owner_profile_id = auth.uid())
with check (owner_profile_id = auth.uid());

create policy "pets municipal admin org read"
on public.pets
for select
using (
  public.is_municipal_admin()
  and organization_id = public.current_org_id()
);

create policy "pets municipal admin org write"
on public.pets
for update
using (
  public.is_municipal_admin()
  and organization_id = public.current_org_id()
)
with check (
  public.is_municipal_admin()
  and organization_id = public.current_org_id()
);

create policy "tags municipal admin manage"
on public.tags
for all
using (
  public.is_municipal_admin()
  and organization_id = public.current_org_id()
)
with check (
  public.is_municipal_admin()
  and organization_id = public.current_org_id()
);

create policy "tags owner can link available org tag"
on public.tags
for update
using (
  exists (
    select 1
    from public.pets p
    where p.id = tags.pet_id
      and p.owner_profile_id = auth.uid()
  )
  or (
    status = 'available'
    and pet_id is null
    and organization_id = public.current_org_id()
  )
)
with check (
  exists (
    select 1
    from public.pets p
    where p.id = tags.pet_id
      and p.owner_profile_id = auth.uid()
      and p.organization_id = tags.organization_id
  )
);

create policy "scans anonymous insert only existing tag"
on public.scans
for insert
to anon
with check (
  exists (
    select 1
    from public.tags t
    where t.id = scans.tag_id
      and t.organization_id = scans.organization_id
  )
);

create policy "scans municipal admin read"
on public.scans
for select
using (
  public.is_municipal_admin()
  and organization_id = public.current_org_id()
);
