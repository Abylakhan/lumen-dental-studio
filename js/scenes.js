/**
 * Scenes & theme.
 *
 * - Sections declare `data-scene="light|dark|soft"`.
 * - Theme preference: 'auto' (cinematic: scenes alternate), 'light', 'dark'.
 *   A manual choice overrides every scene via CSS and is never changed by
 *   scrolling. It persists across pages.
 * - The header adopts the scene currently underneath it.
 */
import { storage } from './utils.js';
import { t } from './localization.js';

const KEY = 'lumen.theme';
const MODES = ['auto', 'light', 'dark'];
const root = document.documentElement;

let mode = MODES.includes(storage.get(KEY)) ? storage.get(KEY) : 'auto';
let header = null;
let ticking = false;

export const getThemeMode = () => mode;
export const isAutoTheme = () => mode === 'auto';

export function setThemeMode(next) {
  if (!MODES.includes(next)) return;
  mode = next;
  storage.set(KEY, next);
  root.dataset.theme = next;
  updateToggles();
  updateHeaderScene();
  document.dispatchEvent(new CustomEvent('theme:change', { detail: { mode } }));
}

export function cycleTheme() {
  setThemeMode(MODES[(MODES.indexOf(mode) + 1) % MODES.length]);
}

function modeLabel() {
  return t({ auto: 'ui.themeAuto', light: 'ui.themeLight', dark: 'ui.themeDark' }[mode]);
}

export function updateToggles() {
  const label = t('ui.themeLabel', { mode: modeLabel() });
  document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
    btn.dataset.mode = mode;
    btn.setAttribute('aria-label', label);
    if (btn.hasAttribute('data-tip')) btn.dataset.tip = modeLabel();
    const text = btn.querySelector('[data-theme-label]');
    if (text) text.textContent = modeLabel();
  });
}

/** Find the scene under the header's centre line. */
function sceneUnderHeader() {
  const y = (header?.offsetHeight || 72) / 2;
  const x = Math.min(window.innerWidth - 2, 40);
  const stack = document.elementsFromPoint(x, y);
  for (const el of stack) {
    if (header && header.contains(el)) continue;
    if (el.closest('.site-menu, .action-bar, .cursor')) continue;
    const scene = el.closest('[data-scene]');
    if (scene && scene !== header) return scene.dataset.sceneNow || scene.dataset.scene;
  }
  return 'light';
}

export function updateHeaderScene() {
  if (!header || root.classList.contains('menu-open')) return;
  const scene = sceneUnderHeader();
  if (header.dataset.scene !== scene) header.dataset.scene = scene;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    const dark = mode === 'dark' || (mode === 'auto' && scene === 'dark');
    meta.setAttribute('content', dark ? '#080808' : '#ffffff');
  }
}

function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    ticking = false;
    updateHeaderScene();
  });
}

export function initScenes() {
  header = document.querySelector('.site-header');
  root.dataset.theme = mode;
  updateToggles();
  updateHeaderScene();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  document.addEventListener('i18n:change', updateToggles);
  document.addEventListener('click', (e) => {
    const toggle = e.target.closest('[data-theme-toggle]');
    if (toggle) cycleTheme();
  });
}
