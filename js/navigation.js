/**
 * Site chrome — header, fullscreen menu, footer, mobile action bar,
 * scroll progress and page transitions. Rendered once per page from config,
 * so clinic details never need editing in HTML.
 */
import SITE from '../config.js';
import { t, tl, getLang, setLang, syncSwitches } from './localization.js';
import { $, $$, esc, icons, logoMark, telHref, waHref, mailHref, reducedMotion, hasGsap } from './utils.js';
import { hoursListHTML, openStatus } from './hours.js';

const NAV = [
  { key: 'services', href: 'services.html' },
  { key: 'doctors', href: 'doctors.html' },
  { key: 'results', href: 'before-after.html' },
  { key: 'prices', href: 'prices.html' },
  { key: 'about', href: 'about.html' },
  { key: 'contacts', href: 'contacts.html' },
];
const MENU = [
  { key: 'home', href: 'index.html' },
  { key: 'services', href: 'services.html' },
  { key: 'doctors', href: 'doctors.html' },
  { key: 'results', href: 'before-after.html' },
  { key: 'prices', href: 'prices.html' },
  { key: 'reviews', href: 'reviews.html' },
  { key: 'faq', href: 'faq.html' },
  { key: 'about', href: 'about.html' },
  { key: 'contacts', href: 'contacts.html' },
];
// Which nav item is "current" for each page.
const CURRENT = {
  home: 'home', services: 'services', service: 'services', doctors: 'doctors', doctor: 'doctors',
  results: 'results', prices: 'prices', about: 'about', contacts: 'contacts', reviews: 'reviews',
  faq: 'faq', booking: 'booking', privacy: 'privacy',
};

let lenisRef = null;
export const registerLenis = (lenis) => { lenisRef = lenis; };

const currentKey = () => CURRENT[document.body.dataset.page] || '';
const ariaCurrent = (key) => (key === currentKey() ? ' aria-current="page"' : '');

function langSwitch(extraClass = '') {
  const buttons = SITE.languages.supported.map((l) => `
    <button type="button" lang="${l.htmlLang}" data-lang="${l.code}" aria-pressed="${l.code === getLang()}" title="${esc(l.name)}">
      <span aria-hidden="true">${esc(l.label)}</span><span class="sr-only">${esc(l.name)}</span>
    </button>`).join('');
  return `<div class="lang-switch ${extraClass}" role="group" data-i18n-attr="aria-label:ui.language" aria-label="${esc(t('ui.language'))}">${buttons}</div>`;
}

const themeIcons = `
  <svg class="ico ico-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 0 0 16Z" fill="currentColor"/></svg>
  <svg class="ico ico-light" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
  <svg class="ico ico-dark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/></svg>`;

function headerHTML() {
  const links = NAV.map((n) => `<li><a href="${n.href}"${ariaCurrent(n.key)} data-i18n="nav.${n.key}">${esc(t(`nav.${n.key}`))}</a></li>`).join('');
  return `
  <a class="skip-link" href="#main" data-i18n="ui.skip">${esc(t('ui.skip'))}</a>
  <div class="scroll-progress" aria-hidden="true"></div>
  <header class="site-header" data-scene="light">
    <div class="header__inner container">
      <a class="logo" href="index.html" aria-label="${esc(SITE.clinic.name)} — ${esc(t('nav.home'))}">
        ${SITE.clinic.logo ? `<img src="${esc(SITE.clinic.logo)}" alt="" width="28" height="28">` : logoMark}
        <span>${esc(SITE.clinic.shortName)}</span><span class="logo__sub hide-sm">Dental Studio</span>
      </a>
      <nav class="header__nav" data-i18n-attr="aria-label:nav.main" aria-label="${esc(t('nav.main'))}"><ul>${links}</ul></nav>
      <div class="header__tools">
        ${langSwitch('header__lang')}
        <button type="button" class="icon-btn theme-toggle header__theme" data-theme-toggle data-tip="" aria-label="">${themeIcons}</button>
        <a class="btn btn--solid btn--sm header__cta" href="booking.html"><span class="btn__label" data-text="${esc(t('cta.bookShort'))}"><span data-i18n="cta.bookShort">${esc(t('cta.bookShort'))}</span></span></a>
        <button type="button" class="menu-toggle" aria-expanded="false" aria-controls="site-menu" data-i18n-attr="aria-label:ui.openMenu" aria-label="${esc(t('ui.openMenu'))}">
          <span class="menu-toggle__label hide-sm" data-i18n="ui.menu">${esc(t('ui.menu'))}</span>
          <span class="menu-toggle__lines" aria-hidden="true"></span>
        </button>
      </div>
    </div>
  </header>`;
}

function menuHTML() {
  const items = MENU.map((n, i) => `
    <li><a href="${n.href}"${ariaCurrent(n.key)}><span class="index-num">${String(i + 1).padStart(2, '0')}</span><span class="menu-word" data-i18n="nav.${n.key}">${esc(t(`nav.${n.key}`))}</span></a></li>`).join('');
  return `
  <div class="site-menu scene" id="site-menu" data-scene="dark" role="dialog" aria-modal="true" data-i18n-attr="aria-label:ui.menu" aria-label="${esc(t('ui.menu'))}" hidden>
    <div class="site-menu__inner container">
      <nav data-i18n-attr="aria-label:nav.main" aria-label="${esc(t('nav.main'))}">
        <ol class="site-menu__list" role="list">${items}</ol>
      </nav>
      <div class="site-menu__aside">
        <div>
          <h2 data-i18n="footer.contact">${esc(t('footer.contact'))}</h2>
          <a href="${telHref()}">${esc(SITE.contact.phoneDisplay)}</a><br>
          <a href="${waHref(t('booking.wa.general'))}" target="_blank" rel="noopener" data-wa-general>WhatsApp</a><br>
          <span class="muted" data-address>${esc(tl(SITE.contact.address))}</span>
        </div>
        <div>
          <h2 data-i18n="hours.title">${esc(t('hours.title'))}</h2>
          <ul class="hours-mini" role="list" data-hours-list>${hoursListHTML()}</ul>
        </div>
        <div class="site-menu__prefs">
          <h2 data-i18n="ui.language">${esc(t('ui.language'))}</h2>
          ${langSwitch()}
          <button type="button" class="btn btn--sm menu-theme" data-theme-toggle aria-label="">
            ${themeIcons}<span data-theme-label></span>
          </button>
        </div>
        <div>
          <a class="btn btn--solid btn--block" href="booking.html"><span class="btn__label" data-text="${esc(t('cta.book'))}"><span data-i18n="cta.book">${esc(t('cta.book'))}</span></span>${icons.arrow.replace('<svg', '<svg class="btn__icon"')}</a>
        </div>
      </div>
    </div>
    <a class="staff-entry" href="admin/" rel="nofollow" data-i18n-attr="aria-label:nav.staff" aria-label="${esc(t('nav.staff'))}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>
    </a>
  </div>`;
}

function footerHTML() {
  const col = (titleKey, items) => `
    <div class="footer__col">
      <h2 data-i18n="${titleKey}">${esc(t(titleKey))}</h2>
      <ul role="list">${items}</ul>
    </div>`;
  const link = (key, href) => `<li><a href="${href}" data-i18n="nav.${key}">${esc(t(`nav.${key}`))}</a></li>`;
  const social = SITE.social.filter((s) => s.url).map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a></li>`).join('');
  const year = new Date().getFullYear();
  return `
  <footer class="site-footer scene" data-scene="dark">
    <div class="container">
      <div class="footer__top">
        <div class="footer__col">
          <a class="logo" href="index.html" aria-label="${esc(SITE.clinic.name)}">${logoMark}<span>${esc(SITE.clinic.shortName)}</span></a>
          <p class="muted" style="margin-top:var(--sp-4);max-width:28ch" data-i18n="footer.tagline">${esc(t('footer.tagline'))}</p>
        </div>
        ${col('footer.explore', link('services', 'services.html') + link('doctors', 'doctors.html') + link('results', 'before-after.html') + link('prices', 'prices.html') + link('about', 'about.html'))}
        ${col('footer.patients', link('booking', 'booking.html') + link('reviews', 'reviews.html') + link('faq', 'faq.html') + link('contacts', 'contacts.html') + link('privacy', 'privacy.html'))}
        ${col('footer.contact', `
          <li><a href="${telHref()}">${esc(SITE.contact.phoneDisplay)}</a></li>
          <li><a href="${waHref(t('booking.wa.general'))}" target="_blank" rel="noopener" data-wa-general>WhatsApp</a></li>
          <li><a href="${mailHref()}">${esc(SITE.contact.email)}</a></li>
          <li class="muted" data-address>${esc(tl(SITE.contact.address))}</li>${social}`)}
        <div class="footer__col">
          <h2 data-i18n="footer.hours">${esc(t('footer.hours'))}</h2>
          <ul role="list" class="hours-mini" data-hours-list>${hoursListHTML()}</ul>
          <p class="status" data-open-status style="margin-top:var(--sp-4)"></p>
        </div>
      </div>
      <p class="footer__word" aria-hidden="true">Lumen<span class="serif">.</span></p>
      ${SITE.demo.enabled ? `<p class="demo-note"><span class="tag tag--demo" data-i18n="ui.demo">${esc(t('ui.demo'))}</span><span><strong data-i18n="footer.demoTitle">${esc(t('footer.demoTitle'))}</strong> <span data-i18n="footer.demoText">${esc(t('footer.demoText'))}</span></span></p>` : ''}
      <div class="footer__bottom">
        <span>© ${year} ${esc(SITE.clinic.name)}. <span data-i18n="footer.rights">${esc(t('footer.rights'))}</span></span>
        <span>${SITE.clinic.license ? esc(`${SITE.clinic.license.number}`) : `<span data-i18n="footer.license">${esc(t('footer.license'))}</span>`}</span>
        <span data-i18n="footer.photo">${esc(t('footer.photo'))}</span>
      </div>
    </div>
  </footer>`;
}

function actionBarHTML() {
  const onBooking = document.body.dataset.page === 'booking';
  const second = onBooking
    ? `<a class="action-bar__btn" href="${waHref(t('booking.wa.general'))}" target="_blank" rel="noopener" data-wa-general>${icons.whatsapp}<span data-i18n="cta.whatsapp">${esc(t('cta.whatsapp'))}</span></a>`
    : `<a class="action-bar__btn action-bar__btn--primary" href="booking.html">${icons.calendar}<span data-i18n="cta.bookShort">${esc(t('cta.bookShort'))}</span></a>`;
  return `
  <div class="action-bar" data-scene="dark">
    <a class="action-bar__btn" href="${telHref()}">${icons.phone}<span data-i18n="cta.call">${esc(t('cta.call'))}</span></a>
    ${second}
  </div>`;
}

/* ---- Behaviour -------------------------------------------------------- */

function initHeaderScroll() {
  const header = $('.site-header');
  const progress = $('.scroll-progress');
  let lastY = window.scrollY;
  let ticking = false;
  const update = () => {
    ticking = false;
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.setProperty('--progress', max > 0 ? (y / max).toFixed(4) : 0);
    header.classList.toggle('is-scrolled', y > 8);
    const goingDown = y > lastY + 4;
    const goingUp = y < lastY - 4;
    if (goingDown && y > 240 && !header.contains(document.activeElement)) header.classList.add('is-hidden');
    else if (goingUp || y < 240) header.classList.remove('is-hidden');
    lastY = y;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  header.addEventListener('focusin', () => header.classList.remove('is-hidden'));
  update();
}

function initMenu() {
  const toggle = $('.menu-toggle');
  const menu = $('#site-menu');
  const header = $('.site-header');
  const html = document.documentElement;
  let open = false;
  let prevScene = 'light';
  let tl = null;

  const focusables = () => [toggle, ...$$('a[href], button:not([disabled])', menu)];

  function trap(e) {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key !== 'Tab') return;
    const list = focusables();
    const first = list[0];
    const last = list[list.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function openMenu() {
    if (open) return;
    open = true;
    prevScene = header.dataset.scene;
    header.dataset.scene = 'dark';
    menu.hidden = false;
    html.classList.add('menu-open');
    document.body.style.overflow = 'hidden';
    lenisRef?.stop();
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', t('ui.closeMenu'));
    toggle.dataset.i18nAttr = 'aria-label:ui.closeMenu';
    const label = $('.menu-toggle__label', toggle);
    if (label) { label.dataset.i18n = 'ui.close'; label.textContent = t('ui.close'); }
    document.addEventListener('keydown', trap);

    if (hasGsap() && !reducedMotion()) {
      tl?.kill();
      tl = gsap.timeline();
      tl.set(menu, { visibility: 'visible' })
        .fromTo(menu, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.8, ease: 'expo.inOut' })
        .fromTo($$('.site-menu__list a', menu), { yPercent: 110 }, { yPercent: 0, duration: 0.9, ease: 'expo.out', stagger: 0.045 }, '-=0.35')
        .fromTo($$('.site-menu__aside > *', menu), { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.06, ease: 'power3.out' }, '-=0.7');
      menu.classList.add('is-open');
    } else {
      menu.classList.add('is-open');
    }
    requestAnimationFrame(() => $('.site-menu__list a', menu)?.focus({ preventScroll: true }));
  }

  function close({ restoreFocus = true } = {}) {
    if (!open) return;
    open = false;
    document.removeEventListener('keydown', trap);
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', t('ui.openMenu'));
    toggle.dataset.i18nAttr = 'aria-label:ui.openMenu';
    const label = $('.menu-toggle__label', toggle);
    if (label) { label.dataset.i18n = 'ui.menu'; label.textContent = t('ui.menu'); }
    const finish = () => {
      menu.classList.remove('is-open');
      menu.hidden = true;
      window.gsap?.set(menu, { clearProps: 'clipPath,visibility' });
      html.classList.remove('menu-open');
      document.body.style.overflow = '';
      header.dataset.scene = prevScene;
      lenisRef?.start();
      document.dispatchEvent(new Event('scroll'));
    };
    if (restoreFocus) toggle.focus({ preventScroll: true });
    if (hasGsap() && !reducedMotion()) {
      tl?.kill();
      tl = gsap.timeline({ onComplete: finish });
      tl.to(menu, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.6, ease: 'expo.inOut' });
    } else {
      finish();
    }
  }

  toggle.addEventListener('click', () => (open ? close() : openMenu()));
  // Same-page links (and any link) close the menu.
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) close({ restoreFocus: false }); });
  window.addEventListener('pageshow', () => close({ restoreFocus: false }));
}

function initLanguageButtons() {
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-lang]');
    if (!b) return;
    setLang(b.dataset.lang);
  });
  const sync = () => {
    syncSwitches(getLang());
    $$('[data-address]').forEach((el) => { el.textContent = tl(SITE.contact.address); });
    $$('[data-hours-list]').forEach((el) => { el.innerHTML = hoursListHTML(); });
    $$('[data-wa-general]').forEach((el) => { el.href = waHref(t('booking.wa.general')); });
    $$('[data-open-status]').forEach((el) => {
      const s = openStatus();
      el.textContent = s.text;
      el.classList.toggle('is-open', s.open);
    });
    $('.logo')?.setAttribute('aria-label', `${SITE.clinic.name} — ${t('nav.home')}`);
  };
  document.addEventListener('i18n:change', sync);
  sync();
}

/* Page transitions: a curtain covers the page before navigating to another
   internal page and lifts on arrival. Real links, history and bfcache work
   as normal; skipped for reduced motion, modifiers and new-tab clicks. */
function initPageTransitions() {
  const html = document.documentElement;
  if (html.classList.contains('pt-enter')) {
    requestAnimationFrame(() => requestAnimationFrame(() => html.classList.add('pt-reveal')));
    setTimeout(() => html.classList.remove('pt-enter', 'pt-reveal'), 900);
  }
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) html.classList.remove('pt-exit', 'pt-enter', 'pt-reveal');
  });
  if (reducedMotion()) return;
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target && a.target !== '_self') return;
    if (a.hasAttribute('download')) return;
    const url = new URL(a.href, window.location.href);
    if (url.origin !== window.location.origin) return;
    if (!/\.html$|\/$/.test(url.pathname)) return;
    if (url.pathname === window.location.pathname && url.search === window.location.search) return; // hash / same page
    e.preventDefault();
    try { sessionStorage.setItem('lumen.pt', '1'); } catch { /* ignore */ }
    html.classList.add('pt-exit');
    setTimeout(() => { window.location.href = url.href; }, 480);
  });
}

/* Hide the mobile action bar while a text field has focus so it never covers
   the field or the on-screen keyboard. */
function initTypingState() {
  const isField = (el) => el && el.matches?.('input:not([type="checkbox"]):not([type="radio"]), textarea, select');
  document.addEventListener('focusin', (e) => { if (isField(e.target)) document.documentElement.classList.add('is-typing'); });
  document.addEventListener('focusout', (e) => { if (isField(e.target)) document.documentElement.classList.remove('is-typing'); });
}

export function renderChrome() {
  const main = $('#main');
  document.body.insertAdjacentHTML('afterbegin', headerHTML() + menuHTML());
  main.insertAdjacentHTML('afterend', footerHTML() + actionBarHTML());
  initHeaderScroll();
  initMenu();
  initLanguageButtons();
  initPageTransitions();
  initTypingState();
}
