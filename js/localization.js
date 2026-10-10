/**
 * Localization — dictionary lookup, DOM translation, persistence.
 *
 * Markup hooks:
 *   data-i18n="path.to.key"           → textContent
 *   data-i18n-html="path.to.key"      → innerHTML (trusted dictionary markup only)
 *   data-i18n-attr="aria-label:key; placeholder:key2"
 *
 * Config values shaped { ru, kk, en } are resolved with `tl(obj)`.
 */
import SITE from '../config.js';
import { storage } from './utils.js';
import ru from './i18n/ru.js';
import kk from './i18n/kk.js';
import en from './i18n/en.js';

const DICTS = { ru, kk, en };
const STORAGE_KEY = 'lumen.lang';
const supported = SITE.languages.supported.map((l) => l.code);
const listeners = new Set();

function detectInitial() {
  const stored = storage.get(STORAGE_KEY);
  if (stored && supported.includes(stored)) return stored;
  const nav = (navigator.language || '').slice(0, 2).toLowerCase();
  if (nav === 'kk') return 'kk';
  return SITE.languages.default;
}

let current = detectInitial();

export const getLang = () => current;

function lookup(dict, key) {
  return key.split('.').reduce((obj, k) => (obj == null ? undefined : obj[k]), dict);
}

/** Translate a dictionary key. Falls back to Russian, then English, then the key. */
export function t(key, vars) {
  let value = lookup(DICTS[current], key);
  if (value === undefined) value = lookup(DICTS.ru, key);
  if (value === undefined) value = lookup(DICTS.en, key);
  if (value === undefined) {
    console.warn(`[i18n] missing key: ${key}`);
    return key;
  }
  if (typeof value === 'string' && vars) {
    return value.replace(/\{(\w+)\}/g, (_, name) => (vars[name] ?? `{${name}}`));
  }
  return value;
}

/** Resolve a localised config object { ru, kk, en }. */
export function tl(obj) {
  if (obj == null) return '';
  if (typeof obj === 'string') return obj;
  return obj[current] ?? obj.ru ?? obj.en ?? '';
}

export function applyTranslations(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    const text = t(el.dataset.i18n);
    el.textContent = text;
    delete el.dataset.split;
    const roll = el.parentElement;
    if (roll && roll.classList.contains('btn__label')) roll.dataset.text = text;
  });
  root.querySelectorAll('[data-i18n-html]').forEach((el) => {
    el.innerHTML = t(el.dataset.i18nHtml);
    delete el.dataset.split;
  });
  root.querySelectorAll('[data-i18n-attr]').forEach((el) => {
    el.dataset.i18nAttr.split(';').forEach((pair) => {
      const [attr, key] = pair.split(':').map((s) => s.trim());
      if (attr && key) el.setAttribute(attr, t(key));
    });
  });
}

/** Update <title>, description and Open Graph tags for the current page. */
export function applyMeta(vars) {
  const page = document.body.dataset.page;
  if (!page) return;
  const meta = t(`meta.${page}`);
  if (!meta || typeof meta !== 'object') return;
  // Dynamic pages fill {name} once their data is rendered.
  if (!vars && /\{\w+\}/.test(meta.title)) return;
  const fill = (s) => (vars ? s.replace(/\{(\w+)\}/g, (_, n) => vars[n] ?? '') : s);
  const title = fill(meta.title);
  const description = fill(meta.description);
  document.title = title;
  const set = (sel, attr, value) => { const el = document.head.querySelector(sel); if (el) el.setAttribute(attr, value); };
  set('meta[name="description"]', 'content', description);
  set('meta[property="og:title"]', 'content', title);
  set('meta[property="og:description"]', 'content', description);
  const locales = { ru: 'ru_KZ', kk: 'kk_KZ', en: 'en_US' };
  set('meta[property="og:locale"]', 'content', locales[current]);
}

export function setLang(code) {
  if (!supported.includes(code) || code === current) return;
  current = code;
  storage.set(STORAGE_KEY, code);
  syncDocument();
  listeners.forEach((fn) => fn(code));
  document.dispatchEvent(new CustomEvent('i18n:change', { detail: { lang: code } }));
}

export function onLangChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function syncDocument() {
  const def = SITE.languages.supported.find((l) => l.code === current);
  document.documentElement.lang = def ? def.htmlLang : current;
  applyTranslations();
  applyMeta(window.__pageMetaVars);
}

/** Pages with dynamic titles (service, doctor) set vars before/after render. */
export function setPageMetaVars(vars) {
  window.__pageMetaVars = vars;
  applyMeta(vars);
}

export function initLocalization() {
  syncDocument();
}
