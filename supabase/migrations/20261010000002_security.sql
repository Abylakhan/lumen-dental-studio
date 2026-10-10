-- =============================================================================
-- 0002 · Security: role helpers, integrity triggers, Row Level Security,
--        table grants and storage policies.
--
-- Model
--   anon (public visitors)        : read published content; create appointments
--                                   only through public.submit_appointment().
--   authenticated, no staff row   : same as anon (no admin access at all).
--   admin (active staff_users row): full read/write.
-- Doctors have no accounts.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Role helpers (SECURITY DEFINER so policies can read staff_users without
-- recursive RLS; search_path pinned to avoid hijacking).
-- ---------------------------------------------------------------------------
create or replace function public.current_staff_role()
returns public.staff_role
language sql stable security definer set search_path = public, pg_temp as $$
  select role from public.staff_users where user_id = auth.uid() and is_active
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(public.current_staff_role() = 'admin', false)
$$;

create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select public.current_staff_role() is not null
$$;

revoke all on function public.current_staff_role(), public.is_admin(), public.is_staff() from public;
grant execute on function public.current_staff_role(), public.is_admin(), public.is_staff() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Integrity triggers
-- ---------------------------------------------------------------------------

-- At most 10 active doctor profiles. The advisory lock serialises concurrent
-- activations so the limit cannot be exceeded by racing requests.
create or replace function public.enforce_active_doctor_limit()
returns trigger language plpgsql as $$
begin
  if new.is_active and (tg_op = 'INSERT' or not old.is_active) then
    perform pg_advisory_xact_lock(hashtext('doctors_active_limit'));
    if (select count(*) from public.doctors where is_active and id <> new.id) >= 10 then
      raise exception 'MAX_ACTIVE_DOCTORS' using errcode = 'P0001',
        hint = 'A maximum of 10 active doctor profiles is allowed. Deactivate one first.';
    end if;
  end if;
  return new;
end $$;
create trigger doctors_active_limit before insert or update of is_active on public.doctors
  for each row execute function public.enforce_active_doctor_limit();

-- No two live appointments with a concrete time may overlap for one doctor.
-- (Statuses that hold a slot: new, awaiting_confirmation, confirmed.)
create or replace function public.prevent_slot_conflicts()
returns trigger language plpgsql as $$
begin
  if new.slot_start is not null and new.doctor_id is not null
     and new.status in ('new', 'awaiting_confirmation', 'confirmed') then
    perform pg_advisory_xact_lock(hashtext('appt:' || new.doctor_id::text));
    if exists (
      select 1 from public.appointments a
      where a.doctor_id = new.doctor_id
        and a.id <> new.id
        and a.slot_start is not null
        and a.status in ('new', 'awaiting_confirmation', 'confirmed')
        and tstzrange(a.slot_start, a.slot_end) && tstzrange(new.slot_start, new.slot_end)
    ) then
      raise exception 'SLOT_CONFLICT' using errcode = '23P01',
        hint = 'This doctor already has an appointment at that time.';
    end if;
  end if;
  return new;
end $$;
create trigger appointments_no_overlap before insert or update of slot_start, slot_end, doctor_id, status
  on public.appointments for each row execute function public.prevent_slot_conflicts();

-- An admin cannot demote or deactivate their own account (prevents lock-out),
-- and the last active admin cannot be removed.
create or replace function public.protect_admin_accounts()
returns trigger language plpgsql as $$
declare
  remaining integer;
begin
  if tg_op = 'DELETE' then
    if old.role = 'admin' and old.is_active then
      select count(*) into remaining from public.staff_users
        where role = 'admin' and is_active and user_id <> old.user_id;
      if remaining = 0 then
        raise exception 'LAST_ADMIN' using errcode = 'P0001';
      end if;
    end if;
    return old;
  end if;
  if old.user_id = auth.uid() and (new.role <> 'admin' or not new.is_active) and old.role = 'admin' then
    raise exception 'CANNOT_DEMOTE_SELF' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger staff_protect_admins before update or delete on public.staff_users
  for each row execute function public.protect_admin_accounts();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.clinic_settings  enable row level security;
alter table public.clinic_hours     enable row level security;
alter table public.doctors          enable row level security;
alter table public.services         enable row level security;
alter table public.prices           enable row level security;
alter table public.doctor_services  enable row level security;
alter table public.doctor_schedules enable row level security;
alter table public.gallery_images   enable row level security;
alter table public.staff_users      enable row level security;
alter table public.appointments     enable row level security;

-- Clinic settings & hours: public read, admin write.
create policy settings_read  on public.clinic_settings for select to anon, authenticated using (true);
create policy settings_write on public.clinic_settings for all    to authenticated using (public.is_admin()) with check (public.is_admin());
create policy hours_read     on public.clinic_hours    for select to anon, authenticated using (true);
create policy hours_write    on public.clinic_hours    for all    to authenticated using (public.is_admin()) with check (public.is_admin());

-- Doctors: public sees active profiles; admin sees and writes all.
create policy doctors_read  on public.doctors for select to anon, authenticated using (is_active or public.is_staff());
create policy doctors_write on public.doctors for all    to authenticated using (public.is_admin()) with check (public.is_admin());

-- Services & prices: public sees active rows; admin writes.
create policy services_read  on public.services for select to anon, authenticated using (is_active or public.is_staff());
create policy services_write on public.services for all    to authenticated using (public.is_admin()) with check (public.is_admin());
create policy prices_read    on public.prices   for select to anon, authenticated using (is_active or public.is_staff());
create policy prices_write   on public.prices   for all    to authenticated using (public.is_admin()) with check (public.is_admin());

-- Doctor ↔ service links: public sees links between active doctors and services.
create policy doctor_services_read on public.doctor_services for select to anon, authenticated using (
  public.is_staff() or (
    exists (select 1 from public.doctors d where d.id = doctor_id and d.is_active)
    and exists (select 1 from public.services s where s.id = service_id and s.is_active)
  ));
create policy doctor_services_write on public.doctor_services for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Schedules are internal (admin only). The public sees availability only as
-- free slots via get_available_slots().
create policy schedules_write on public.doctor_schedules for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Gallery: public sees published images; real cases also need recorded consent.
create policy gallery_read on public.gallery_images for select to anon, authenticated using (
  public.is_staff() or (
    is_published and (kind <> 'case' or is_demo or (consent_obtained and 'website' = any (consent_scope)))
  ));
create policy gallery_write on public.gallery_images for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Staff allow-list: a user may read their own row (to learn they are admin);
-- only an existing admin can change it.
create policy staff_read_self on public.staff_users for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy staff_write on public.staff_users for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Appointments: patient data is visible only to the admin.
-- No public insert policy — submissions go through submit_appointment().
create policy appointments_read on public.appointments for select to authenticated
  using (public.is_admin());
create policy appointments_admin_insert on public.appointments for insert to authenticated
  with check (public.is_admin());
create policy appointments_admin_update on public.appointments for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy appointments_admin_delete on public.appointments for delete to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Grants (defence in depth on top of RLS)
-- ---------------------------------------------------------------------------
revoke all on public.appointments, public.staff_users, public.doctor_schedules from anon;
revoke insert, update, delete on
  public.clinic_settings, public.clinic_hours, public.doctors, public.services, public.prices,
  public.doctor_services, public.gallery_images
from anon;
grant select on
  public.clinic_settings, public.clinic_hours, public.doctors, public.services, public.prices,
  public.doctor_services, public.gallery_images
to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: one public bucket for website media. Files get random names; the
-- bucket cannot be listed by visitors. Only admins can upload/replace/delete.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 5242880, array['image/webp', 'image/jpeg', 'image/png', 'image/avif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy media_admin_select on storage.objects for select to authenticated
  using (bucket_id = 'media' and public.is_admin());
create policy media_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and public.is_admin());
create policy media_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'media' and public.is_admin()) with check (bucket_id = 'media' and public.is_admin());
create policy media_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'media' and public.is_admin());
