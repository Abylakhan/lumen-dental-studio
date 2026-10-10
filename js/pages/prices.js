// Full price list — grouped by category, searchable, with a scroll-spy index.
import SITE from '../../config.js';
import { t, tl } from '../localization.js';
import { $, $$, esc, normalize } from '../utils.js';
import { priceRowHTML } from '../render.js';

let query = '';

function matches(item) {
  if (!query) return true;
  const hay = [...Object.values(item.title), ...Object.values(item.note)].map(normalize).join(' ');
  return normalize(query).split(/\s+/).every((w) => hay.includes(w));
}

function render() {
  let total = 0;
  const groups = SITE.prices.categories.map((cat) => {
    const items = SITE.prices.items.filter((it) => it.category === cat.id && matches(it));
    total += items.length;
    return { cat, items };
  }).filter((g) => g.items.length);

  $('[data-price-groups]').innerHTML = groups.map(({ cat, items }) => `
    <section class="price-group" aria-labelledby="pg-${esc(cat.id)}">
      <h2 id="pg-${esc(cat.id)}">${esc(tl(cat.label))}</h2>
      <ul class="price-list" role="list">${items.map((it) => priceRowHTML(it)).join('')}</ul>
    </section>`).join('');
  $('[data-prices-nav]').innerHTML = groups.map(({ cat, items }) =>
    `<a href="#pg-${esc(cat.id)}" data-nav="${esc(cat.id)}"><span>${esc(tl(cat.label))}</span><span>${items.length}</span></a>`).join('');
  $('[data-price-count]').textContent = t('ui.results', { n: total });
  $('[data-price-empty]').hidden = total > 0;
  spy();
}

let observer;
function spy() {
  observer?.disconnect();
  observer = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const id = e.target.id.replace('pg-', '');
      $$('[data-nav]').forEach((a) => a.classList.toggle('is-active', a.dataset.nav === id));
    });
  }, { rootMargin: '-30% 0px -60% 0px' });
  $$('.price-group h2').forEach((h) => observer.observe(h));
}

export function init() {
  const search = $('[data-price-search]');
  render();
  $('[data-cost-factors]').innerHTML = t('pricesPage.includedItems').map((s) => `<li>${esc(s)}</li>`).join('');
  search.addEventListener('input', () => { query = search.value.trim(); render(); });
  $('[data-price-reset]').addEventListener('click', () => { query = ''; search.value = ''; render(); search.focus(); });
  document.addEventListener('i18n:change', () => {
    render();
    $('[data-cost-factors]').innerHTML = t('pricesPage.includedItems').map((s) => `<li>${esc(s)}</li>`).join('');
  });
}
