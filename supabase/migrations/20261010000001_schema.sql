-- =============================================================================
-- 0001 · Schema
-- Clinic content, staff accounts, schedules and appointment requests.
-- Localised text columns are jsonb shaped {"ru": "…", "kk": "…", "en": "…"}.
-- =============================================================================

-- Only one role today. More roles can be added later with
--   alter type public.staff_role add value 'reception';
-- plus matching policies — the rest of the schema does not change.
create type public.staff_role as enum ('admin');
create type public.appointment_status as enum
  ('new', 'awaiting_confirmation', 'confirmed', 'completed', 'cancelled', 'no_show');

-- Shared trigger: keep updated_at current.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Clinic settings (single row)
-- ---------------------------------------------------------------------------
create table public.clinic_settings (
  id                smallint primary key default 1 check (id = 1),
  name              text not null default 'Dental Clinic',
  short_name        text,
  phone             text check (phone is null or phone ~ '^\+[0-9]{10,15}$'),
  phone_display     text,
  whatsapp          text check (whatsapp is null or whatsapp ~ '^[0-9]{10,15}$'),
  email             text,
  address           jsonb not null default '{}'::jsonb,
  city              jsonb not null default '{}'::jsonb,
  latitude          numeric(9, 6),
  longitude         numeric(9, 6),
  map_zoom          smallint not null default 15,
  timezone          text not null default 'Asia/Almaty',
  social            jsonb not null default '[]'::jsonb,   -- [{id,label,url}]
  review_platforms  jsonb not null default '[]'::jsonb,   -- [{id,label,url}]
  -- 'request'  : patients send a preferred day/time window; staff confirm.
  -- 'realtime' : patients pick a free slot computed from doctor schedules;
  --              the slot is held until staff confirm or cancel.
  booking_mode      text not null default 'request' check (booking_mode in ('request', 'realtime')),
  slot_step_minutes smallint not null default 15 check (slot_step_minutes between 5 and 120),
  min_lead_minutes  integer  not null default 120 check (min_lead_minutes between 0 and 10080),
  max_days_ahead    smallint not null default 60 check (max_days_ahead between 1 and 365),
  demo_mode         boolean not null default true,
  updated_at        timestamptz not null default now()
);
create trigger clinic_settings_touch before update on public.clinic_settings
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Clinic opening hours (0 = Sunday … 6 = Saturday)
-- ---------------------------------------------------------------------------
create table public.clinic_hours (
  weekday  smallint primary key check (weekday between 0 and 6),
  is_open  boolean not null default true,
  opens    time,
  closes   time,
  check (not is_open or (opens is not null and closes is not null and opens < closes))
);

-- ---------------------------------------------------------------------------
-- Doctors (max 10 active — enforced by trigger in 0002)
-- ---------------------------------------------------------------------------
create table public.doctors (
  id                  uuid primary key default gen_random_uuid(),
  slug                text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,48}$'),
  is_active           boolean not null default true,
  is_placeholder      boolean not null default false,
  sort_order          integer not null default 0,
  name                jsonb not null default '{}'::jsonb,
  specialty           jsonb not null default '{}'::jsonb,
  bio                 jsonb,
  education           jsonb,
  experience          jsonb,
  languages           text[] not null default '{}',
  photo_path          text,
  photo_alt           jsonb not null default '{}'::jsonb,
  whatsapp            text check (whatsapp is null or whatsapp ~ '^[0-9]{10,15}$'),
  appointment_minutes smallint not null default 30 check (appointment_minutes between 10 and 240),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create trigger doctors_touch before update on public.doctors
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Services
-- ---------------------------------------------------------------------------
create table public.services (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,48}$'),
  is_active        boolean not null default true,
  sort_order       integer not null default 0,
  category         text not null check (category in ('therapy', 'surgery', 'orthodontics', 'aesthetics', 'prevention', 'kids')),
  title            jsonb not null default '{}'::jsonb,
  short            jsonb not null default '{}'::jsonb,
  intro            jsonb not null default '{}'::jsonb,
  steps            jsonb not null default '[]'::jsonb,   -- [{ru,kk,en}, …]
  prep             jsonb not null default '[]'::jsonb,   -- [{ru,kk,en}, …]
  duration_minutes smallint not null default 30 check (duration_minutes between 10 and 480),
  duration_label   jsonb,                                -- optional display text, e.g. "Several visits"
  image_path       text,
  image_alt        jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create trigger services_touch before update on public.services
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Price list
-- ---------------------------------------------------------------------------
create table public.prices (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,48}$'),
  is_active   boolean not null default true,
  sort_order  integer not null default 0,
  category    text not null check (category in ('diagnostics', 'therapy', 'hygiene', 'aesthetics', 'orthodontics', 'surgery', 'kids')),
  service_id  uuid references public.services (id) on delete set null,
  title       jsonb not null default '{}'::jsonb,
  note        jsonb not null default '{}'::jsonb,
  price       integer not null check (price >= 0),
  promo_price integer check (promo_price is null or (promo_price >= 0 and promo_price < price)),
  promo_until date,
  is_from     boolean not null default true,
  is_popular  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger prices_touch before update on public.prices
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Doctor ↔ service (with optional doctor-specific price / duration)
-- ---------------------------------------------------------------------------
create table public.doctor_services (
  doctor_id         uuid not null references public.doctors (id) on delete cascade,
  service_id        uuid not null references public.services (id) on delete cascade,
  price_override    integer check (price_override is null or price_override >= 0),
  duration_override smallint check (duration_override is null or duration_override between 10 and 480),
  primary key (doctor_id, service_id)
);

-- ---------------------------------------------------------------------------
-- Weekly working hours per doctor, with one optional break
-- ---------------------------------------------------------------------------
create table public.doctor_schedules (
  doctor_id   uuid not null references public.doctors (id) on delete cascade,
  weekday     smallint not null check (weekday between 0 and 6),
  starts_at   time not null,
  ends_at     time not null,
  break_start time,
  break_end   time,
  primary key (doctor_id, weekday),
  check (starts_at < ends_at),
  check ((break_start is null) = (break_end is null)),
  check (break_start is null or (break_start < break_end and break_start >= starts_at and break_end <= ends_at))
);

-- ---------------------------------------------------------------------------
-- Gallery: clinic interiors, general images and before/after cases
-- ---------------------------------------------------------------------------
create table public.gallery_images (
  id               uuid primary key default gen_random_uuid(),
  kind             text not null check (kind in ('interior', 'case', 'general')),
  category         text,          -- case category: whitening | restoration | orthodontics | veneers
  service_id       uuid references public.services (id) on delete set null,
  image_path       text,          -- interior / general
  before_path      text,          -- case
  after_path       text,          -- case
  simulate_before  text check (simulate_before is null or simulate_before in ('stain', 'dull')),
  title            jsonb not null default '{}'::jsonb,
  caption          jsonb not null default '{}'::jsonb,
  alt              jsonb not null default '{}'::jsonb,
  is_published     boolean not null default false,
  is_demo          boolean not null default false,
  sort_order       integer not null default 0,
  consent_obtained boolean not null default false,
  consent_date     date,
  consent_scope    text[] not null default '{}',
  consent_ref      text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (kind <> 'case' or (before_path is not null and after_path is not null)),
  check (kind = 'case' or image_path is not null),
  -- A real (non-demo) patient case can only be published with written consent for the website.
  constraint gallery_case_requires_consent check (
    not (kind = 'case' and is_published and not is_demo)
    or (consent_obtained and 'website' = any (consent_scope))
  )
);
create trigger gallery_touch before update on public.gallery_images
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Staff allow-list. A Supabase Auth user can use the admin panel ONLY if it
-- has an active row here. Rows are created manually with SQL (see SETUP.md);
-- there is no public registration and no way to self-assign a role.
-- ---------------------------------------------------------------------------
create table public.staff_users (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  role         public.staff_role not null default 'admin',
  display_name text,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Appointment requests (patients never have accounts)
-- ---------------------------------------------------------------------------
create table public.appointments (
  id               uuid primary key default gen_random_uuid(),
  reference        text not null unique,
  status           public.appointment_status not null default 'new',
  doctor_id        uuid references public.doctors (id) on delete set null,
  service_id       uuid references public.services (id) on delete set null,
  preferred_date   date not null,
  preferred_window text check (preferred_window is null or preferred_window in ('any', 'morning', 'day', 'evening')),
  slot_start       timestamptz,
  slot_end         timestamptz,
  patient_name     text not null check (char_length(patient_name) between 2 and 80),
  patient_phone    text not null check (patient_phone ~ '^\+7[67][0-9]{9}$'),
  contact_method   text not null default 'call' check (contact_method in ('call', 'whatsapp', 'sms')),
  comment          text check (comment is null or char_length(comment) <= 500),
  language         text not null default 'ru' check (language in ('ru', 'kk', 'en')),
  consent          boolean not null check (consent),
  staff_notes      text check (staff_notes is null or char_length(staff_notes) <= 2000),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check ((slot_start is null) = (slot_end is null)),
  check (slot_end is null or slot_end > slot_start)
);
create index appointments_doctor_slot_idx on public.appointments (doctor_id, slot_start);
create index appointments_status_idx on public.appointments (status);
create index appointments_date_idx on public.appointments (preferred_date);
create index appointments_phone_created_idx on public.appointments (patient_phone, created_at);
create trigger appointments_touch before update on public.appointments
  for each row execute function public.touch_updated_at();
