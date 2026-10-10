// Shared helpers — DOM, formatting, contact links, motion preferences.
import SITE from '../config.js';

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/** Escape text for safe interpolation into HTML templates. */
export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

export const storage = {
  get(key) { try { return window.localStorage.getItem(key); } catch { return null; } },
  set(key, value) { try { window.localStorage.setItem(key, value); } catch { /* private mode */ } },
};

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const finePointer = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;
export const hasGsap = () => typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';

/* ---- Contact links ---------------------------------------------------- */
export const telHref = () => `tel:${SITE.contact.phone}`;
export const mailHref = () => `mailto:${SITE.contact.email}`;
export function waHref(message = '', number = '') {
  const digits = String(number || SITE.contact.whatsapp || '').replace(/\D/g, '');
  const text = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${digits}${text}`;
}
export function mapLinks() {
  const { lat, lng } = SITE.contact.coordinates;
  return {
    google: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
    twogis: `https://2gis.kz/geo/${lng},${lat}`,
    yandex: `https://yandex.kz/maps/?rtext=~${lat},${lng}&rtt=auto`,
    embed: `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.012},${lat - 0.006},${lng + 0.012},${lat + 0.006}&layer=mapnik&marker=${lat},${lng}`,
  };
}

/* ---- Lookup ----------------------------------------------------------- */
export const serviceById = (id) => SITE.services.find((s) => s.id === id);
export const doctorById = (id) => SITE.doctors.find((d) => d.id === id);

/* ---- Small DOM helpers ----------------------------------------------- */
export function debounce(fn, wait = 150) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
}

/** Normalise a search string (case, Kazakh/Russian letters, ё). */
export function normalize(str) {
  return String(str || '').toLowerCase().replace(/ё/g, 'е').trim();
}

/** Inline SVG icon set used across the site. */
export const icons = {
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  arrowUpRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg>',
  phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>',
  whatsapp: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z"/></svg>',
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  drag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M9 6 3 12l6 6M15 6l6 6-6 6"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m5 12 5 5L20 7"/></svg>',
  alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16.5v.5"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
};

/** Logo mark: an abstract tooth outline drawn as a single continuous line. */
export const logoMark = '<svg class="logo__mark" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M9.5 4.5c-3.2 0-5.5 2.7-5.5 6.2 0 3.3 1.3 5.5 2.4 8.4 1 2.6 1.4 8.4 3.6 8.4 2.4 0 2-6.8 6-6.8s3.6 6.8 6 6.8c2.2 0 2.6-5.8 3.6-8.4 1.1-2.9 2.4-5.1 2.4-8.4 0-3.5-2.3-6.2-5.5-6.2-2.6 0-4 1.4-6.5 1.4S12.1 4.5 9.5 4.5Z"/><path d="M12 9.5c1.3.6 2.6.9 4 .9" opacity=".55"/></svg>';

/** Build a button with the rolling-label hover effect. */
export function btn({ href, label, i18n, cls = '', icon = 'arrow', attrs = '' }) {
  const i18nAttr = i18n ? ` data-i18n="${i18n}"` : '';
  const iconSvg = icon ? icons[icon].replace('<svg', '<svg class="btn__icon"') : '';
  return `<a class="btn ${cls}" href="${href}" ${attrs}><span class="btn__label" data-text="${esc(label)}"><span${i18nAttr}>${esc(label)}</span></span>${iconSvg}</a>`;
}
