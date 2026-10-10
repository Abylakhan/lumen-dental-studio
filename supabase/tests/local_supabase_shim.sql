-- =============================================================================
-- LOCAL TESTING ONLY — never run this on a real Supabase project.
-- Emulates the parts of Supabase the migrations rely on, on plain PostgreSQL:
-- roles (anon, authenticated), Supabase's default grants, auth.users,
-- auth.uid() and the storage schema.
-- =============================================================================
create role anon nologin;
create role authenticated nologin;
grant usage on schema public to anon, authenticated;

-- Supabase grants these by default on new objects in "public"; emulating them
-- proves the migrations' explicit revokes and RLS do the protecting.
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;
alter default privileges in schema public grant execute on functions to anon, authenticated;

create schema auth;
grant usage on schema auth to anon, authenticated;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  encrypted_password text,
  last_sign_in_at timestamptz
);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant execute on function auth.uid() to anon, authenticated;

create schema storage;
grant usage on schema storage to anon, authenticated;
create table storage.buckets (
  id text primary key, name text, public boolean default false,
  file_size_limit bigint, allowed_mime_types text[]
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text, owner uuid, created_at timestamptz default now()
);
alter table storage.objects enable row level security;
grant all on storage.objects to anon, authenticated;
grant select on storage.buckets to anon, authenticated;
