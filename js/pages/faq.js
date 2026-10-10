// FAQ — searchable, filterable accordion built on native <details>.
import { t } from '../localization.js';
import { $, $$, esc, icons, normalize, telHref, waHref } from '../utils.js';
import { motionOK } from '../animations.js';
import { chipsHTML } from '../render.js';

let cat = 'all';
let query = '';

function render() {
  const cats = t('faqPage.categories');
  const items = t('faqPage.items');
  $('[data-faq-filters]').innerHTML = chipsHTML([{ id: 'all', label: t('ui.all') }, ...Object.entries(cats).map(([id, label]) => ({ id, label }))], cat);
  const q = normalize(query);
  const visible = items.filter((it) => (cat === 'all' || it.cat === cat) && (!q || normalize(`${it.q} ${it.a}`).includes(q)));
  $('[data-faq-list]').innerHTML = visible.map((it) => `
    <details>
      <summary>${esc(it.q)}<span class="plus" aria-hidden="true"></span></summary>
      <div class="accordion__body"><div>${esc(it.a)}</div></div>
    </details>`).join('');
  $('[data-faq-empty]').hidden = visible.length > 0;
  $('[data-prep]').innerHTML = t('faqPage.prep').map((p, i) => `
    <li><span class="index-num">${String(i + 1).padStart(2, '0')}</span><h3>${esc(p.title)}</h3><p>${esc(p.text)}</p></li>`).join('');
  $('[data-faq-contacts]').innerHTML = `
    <a class="btn btn--sm" href="${telHref()}">${icons.phone.replace('<svg', '<svg class="btn__icon"')}<span class="btn__label" data-text="${esc(t('cta.call'))}"><span>${esc(t('cta.call'))}</span></span></a>
    <a class="btn btn--sm" href="${waHref(t('booking.wa.general'))}" target="_blank" rel="noopener">${icons.whatsapp.replace('<svg', '<svg class="btn__icon"')}<span class="btn__label" data-text="WhatsApp"><span>WhatsApp</span></span></a>`;
}

/** Smooth height animation for <details>, keeping native semantics. */
function initAccordion() {
  $('[data-faq-list]').addEventListener('click', (e) => {
    const summary = e.target.closest('summary');
    if (!summary || !motionOK()) return;
    const details = summary.parentElement;
    const body = $('.accordion__body', details);
    e.preventDefault();
    if (details.open) {
      gsap.to(body, { height: 0, duration: 0.45, ease: 'power3.inOut', onComplete: () => { details.open = false; gsap.set(body, { clearProps: 'height' }); } });
    } else {
      details.open = true;
      gsap.fromTo(body, { height: 0 }, { height: body.scrollHeight, duration: 0.55, ease: 'power3.out', onComplete: () => gsap.set(body, { clearProps: 'height' }) });
    }
  });
}

export function init() {
  render();
  initAccordion();
  const search = $('[data-faq-search]');
  search.addEventListener('input', () => { query = search.value.trim(); render(); });
  $('[data-faq-filters]').addEventListener('click', (e) => {
    const chip = e.target.closest('[data-filter]');
    if (!chip) return;
    cat = chip.dataset.filter;
    render();
    $(`[data-faq-filters] [data-filter="${cat}"]`)?.focus();
  });
  $('[data-faq-reset]').addEventListener('click', () => { cat = 'all'; query = ''; search.value = ''; render(); search.focus(); });
  document.addEventListener('i18n:change', render);
}
