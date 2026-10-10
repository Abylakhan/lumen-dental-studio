// Contacts — click-to-call, WhatsApp, email, map, directions and hours.
import SITE from '../../config.js';
import { t, tl } from '../localization.js';
import { $, esc, icons, telHref, waHref, mailHref, mapLinks } from '../utils.js';
import { hoursTableHTML } from '../hours.js';

function render() {
  const social = SITE.social.filter((s) => s.url);
  $('[data-contact-list]').innerHTML = `
    <div><dt>${esc(t('contactsPage.phone'))}</dt><dd><a class="big" href="${telHref()}">${esc(SITE.contact.phoneDisplay)}</a></dd></div>
    <div><dt>${esc(t('contactsPage.whatsapp'))}</dt><dd><a class="big" href="${waHref(t('booking.wa.general'))}" target="_blank" rel="noopener">WhatsApp ↗<span class="sr-only"> (${esc(t('ui.externalLink'))})</span></a></dd></div>
    <div><dt>${esc(t('contactsPage.email'))}</dt><dd><a href="${mailHref()}">${esc(SITE.contact.email)}</a></dd></div>
    <div><dt>${esc(t('contactsPage.address'))}</dt><dd>${esc(tl(SITE.contact.address))}</dd></div>
    <div><dt>${esc(t('contactsPage.social'))}</dt><dd>${social.length ? social.map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a>`).join(' · ') : `<span class="placeholder-val">${esc(t('contactsPage.noSocial'))}</span>`}</dd></div>
    ${SITE.contact.placeholder ? `<div><dd><span class="tag tag--demo">${esc(t('ui.placeholder'))}</span></dd></div>` : ''}`;

  const links = mapLinks();
  $('[data-directions]').innerHTML = [['2GIS', links.twogis], ['Google Maps', links.google], ['Yandex Maps', links.yandex]]
    .map(([label, href]) => `<a class="btn btn--sm" href="${href}" target="_blank" rel="noopener"><span class="btn__label" data-text="${label}"><span>${label}</span></span>${icons.arrowUpRight.replace('<svg', '<svg class="btn__icon"')}<span class="sr-only">(${esc(t('ui.externalLink'))})</span></a>`).join('');

  $('[data-hours-table]').innerHTML = hoursTableHTML();
  const map = $('[data-map]');
  const iframe = map.querySelector('iframe');
  if (iframe) iframe.title = t('contactsPage.mapTitle');
  else map.innerHTML = `<iframe src="${links.embed}" title="${esc(t('contactsPage.mapTitle'))}" loading="lazy" referrerpolicy="no-referrer"></iframe>`;
}

export function init() {
  render();
  document.addEventListener('i18n:change', render);
}
