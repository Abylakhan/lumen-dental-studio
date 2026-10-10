// Before & after gallery — category filters, one comparison slider per case,
// and the patient-photo consent workflow.
import SITE from '../../config.js';
import { t, tl } from '../localization.js';
import { $, $$, esc, icons } from '../utils.js';
import { motionOK } from '../animations.js';
import { chipsHTML } from '../render.js';
import { publishableCases, comparisonHTML, initComparison } from '../before-after.js';

let filter = 'all';

function renderFilters() {
  const cases = publishableCases();
  const counts = { all: cases.length };
  cases.forEach((c) => { counts[c.category] = (counts[c.category] || 0) + 1; });
  const items = [{ id: 'all', label: t('ui.all') }, ...SITE.caseCategories.map((c) => ({ id: c.id, label: tl(c.label) }))];
  $('[data-results-filters]').innerHTML = chipsHTML(items, filter, { counts, label: t('ba.cases') });
}

function renderGallery({ animate = false } = {}) {
  const host = $('[data-gallery]');
  const cases = publishableCases().filter((c) => filter === 'all' || c.category === filter);
  if (!cases.length) {
    host.innerHTML = `<li class="empty" style="grid-column:1/-1"><p>${esc(t('resultsPage.empty'))}</p></li>`;
    return;
  }
  host.innerHTML = cases.map((c, i) => `
    <li class="gallery__item">
      ${comparisonHTML(c, { eager: i < 2 })}
      <div class="gallery__meta">
        <h2 style="font-size:var(--fs-xl)">${esc(tl(c.title))}</h2>
        <span class="tag">${esc(tl(SITE.caseCategories.find((x) => x.id === c.category)?.label))}</span>
      </div>
      <p class="muted">${esc(tl(c.text))}</p>
      <a class="link-arrow" href="service.html?id=${esc(c.service)}">${esc(t('cta.aboutTreatment'))}${icons.arrow}</a>
    </li>`).join('');
  $$('[data-ba]', host).forEach((el) => initComparison(el));
  if (animate && motionOK()) {
    gsap.fromTo('.gallery__item', { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.08, ease: 'expo.out' });
    $$('[data-ba]', host).forEach((el) => el._ba?.sweep());
  }
}

function renderConsent() {
  $('[data-consent-steps]').innerHTML = t('resultsPage.consentSteps')
    .map((s) => `<li><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></li>`).join('');
}

export function init() {
  renderFilters();
  renderGallery();
  renderConsent();
  $('[data-results-filters]').addEventListener('click', (e) => {
    const chip = e.target.closest('[data-filter]');
    if (!chip) return;
    filter = chip.dataset.filter;
    $$('[data-results-filters] [data-filter]').forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
    renderGallery({ animate: true });
  });
  document.addEventListener('i18n:change', () => { renderFilters(); renderGallery(); renderConsent(); });
}
