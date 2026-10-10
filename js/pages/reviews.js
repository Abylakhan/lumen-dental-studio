// Reviews — shows only verified reviews from config; otherwise an honest empty state.
import SITE from '../../config.js';
import { t, tl, getLang } from '../localization.js';
import { $, esc, icons } from '../utils.js';

function reviewsHTML() {
  const reviews = SITE.reviews.filter((r) => r.consent === true);
  if (!reviews.length) {
    return `
      <div class="reviews-grid">
        <div class="empty" style="grid-column:span 2">
          <span class="tag tag--demo">${esc(t('ui.placeholder'))}</span>
          <h3>${esc(t('reviewsPage.emptyTitle'))}</h3>
          <p>${esc(t('reviewsPage.emptyText'))}</p>
        </div>
        <div class="review" aria-hidden="true">
          <div class="skeleton-lines"><span></span><span></span><span></span></div>
          <div class="skeleton-lines" style="width:40%"><span></span></div>
        </div>
      </div>`;
  }
  const fmt = new Intl.DateTimeFormat(getLang() === 'en' ? 'en-GB' : `${getLang()}-KZ`, { dateStyle: 'long' });
  return `<ul class="reviews-grid" role="list">${reviews.map((r) => `
    <li><figure class="review">
      <blockquote>${esc(tl(r.text))}</blockquote>
      <figcaption>${esc(r.name)} · ${esc(fmt.format(new Date(r.date)))}${r.sourceUrl ? ` · <a href="${esc(r.sourceUrl)}" target="_blank" rel="noopener">${esc(t('reviewsPage.source'))}: ${esc(r.source)}</a>` : ''}</figcaption>
    </figure></li>`).join('')}</ul>`;
}

function render() {
  $('[data-reviews]').innerHTML = reviewsHTML();
  $('[data-review-policy]').innerHTML = t('reviewsPage.policy').map((p) => `<li>${esc(p)}</li>`).join('');
  const platforms = SITE.reviewPlatforms.filter((p) => p.url);
  $('[data-review-platforms]').innerHTML = platforms.length
    ? platforms.map((p) => `<a class="btn" href="${esc(p.url)}" target="_blank" rel="noopener"><span class="btn__label" data-text="${esc(p.label)}"><span>${esc(p.label)}</span></span>${icons.arrowUpRight.replace('<svg', '<svg class="btn__icon"')}</a>`).join('')
    : `<p class="muted">${esc(t('reviewsPage.noPlatforms'))}</p>`;
}

export function init() {
  render();
  document.addEventListener('i18n:change', render);
}
