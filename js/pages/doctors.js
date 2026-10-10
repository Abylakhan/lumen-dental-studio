// Team page — alternating editorial rows rendered from config.
import SITE from '../../config.js';
import { t, tl } from '../localization.js';
import { $, esc, icons, serviceById } from '../utils.js';

function rowHTML(d, i) {
  const services = d.services.map(serviceById).filter(Boolean);
  return `
    <li class="doc-row">
      <figure class="media doc-row__media" data-reveal="clip">
        <img src="${esc(d.photo)}" alt="${esc(tl(d.photoAlt))}" loading="${i < 1 ? 'eager' : 'lazy'}" decoding="async" width="1000" height="1500">
      </figure>
      <div class="doc-row__body">
        <span class="index-num">${String(i + 1).padStart(2, '0')}</span>
        ${d.placeholder ? `<span class="tag tag--demo">${esc(t('ui.placeholder'))}</span>` : ''}
        <h2 data-reveal="lines">${esc(tl(d.role))}</h2>
        <p class="lead">${esc(tl(d.name))}</p>
        <ul class="pill-list" role="list" aria-label="${esc(t('doctorPage.treatments'))}">
          ${services.map((s) => `<li><a href="service.html?id=${esc(s.id)}">${esc(tl(s.title))}</a></li>`).join('')}
        </ul>
        <div class="cta-band__actions">
          <a class="btn btn--solid" href="booking.html?doctor=${esc(d.id)}"><span class="btn__label" data-text="${esc(t('cta.bookDoctor'))}"><span>${esc(t('cta.bookDoctor'))}</span></span>${icons.arrow.replace('<svg', '<svg class="btn__icon"')}</a>
          <a class="link-arrow" href="doctor.html?id=${esc(d.id)}">${esc(t('cta.viewProfile'))}${icons.arrow}</a>
        </div>
      </div>
    </li>`;
}

export function init() {
  const host = $('[data-doctor-rows]');
  const render = () => { host.innerHTML = SITE.doctors.map(rowHTML).join(''); };
  render();
  document.addEventListener('i18n:change', render);
}
