-- =====================================================================
--  HB+ Portal - Supabase schema
--  Run this ONCE in: Supabase Dashboard -> SQL Editor -> New query
--  What it does:
--    1. Blocks sign-ups from any email outside the allowed domain (server side)
--    2. Creates a `profiles` table (stores user data + role)
--    3. Locks the table down with Row Level Security (RLS)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) DOMAIN RESTRICTION (server-side, cannot be bypassed from the client)
--    To change the allowed domain, edit the pattern below AND set
--    EXPO_PUBLIC_ALLOWED_DOMAIN in your .env / Netlify settings.
-- ---------------------------------------------------------------------
create or replace function public.enforce_email_domain()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is null or lower(new.email) not like '%@hbplus.fit' then
    raise exception 'Access restricted: only @hbplus.fit accounts are allowed';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_email_domain on auth.users;
create trigger enforce_email_domain
  before insert or update of email on auth.users
  for each row execute function public.enforce_email_domain();

-- ---------------------------------------------------------------------
-- 2) PROFILES TABLE (user data + role)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  email         text not null unique,
  full_name     text,
  avatar_url    text,
  role          text not null default 'user' check (role in ('admin', 'user')),
  created_at    timestamptz not null default now(),
  last_login_at timestamptz
);

-- Automatically create a profile when a user signs up (role is always 'user').
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 3) ROW LEVEL SECURITY
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;

-- Helper used by policies. SECURITY DEFINER avoids infinite policy recursion.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  );
$$;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());

-- A user may only create THEIR OWN row, and only with role = 'user'.
drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self"
  on public.profiles for insert to authenticated
  with check (
    id = auth.uid()
    and role = 'user'
    and lower(email) = lower(auth.jwt() ->> 'email')
  );

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Column-level privileges: nobody can change `role` through the API.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant insert (id, email, full_name, avatar_url) on public.profiles to authenticated;
grant update (full_name, avatar_url, last_login_at) on public.profiles to authenticated;

-- ---------------------------------------------------------------------
-- 4) MAKE YOURSELF AN ADMIN (run AFTER your first login)
-- ---------------------------------------------------------------------
-- update public.profiles set role = 'admin' where email = 'you@hbplus.fit';
