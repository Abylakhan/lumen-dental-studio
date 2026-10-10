/**
 * LOCAL TESTING ONLY — an in-browser fake backend (localhost + ?mock=1).
 *
 * Seeded from config.js and stored in this browser's localStorage. It mirrors
 * the database rules that matter for the UI (10-doctor limit, consent rule,
 * slot conflicts, booking validation) so the admin panel and real-time
 * booking can be exercised without a Supabase project. It is never used when
 * js/backend-config.js is filled in and it cannot reach any real data.
 *
 * Mock login: admin@demo.local / demo-admin-2026
 */
import SITE_SOURCE from '../../config.js';

const KEY = 'lumen.mock.db';
const SESSION_KEY = 'lumen.mock.session';
const SEED = JSON.parse(JSON.stringify(SITE_SOURCE)); // pristine copy before any remote mapping
const TZ_OFFSET = '+05:00'; // Asia/Almaty
const MOCK_USER = { email: 'admin@demo.local', password: 'demo-admin-2026' };
const HOLD = ['new', 'awaiting_confirmation', 'confirmed'];
const wait = (ms = 220) => new Promise((r) => setTimeout(r, ms));
const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const clone = (v) => JSON.parse(JSON.stringify(v));

function todayLocal() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Almaty' }).format(new Date());
}
function addDays(iso, n) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
const dow = (iso) => new Date(`${iso}T00:00:00Z`).getUTCDay();
const at = (date, hhmm) => new Date(`${date}T${hhmm.slice(0, 5)}:00${TZ_OFFSET}`).getTime();

function seed() {
  const svcIds = {};
  const services = SEED.services.map((s, i) => {
    svcIds[s.id] = uid();
    return {
      id: svcIds[s.id], slug: s.id, is_active: true, sort_order: i, category: s.category, title: s.title, short: s.short,
      intro: s.intro, steps: s.steps, prep: s.prep, duration_minutes: 60, duration_label: s.duration,
      image_path: s.image, image_alt: s.imageAlt, created_at: now(), updated_at: now(),
    };
  });
  const doctors = [];
  const links = [];
  const schedules = [];
  SEED.doctors.forEach((d, i) => {
    const id = uid();
    doctors.push({
      id, slug: d.id, is_active: true, is_placeholder: true, sort_order: i, name: d.name, specialty: d.role, bio: null,
      education: null, experience: null, languages: [], photo_path: d.photo, photo_alt: d.photoAlt, whatsapp: null,
      appointment_minutes: 30, created_at: now(), updated_at: now(),
    });
    d.services.forEach((s) => links.push({ doctor_id: id, service_id: svcIds[s], price_override: null, duration_override: null }));
    [1, 2, 3, 4, 5].forEach((wd) => schedules.push({ doctor_id: id, weekday: wd, starts_at: '09:00', ends_at: '18:00', break_start: '13:00', break_end: '14:00' }));
    schedules.push({ doctor_id: id, weekday: 6, starts_at: '10:00', ends_at: '15:00', break_start: null, break_end: null });
  });
  const prices = SEED.prices.items.map((p, i) => ({
    id: uid(), slug: p.id, is_active: true, sort_order: i, category: p.category, service_id: svcIds[p.service] || null,
    title: p.title, note: p.note, price: p.price, promo_price: null, promo_until: null, is_from: !!p.from, is_popular: !!p.popular,
  }));
  const gallery = [
    ...SEED.cases.map((c, i) => ({
      id: uid(), kind: 'case', category: c.category, service_id: svcIds[c.service], image_path: null, before_path: c.before,
      after_path: c.after, simulate_before: c.simulateBefore, title: c.title, caption: c.text, alt: c.title, is_published: true,
      is_demo: true, sort_order: i, consent_obtained: false, consent_date: null, consent_scope: [], consent_ref: null,
    })),
    ...['clinic-room', 'clinic-lounge', 'mirror-chair', 'clinic-desk'].map((f, i) => ({
      id: uid(), kind: 'interior', category: null, service_id: null, image_path: `assets/images/photos/${f}.webp`, before_path: null,
      after_path: null, simulate_before: null, title: {}, caption: {}, alt: { ru: 'Интерьер клиники', kk: 'Клиника интерьері', en: 'Clinic interior' },
      is_published: true, is_demo: false, sort_order: i, consent_obtained: false, consent_date: null, consent_scope: [], consent_ref: null,
    })),
  ];
  const c = SEED.contact;
  const today = todayLocal();
  let next = addDays(today, 1);
  while (dow(next) === 0) next = addDays(next, 1);
  const appointments = [
    { status: 'new', name: 'Тестовый Пациент', phone: '+77011234567', svc: 'general', doc: 0, date: next, window: 'morning' },
    { status: 'confirmed', name: 'Mock Patient', phone: '+77071234567', svc: 'cleaning', doc: 0, date: next, slot: '10:00' },
    { status: 'awaiting_confirmation', name: 'Сынақ Науқас', phone: '+77751234567', svc: 'orthodontics', doc: 1, date: addDays(next, 1), slot: '11:30' },
    { status: 'completed', name: 'Demo Patient', phone: '+77781234567', svc: 'whitening', doc: 0, date: today, window: 'day' },
  ].map((a, i) => ({
    id: uid(), reference: `REQ-MOCK-${i + 1}`, status: a.status, doctor_id: doctors[a.doc].id, service_id: svcIds[a.svc],
    preferred_date: a.date, preferred_window: a.window || 'any',
    slot_start: a.slot ? new Date(at(a.date, a.slot)).toISOString() : null,
    slot_end: a.slot ? new Date(at(a.date, a.slot) + 3600e3).toISOString() : null,
    patient_name: a.name, patient_phone: a.phone, contact_method: 'call', comment: 'Mock data — local testing only', language: 'ru',
    consent: true, staff_notes: null, created_at: now(), updated_at: now(),
  }));
  return {
    clinic_settings: [{
      id: 1, name: SEED.clinic.name, short_name: SEED.clinic.shortName, phone: c.phone, phone_display: c.phoneDisplay,
      whatsapp: c.whatsapp, email: c.email, address: c.address, city: c.city, latitude: c.coordinates.lat, longitude: c.coordinates.lng,
      map_zoom: c.mapZoom, timezone: SEED.hours.timeZone, social: SEED.social, review_platforms: SEED.reviewPlatforms,
      booking_mode: 'realtime', slot_step_minutes: 30, min_lead_minutes: 120, max_days_ahead: SEED.booking.maxDaysAhead, demo_mode: true,
    }],
    clinic_hours: [0, 1, 2, 3, 4, 5, 6].map((wd) => {
      const h = SEED.hours.week[wd];
      return { weekday: wd, is_open: !!h, opens: h ? h[0] : null, closes: h ? h[1] : null };
    }),
    doctors, services, prices, doctor_services: links, doctor_schedules: schedules, gallery_images: gallery, appointments,
  };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  const db = seed();
  save(db);
  return db;
}
function save(db) {
  try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { console.warn('[mock] storage full', e); }
}

const matches = (row, { eq, neq, gte, lte, in: inList } = {}) =>
  Object.entries(eq || {}).every(([k, v]) => row[k] === v)
  && Object.entries(neq || {}).every(([k, v]) => row[k] !== v)
  && Object.entries(gte || {}).every(([k, v]) => row[k] != null && row[k] >= v)
  && Object.entries(lte || {}).every(([k, v]) => row[k] != null && row[k] <= v)
  && Object.entries(inList || {}).every(([k, v]) => v.includes(row[k]));

function sortRows(rows, order = []) {
  return rows.sort((a, b) => {
    for (const [col, asc = true] of order) {
      if (a[col] === b[col]) continue;
      if (a[col] == null) return 1;
      if (b[col] == null) return -1;
      return (a[col] > b[col] ? 1 : -1) * (asc ? 1 : -1);
    }
    return 0;
  });
}

/** The same integrity rules the database enforces. */
function enforce(db, table, row, prev) {
  if (table === 'doctors' && row.is_active && !(prev && prev.is_active)) {
    if (db.doctors.filter((d) => d.is_active && d.id !== row.id).length >= 10) throw new Error('MAX_ACTIVE_DOCTORS');
  }
  if (table === 'gallery_images' && row.kind === 'case' && row.is_published && !row.is_demo
      && !(row.consent_obtained && (row.consent_scope || []).includes('website'))) {
    throw new Error('gallery_case_requires_consent');
  }
  if (table === 'appointments' && row.slot_start && row.doctor_id && HOLD.includes(row.status)) {
    const s = Date.parse(row.slot_start);
    const e = Date.parse(row.slot_end);
    if (db.appointments.some((a) => a.id !== row.id && a.doctor_id === row.doctor_id && a.slot_start && HOLD.includes(a.status)
        && Date.parse(a.slot_start) < e && s < Date.parse(a.slot_end))) {
      throw new Error('SLOT_CONFLICT');
    }
  }
  if (table === 'prices' && row.promo_price != null && row.promo_price >= row.price) throw new Error('PROMO_NOT_LOWER');
}

function duration(db, doctorId, serviceId) {
  const link = db.doctor_services.find((l) => l.doctor_id === doctorId && l.service_id === serviceId);
  const svc = db.services.find((s) => s.id === serviceId);
  const doc = db.doctors.find((d) => d.id === doctorId);
  return link?.duration_override || svc?.duration_minutes || doc?.appointment_minutes || 30;
}

function slotsFor(db, doctorId, serviceId, date) {
  const cfg = db.clinic_settings[0];
  const today = todayLocal();
  if (!date || date < today || date > addDays(today, cfg.max_days_ahead)) return [];
  const doc = db.doctors.find((d) => d.id === doctorId && d.is_active);
  const svc = db.services.find((s) => s.id === serviceId && s.is_active);
  if (!doc || !svc || !db.doctor_services.some((l) => l.doctor_id === doctorId && l.service_id === serviceId)) return [];
  const wd = dow(date);
  const hrs = db.clinic_hours.find((h) => h.weekday === wd);
  const sched = db.doctor_schedules.find((s) => s.doctor_id === doctorId && s.weekday === wd);
  if (!hrs?.is_open || !sched) return [];
  const dur = duration(db, doctorId, serviceId) * 60e3;
  const from = Math.max(at(date, hrs.opens), at(date, sched.starts_at));
  const to = Math.min(at(date, hrs.closes), at(date, sched.ends_at));
  const lead = Date.now() + cfg.min_lead_minutes * 60e3;
  const out = [];
  for (let t = from; t + dur <= to; t += cfg.slot_step_minutes * 60e3) {
    if (t < lead) continue;
    if (sched.break_start && t < at(date, sched.break_end) && at(date, sched.break_start) < t + dur) continue;
    if (db.appointments.some((a) => a.doctor_id === doctorId && a.slot_start && HOLD.includes(a.status)
        && Date.parse(a.slot_start) < t + dur && t < Date.parse(a.slot_end))) continue;
    out.push(new Date(t).toISOString());
  }
  return out;
}

export function createMockApi() {
  let db = load();
  const listeners = new Set();
  const session = () => {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); } catch { return null; }
  };
  const persist = () => save(db);
  console.info('%c[mock backend]%c local testing only — data lives in this browser', 'font-weight:bold;color:#3f6f8f', '');

  const api = {
    mode: 'mock',
    async fetchPublic() {
      await wait(120);
      db = load();
      return {
        settings: clone(db.clinic_settings[0]), hours: clone(db.clinic_hours),
        doctors: sortRows(db.doctors.filter((d) => d.is_active), [['sort_order']]).map(clone),
        services: sortRows(db.services.filter((s) => s.is_active), [['sort_order']]).map(clone),
        prices: sortRows(db.prices.filter((p) => p.is_active), [['sort_order']]).map(clone),
        doctorServices: clone(db.doctor_services),
        gallery: sortRows(db.gallery_images.filter((g) => g.is_published), [['sort_order']]).map(clone),
      };
    },
    async availableSlots(doctorId, serviceId, date) {
      await wait();
      return slotsFor(db, doctorId, serviceId, date);
    },
    async submitAppointment(p) {
      await wait(600);
      const cfg = db.clinic_settings[0];
      if (p.consent !== true) throw new Error('CONSENT_REQUIRED');
      let digits = String(p.phone || '').replace(/\D/g, '');
      if (digits.startsWith('8')) digits = `7${digits.slice(1)}`;
      if (!/^7[67]\d{9}$/.test(digits)) throw new Error('INVALID_PHONE');
      const name = String(p.name || '').trim();
      if (name.length < 2 || /\d/.test(name)) throw new Error('INVALID_NAME');
      const today = todayLocal();
      if (!p.date || p.date < today || p.date > addDays(today, cfg.max_days_ahead)) throw new Error('INVALID_DATE');
      if (!db.clinic_hours.find((h) => h.weekday === dow(p.date))?.is_open) throw new Error('DATE_CLOSED');
      const phone = `+${digits}`;
      if (db.appointments.filter((a) => a.patient_phone === phone && Date.now() - Date.parse(a.created_at) < 3600e3).length >= 3) throw new Error('RATE_LIMITED');
      let status = 'new';
      let slotStart = null;
      let slotEnd = null;
      if (cfg.booking_mode === 'realtime' && p.slot_start) {
        if (!slotsFor(db, p.doctor_id, p.service_id, p.date).includes(new Date(p.slot_start).toISOString())) throw new Error('SLOT_UNAVAILABLE');
        slotStart = new Date(p.slot_start).toISOString();
        slotEnd = new Date(Date.parse(slotStart) + duration(db, p.doctor_id, p.service_id) * 60e3).toISOString();
        status = 'awaiting_confirmation';
      }
      const row = {
        id: uid(), reference: `REQ-${today.replace(/-/g, '').slice(2)}-${uid().slice(0, 5).toUpperCase()}`, status,
        doctor_id: p.doctor_id && p.doctor_id !== 'any' ? p.doctor_id : null,
        service_id: p.service_id && p.service_id !== 'consultation' ? p.service_id : null,
        preferred_date: p.date, preferred_window: p.window || 'any', slot_start: slotStart, slot_end: slotEnd,
        patient_name: name, patient_phone: phone, contact_method: p.method || 'call', comment: p.comment || null,
        language: p.language || 'ru', consent: true, staff_notes: null, created_at: now(), updated_at: now(),
      };
      db = load();
      enforce(db, 'appointments', row);
      db.appointments.push(row);
      persist();
      return { reference: row.reference, status, slot_start: slotStart };
    },

    async getSession() { return session(); },
    async signIn(email, password) {
      await wait(400);
      if (email.trim().toLowerCase() !== MOCK_USER.email || password !== MOCK_USER.password) throw new Error('Invalid login credentials');
      const s = { user: { email: MOCK_USER.email }, mock: true };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
      listeners.forEach((cb) => cb(s));
      return s;
    },
    async signOut() {
      sessionStorage.removeItem(SESSION_KEY);
      listeners.forEach((cb) => cb(null));
    },
    onAuthChange(cb) { listeners.add(cb); return () => listeners.delete(cb); },
    async isAdmin() { return !!session(); },
    async changePassword(current, next) {
      await wait(400);
      if (current !== MOCK_USER.password) throw new Error('WRONG_PASSWORD');
      if (String(next).length < 10) throw new Error('WEAK_PASSWORD');
      // The mock does not persist password changes.
    },

    async select(table, opts = {}) {
      if (!session()) throw new Error('permission denied');
      await wait(120);
      db = load();
      let rows = (db[table] || []).filter((r) => matches(r, opts));
      rows = sortRows(rows, opts.order);
      if (opts.limit) rows = rows.slice(0, opts.limit);
      return rows.map(clone);
    },
    async insert(table, row) {
      if (!session()) throw new Error('permission denied');
      await wait();
      db = load();
      const full = { id: uid(), created_at: now(), updated_at: now(), ...row };
      if (table === 'doctors' && full.is_active === undefined) full.is_active = true;
      if (['doctors', 'services', 'prices'].includes(table) && db[table].some((r) => r.slug === full.slug)) throw new Error('duplicate key value violates unique constraint (slug)');
      enforce(db, table, full);
      db[table].push(full);
      persist();
      return clone(full);
    },
    async update(table, match, patch) {
      if (!session()) throw new Error('permission denied');
      await wait();
      db = load();
      const rows = db[table].filter((r) => matches(r, { eq: match }));
      if (!rows.length) throw new Error('NOT_UPDATED');
      rows.forEach((r) => enforce(db, table, { ...r, ...patch }, r));
      rows.forEach((r) => Object.assign(r, patch, { updated_at: now() }));
      persist();
      return rows.map(clone);
    },
    async remove(table, match) {
      if (!session()) throw new Error('permission denied');
      await wait();
      db = load();
      db[table] = db[table].filter((r) => !matches(r, { eq: match }));
      persist();
    },
    async upsert(table, rows, onConflict) {
      if (!session()) throw new Error('permission denied');
      await wait();
      db = load();
      const keys = onConflict.split(',');
      rows.forEach((row) => {
        const existing = db[table].find((r) => keys.every((k) => r[k] === row[k]));
        if (existing) Object.assign(existing, row); else db[table].push(clone(row));
      });
      persist();
    },
    async replace(table, match, rows) {
      await api.remove(table, match);
      db = load();
      db[table].push(...rows.map(clone));
      persist();
    },
    async upload(blob) {
      if (!session()) throw new Error('permission denied');
      // Stored inline as a data URL (fine for local testing only).
      return new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = reject;
        r.readAsDataURL(blob);
      });
    },
    async removeFile() {},
    /** Testing helper: restore the original demo data. */
    resetMock() { localStorage.removeItem(KEY); db = load(); },
  };
  return api;
}
