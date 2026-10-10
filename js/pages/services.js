// Services index — live search, category filters, cursor-following preview.
import SITE from '../../config.js';
import { t, tl } from '../localization.js';
import { $, $$, esc, icons, normalize, getParam, finePointer } from '../utils.js';
import { motionOK } from '../animations.js';
import { chipsHTML, categoryLabel } from '../render.js';

const state = { q: getParam('q') || '', cat: getParam('category') || 'all' };

function matches(s) {
  if (state.cat !== 'all' && s.category !== state.cat) return false;
  if (!state.q) return true;
  const q = normalize(state.q);
  const hay = [
    ...Object.values(s.title), ...Object.values(s.short), ...Object.values(s.intro),
    ...Object.values(SITE.serviceCategories.find((c) => c.id === s.category)?.label || {}),
  ].map(normalize).join(' ');
  return q.split(/\s+/).every((word) => hay.includes(word));
}

function renderFilters() {
  const counts = { all: SITE.services.length };
  SITE.services.forEach((s) => { counts[s.category] = (counts[s.category] || 0) + 1; });
  const items = [{ id: 'all', label: t('ui.all') }, ...SITE.serviceCategories.filter((c) => counts[c.id]).map((c) => ({ id: c.id, label: tl(c.label) }))];
  $('[data-svc-filters]').innerHTML = chipsHTML(items, state.cat, { counts });
}

function renderList({ animate = false } = {}) {
  const list = SITE.services.filter(matches);
  $('[data-svc-list]').innerHTML = list.map((s) => {
    const i = SITE.services.indexOf(s);
    return `
      <li class="svc-row" data-img="${esc(s.image)}">
        <span class="index-num">${String(i + 1).padStart(2, '0')}</span>
        <span class="svc-row__thumb"><img src="${esc(s.image)}" alt="" loading="lazy" decoding="async"></span>
        <div>
          <span class="tag" style="margin-bottom:var(--sp-3)">${esc(categoryLabel(s.category))}</span>
          <h2><a href="service.html?id=${esc(s.id)}">${esc(tl(s.title))}</a></h2>
        </div>
        <p>${esc(tl(s.short))}</p>
        <span class="svc-row__go" aria-hidden="true">${icons.arrow}</span>
      </li>`;
  }).join('');
  $('[data-svc-empty]').hidden = list.length > 0;
  $('[data-svc-count]').textContent = t('ui.results', { n: list.length });
  if (animate && motionOK()) {
    gsap.fromTo('.svc-row', { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.05, ease: 'expo.out' });
  }
}

function syncUrl() {
  const url = new URL(window.location.href);
  url.searchParams.delete('q');
  url.searchParams.delete('category');
  if (state.q) url.searchParams.set('q', state.q);
  if (state.cat !== 'all') url.searchParams.set('category', state.cat);
  history.replaceState(null, '', url);
}

/** Floating image that follows the cursor over rows (fine pointers only). */
function initPreview() {
  if (!finePointer() || !motionOK()) return;
  const preview = $('[data-svc-preview]');
  const img = $('img', preview);
  const xTo = gsap.quickTo(preview, 'x', { duration: 0.6, ease: 'power3' });
  const yTo = gsap.quickTo(preview, 'y', { duration: 0.6, ease: 'power3' });
  const list = $('[data-svc-list]');
  list.addEventListener('pointermove', (e) => {
    xTo(e.clientX + 24);
    yTo(e.clientY - 180);
  });
  list.addEventListener('pointerover', (e) => {
    const row = e.target.closest('.svc-row');
    if (!row) return;
    if (img.getAttribute('src') !== row.dataset.img) img.src = row.dataset.img;
    preview.classList.add('is-visible');
  });
  list.addEventListener('pointerleave', () => preview.classList.remove('is-visible'));
}

export function init() {
  const search = $('[data-svc-search]');
  search.value = state.q;
  renderFilters();
  renderList();
  initPreview();

  search.addEventListener('input', () => { state.q = search.value.trim(); renderList(); syncUrl(); });
  $('[data-svc-filters]').addEventListener('click', (e) => {
    const chip = e.target.closest('[data-filter]');
    if (!chip) return;
    state.cat = chip.dataset.filter;
    $$('[data-filter]').forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
    renderList({ animate: true });
    syncUrl();
  });
  $('[data-svc-reset]').addEventListener('click', () => {
    state.q = ''; state.cat = 'all'; search.value = '';
    renderFilters(); renderList({ animate: true }); syncUrl();
    search.focus();
  });
  document.addEventListener('i18n:change', () => { renderFilters(); renderList(); });
}
