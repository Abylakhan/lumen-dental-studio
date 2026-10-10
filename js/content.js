/**
 * Public content synchronisation.
 *
 * When a backend is configured, published content (settings, hours, doctors,
 * services, prices, gallery) is loaded from the database and mapped onto the
 * same SITE structure that config.js defines — so every existing page keeps
 * working unchanged. If the backend is unreachable, the site silently falls
 * back to config.js.
 */
import SITE from '../config.js';
import { getApi, mediaUrl } from './api/index.js';

const TIMEOUT_MS = 6000;

function withTimeout(promise, ms) {
  return Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT')), ms))]);
}

const hhmm = (t) => (t ? String(t).slice(0, 5) : null);
const has = (obj) => obj && Object.values(obj).some((v) => v);

function todayIn(tz) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz || 'Asia/Almaty' }).format(new Date());
}

export function applyContent(data) {
  const s = data.settings;
  if (s) {
    SITE.clinic.name = s.name || SITE.clinic.name;
    SITE.clinic.shortName = s.short_name || SITE.clinic.shortName;
    SITE.demo.enabled = !!s.demo_mode;
    Object.assign(SITE.contact, {
      placeholder: !!s.demo_mode,
      phone: s.phone || '',
      phoneDisplay: s.phone_display || s.phone || '',
      whatsapp: s.whatsapp || '',
      email: s.email || '',
      address: s.address || {},
      city: s.city || {},
      coordinates: { lat: Number(s.latitude) || SITE.contact.coordinates.lat, lng: Number(s.longitude) || SITE.contact.coordinates.lng },
      mapZoom: s.map_zoom || 15,
    });
    SITE.hours.timeZone = s.timezone || SITE.hours.timeZone;
    SITE.hours.placeholder = !!s.demo_mode;
    SITE.social = Array.isArray(s.social) ? s.social : [];
    SITE.reviewPlatforms = Array.isArray(s.review_platforms) ? s.review_platforms : [];
    SITE.prices.placeholder = !!s.demo_mode;
    Object.assign(SITE.booking, {
      mode: 'backend',
      realtime: s.booking_mode === 'realtime',
      maxDaysAhead: s.max_days_ahead || SITE.booking.maxDaysAhead,
    });
  }

  if (data.hours?.length) {
    SITE.hours.week = {};
    data.hours.forEach((h) => { SITE.hours.week[h.weekday] = h.is_open ? [hhmm(h.opens), hhmm(h.closes)] : null; });
  }

  const svcSlug = {};
  SITE.services = (data.services || []).map((r) => {
    svcSlug[r.id] = r.slug;
    const m = r.duration_minutes;
    return {
      id: r.slug,
      uuid: r.id,
      category: r.category,
      image: mediaUrl(r.image_path) || 'assets/images/photos/exam-mirror.webp',
      imageAlt: r.image_alt || {},
      title: r.title || {},
      short: r.short || {},
      intro: r.intro || {},
      duration: has(r.duration_label) ? r.duration_label : { ru: `${m} мин`, kk: `${m} мин`, en: `${m} min` },
      durationMinutes: m,
      steps: Array.isArray(r.steps) ? r.steps : [],
      prep: Array.isArray(r.prep) ? r.prep : [],
    };
  });

  const links = data.doctorServices || [];
  SITE.doctors = (data.doctors || []).map((r) => {
    const mine = links.filter((l) => l.doctor_id === r.id && svcSlug[l.service_id]);
    return {
      id: r.slug,
      uuid: r.id,
      placeholder: !!r.is_placeholder,
      name: r.name || {},
      role: r.specialty || {},
      photo: mediaUrl(r.photo_path) || 'assets/images/photos/dentist-bw.webp',
      photoAlt: r.photo_alt || {},
      bio: has(r.bio) ? r.bio : null,
      education: has(r.education) ? r.education : null,
      experience: has(r.experience) ? r.experience : null,
      languages: r.languages?.length ? r.languages : null,
      whatsapp: r.whatsapp || '',
      services: mine.map((l) => svcSlug[l.service_id]),
      servicePrices: Object.fromEntries(mine.filter((l) => l.price_override != null).map((l) => [svcSlug[l.service_id], l.price_override])),
    };
  });

  const today = todayIn(s?.timezone);
  SITE.prices.items = (data.prices || []).map((r) => {
    const promo = r.promo_price != null && (!r.promo_until || r.promo_until >= today);
    return {
      id: r.slug,
      category: r.category,
      service: svcSlug[r.service_id] || null,
      popular: !!r.is_popular,
      from: !!r.is_from,
      price: promo ? r.promo_price : r.price,
      regular: r.price,
      promo,
      promoUntil: promo ? r.promo_until : null,
      title: r.title || {},
      note: r.note || {},
    };
  });

  const gallery = data.gallery || [];
  SITE.cases = gallery.filter((g) => g.kind === 'case').map((g) => ({
    id: g.id,
    demo: !!g.is_demo,
    category: g.category || 'restoration',
    service: svcSlug[g.service_id] || null,
    before: mediaUrl(g.before_path),
    after: mediaUrl(g.after_path),
    simulateBefore: g.is_demo ? g.simulate_before : null,
    title: g.title || {},
    text: g.caption || {},
    consent: { obtained: !!g.consent_obtained, scope: g.consent_scope || [] },
  }));
  SITE.interiors = gallery.filter((g) => g.kind === 'interior').map((g) => ({ src: mediaUrl(g.image_path), alt: g.alt || {} }));
  SITE.backend = true;
}

/** Load published content from the backend (if any). Resolves true when applied. */
export async function loadContent() {
  try {
    const api = await getApi();
    if (!api) return false;
    const data = await withTimeout(api.fetchPublic(), TIMEOUT_MS);
    applyContent(data);
    return true;
  } catch (err) {
    console.warn('[content] using built-in content — backend unavailable:', err.message);
    return false;
  }
}
