/**
 * Before / after comparison slider.
 *
 * - Pointer events cover mouse, pen and touch (vertical page scroll still
 *   works on touch thanks to `touch-action: pan-y`).
 * - The handle is an ARIA slider: arrows (±2), Shift+arrows / PageUp/Down
 *   (±10), Home / End.
 * - Only cases allowed by the consent rules in config.js are ever rendered.
 */
import SITE from '../config.js';
import { t, tl } from './localization.js';
import { esc, icons } from './utils.js';
import { motionOK } from './animations.js';

/** Cases that may be shown publicly. */
export function publishableCases() {
  return SITE.cases.filter((c) => c.demo || (c.consent?.obtained === true && (c.consent.scope || []).includes('website')));
}

export function comparisonHTML(c, { eager = false } = {}) {
  const title = tl(c.title);
  const sim = c.demo && c.simulateBefore ? `sim-${esc(c.simulateBefore)}` : '';
  const loading = eager ? '' : 'loading="lazy"';
  return `
    <div class="ba" data-ba data-cursor="${esc(t('ba.drag'))}" style="--pos:50%">
      <img class="ba__after" src="${esc(c.after)}" alt="${esc(`${t('ba.after')} — ${title}`)}" ${loading} decoding="async">
      <div class="ba__before"><img class="${sim}" src="${esc(c.before)}" alt="${esc(`${t('ba.before')} — ${title}`)}" ${loading} decoding="async"></div>
      <div class="ba__divider" aria-hidden="true"></div>
      <span class="ba__label ba__label--before" aria-hidden="true">${esc(t('ba.before'))}</span>
      <span class="ba__label ba__label--after" aria-hidden="true">${esc(t('ba.after'))}</span>
      ${c.demo ? `<span class="ba__demo">${esc(t('ba.demoBadge'))}</span>` : ''}
      <div class="ba__handle" role="slider" tabindex="0"
           aria-label="${esc(t('ba.label', { title }))}"
           aria-valuemin="0" aria-valuemax="100" aria-valuenow="50"
           aria-valuetext="${esc(t('ba.valueText', { n: 50 }))}">${icons.drag}</div>
    </div>`;
}

/** Wire up behaviour on a rendered `.ba` element. Returns a small API. */
export function initComparison(el) {
  if (!el || el.dataset.baInit) return el?._ba;
  el.dataset.baInit = '1';
  const handle = el.querySelector('.ba__handle');
  let pos = 50;
  let dragging = false;

  function set(value, { announce = true } = {}) {
    pos = Math.max(0, Math.min(100, value));
    el.style.setProperty('--pos', `${pos}%`);
    if (announce) {
      const n = Math.round(pos);
      handle.setAttribute('aria-valuenow', String(n));
      handle.setAttribute('aria-valuetext', t('ba.valueText', { n }));
    }
  }

  const fromEvent = (e) => {
    const rect = el.getBoundingClientRect();
    return ((e.clientX - rect.left) / rect.width) * 100;
  };

  el.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    dragging = true;
    el.classList.add('is-dragging');
    el.setPointerCapture(e.pointerId);
    set(fromEvent(e));
    if (e.pointerType === 'mouse') e.preventDefault();
    handle.focus({ preventScroll: true });
  });
  el.addEventListener('pointermove', (e) => { if (dragging) set(fromEvent(e)); });
  const end = (e) => {
    if (!dragging) return;
    dragging = false;
    el.classList.remove('is-dragging');
    if (el.hasPointerCapture?.(e.pointerId)) el.releasePointerCapture(e.pointerId);
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  el.addEventListener('lostpointercapture', () => { dragging = false; el.classList.remove('is-dragging'); });

  handle.addEventListener('keydown', (e) => {
    const big = e.shiftKey ? 10 : 2;
    const map = {
      ArrowLeft: pos - big, ArrowDown: pos - big, ArrowRight: pos + big, ArrowUp: pos + big,
      PageDown: pos - 10, PageUp: pos + 10, Home: 0, End: 100,
    };
    if (!(e.key in map)) return;
    e.preventDefault();
    set(map[e.key]);
  });

  const api = {
    set,
    get: () => pos,
    /** Animated sweep used when switching cases. */
    sweep() {
      if (!motionOK()) { set(50); return; }
      const o = { v: 100 };
      gsap.to(o, { v: 50, duration: 1.2, ease: 'expo.inOut', onUpdate: () => set(o.v, { announce: false }), onComplete: () => set(50) });
    },
  };
  el._ba = api;
  return api;
}
