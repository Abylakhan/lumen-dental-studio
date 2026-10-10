/**
 * Motion system.
 *
 * Declarative reveals via data attributes — content is fully visible without
 * JS, without GSAP and with prefers-reduced-motion; JS only hides what it is
 * about to animate.
 *
 *   data-reveal="up | fade | lines | words | clip | stagger | scale | line | draw"
 *   data-reveal-delay="0.2"
 *   data-parallax="0.15"         (image drift while scrolling, scrubbed)
 *   data-count="8"               (animated counter)
 *   data-morph-from="dark|light|soft"  (scene colours morph on enter, auto theme only)
 */
import { $$, hasGsap, reducedMotion, finePointer, debounce } from './utils.js';
import { isAutoTheme } from './scenes.js';
import { registerLenis } from './navigation.js';

export const motionOK = () => hasGsap() && !reducedMotion();

const PALETTES = {
  light: { '--bg': '#ffffff', '--fg': '#080808', '--muted': '#5c5c5a', '--line': 'rgba(8,8,8,0.12)' },
  soft: { '--bg': '#f2f2f0', '--fg': '#080808', '--muted': '#57574f', '--line': 'rgba(8,8,8,0.13)' },
  dark: { '--bg': '#080808', '--fg': '#f2f2f0', '--muted': '#a4a4a0', '--line': 'rgba(242,242,240,0.14)' },
};

/* ---- Text splitting ---------------------------------------------------- */

/**
 * Wrap every word in a mask: <span class="w"><span class="wi">word</span></span>.
 * Nested inline elements (e.g. <em class="serif">) are preserved.
 */
export function splitWords(el) {
  if (el.dataset.split === 'done') return $$('.wi', el);
  const walk = (node) => {
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const parts = child.textContent.split(/(\s+)/);
        const frag = document.createDocumentFragment();
        parts.forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
          const w = document.createElement('span');
          w.className = 'w';
          const wi = document.createElement('span');
          wi.className = 'wi';
          wi.textContent = part;
          w.appendChild(wi);
          frag.appendChild(w);
        });
        child.replaceWith(frag);
      } else if (child.nodeType === Node.ELEMENT_NODE && !child.classList.contains('w')) {
        walk(child);
      }
    });
  };
  walk(el);
  el.dataset.split = 'done';
  return $$('.wi', el);
}

/** Group split words by their rendered line (for line-by-line staggering). */
export function wordLines(words) {
  const lines = [];
  let top = null;
  words.forEach((wi) => {
    const y = Math.round(wi.parentElement.offsetTop);
    if (top === null || Math.abs(y - top) > 4) { lines.push([]); top = y; }
    lines[lines.length - 1].push(wi);
  });
  return lines;
}

/** Line-by-line masked rise. Returns a timeline (paused if requested). */
export function revealLines(el, { delay = 0, duration = 1.1, stagger = 0.11, paused = false } = {}) {
  const words = splitWords(el);
  const lines = wordLines(words);
  const tl = gsap.timeline({ delay, paused });
  lines.forEach((line, i) => {
    tl.fromTo(line, { yPercent: 115, rotate: 2 }, { yPercent: 0, rotate: 0, duration, ease: 'expo.out' }, i * stagger);
  });
  return tl;
}

/* ---- Reveal variants --------------------------------------------------- */

const variants = {
  up: (el, d) => gsap.fromTo(el, { autoAlpha: 0, y: 48 }, { autoAlpha: 1, y: 0, duration: 1.1, ease: 'expo.out', delay: d }),
  fade: (el, d) => gsap.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.2, ease: 'power2.out', delay: d }),
  scale: (el, d) => gsap.fromTo(el, { autoAlpha: 0, scale: 0.94 }, { autoAlpha: 1, scale: 1, duration: 1.2, ease: 'expo.out', delay: d }),
  lines: (el, d) => { gsap.set(el, { autoAlpha: 1 }); return revealLines(el, { delay: d }); },
  words: (el, d) => {
    const words = splitWords(el);
    return gsap.fromTo(words, { yPercent: 110, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.9, ease: 'expo.out', stagger: 0.035, delay: d });
  },
  clip: (el, d) => {
    const img = el.querySelector('img');
    const tl = gsap.timeline({ delay: d });
    tl.fromTo(el, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.3, ease: 'expo.inOut' });
    if (img) tl.fromTo(img, { scale: 1.35 }, { scale: 1, duration: 1.8, ease: 'expo.out' }, 0.1);
    return tl;
  },
  stagger: (el, d) => gsap.fromTo(Array.from(el.children), { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 1, ease: 'expo.out', stagger: 0.08, delay: d }),
  line: (el, d) => gsap.fromTo(el, { scaleX: 0 }, { scaleX: 1, duration: 1.4, ease: 'expo.inOut', delay: d }),
  draw: (el, d) => {
    const paths = el.matches('path, line, polyline, circle') ? [el] : $$('path, line, polyline, circle', el);
    paths.forEach((p) => {
      const len = p.getTotalLength ? p.getTotalLength() : 1000;
      p.style.strokeDasharray = len;
      p.style.strokeDashoffset = len;
    });
    return gsap.to(paths, { strokeDashoffset: 0, duration: 1.8, ease: 'power2.inOut', stagger: 0.15, delay: d });
  },
};

export function initReveals(root = document) {
  if (!motionOK()) return;
  $$('[data-reveal]', root).forEach((el) => {
    if (el.dataset.revealInit) return;
    el.dataset.revealInit = '1';
    const type = el.dataset.reveal;
    const fn = variants[type];
    if (!fn) return;
    const delay = parseFloat(el.dataset.revealDelay || 0);
    // Hide immediately (before it scrolls into view) to avoid a flash.
    if (type === 'clip') gsap.set(el, { clipPath: 'inset(100% 0% 0% 0%)' });
    else if (type === 'stagger') gsap.set(el.children, { autoAlpha: 0 });
    else if (type === 'line') gsap.set(el, { scaleX: 0 });
    else if (type === 'lines' || type === 'words') gsap.set(splitWords(el), { yPercent: 115 });
    else if (type !== 'draw') gsap.set(el, { autoAlpha: 0 });

    ScrollTrigger.create({
      trigger: el,
      start: el.dataset.revealStart || 'top 88%',
      once: true,
      onEnter: () => fn(el, delay),
    });
  });

  $$('[data-parallax]', root).forEach((el) => {
    if (el.dataset.parallaxInit) return;
    el.dataset.parallaxInit = '1';
    const amount = parseFloat(el.dataset.parallax) || 0.15;
    gsap.fromTo(el, { yPercent: -amount * 50 }, {
      yPercent: amount * 50,
      ease: 'none',
      scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });

  $$('[data-count]', root).forEach((el) => {
    if (el.dataset.countInit) return;
    el.dataset.countInit = '1';
    const target = parseFloat(el.dataset.count);
    const obj = { v: 0 };
    el.textContent = '0';
    ScrollTrigger.create({
      trigger: el,
      start: 'top 90%',
      once: true,
      onEnter: () => gsap.to(obj, {
        v: target, duration: 1.6, ease: 'power3.out',
        onUpdate: () => { el.textContent = Math.round(obj.v); },
      }),
    });
  });
}

/* ---- Scene colour morphs ---------------------------------------------- */

let morphTweens = [];

/** Scrub a section's colours from the previous scene into its own. */
export function initMorphs() {
  morphTweens.forEach((tw) => { tw.scrollTrigger?.kill(); tw.kill(); });
  morphTweens.forEach((tw) => tw.targets().forEach((el) => {
    gsap.set(el, { clearProps: '--bg,--fg,--muted,--line' });
    el.classList.remove('is-morphing');
    delete el.dataset.sceneNow;
  }));
  morphTweens = [];
  if (!motionOK() || !isAutoTheme()) return;
  $$('[data-morph-from]').forEach((section) => {
    const from = PALETTES[section.dataset.morphFrom];
    const to = PALETTES[section.dataset.scene];
    if (!from || !to) return;
    const extra = section.dataset.morphWith ? $$(section.dataset.morphWith) : [];
    const targets = [section, ...extra];
    targets.forEach((el) => el.classList.add('is-morphing'));
    // The header reads `data-scene-now` so it matches what is actually painted.
    const setNow = (p) => targets.forEach((el) => { el.dataset.sceneNow = p > 0.5 ? section.dataset.scene : section.dataset.morphFrom; });
    const tw = gsap.fromTo(targets, { ...from }, {
      ...to,
      ease: 'none',
      scrollTrigger: {
        trigger: section,
        start: section.dataset.morphStart || 'top bottom',
        end: section.dataset.morphEnd || 'top 70%',
        scrub: true,
        onUpdate: (self) => setNow(self.progress),
        onRefresh: (self) => setNow(self.progress),
      },
    });
    morphTweens.push(tw);
  });
}

/* ---- Smooth scroll ------------------------------------------------------ */

export let lenis = null;

export function initSmoothScroll() {
  if (!motionOK() || typeof window.Lenis === 'undefined') return;
  lenis = new window.Lenis({ lerp: 0.11, smoothWheel: true, wheelMultiplier: 1 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  registerLenis(lenis);
  document.documentElement.classList.add('lenis');

  // In-page anchors go through Lenis so the scroll stays smooth and in sync.
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    lenis.scrollTo(target, { offset: -80 });
    if (id === '#main') target.focus({ preventScroll: true });
    history.pushState(null, '', id);
  });
}

/* ---- Cursor ------------------------------------------------------------- */

export function initCursor() {
  if (!motionOK() || !finePointer()) return;
  const cursor = document.createElement('div');
  cursor.className = 'cursor';
  cursor.setAttribute('aria-hidden', 'true');
  document.body.appendChild(cursor);
  const xTo = gsap.quickTo(cursor, 'x', { duration: 0.45, ease: 'power3' });
  const yTo = gsap.quickTo(cursor, 'y', { duration: 0.45, ease: 'power3' });
  let active = null;
  window.addEventListener('pointermove', (e) => {
    xTo(e.clientX);
    yTo(e.clientY);
    const target = e.target.closest?.('[data-cursor]');
    if (target !== active) {
      active = target;
      if (target) cursor.textContent = target.dataset.cursor;
      gsap.to(cursor, { scale: target ? 1 : 0, duration: 0.4, ease: 'expo.out' });
    }
  }, { passive: true });
  document.addEventListener('pointerleave', () => gsap.to(cursor, { scale: 0, duration: 0.3 }));
}

/* ---- Refresh orchestration -------------------------------------------- */

export function initRefreshHooks() {
  if (!hasGsap()) return;
  const refresh = debounce(() => ScrollTrigger.refresh(), 200);
  window.addEventListener('load', refresh);
  document.fonts?.ready.then(refresh);
  document.addEventListener('load', (e) => { if (e.target.tagName === 'IMG') refresh(); }, true);
  document.addEventListener('theme:change', () => { initMorphs(); refresh(); });
}
