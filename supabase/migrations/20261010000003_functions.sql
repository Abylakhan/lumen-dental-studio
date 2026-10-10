-- =============================================================================
-- 0003 · Functions (RPC)
--
-- Public (anon):
--   get_available_slots(doctor, service, date) → free start times (realtime mode)
--   submit_appointment(payload jsonb)          → validated appointment request
-- Admin access to everything else is through RLS-protected tables.
-- All functions are SECURITY DEFINER with a pinned search_path and perform
-- their own authorisation checks.
-- =============================================================================

-- Effective duration of a service for a doctor (override → service → doctor default).
create or replace function public.effective_duration(p_doctor uuid, p_service uuid)
returns integer
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(ds.duration_override, s.duration_minutes, d.appointment_minutes, 30)
  from public.doctors d
  left join public.services s on s.id = p_service
  left join public.doctor_services ds on ds.doctor_id = d.id and ds.service_id = p_service
  where d.id = p_doctor
$$;

-- ---------------------------------------------------------------------------
-- Free slots for one doctor/service/day, in clinic local time.
-- Respects: clinic hours, doctor schedule + break, lead time, booking window,
-- and appointments that already hold a slot.
-- ---------------------------------------------------------------------------
create or replace function public.get_available_slots(p_doctor uuid, p_service uuid, p_date date)
returns setof timestamptz
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  cfg      public.clinic_settings;
  sched    public.doctor_schedules;
  hrs      public.clinic_hours;
  tz       text;
  today    date;
  dur      integer;
  win_from timestamptz;
  win_to   timestamptz;
begin
  select * into cfg from public.clinic_settings where id = 1;
  if not found then return; end if;
  tz := cfg.timezone;
  today := (now() at time zone tz)::date;
  if p_date is null or p_date < today or p_date > today + cfg.max_days_ahead then return; end if;

  -- Doctor must be active and offer this active service.
  if not exists (
    select 1 from public.doctors d
    join public.doctor_services ds on ds.doctor_id = d.id
    join public.services s on s.id = ds.service_id
    where d.id = p_doctor and d.is_active and s.id = p_service and s.is_active
  ) then return; end if;

  select * into hrs from public.clinic_hours where weekday = extract(dow from p_date)::smallint;
  if not found or not hrs.is_open then return; end if;
  select * into sched from public.doctor_schedules
    where doctor_id = p_doctor and weekday = extract(dow from p_date)::smallint;
  if not found then return; end if;

  dur := public.effective_duration(p_doctor, p_service);
  -- Working window = intersection of clinic hours and the doctor's hours.
  win_from := (p_date + greatest(hrs.opens, sched.starts_at)) at time zone tz;
  win_to   := (p_date + least(hrs.closes, sched.ends_at)) at time zone tz;

  return query
    select c.t
    from generate_series(win_from, win_to - make_interval(mins => dur), make_interval(mins => cfg.slot_step_minutes)) as c(t)
    where c.t >= now() + make_interval(mins => cfg.min_lead_minutes)
      and (
        sched.break_start is null
        or not tstzrange(c.t, c.t + make_interval(mins => dur))
               && tstzrange((p_date + sched.break_start) at time zone tz, (p_date + sched.break_end) at time zone tz)
      )
      and not exists (
        select 1 from public.appointments a
        where a.doctor_id = p_doctor
          and a.slot_start is not null
          and a.status in ('new', 'awaiting_confirmation', 'confirmed')
          and tstzrange(a.slot_start, a.slot_end) && tstzrange(c.t, c.t + make_interval(mins => dur))
      )
    order by c.t;
end $$;

-- ---------------------------------------------------------------------------
-- Public appointment request. Every field is validated server-side; the
-- client-side checks are only for usability.
-- Errors are raised with machine-readable messages (e.g. 'INVALID_PHONE').
-- ---------------------------------------------------------------------------
create or replace function public.submit_appointment(p jsonb)
returns jsonb
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare
  cfg        public.clinic_settings;
  tz         text;
  today      date;
  v_name     text := btrim(coalesce(p ->> 'name', ''));
  v_digits   text := regexp_replace(coalesce(p ->> 'phone', ''), '\D', '', 'g');
  v_phone    text;
  v_date     date;
  v_doctor   uuid;
  v_service  uuid;
  v_window   text := nullif(p ->> 'window', '');
  v_method   text := coalesce(nullif(p ->> 'method', ''), 'call');
  v_comment  text := nullif(btrim(coalesce(p ->> 'comment', '')), '');
  v_lang     text := coalesce(nullif(p ->> 'language', ''), 'ru');
  v_slot     timestamptz;
  v_end      timestamptz;
  v_status   public.appointment_status := 'new';
  v_ref      text;
  attempt    integer := 0;
begin
  select * into cfg from public.clinic_settings where id = 1;
  tz := coalesce(cfg.timezone, 'Asia/Almaty');
  today := (now() at time zone tz)::date;

  -- Consent
  if coalesce((p ->> 'consent')::boolean, false) is not true then
    raise exception 'CONSENT_REQUIRED' using errcode = 'P0001';
  end if;

  -- Name: 2–80 chars, at least two letters, no digits
  if char_length(v_name) not between 2 and 80 or v_name ~ '[0-9]' or v_name !~ '[[:alpha:]].*[[:alpha:]]' then
    raise exception 'INVALID_NAME' using errcode = 'P0001';
  end if;

  -- Phone: Kazakhstan, normalised to +7XXXXXXXXXX
  if v_digits like '8%' then v_digits := '7' || substr(v_digits, 2); end if;
  if v_digits !~ '^7[67][0-9]{9}$' then
    raise exception 'INVALID_PHONE' using errcode = 'P0001';
  end if;
  v_phone := '+' || v_digits;

  if v_method not in ('call', 'whatsapp', 'sms') then raise exception 'INVALID_METHOD' using errcode = 'P0001'; end if;
  if v_lang not in ('ru', 'kk', 'en') then v_lang := 'ru'; end if;
  if v_window is not null and v_window not in ('any', 'morning', 'day', 'evening') then
    raise exception 'INVALID_WINDOW' using errcode = 'P0001';
  end if;
  if v_comment is not null and char_length(v_comment) > 500 then
    raise exception 'COMMENT_TOO_LONG' using errcode = 'P0001';
  end if;

  -- Date: within the booking window, on a day the clinic is open
  begin
    v_date := (p ->> 'date')::date;
  exception when others then
    raise exception 'INVALID_DATE' using errcode = 'P0001';
  end;
  if v_date is null or v_date < today or v_date > today + cfg.max_days_ahead then
    raise exception 'INVALID_DATE' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.clinic_hours where weekday = extract(dow from v_date)::smallint and is_open) then
    raise exception 'DATE_CLOSED' using errcode = 'P0001';
  end if;

  -- Doctor / service (both optional; 'any' / 'consultation' map to null)
  if nullif(p ->> 'doctor_id', '') is not null and p ->> 'doctor_id' <> 'any' then
    begin
      v_doctor := (p ->> 'doctor_id')::uuid;
    exception when others then
      raise exception 'INVALID_DOCTOR' using errcode = 'P0001';
    end;
    if not exists (select 1 from public.doctors where id = v_doctor and is_active) then
      raise exception 'INVALID_DOCTOR' using errcode = 'P0001';
    end if;
  end if;
  if nullif(p ->> 'service_id', '') is not null and p ->> 'service_id' <> 'consultation' then
    begin
      v_service := (p ->> 'service_id')::uuid;
    exception when others then
      raise exception 'INVALID_SERVICE' using errcode = 'P0001';
    end;
    if not exists (select 1 from public.services where id = v_service and is_active) then
      raise exception 'INVALID_SERVICE' using errcode = 'P0001';
    end if;
  end if;
  if v_doctor is not null and v_service is not null and not exists (
    select 1 from public.doctor_services where doctor_id = v_doctor and service_id = v_service
  ) then
    raise exception 'SERVICE_NOT_OFFERED' using errcode = 'P0001';
  end if;

  -- Basic abuse protection: per-phone and global rate limits
  if (select count(*) from public.appointments where patient_phone = v_phone and created_at > now() - interval '1 hour') >= 3 then
    raise exception 'RATE_LIMITED' using errcode = 'P0001';
  end if;
  if (select count(*) from public.appointments where created_at > now() - interval '10 minutes') >= 60 then
    raise exception 'RATE_LIMITED' using errcode = 'P0001';
  end if;

  -- Real-time slot (only when the clinic enabled it and a concrete slot was chosen)
  if cfg.booking_mode = 'realtime' and nullif(p ->> 'slot_start', '') is not null then
    if v_doctor is null or v_service is null then
      raise exception 'SLOT_REQUIRES_DOCTOR_AND_SERVICE' using errcode = 'P0001';
    end if;
    begin
      v_slot := (p ->> 'slot_start')::timestamptz;
    exception when others then
      raise exception 'SLOT_UNAVAILABLE' using errcode = 'P0001';
    end;
    if (v_slot at time zone tz)::date <> v_date
       or not exists (select 1 from public.get_available_slots(v_doctor, v_service, v_date) s where s = v_slot) then
      raise exception 'SLOT_UNAVAILABLE' using errcode = 'P0001';
    end if;
    v_end := v_slot + make_interval(mins => public.effective_duration(v_doctor, v_service));
    v_status := 'awaiting_confirmation';
  end if;

  -- Insert with a unique human-friendly reference
  loop
    attempt := attempt + 1;
    v_ref := 'REQ-' || to_char(now() at time zone tz, 'YYMMDD') || '-'
             || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 5));
    begin
      insert into public.appointments (
        reference, status, doctor_id, service_id, preferred_date, preferred_window,
        slot_start, slot_end, patient_name, patient_phone, contact_method, comment, language, consent
      ) values (
        v_ref, v_status, v_doctor, v_service, v_date, coalesce(v_window, 'any'),
        v_slot, v_end, v_name, v_phone, v_method, v_comment, v_lang, true
      );
      exit;
    exception
      when unique_violation then
        if attempt >= 5 then raise; end if;
      when exclusion_violation then
        raise exception 'SLOT_UNAVAILABLE' using errcode = 'P0001';
    end;
  end loop;

  return jsonb_build_object('reference', v_ref, 'status', v_status, 'slot_start', v_slot);
end $$;

-- ---------------------------------------------------------------------------
-- Execute permissions
-- ---------------------------------------------------------------------------
revoke all on function
  public.effective_duration(uuid, uuid),
  public.get_available_slots(uuid, uuid, date),
  public.submit_appointment(jsonb)
from public;

grant execute on function public.get_available_slots(uuid, uuid, date), public.submit_appointment(jsonb) to anon, authenticated;
grant execute on function public.effective_duration(uuid, uuid) to authenticated;
