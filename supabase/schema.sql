-- Run this in Supabase SQL Editor after creating the project.
-- Creates tables, RLS, and trigger for new user profiles.

-- Profiles (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'user',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Admins can read all profiles"
  on public.profiles for select
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Kids (per user)
create table if not exists public.kids (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text,
  created_at timestamptz not null default now()
);

alter table public.kids enable row level security;

create policy "Users can manage own kids"
  on public.kids for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Admins can manage all kids"
  on public.kids for all
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Assessment records (per kid)
create table if not exists public.assessment_records (
  id uuid primary key default gen_random_uuid(),
  kid_id uuid not null references public.kids(id) on delete cascade,
  date date not null,
  created_at timestamptz not null default now()
);

alter table public.assessment_records enable row level security;

create policy "Users can manage records for own kids"
  on public.assessment_records for all
  using (
    exists (select 1 from public.kids k where k.id = kid_id and k.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.kids k where k.id = kid_id and k.user_id = auth.uid())
  );

create policy "Admins can manage all records"
  on public.assessment_records for all
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Assessment entries (per record)
create table if not exists public.assessment_entries (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.assessment_records(id) on delete cascade,
  type text not null check (type in ('parent', 'coach')),
  data jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.assessment_entries enable row level security;

create policy "Users can manage entries for own kids"
  on public.assessment_entries for all
  using (
    exists (
      select 1 from public.assessment_records r
      join public.kids k on k.id = r.kid_id
      where r.id = record_id and k.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.assessment_records r
      join public.kids k on k.id = r.kid_id
      where r.id = record_id and k.user_id = auth.uid()
    )
  );

create policy "Admins can manage all entries"
  on public.assessment_entries for all
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Create profile on signup (role = 'user')
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'user');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- After creating the admin user in Supabase Auth (Authentication -> Users -> Add user)
-- run: update public.profiles set role = 'admin' where email = 'admin@popskate.local';
