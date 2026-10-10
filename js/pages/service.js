// Individual service — rendered from config by ?id=…
import SITE from '../../config.js';
import { t, tl, setPageMetaVars } from '../localization.js';
import { $, esc, icons, getParam, serviceById } from '../utils.js';
import { serviceCardHTML, categoryLabel, formatPrice } from '../render.js';
import { initReveals } from '../animations.js';

const btn = (href, label, solid = false, arrow = true) =>
  `<a class="btn${solid ? ' btn--solid' : ''}" href="${href}"><span class="btn__label" data-text="${esc(label)}"><span>${esc(label)}</span></span>${arrow ? icons.arrow.replace('<svg', '<svg class="btn__icon"') : ''}</a>`;

function notFound() {
  setPageMetaVars({ name: t('servicePage.notFoundTitle') });
  return `
    <section class="nf scene" data-scene="light">
      <div class="container">
        <h1>${esc(t('servicePage.notFoundTitle'))}</h1>
        <p>${esc(t('servicePage.notFoundText'))}</p>
        <div class="nf__actions">${btn('services.html', t('cta.allServices'), true)}</div>
      </div>
    </section>`;
}

function render() {
  const s = serviceById(getParam('id'));
  if (!s) return notFound();
  const title = tl(s.title);
  setPageMetaVars({ name: title });

  const prices = SITE.prices.items.filter((p) => p.service === s.id);
  const cheapest = prices.length ? prices.reduce((a, b) => (a.price <= b.price ? a : b)) : null;
  const related = SITE.services.filter((x) => x.id !== s.id && x.category === s.category)
    .concat(SITE.services.filter((x) => x.id !== s.id && x.category !== s.category))
    .slice(0, 3);
  const bookHref = `booking.html?service=${encodeURIComponent(s.id)}`;
  const check = icons.check;

  return `
    <section class="page-hero scene" data-scene="light">
      <div class="container">
        <nav class="breadcrumb" aria-label="${esc(t('nav.breadcrumb'))}"><ol>
          <li><a href="index.html">${esc(t('nav.home'))}</a></li>
          <li><a href="services.html">${esc(t('nav.services'))}</a></li>
          <li aria-current="page">${esc(title)}</li>
        </ol></nav>
        <div class="page-hero__grid">
          <div>
            <h1 data-reveal="lines">${esc(title)}</h1>
          </div>
          <div class="stack">
            <p class="lead" data-reveal="up">${esc(tl(s.short))}</p>
            <div class="cta-band__actions" data-reveal="up">${btn(bookHref, t('cta.bookService'), true)}</div>
          </div>
        </div>
        <figure class="media svc-hero__media" data-reveal="clip">
          <img src="${esc(s.image)}" alt="${esc(tl(s.imageAlt))}" decoding="async" fetchpriority="high" data-parallax="0.12" style="height:120%">
        </figure>
        <dl class="facts" style="margin-top:var(--sp-7)" data-reveal="stagger">
          <div><dt>${esc(t('servicePage.duration'))}</dt><dd>${esc(tl(s.duration))}</dd></div>
          <div><dt>${esc(t('servicePage.priceFrom'))}</dt><dd>${cheapest ? `${formatPrice({ ...cheapest, from: true })}${SITE.prices.placeholder ? ` <span class="tag tag--demo">${esc(t('ui.demoPrice'))}</span>` : ''}` : '—'}</dd></div>
          <div><dt>${esc(t('servicePage.category'))}</dt><dd>${esc(categoryLabel(s.category))}</dd></div>
        </dl>
      </div>
    </section>

    <section class="section scene" data-scene="light" style="padding-top:var(--sp-6)">
      <div class="container split">
        <div class="split__sticky"><p class="kicker">${esc(t('servicePage.overview'))}</p></div>
        <p class="manifesto" data-reveal="words">${esc(tl(s.intro))}</p>
      </div>
    </section>

    <section class="section scene" data-scene="dark">
      <div class="container split">
        <div class="split__sticky">
          <p class="kicker">${esc(title)}</p>
          <h2 data-reveal="lines">${esc(t('servicePage.steps'))}</h2>
        </div>
        <ol class="steps" role="list" data-reveal="stagger">${s.steps.map((st) => `<li>${esc(tl(st))}</li>`).join('')}</ol>
      </div>
    </section>

    <section class="section scene" data-scene="soft">
      <div class="container split">
        <div class="split__sticky"><h2 data-reveal="lines">${esc(t('servicePage.prep'))}</h2></div>
        <div class="stack" style="--stack:var(--sp-6)">
          <ul class="prep-list" role="list" data-reveal="stagger">${s.prep.map((p) => `<li>${check}<span>${esc(tl(p))}</span></li>`).join('')}</ul>
          <p class="notice">${icons.alert}<span>${esc(t('servicePage.disclaimer'))}</span></p>
          <p><a class="link-arrow" href="faq.html#preparation">${esc(t('faqPage.prepTitle'))}${icons.arrow}</a></p>
        </div>
      </div>
    </section>

    <section class="section scene" data-scene="light">
      <div class="container">
        <div class="toolbar"><h2>${esc(t('servicePage.related'))}</h2><a class="link-arrow" href="services.html">${esc(t('cta.allServices'))}${icons.arrow}</a></div>
        <ul class="related" role="list" data-reveal="stagger">${related.map((r) => `<li>${serviceCardHTML(r, SITE.services.indexOf(r))}</li>`).join('')}</ul>
      </div>
    </section>

    <section class="section section--tight scene" data-scene="light">
      <div class="container">
        <div class="cta-band" data-reveal="up">
          <h2>${esc(title)}</h2>
          <div class="cta-band__actions">${btn(bookHref, t('cta.bookService'), true)}${btn('contacts.html', t('cta.contact'), false, false)}</div>
        </div>
      </div>
    </section>`;
}

export function init() {
  const host = $('[data-service]');
  host.innerHTML = render();
  document.addEventListener('i18n:change', () => {
    host.innerHTML = render();
    initReveals(host);
  });
}
