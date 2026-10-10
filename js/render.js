// Reusable HTML fragments rendered from config — keeps pages consistent.
import SITE from '../config.js';
import { t, tl, getLang } from './localization.js';
import { esc, icons } from './utils.js';

const arrow = icons.arrow;

export function formatPrice(item) {
  const fmt = (n) => `${new Intl.NumberFormat(SITE.currency.locale).format(n)}\u00a0${SITE.currency.symbol}`;
  const value = fmt(item.price);
  if (item.promo && item.regular > item.price) {
    // Promotional price: show the regular price struck through.
    const from = item.from ? `<small>${esc(t('ui.from'))}</small>` : '';
    return `<span class="price-promo">${esc(t('ui.promo'))}</span> <s class="price-old">${esc(fmt(item.regular))}</s> ${from}${esc(value)}`;
  }
  if (!item.from) return esc(value);
  // Kazakh places "бастап" after the amount; Russian/English put "от"/"from" before.
  return getLang() === 'kk'
    ? `${esc(value)} <small>${esc(t('ui.from'))}</small>`
    : `<small>${esc(t('ui.from'))}</small>${esc(value)}`;
}

export const categoryLabel = (id, list = SITE.serviceCategories) => tl(list.find((c) => c.id === id)?.label);

export function serviceCardHTML(s, i, { eager = false } = {}) {
  return `
    <a class="service-card" href="service.html?id=${esc(s.id)}" data-cursor="${esc(t('cta.learnMore'))}">
      <figure class="media">
        <img src="${esc(s.image)}" alt="${esc(tl(s.imageAlt))}" ${eager ? '' : 'loading="lazy"'} decoding="async" width="800" height="1000">
        <span class="service-card__more" aria-hidden="true">${icons.arrowUpRight}</span>
      </figure>
      <div class="service-card__meta">
        <span class="index-num">${String(i + 1).padStart(2, '0')}</span>
        <span class="tag">${esc(categoryLabel(s.category))}</span>
      </div>
      <h3>${esc(tl(s.title))}</h3>
      <p>${esc(tl(s.short))}</p>
    </a>`;
}

export function doctorCardHTML(d) {
  return `
    <a class="doc-card" href="doctor.html?id=${esc(d.id)}" data-cursor="${esc(t('cta.viewProfile'))}">
      <figure class="media doc-card__media" data-reveal="clip">
        <img src="${esc(d.photo)}" alt="${esc(tl(d.photoAlt))}" loading="lazy" decoding="async" width="1000" height="1500">
      </figure>
      <div class="doc-card__body">
        ${d.placeholder ? `<span class="tag tag--demo">${esc(t('ui.placeholder'))}</span>` : ''}
        <h3 class="doc-card__role">${esc(tl(d.role))}</h3>
        <p class="doc-card__name">${esc(tl(d.name))}</p>
        <span class="link-arrow" aria-hidden="true">${esc(t('cta.viewProfile'))}${arrow}</span>
      </div>
    </a>`;
}

export function priceRowHTML(item, { book = true } = {}) {
  const bookHref = `booking.html?service=${encodeURIComponent(item.service || '')}`;
  return `
    <li class="price-row" data-category="${esc(item.category)}">
      <span class="price-row__title">${esc(tl(item.title))}</span>
      <span class="price-row__price">${formatPrice(item)}</span>
      <span class="price-row__note">${esc(tl(item.note))}${SITE.prices.placeholder ? ` · <span class="tag tag--demo">${esc(t('ui.demoPrice'))}</span>` : ''}</span>
      ${book ? `<span class="price-row__actions"><a class="link-arrow" href="${bookHref}" aria-label="${esc(`${t('cta.bookShort')}: ${tl(item.title)}`)}">${esc(t('cta.bookShort'))}${arrow}</a></span>` : ''}
    </li>`;
}

/** Accessible filter chip group. */
export function chipsHTML(items, active, { label, counts } = {}) {
  return `<div class="chips" role="group" aria-label="${esc(label || t('ui.filterBy'))}">
    ${items.map((it) => `<button type="button" class="chip" data-filter="${esc(it.id)}" aria-pressed="${it.id === active}">${esc(it.label)}${counts && counts[it.id] != null ? `<span class="count">${counts[it.id]}</span>` : ''}</button>`).join('')}
  </div>`;
}

export function demoNoteHTML(textKey) {
  if (!SITE.demo.enabled) return '';
  return `<p class="demo-note"><span class="tag tag--demo">${esc(t('ui.demo'))}</span><span>${esc(t(textKey))}</span></p>`;
}
