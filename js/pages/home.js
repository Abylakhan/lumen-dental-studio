/**
 * Homepage — eight choreographed scenes.
 * Content is rendered from config; motion is layered on top and torn down /
 * rebuilt through gsap.matchMedia so breakpoints and reduced motion are safe.
 */
import SITE from '../../config.js';
import { t, tl } from '../localization.js';
import { $, $$, esc } from '../utils.js';
import { motionOK, splitWords, revealLines } from '../animations.js';
import { serviceCardHTML, doctorCardHTML, priceRowHTML, chipsHTML } from '../render.js';
import { publishableCases, comparisonHTML, initComparison } from '../before-after.js';

/* Hotspot coordinates in % of the close-up photograph (x, y) and where each
   label sits (lx, ly). Adjust if the image is replaced. */
const HOTSPOTS = [
  { x: 39, y: 47, lx: 21, ly: 24 },
  { x: 50, y: 61, lx: 33, ly: 82 },
  { x: 62, y: 45, lx: 55, ly: 18 },
  { x: 73, y: 43, lx: 86, ly: 66 },
];

let pricingFilter = 'popular';
let caseFilter = 'all';
let activeCase = null;

/* ======================================================================
   Rendering
   ====================================================================== */

function renderStats() {
  const openDays = Object.values(SITE.hours.week).filter(Boolean).length;
  const stats = [
    { n: SITE.services.length, key: 'services' },
    { n: SITE.doctors.length, key: 'doctors' },
    { n: SITE.languages.supported.length, key: 'languages' },
    { n: openDays, key: 'days' },
  ];
  $('[data-stats]').innerHTML = stats.map((s) => `
    <div class="stats__item">
      <dt data-i18n="home.stats.${s.key}">${esc(t(`home.stats.${s.key}`))}</dt>
      <dd><span data-count="${s.n}">${s.n}</span></dd>
    </div>`).join('');
}

function renderHotspots() {
  const points = t('home.s3.points');
  const wrap = $('[data-hotspots]');
  wrap.innerHTML = HOTSPOTS.map((h, i) => {
    const p = points[i];
    const side = h.x > 60 ? 'is-left' : 'is-right';
    const vside = h.y > 55 ? 'is-up' : 'is-down';
    return `
      <button type="button" class="hotspot" style="left:${h.x}%;top:${h.y}%" aria-expanded="false" aria-controls="hs-panel-${i}" data-hotspot="${i}">
        <span class="hotspot__dot" aria-hidden="true"></span><span class="sr-only">${esc(p.title)}</span>
      </button>
      <span class="hotspot-label" style="left:${h.lx}%;top:${h.ly}%" aria-hidden="true"><span class="index-num">0${i + 1}</span><span class="hotspot-label__t"> ${esc(p.title)}</span></span>
      <div class="hotspot-panel ${side} ${vside}" id="hs-panel-${i}" role="region" aria-label="${esc(p.title)}" style="left:${h.x}%;top:${h.y}%">
        <h3>${esc(p.title)}</h3><p>${esc(p.text)}</p>
      </div>`;
  }).join('');
  $('[data-closeup-lines]').innerHTML = HOTSPOTS.map((h, i) =>
    `<span class="hotspot-line" data-line="${i}" style="left:${h.x}%;top:${h.y}%"><span class="hotspot-line__fill"></span></span>`).join('');
  positionConnectors();
}

/** Size and angle each connector from its hotspot to its label (layout px). */
function positionConnectors() {
  const frame = $('[data-closeup-frame]');
  if (!frame) return;
  const w = frame.offsetWidth;
  const h = frame.offsetHeight;
  $$('.hotspot-line', frame).forEach((line) => {
    const p = HOTSPOTS[Number(line.dataset.line)];
    const dx = ((p.lx - p.x) / 100) * w;
    const dy = ((p.ly - p.y) / 100) * h;
    line.style.width = `${Math.hypot(dx, dy)}px`;
    line.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
  });
}

/** Update hotspot copy in place so running timelines keep their targets. */
function updateHotspotText() {
  const points = t('home.s3.points');
  points.forEach((p, i) => {
    const btn = $(`[data-hotspot="${i}"]`);
    if (!btn) return;
    $('.sr-only', btn).textContent = p.title;
    const label = $$('.hotspot-label')[i];
    if (label) $('.hotspot-label__t', label).textContent = ` ${p.title}`;
    const panel = $(`#hs-panel-${i}`);
    panel.setAttribute('aria-label', p.title);
    $('h3', panel).textContent = p.title;
    $('p', panel).textContent = p.text;
  });
}

function initHotspots() {
  const wrap = $('[data-hotspots]');
  let pinned = null;
  const open = (i, on) => {
    const btn = $(`[data-hotspot="${i}"]`, wrap);
    const panel = $(`#hs-panel-${i}`, wrap);
    if (!btn || !panel) return;
    btn.setAttribute('aria-expanded', String(on));
    panel.classList.toggle('is-open', on);
  };
  const closeAll = (except) => HOTSPOTS.forEach((_, i) => { if (i !== except) open(i, false); });

  wrap.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-hotspot]');
    if (!btn) return;
    const i = Number(btn.dataset.hotspot);
    const isOpen = btn.getAttribute('aria-expanded') === 'true' && pinned === i;
    closeAll(i);
    pinned = isOpen ? null : i;
    open(i, !isOpen);
  });
  wrap.addEventListener('pointerover', (e) => {
    const btn = e.target.closest('[data-hotspot]');
    if (!btn || e.pointerType !== 'mouse') return;
    closeAll(pinned);
    open(Number(btn.dataset.hotspot), true);
  });
  wrap.addEventListener('pointerout', (e) => {
    const btn = e.target.closest('[data-hotspot]');
    if (!btn || e.pointerType !== 'mouse') return;
    const i = Number(btn.dataset.hotspot);
    if (pinned !== i) open(i, false);
  });
  wrap.addEventListener('focusin', (e) => {
    const btn = e.target.closest('[data-hotspot]');
    if (btn) { closeAll(); open(Number(btn.dataset.hotspot), true); }
  });
  wrap.addEventListener('focusout', (e) => {
    const btn = e.target.closest('[data-hotspot]');
    if (btn && pinned !== Number(btn.dataset.hotspot)) open(Number(btn.dataset.hotspot), false);
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { pinned = null; closeAll(); } });
  document.addEventListener('click', (e) => { if (!e.target.closest('[data-hotspots]')) { pinned = null; closeAll(); } });
}

function renderServices() {
  const track = $('[data-services-track]');
  track.innerHTML = SITE.services.map((s, i) => `<li class="showcase__item">${serviceCardHTML(s, i)}</li>`).join('');
  // Native lazy-loading is unreliable inside a transformed, clipped track:
  // start loading every card image once the section is near.
  const io = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    $$('img', track).forEach((img) => { img.loading = 'eager'; });
    io.disconnect();
  }, { rootMargin: '1200px 0px' });
  io.observe(track);
  const count = $('[data-showcase-count]');
  if (count) count.textContent = `01 / ${String(SITE.services.length).padStart(2, '0')}`;
}

function renderResults() {
  const host = $('[data-results]');
  const cases = publishableCases();
  if (!cases.length) { host.innerHTML = `<p class="muted">${esc(t('resultsPage.empty'))}</p>`; return; }
  if (!activeCase || !cases.find((c) => c.id === activeCase)) activeCase = cases[0].id;
  const current = cases.find((c) => c.id === activeCase);
  const cats = [{ id: 'all', label: t('ui.all') }, ...SITE.caseCategories.filter((c) => cases.some((x) => x.category === c.id)).map((c) => ({ id: c.id, label: tl(c.label) }))];
  const visible = cases.filter((c) => caseFilter === 'all' || c.category === caseFilter);

  host.innerHTML = `
    <div class="results__viewer" data-reveal="scale">${comparisonHTML(current)}</div>
    <aside class="results__side">
      ${chipsHTML(cats, caseFilter, { label: t('ba.cases') })}
      <ul class="results__cases" role="list">
        ${visible.map((c, i) => `
          <li><button type="button" class="case-btn" data-case="${esc(c.id)}" aria-pressed="${c.id === activeCase}">
            <span class="index-num">${String(i + 1).padStart(2, '0')}</span>
            <span class="case-btn__title">${esc(tl(c.title))}</span>
            ${c.demo ? `<span class="tag tag--demo">${esc(t('ui.demo'))}</span>` : ''}
          </button></li>`).join('')}
      </ul>
      <div class="results__desc" aria-live="polite">
        <h3>${esc(tl(current.title))}</h3>
        <p class="muted">${esc(tl(current.text))}</p>
        <div class="results__links">
          <a class="link-arrow" href="service.html?id=${esc(current.service)}">${esc(t('cta.aboutTreatment'))}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>
          <a class="link-arrow" href="before-after.html">${esc(t('cta.allResults'))}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>
        </div>
      </div>
    </aside>`;
  return initComparison($('[data-ba]', host));
}

function initResults() {
  renderResults();
  const host = $('[data-results]');
  host.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-filter]');
    const caseBtn = e.target.closest('[data-case]');
    if (chip) {
      caseFilter = chip.dataset.filter;
      const first = publishableCases().find((c) => caseFilter === 'all' || c.category === caseFilter);
      if (first) activeCase = first.id;
      swapCase(() => $(`[data-filter="${caseFilter}"]`, host)?.focus());
    } else if (caseBtn && caseBtn.dataset.case !== activeCase) {
      activeCase = caseBtn.dataset.case;
      swapCase(() => $(`[data-case="${activeCase}"]`, host)?.focus());
    }
  });
}

/** Cross-fade to the selected case, then sweep the divider into place. */
function swapCase(restoreFocus) {
  const viewer = $('.results__viewer');
  const run = () => {
    const api = renderResults();
    $('.results__viewer')?.removeAttribute('data-reveal');
    restoreFocus?.();
    if (motionOK()) {
      gsap.fromTo('.results__viewer .ba', { autoAlpha: 0.2, scale: 0.985 }, { autoAlpha: 1, scale: 1, duration: 0.8, ease: 'expo.out' });
      gsap.fromTo('.results__desc > *', { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.06, ease: 'power3.out' });
      api?.sweep();
    }
  };
  if (motionOK() && viewer) gsap.to(viewer, { autoAlpha: 0.4, duration: 0.2, onComplete: () => { gsap.set(viewer, { clearProps: 'all' }); run(); } });
  else run();
}

function renderDoctors() {
  $('[data-doctors]').innerHTML = SITE.doctors.map((d, i) => `<li class="team__item" style="--i:${i}">${doctorCardHTML(d)}</li>`).join('');
}

function renderPricing() {
  const host = $('[data-pricing]');
  const cats = [{ id: 'popular', label: t('home.pricing.popular') }, ...SITE.prices.categories.map((c) => ({ id: c.id, label: tl(c.label) }))];
  const items = SITE.prices.items.filter((it) => (pricingFilter === 'popular' ? it.popular : it.category === pricingFilter));
  host.innerHTML = `
    ${chipsHTML(cats, pricingFilter)}
    <ul class="price-list" role="list" aria-live="polite">${items.map((it) => priceRowHTML(it)).join('')}</ul>`;
}

function initPricing() {
  renderPricing();
  $('[data-pricing]').addEventListener('click', (e) => {
    const chip = e.target.closest('[data-filter]');
    if (!chip) return;
    pricingFilter = chip.dataset.filter;
    renderPricing();
    $(`[data-pricing] [data-filter="${pricingFilter}"]`)?.focus();
    if (motionOK()) gsap.fromTo('[data-pricing] .price-row', { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.04, ease: 'power3.out' });
  });
}

function renderAll() {
  renderStats();
  renderHotspots();
  renderServices();
  renderResults();
  renderDoctors();
  renderPricing();
}

/* ======================================================================
   Motion
   ====================================================================== */

function heroIntro() {
  const hero = $('.hero');
  const title = $('.hero__title', hero);
  const media = $('.hero__media', hero);
  const img = $('img', media);
  gsap.set([title], { autoAlpha: 1 });
  gsap.set(splitWords(title), { yPercent: 115 });
  gsap.set(media, { clipPath: 'inset(100% 0% 0% 0%)' });
  gsap.set($$('.hero__kicker, .hero__lead, .hero__ctas, .hero__note, .hero__cue', hero), { autoAlpha: 0, y: 24 });

  const tlIntro = gsap.timeline({ defaults: { ease: 'expo.out' }, delay: document.documentElement.classList.contains('pt-enter') ? 0.45 : 0.1 });
  tlIntro
    .to('.hero__kicker', { autoAlpha: 1, y: 0, duration: 0.9 }, 0)
    .add(revealLines(title, { duration: 1.25, stagger: 0.12 }), 0.05)
    .to(media, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.5, ease: 'expo.inOut' }, 0.2)
    .fromTo(img, { scale: 1.45 }, { scale: 1, duration: 2.2 }, 0.3)
    .to($$('.hero__lead, .hero__ctas, .hero__note, .hero__cue', hero), { autoAlpha: 1, y: 0, duration: 1, stagger: 0.08 }, 0.65);
}

function heroScroll() {
  const hero = $('.hero');
  gsap.to('.hero__media-inner', {
    yPercent: 14, scale: 1.06, ease: 'none',
    scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true },
  });
  gsap.to('.hero__title', {
    yPercent: -18, ease: 'none',
    scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true },
  });
  // As the dark scene rises, the hero recedes into it.
  gsap.to('.hero__inner', {
    autoAlpha: 0.12, scale: 0.97, ease: 'none',
    scrollTrigger: { trigger: '.approach', start: 'top 85%', end: 'top 30%', scrub: true },
  });
}

let scrubTween = null;
function scrubTitle() {
  scrubTween?.scrollTrigger?.kill();
  scrubTween?.kill();
  const title = $('[data-scrub-words]');
  const words = splitWords(title);
  scrubTween = gsap.fromTo(words, { opacity: 0.14 }, {
    opacity: 1, ease: 'none', stagger: 0.12,
    scrollTrigger: { trigger: title, start: 'top 82%', end: 'bottom 42%', scrub: true },
  });
  gsap.fromTo(title, { y: 60 }, { y: -20, ease: 'none', scrollTrigger: { trigger: title, start: 'top bottom', end: 'bottom top', scrub: true } });
}

function closeupDesktop() {
  const section = $('.closeup');
  const pin = $('.closeup__pin', section);
  const frame = $('[data-closeup-frame]', section);
  const lines = $$('.hotspot-line__fill', section);
  const spots = $$('.hotspot, .hotspot-label', section);

  const tlPin = gsap.timeline({
    scrollTrigger: { trigger: section, start: 'top top', end: '+=220%', pin, scrub: 0.8, anticipatePin: 1, invalidateOnRefresh: true },
  });
  tlPin
    .fromTo(frame, { scale: 0.42, clipPath: 'inset(6% 6% 6% 6% round 28px)', filter: 'brightness(0.7)' },
      { scale: 1, clipPath: 'inset(0% 0% 0% 0% round 0px)', filter: 'brightness(1)', ease: 'power2.inOut', duration: 1 }, 0)
    .fromTo('.closeup__head', { autoAlpha: 1, y: 0 }, { autoAlpha: 0, y: -80, duration: 0.45, ease: 'power1.in' }, 0.25)
    .fromTo('.closeup__side--left', { autoAlpha: 0, x: -90 }, { autoAlpha: 1, x: 0, duration: 0.4, ease: 'power3.out' }, 0.82)
    .fromTo('.closeup__side--right', { autoAlpha: 0, x: 90 }, { autoAlpha: 1, x: 0, duration: 0.4, ease: 'power3.out' }, 0.88)
    .fromTo(lines, { scaleX: 0 }, { scaleX: 1, duration: 0.35, stagger: 0.07, ease: 'power2.inOut' }, 0.9)
    .fromTo(spots, { autoAlpha: 0, scale: 0.4 }, { autoAlpha: 1, scale: 1, duration: 0.25, stagger: 0.05, ease: 'back.out(2)' }, 0.95)
    .to({}, { duration: 0.45 });
  return () => gsap.set(lines, { clearProps: 'transform' });
}

function closeupMobile() {
  const section = $('.closeup');
  gsap.fromTo('[data-closeup-frame]', { clipPath: 'inset(12% 12% 12% 12% round 20px)', scale: 1.1 }, {
    clipPath: 'inset(0% 0% 0% 0% round 16px)', scale: 1, ease: 'none',
    scrollTrigger: { trigger: '[data-closeup-frame]', start: 'top 90%', end: 'center 55%', scrub: true },
  });
  gsap.fromTo($$('.hotspot-line__fill', section), { scaleX: 0 }, {
    scaleX: 1, stagger: 0.08, duration: 0.8, ease: 'power2.inOut',
    scrollTrigger: { trigger: '[data-closeup-frame]', start: 'center 75%' },
  });
  gsap.fromTo($$('.hotspot, .hotspot-label', section), { autoAlpha: 0, scale: 0.5 }, {
    autoAlpha: 1, scale: 1, stagger: 0.08, duration: 0.6, ease: 'back.out(2)',
    scrollTrigger: { trigger: '[data-closeup-frame]', start: 'center 70%' },
  });
  gsap.fromTo('.closeup__side', { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, stagger: 0.1, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.closeup__side', start: 'top 90%' } });
}

function showcaseHorizontal() {
  const section = $('.showcase');
  const viewport = $('.showcase__viewport', section);
  const track = $('.showcase__track', section);
  const bar = $('.showcase__progress span', section);
  const count = $('[data-showcase-count]', section);
  const total = SITE.services.length;
  section.classList.add('is-pinned');
  const distance = () => Math.max(0, track.scrollWidth - viewport.clientWidth);

  const tween = gsap.to(track, {
    x: () => -distance(),
    ease: 'none',
    scrollTrigger: {
      trigger: section,
      start: 'top top',
      end: () => `+=${distance()}`,
      pin: true,
      scrub: 0.6,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        gsap.set(bar, { scaleX: self.progress });
        const idx = Math.min(total, Math.floor(self.progress * (total - 1)) + 1);
        count.textContent = `${String(idx).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
      },
    },
  });

  // Cards subtly counter-drift inside their frames while the track moves.
  $$('.service-card .media img', track).forEach((img) => {
    gsap.fromTo(img, { xPercent: -6 }, {
      xPercent: 6, ease: 'none',
      scrollTrigger: { trigger: img.closest('.showcase__item'), containerAnimation: tween, start: 'left right', end: 'right left', scrub: true },
    });
  });

  // Keyboard users: focusing an off-screen card scrolls the page to it.
  const onFocus = (e) => {
    const item = e.target.closest('.showcase__item');
    if (!item) return;
    const st = tween.scrollTrigger;
    const ratio = Math.min(1, Math.max(0, (item.offsetLeft - viewport.clientWidth * 0.1) / distance()));
    window.scrollTo({ top: st.start + (st.end - st.start) * ratio, behavior: 'auto' });
  };
  track.addEventListener('focusin', onFocus);
  return () => {
    track.removeEventListener('focusin', onFocus);
    section.classList.remove('is-pinned');
    gsap.set(track, { clearProps: 'x' });
  };
}

function teamMotion() {
  // Alternate columns drift at different speeds for an editorial rhythm.
  $$('.team__item').forEach((item, i) => {
    gsap.fromTo(item, { y: i % 2 ? 80 : 20 }, {
      y: i % 2 ? -40 : -10, ease: 'none',
      scrollTrigger: { trigger: '.team__grid', start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });
}

function finaleMotion() {
  const finale = $('.finale');
  const paths = $$('.finale__arc path', finale);
  paths.forEach((p) => { p.setAttribute('pathLength', '1'); p.style.strokeDasharray = 1; p.style.strokeDashoffset = 1; });
  gsap.to(paths, { strokeDashoffset: 0, ease: 'none', stagger: 0.1, scrollTrigger: { trigger: finale, start: 'top 75%', end: 'center 50%', scrub: true } });
  gsap.fromTo('.finale__arc', { yPercent: 20, scale: 0.9 }, { yPercent: -10, scale: 1, ease: 'none', scrollTrigger: { trigger: finale, start: 'top bottom', end: 'bottom top', scrub: true } });
  const move = (e) => {
    const r = finale.getBoundingClientRect();
    finale.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
    finale.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
  };
  finale.addEventListener('pointermove', move, { passive: true });
}

function buildMotion() {
  if (!motionOK()) return;
  heroIntro();
  heroScroll();
  scrubTitle();
  teamMotion();
  finaleMotion();

  const mm = gsap.matchMedia();
  mm.add('(min-width: 900px)', () => closeupDesktop());
  mm.add('(max-width: 899.98px)', () => closeupMobile());
  mm.add('(min-width: 1024px) and (min-height: 600px)', () => showcaseHorizontal());

  document.addEventListener('i18n:change', scrubTitle);
}

/* ======================================================================
   Init
   ====================================================================== */

export function init() {
  renderAll();
  window.addEventListener('resize', positionConnectors, { passive: true });
  initHotspots();
  initResults();
  initPricing();
  buildMotion();

  document.addEventListener('i18n:change', () => {
    renderStats();
    renderServices();
    renderResults();
    renderDoctors();
    renderPricing();
    updateHotspotText();
  });
}
