/**
 * Data access facade shared by the public site and /admin/.
 *
 *   'supabase' — js/backend-config.js is filled in (production).
 *   'mock'     — LOCAL TESTING ONLY: localhost + ?mock=1. An in-browser fake
 *                backend seeded from config.js, so the admin panel and
 *                real-time booking can be tried without a Supabase project.
 *                It never talks to a server and holds no real data.
 *   null       — no backend: the public site uses config.js as before.
 *
 * Every implementation exposes the same methods (see supabase.js).
 */
import cfg from '../backend-config.js';

const LOCAL = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);

function mockRequested() {
  if (!LOCAL) return false;
  const param = new URLSearchParams(window.location.search).get('mock');
  try {
    if (param === '1') localStorage.setItem('lumen.mock', '1');
    if (param === '0') localStorage.removeItem('lumen.mock');
    return localStorage.getItem('lumen.mock') === '1';
  } catch {
    return param === '1';
  }
}

export const backendMode = cfg.supabaseUrl && cfg.supabaseAnonKey ? 'supabase' : mockRequested() ? 'mock' : null;

let apiPromise = null;

/** Resolve the API implementation, or null when the site runs from config.js. */
export function getApi() {
  if (!backendMode) return Promise.resolve(null);
  if (!apiPromise) {
    apiPromise = backendMode === 'supabase'
      ? import('./supabase.js').then((m) => m.createSupabaseApi(cfg))
      : import('./mock.js').then((m) => m.createMockApi());
  }
  return apiPromise;
}

/** Turn a stored media path into a URL usable from the current page. */
export function mediaUrl(path, { base = '' } = {}) {
  if (!path) return '';
  if (/^(https?:|data:|blob:)/.test(path)) return path;
  if (path.startsWith('assets/')) return base + path; // bundled demo images
  if (backendMode === 'supabase') {
    return `${cfg.supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/${cfg.bucket}/${path.split('/').map(encodeURIComponent).join('/')}`;
  }
  return base + path;
}

/** Map database error messages (e.g. 'MAX_ACTIVE_DOCTORS') to a code. */
export function errorCode(err) {
  const msg = String(err?.message || err || '');
  const m = msg.match(/[A-Z][A-Z_]{3,}/);
  return m ? m[0] : 'UNKNOWN';
}
