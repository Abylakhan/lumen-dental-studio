// Admin UI helpers — small, dependency-free building blocks.
import { esc } from '../../js/utils.js';
import { mediaUrl, errorCode } from '../../js/api/index.js';

export { esc };
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
export const LANGS = [['ru', 'RU'], ['kk', 'KZ'], ['en', 'EN']];
export const DAYS = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
export const DAYS_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
export const STATUS = {
  new: 'Новая', awaiting_confirmation: 'Ждёт подтверждения', confirmed: 'Подтверждена',
  completed: 'Завершена', cancelled: 'Отменена', no_show: 'Неявка',
};
export const SERVICE_CATEGORIES = { therapy: 'Терапия', surgery: 'Хирургия и имплантация', orthodontics: 'Ортодонтия', aesthetics: 'Эстетика', prevention: 'Профилактика', kids: 'Детям' };
export const PRICE_CATEGORIES = { diagnostics: 'Диагностика', therapy: 'Терапия', hygiene: 'Гигиена', aesthetics: 'Эстетика', orthodontics: 'Ортодонтия', surgery: 'Имплантация', kids: 'Детям' };
export const CASE_CATEGORIES = { whitening: 'Отбеливание', restoration: 'Реставрация', orthodontics: 'Ортодонтия', veneers: 'Виниры' };

/** Localised value for admin display (RU first). */
export const L = (obj) => (obj && (obj.ru || obj.kk || obj.en)) || '';
export const img = (path) => mediaUrl(path, { base: '../' });

export const icon = {
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m6 15 6-6 6 6"/></svg>',
  down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4Z"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 17-5-5-9 8"/></svg>',
};

/* ---- Toasts & dialogs ------------------------------------------------- */
export function toast(message, type = 'ok') {
  const host = $('.adm-toasts');
  const el = document.createElement('div');
  el.className = `adm-toast${type === 'error' ? ' adm-toast--error' : ''}`;
  el.setAttribute('role', type === 'error' ? 'alert' : 'status');
  el.textContent = message;
  host.appendChild(el);
  setTimeout(() => el.remove(), type === 'error' ? 7000 : 3500);
}

/** Accessible confirm dialog. Resolves true when confirmed. */
export function confirmDialog({ title, text, confirm = 'Подтвердить', danger = false }) {
  return new Promise((resolve) => {
    const d = document.createElement('dialog');
    d.className = 'adm-dialog';
    d.innerHTML = `<form method="dialog">
      <h2>${esc(title)}</h2>
      ${text ? `<p class="adm-note">${esc(text)}</p>` : ''}
      <div class="adm-actions" style="justify-content:flex-end">
        <button class="abtn" value="cancel" autofocus>Отмена</button>
        <button class="abtn ${danger ? 'abtn--danger' : 'abtn--primary'}" value="ok">${esc(confirm)}</button>
      </div></form>`;
    document.body.appendChild(d);
    d.addEventListener('close', () => { resolve(d.returnValue === 'ok'); d.remove(); });
    d.showModal();
  });
}

/* ---- Errors ----------------------------------------------------------- */
const ERRORS = {
  MAX_ACTIVE_DOCTORS: 'Можно иметь не более 10 активных врачей. Сначала деактивируйте одного.',
  SLOT_CONFLICT: 'У этого врача уже есть запись на это время. Выберите другое время.',
  CANNOT_DEMOTE_SELF: 'Нельзя отключить собственную учётную запись администратора.',
  LAST_ADMIN: 'Нельзя удалить последнего администратора.',
  PROMO_NOT_LOWER: 'Акционная цена должна быть ниже обычной.',
  WRONG_PASSWORD: 'Текущий пароль указан неверно.',
  WEAK_PASSWORD: 'Пароль слишком простой. Используйте не меньше 10 символов.',
  NOT_UPDATED: 'Изменения не сохранены: нет доступа или запись удалена.',
  TIMEOUT: 'Сервер не ответил вовремя. Проверьте интернет и попробуйте снова.',
};
export function errorText(err) {
  const msg = String(err?.message || err || '');
  if (/gallery_case_requires_consent/.test(msg)) return 'Реальный случай можно опубликовать только после письменного согласия пациента на публикацию на сайте.';
  if (/duplicate key|unique/i.test(msg)) return 'Такой адрес (slug) уже используется. Укажите другой.';
  if (/Invalid login credentials/i.test(msg)) return 'Неверный email или пароль.';
  if (/rate limit|too many/i.test(msg)) return 'Слишком много попыток. Подождите несколько минут.';
  if (/password/i.test(msg) && /should|least|weak|short/i.test(msg)) return ERRORS.WEAK_PASSWORD;
  if (/permission denied|row-level security|JWT|not authorized/i.test(msg)) return 'Нет доступа. Войдите снова.';
  if (/Failed to fetch|NetworkError|network/i.test(msg)) return 'Нет связи с сервером. Проверьте интернет.';
  if (/check constraint/i.test(msg)) return 'Некоторые значения недопустимы. Проверьте поля формы.';
  return ERRORS[errorCode(err)] || `Не удалось выполнить действие. ${msg.slice(0, 140)}`;
}

/** Run an async action with a busy button and a friendly error toast. */
export async function busy(button, fn, okMessage) {
  if (button) { button.disabled = true; button.classList.add('is-loading'); }
  try {
    const r = await fn();
    if (okMessage) toast(okMessage);
    return r;
  } catch (err) {
    console.error(err);
    toast(errorText(err), 'error');
    return undefined;
  } finally {
    if (button) { button.disabled = false; button.classList.remove('is-loading'); }
  }
}

/* ---- Form builders ---------------------------------------------------- */
let uidN = 0;
const nid = (p) => `${p}-${++uidN}`;

export function field(label, control, { hint = '', cls = '' } = {}) {
  return `<div class="field ${cls}"><label class="field__label" for="${control.id}">${esc(label)}</label>${control.html}${hint ? `<p class="field__hint">${esc(hint)}</p>` : ''}</div>`;
}
export function input(name, value = '', { type = 'text', attrs = '', label, hint, cls } = {}) {
  const id = nid(name);
  const html = `<input class="input" id="${id}" name="${esc(name)}" type="${type}" value="${esc(value ?? '')}" ${attrs}>`;
  return label ? field(label, { id, html }, { hint, cls }) : html;
}
export function textarea(name, value = '', { rows = 4, label, hint, attrs = '' } = {}) {
  const id = nid(name);
  const html = `<textarea class="textarea" id="${id}" name="${esc(name)}" rows="${rows}" ${attrs}>${esc(value ?? '')}</textarea>`;
  return label ? field(label, { id, html }, { hint }) : html;
}
export function select(name, options, value, { label, hint, attrs = '' } = {}) {
  const id = nid(name);
  const opts = Object.entries(options).map(([v, t]) => `<option value="${esc(v)}" ${String(v) === String(value ?? '') ? 'selected' : ''}>${esc(t)}</option>`).join('');
  const html = `<select class="select" id="${id}" name="${esc(name)}" ${attrs}>${opts}</select>`;
  return label ? field(label, { id, html }, { hint }) : html;
}
export function toggle(name, checked, label) {
  return `<label class="switch"><input type="checkbox" name="${esc(name)}" ${checked ? 'checked' : ''}><span class="switch__track" aria-hidden="true"></span><span>${esc(label)}</span></label>`;
}

/** RU / KZ / EN tabs for one localised field. Inputs are named `${name}.ru` etc. */
export function langField(name, value = {}, { label, textarea: isArea = false, rows = 3, required = false, hint = '' } = {}) {
  const v = value || {};
  const base = nid(name);
  const bar = LANGS.map(([code, lbl], i) => `<button type="button" role="tab" aria-selected="${i === 0}" aria-controls="${base}-${code}" data-lang-tab="${code}" class="${v[code] ? '' : 'is-empty'}">${lbl}</button>`).join('');
  const panes = LANGS.map(([code], i) => {
    const attrs = `id="${base}-${code}" name="${esc(name)}.${code}" lang="${code === 'kk' ? 'kk' : code}" ${i === 0 && required ? 'required' : ''} aria-label="${esc(label)} (${code.toUpperCase()})" ${i ? 'hidden' : ''}`;
    return isArea
      ? `<textarea class="textarea" rows="${rows}" ${attrs}>${esc(v[code] || '')}</textarea>`
      : `<input class="input" ${attrs} value="${esc(v[code] || '')}">`;
  }).join('');
  return `<div class="field lang-tabs" data-lang-field>
    <div class="lang-tabs__head"><span class="field__label">${esc(label)}${required ? ' *' : ''}</span><div class="lang-tabs__bar" role="tablist" aria-label="Язык">${bar}</div></div>
    ${panes}${hint ? `<p class="field__hint">${esc(hint)}</p>` : ''}</div>`;
}

/** Event delegation for language tabs inside a container. */
export function bindLangTabs(root) {
  root.addEventListener('click', (e) => {
    const tab = e.target.closest('[data-lang-tab]');
    if (!tab) return;
    const wrap = tab.closest('[data-lang-field]');
    $$('[data-lang-tab]', wrap).forEach((b) => b.setAttribute('aria-selected', String(b === tab)));
    $$('input[name], textarea[name]', wrap).forEach((el) => { el.hidden = !el.name.endsWith(`.${tab.dataset.langTab}`); });
    $(`[name$=".${tab.dataset.langTab}"]`, wrap)?.focus();
  });
  root.addEventListener('input', (e) => {
    const wrap = e.target.closest('[data-lang-field]');
    if (!wrap) return;
    const code = e.target.name.split('.').pop();
    $(`[data-lang-tab="${code}"]`, wrap)?.classList.toggle('is-empty', !e.target.value.trim());
  });
}

/** Read a form into an object; `a.b` names become nested objects. */
export function readForm(form) {
  const out = {};
  $$('input[name], select[name], textarea[name]', form).forEach((el) => {
    if (el.type === 'file' || el.disabled) return;
    let value;
    if (el.type === 'checkbox') value = el.checked;
    else if (el.type === 'radio') { if (!el.checked) return; value = el.value; }
    else if (el.type === 'number') value = el.value === '' ? null : Number(el.value);
    else value = el.value.trim();
    const parts = el.name.split('.');
    let o = out;
    parts.slice(0, -1).forEach((p) => { o = o[p] = o[p] || {}; });
    o[parts[parts.length - 1]] = value;
  });
  return out;
}

/** Drop empty translations so the site falls back cleanly. */
export const cleanLang = (obj) => Object.fromEntries(Object.entries(obj || {}).filter(([, v]) => v));

export function slugify(text) {
  const map = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ы: 'y', э: 'e', ю: 'yu', я: 'ya', ә: 'a', ғ: 'g', қ: 'k', ң: 'n', ө: 'o', ұ: 'u', ү: 'u', һ: 'h', і: 'i' };
  return String(text || '').toLowerCase().split('').map((c) => map[c] ?? c).join('')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || `item-${Date.now().toString(36)}`;
}

/* ---- Images ----------------------------------------------------------- */
const MAX_INPUT_BYTES = 15 * 1024 * 1024;

/** Resize and re-encode an image in the browser (WebP when supported). */
export async function compressImage(file, maxSide = 1800, quality = 0.82) {
  if (!/^image\/(jpeg|png|webp|avif|heic|heif)$/i.test(file.type) && !/\.(jpe?g|png|webp|heic)$/i.test(file.name)) {
    throw new Error('Можно загружать только изображения (JPEG, PNG, WebP).');
  }
  if (file.size > MAX_INPUT_BYTES) throw new Error('Файл больше 15 МБ. Выберите изображение поменьше.');
  const bitmap = await createImageBitmap(file).catch(() => { throw new Error('Не удалось прочитать изображение. Попробуйте JPEG или PNG.'); });
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  const toBlob = (type) => new Promise((r) => canvas.toBlob(r, type, quality));
  let blob = await toBlob('image/webp');
  if (!blob || blob.type !== 'image/webp') blob = await toBlob('image/jpeg');
  if (blob.size > 5 * 1024 * 1024) throw new Error('Изображение слишком большое даже после сжатия.');
  return blob;
}

/** Image picker with preview. The chosen, compressed file is kept on the element. */
export function imagePicker(name, currentPath, { label = 'Фотография', hint = 'JPEG, PNG или WebP. Сжимается автоматически.' } = {}) {
  const id = nid(name);
  return `<div class="field" data-imgpick="${esc(name)}">
    <span class="field__label">${esc(label)}</span>
    <div class="imgpick">
      <img class="imgpick__preview" alt="" src="${esc(img(currentPath))}" ${currentPath ? '' : 'hidden'}>
      <div class="imgpick__body">
        <input type="file" id="${id}" accept="image/jpeg,image/png,image/webp,image/heic">
        <label class="abtn" for="${id}">${icon.image}${currentPath ? 'Заменить фото' : 'Загрузить фото'}</label>
        <p class="field__hint">${esc(hint)}</p>
      </div>
    </div>
  </div>`;
}

export function bindImagePickers(root) {
  root.addEventListener('change', async (e) => {
    const inputEl = e.target;
    if (inputEl.type !== 'file') return;
    const wrap = inputEl.closest('[data-imgpick]');
    if (!wrap || !inputEl.files[0]) return;
    const hintEl = $('.field__hint', wrap);
    const old = hintEl.textContent;
    hintEl.textContent = 'Обработка изображения…';
    try {
      const blob = await compressImage(inputEl.files[0]);
      wrap._blob = blob;
      const preview = $('.imgpick__preview', wrap);
      preview.src = URL.createObjectURL(blob);
      preview.hidden = false;
      hintEl.textContent = `Готово: ${(blob.size / 1024).toFixed(0)} КБ. Сохраните, чтобы загрузить.`;
    } catch (err) {
      wrap._blob = null;
      hintEl.textContent = old;
      toast(err.message, 'error');
    }
    inputEl.value = '';
  });
}

/** Pending blob chosen in a picker (or null). */
export const pickedImage = (root, name) => $(`[data-imgpick="${name}"]`, root)?._blob || null;

export function fmtDate(iso, opts = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!iso) return '—';
  const d = iso.length === 10 ? new Date(`${iso}T00:00:00Z`) : new Date(iso);
  return new Intl.DateTimeFormat('ru-RU', { ...opts, timeZone: iso.length === 10 ? 'UTC' : 'Asia/Almaty' }).format(d);
}
export function fmtTime(iso) {
  return iso ? new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Almaty' }).format(new Date(iso)) : '';
}
export const money = (n) => (n == null ? '—' : `${new Intl.NumberFormat('ru-KZ').format(n)} ₸`);
