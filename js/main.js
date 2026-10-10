/**
 * Entry point — shared on every page.
 * Order: translate → chrome → theme → page module → motion.
 */
import { initLocalization, applyTranslations } from './localization.js';
import { renderChrome } from './navigation.js';
import { initScenes, updateHeaderScene } from './scenes.js';
import { initReveals, initMorphs, initSmoothScroll, initCursor, initRefreshHooks, motionOK } from './animations.js';
import { hasGsap } from './utils.js';
import { injectStructuredData } from './seo.js';
import { loadContent } from './content.js';

const PAGES = {
  home: () => import('./pages/home.js'),
  services: () => import('./pages/services.js'),
  service: () => import('./pages/service.js'),
  doctors: () => import('./pages/doctors.js'),
  doctor: () => import('./pages/doctor.js'),
  results: () => import('./pages/results.js'),
  prices: () => import('./pages/prices.js'),
  booking: () => import('./booking.js'),
  about: () => import('./pages/about.js'),
  reviews: () => import('./pages/reviews.js'),
  contacts: () => import('./pages/contacts.js'),
  faq: () => import('./pages/faq.js'),
  privacy: () => import('./pages/privacy.js'),
};

async function boot() {
  const root = document.documentElement;
  if (hasGsap()) gsap.registerPlugin(ScrollTrigger);
  else root.classList.add('no-gsap');
  if (!motionOK()) root.classList.add('no-motion');

  // Published content from the database (falls back to config.js).
  await loadContent();

  initLocalization();
  renderChrome();
  applyTranslations();
  initScenes();
  injectStructuredData();
  root.classList.add('i18n');

  const page = document.body.dataset.page;
  let mod = null;
  if (PAGES[page]) {
    try {
      mod = await PAGES[page]();
      await mod.init?.();
    } catch (err) {
      console.error(`[page:${page}]`, err);
    }
  }

  initSmoothScroll();
  initMorphs();
  initReveals();
  initCursor();
  initRefreshHooks();
  root.classList.add('ready');
  updateHeaderScene();

  // Re-run reveals for content re-rendered after a language change.
  document.addEventListener('i18n:change', () => {
    requestAnimationFrame(() => {
      // Drop triggers whose elements were replaced by the re-render.
      if (hasGsap()) ScrollTrigger.getAll().forEach((st) => { if (st.trigger && !document.contains(st.trigger)) st.kill(); });
      initReveals();
      if (hasGsap()) ScrollTrigger.refresh();
    });
  });
}

boot();
