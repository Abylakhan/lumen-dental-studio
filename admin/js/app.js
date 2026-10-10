/**
 * Admin panel shell — authentication gate, navigation and routing.
 *
 * Security model: this page only renders UI. Every read and write is
 * authorised by the database (Row Level Security). A signed-in account that
 * is not in public.staff_users is signed out immediately and sees nothing.
 */
import { getApi, backendMode } from '../../js/api/index.js';
import { logoMark } from '../../js/utils.js';
import { $, $$, esc, icon, toast, errorText } from './ui.js';

const VIEWS = [
  { id: 'overview', label: 'Обзор', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-4H4zM14 4v4h6V4z"/></svg>' },
  { id: 'appointments', label: 'Записи', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>' },
  { id: 'doctors', label: 'Врачи', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/></svg>' },
  { id: 'services', label: 'Услуги', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 4.5c-2.6 0-4.5 2.2-4.5 5 0 2.7 1 4.5 2 6.9.8 2.1 1.1 6.9 2.9 6.9 2 0 1.6-5.6 4.6-5.6"/><path d="M15 4.5c2.6 0 4.5 2.2 4.5 5 0 2.7-1 4.5-2 6.9-.8 2.1-1.1 6.9-2.9 6.9"/></svg>' },
  { id: 'prices', label: 'Цены', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.5"/></svg>' },
  { id: 'gallery', label: 'Галерея', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 17-5-5-9 8"/></svg>' },
  { id: 'hours', label: 'Часы работы', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>' },
  { id: 'settings', label: 'Настройки клиники', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7 7 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z"/></svg>' },
  { id: 'account', label: 'Пароль', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>' },
];
const IDLE_LIMIT_MS = 30 * 60 * 1000; // sign out after 30 min of inactivity

const app = $('#app');
let api = null;
let session = null;
let idleTimer = null;
let currentView = null;

/* ---- Screens ---------------------------------------------------------- */
function setupScreen() {
  app.innerHTML = `
    <main class="adm-login"><div class="adm-login__card">
      <div class="adm-login__brand">${logoMark}<span>Lumen · Админ</span></div>
      <h1>Подключите базу данных</h1>
      <p class="adm-note">Панель управления работает только с подключённым Supabase. Заполните <code>js/backend-config.js</code> по инструкции в <code>SETUP.md</code>.</p>
      <p class="adm-alert adm-alert--info">Сейчас сайт работает на демо-данных из <code>config.js</code>.</p>
      <a class="abtn" href="../index.html">← На сайт</a>
    </div></main>`;
}

function loginScreen(message = '') {
  app.innerHTML = `
    <main class="adm-login"><div class="adm-login__card">
      <div class="adm-login__brand">${logoMark}<span>Lumen · Админ</span></div>
      <div><h1>Вход</h1><p class="adm-note" style="margin-top:.5rem">Только для администратора клиники.</p></div>
      ${backendMode === 'mock' ? '<p class="adm-alert adm-alert--warn">Локальный тестовый режим (mock): данные хранятся только в этом браузере. Вход: admin@demo.local / demo-admin-2026</p>' : ''}
      <p class="adm-alert" role="alert" ${message ? '' : 'hidden'} data-login-error>${esc(message)}</p>
      <form class="adm-form" data-login novalidate>
        <div class="field"><label class="field__label" for="l-email">Email</label>
          <input class="input" id="l-email" name="email" type="email" autocomplete="username" required autocapitalize="off" spellcheck="false"></div>
        <div class="field"><label class="field__label" for="l-pass">Пароль</label>
          <input class="input" id="l-pass" name="password" type="password" autocomplete="current-password" required></div>
        <button class="abtn abtn--primary" type="submit" style="min-height:52px">Войти</button>
      </form>
      <a class="adm-note" href="../index.html">← На сайт</a>
    </div></main>`;
  const form = $('[data-login]');
  $('#l-email').focus();
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('button[type="submit"]', form);
    const err = $('[data-login-error]');
    const email = form.email.value.trim();
    const password = form.password.value;
    if (!email || !password) { err.hidden = false; err.textContent = 'Введите email и пароль.'; return; }
    btn.disabled = true; btn.classList.add('is-loading');
    try {
      await api.signIn(email, password);
      form.password.value = '';
      await enter();
    } catch (ex) {
      err.hidden = false;
      err.textContent = errorText(ex);
      form.password.value = '';
      form.password.focus();
    } finally {
      btn.disabled = false; btn.classList.remove('is-loading');
    }
  });
}

function shell() {
  const nav = VIEWS.map((v) => `<a href="#${v.id}" data-nav="${v.id}">${v.icon}<span>${esc(v.label)}</span>${v.id === 'appointments' ? '<span class="badge" data-new-count hidden></span>' : ''}</a>`).join('');
  app.innerHTML = `
    <div class="adm">
      <header class="adm-top">
        <span class="adm-top__title" data-top-title>Админ</span>
        <button type="button" aria-label="Открыть меню" aria-expanded="false" aria-controls="adm-side" data-menu>${icon.menu}</button>
      </header>
      <aside class="adm-side" id="adm-side">
        <div class="adm-side__brand">${logoMark}<span>Lumen<small>Панель управления</small></span></div>
        <nav class="adm-nav" aria-label="Разделы">${nav}</nav>
        <div class="adm-side__foot adm-nav">
          <p class="adm-side__user">${esc(session?.user?.email || '')}</p>
          <a href="../index.html" target="_blank" rel="noopener">Открыть сайт ↗</a>
          <button type="button" data-logout>Выйти</button>
        </div>
      </aside>
      <main class="adm-main" id="view" tabindex="-1"></main>
    </div>`;

  const side = $('#adm-side');
  const menuBtn = $('[data-menu]');
  const closeMenu = () => { side.classList.remove('is-open'); menuBtn.setAttribute('aria-expanded', 'false'); menuBtn.innerHTML = icon.menu; };
  menuBtn.addEventListener('click', () => {
    const open = !side.classList.contains('is-open');
    side.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.innerHTML = open ? icon.close : icon.menu;
  });
  side.addEventListener('click', (e) => { if (e.target.closest('a')) closeMenu(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
  $('[data-logout]').addEventListener('click', () => logout());
}

/* ---- Routing ---------------------------------------------------------- */
const loaders = {
  overview: () => import('./views/overview.js'),
  appointments: () => import('./views/appointments.js'),
  doctors: () => import('./views/doctors.js'),
  services: () => import('./views/services.js'),
  prices: () => import('./views/prices.js'),
  gallery: () => import('./views/gallery.js'),
  hours: () => import('./views/hours.js'),
  settings: () => import('./views/settings.js'),
  account: () => import('./views/account.js'),
};

async function route() {
  if (!session) return;
  const id = (location.hash.slice(1).split('?')[0]) || 'overview';
  const view = VIEWS.find((v) => v.id === id) ? id : 'overview';
  $$('[data-nav]').forEach((a) => (a.dataset.nav === view ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
  $('[data-top-title]').textContent = VIEWS.find((v) => v.id === view).label;
  document.title = `${VIEWS.find((v) => v.id === view).label} — Панель управления`;
  // Fresh container per view so no event listeners leak between views.
  const old = $('#view');
  const host = old.cloneNode(false);
  old.replaceWith(host);
  host.innerHTML = '<div class="adm-boot" style="min-height:40vh"><span class="spinner" aria-hidden="true"></span> Загрузка…</div>';
  currentView = view;
  try {
    const mod = await loaders[view]();
    if (currentView !== view) return;
    await mod.render(host, { api, session, navigate: (h) => { location.hash = h; }, refreshBadge });
  } catch (err) {
    console.error(err);
    host.innerHTML = `<p class="adm-alert">${esc(errorText(err))}</p>`;
  }
  host.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

async function refreshBadge() {
  try {
    const rows = await api.select('appointments', { columns: 'id', in: { status: ['new', 'awaiting_confirmation'] } });
    const badge = $('[data-new-count]');
    if (!badge) return;
    badge.textContent = rows.length;
    badge.hidden = !rows.length;
  } catch { /* non-critical */ }
}

/* ---- Session ---------------------------------------------------------- */
function resetIdle() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => logout('Сеанс завершён из-за отсутствия активности. Войдите снова.'), IDLE_LIMIT_MS);
}

async function logout(message = '') {
  clearTimeout(idleTimer);
  try { await api.signOut(); } catch { /* already signed out */ }
  session = null;
  history.replaceState(null, '', location.pathname);
  loginScreen(message);
}

async function enter() {
  session = await api.getSession();
  if (!session) { loginScreen(); return; }
  // Server-side check — the UI is never shown to non-admin accounts.
  const admin = await api.isAdmin();
  if (!admin) {
    await api.signOut();
    session = null;
    loginScreen('У этой учётной записи нет доступа к панели управления.');
    return;
  }
  shell();
  resetIdle();
  ['pointerdown', 'keydown', 'scroll'].forEach((ev) => window.addEventListener(ev, resetIdle, { passive: true }));
  await route();
  refreshBadge();
}

async function boot() {
  api = await getApi().catch((err) => { console.error(err); return null; });
  if (!api) { setupScreen(); return; }
  window.addEventListener('hashchange', route);
  api.onAuthChange((s) => {
    if (!s && session) { session = null; loginScreen('Вы вышли из системы.'); }
  });
  try {
    await enter();
  } catch (err) {
    loginScreen(errorText(err));
  }
}

boot();
export { toast };
