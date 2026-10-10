// Doctor profile — rendered from config by ?id=…
// Unknown fields show "to be provided by the clinic"; nothing is invented.
import SITE from '../../config.js';
import { t, tl, setPageMetaVars } from '../localization.js';
import { $, esc, icons, getParam, doctorById, serviceById, waHref } from '../utils.js';
import { initReveals } from '../animations.js';
import { formatPrice } from '../render.js';

const pending = () => `<span class="placeholder-val">${esc(t('ui.toBeProvided'))}</span>`;
const value = (v) => (v == null || (Array.isArray(v) && !v.length) ? pending() : esc(tl(v)));

function render() {
  const d = doctorById(getParam('id'));
  if (!d) {
    setPageMetaVars({ name: t('doctorPage.notFoundTitle') });
    return `
      <section class="nf scene" data-scene="light"><div class="container">
        <h1>${esc(t('doctorPage.notFoundTitle'))}</h1><p>${esc(t('doctorPage.notFoundText'))}</p>
        <div class="nf__actions"><a class="btn btn--solid" href="doctors.html"><span class="btn__label" data-text="${esc(t('doctorPage.back'))}"><span>${esc(t('doctorPage.back'))}</span></span></a></div>
      </div></section>`;
  }
  const name = tl(d.name);
  const role = tl(d.role);
  setPageMetaVars({ name: `${role} — ${name}` });
  const langs = Array.isArray(d.languages) && d.languages.length
    ? esc(d.languages.map((code) => SITE.languages.supported.find((l) => l.code === code)?.name || code).join(', '))
    : pending();
  const services = d.services.map(serviceById).filter(Boolean);
  const waText = `${t('booking.wa.greeting')}\n${t('booking.wa.doctor')}: ${role} — ${name}`;
  const others = SITE.doctors.filter((x) => x.id !== d.id);

  return `
    <section class="scene" data-scene="light">
      <div class="container profile">
        <figure class="media profile__media" data-reveal="clip">
          <img src="${esc(d.photo)}" alt="${esc(tl(d.photoAlt))}" decoding="async" fetchpriority="high" width="1000" height="1500">
        </figure>
        <div class="profile__body">
          <div>
            <nav class="breadcrumb" aria-label="${esc(t('nav.breadcrumb'))}"><ol>
              <li><a href="index.html">${esc(t('nav.home'))}</a></li>
              <li><a href="doctors.html">${esc(t('nav.doctors'))}</a></li>
              <li aria-current="page">${esc(role)}</li>
            </ol></nav>
            <p class="kicker" style="margin-top:var(--sp-6)">${esc(role)}</p>
            <h1 data-reveal="lines">${esc(name)}</h1>
            ${d.placeholder ? `<p class="demo-note" style="margin-top:var(--sp-5)"><span class="tag tag--demo">${esc(t('ui.placeholder'))}</span><span>${esc(t('doctorPage.placeholderNote'))}</span></p>` : ''}
          </div>

          <div class="stack" style="--stack:var(--sp-4)">
            <h2 class="kicker">${esc(t('doctorPage.about'))}</h2>
            <p class="lead" style="max-width:56ch">${value(d.bio)}</p>
          </div>

          <dl class="info-list" data-reveal="stagger">
            <div><dt>${esc(t('doctorPage.specialization'))}</dt><dd>${esc(role)}</dd></div>
            <div><dt>${esc(t('doctorPage.education'))}</dt><dd>${value(d.education)}</dd></div>
            <div><dt>${esc(t('doctorPage.experience'))}</dt><dd>${value(d.experience)}</dd></div>
            <div><dt>${esc(t('doctorPage.languages'))}</dt><dd>${langs}</dd></div>
          </dl>

          <div class="stack" style="--stack:var(--sp-4)">
            <h2 class="kicker">${esc(t('doctorPage.treatments'))}</h2>
            <ul class="pill-list" role="list">${services.map((s) => {
              const own = d.servicePrices?.[s.id];
              const price = own != null ? ` · ${formatPrice({ price: own, from: true })}` : '';
              return `<li><a href="service.html?id=${esc(s.id)}">${esc(tl(s.title))}${price}</a></li>`;
            }).join('')}</ul>
          </div>

          <div class="cta-band">
            <h2>${esc(t('cta.bookDoctor'))}</h2>
            <div class="cta-band__actions">
              <a class="btn btn--solid" href="booking.html?doctor=${esc(d.id)}"><span class="btn__label" data-text="${esc(t('cta.book'))}"><span>${esc(t('cta.book'))}</span></span>${icons.arrow.replace('<svg', '<svg class="btn__icon"')}</a>
              <a class="btn" href="${waHref(waText, d.whatsapp)}" target="_blank" rel="noopener"><span class="btn__label" data-text="WhatsApp"><span>WhatsApp</span></span><span class="sr-only">(${esc(t('ui.externalLink'))})</span></a>
            </div>
          </div>

          <div class="stack" style="--stack:var(--sp-4)">
            <h2 class="kicker">${esc(t('doctorPage.back'))}</h2>
            <ul class="pill-list" role="list">${others.map((o) => `<li><a href="doctor.html?id=${esc(o.id)}">${esc(tl(o.role))}</a></li>`).join('')}</ul>
          </div>
        </div>
      </div>
    </section>
    <div style="height:var(--section-y)" class="scene" data-scene="light"></div>`;
}

export function init() {
  const host = $('[data-doctor]');
  host.innerHTML = render();
  document.addEventListener('i18n:change', () => { host.innerHTML = render(); initReveals(host); });
}
