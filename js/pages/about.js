// About — principles rendered from the dictionary.
import SITE from '../../config.js';
import { t, tl } from '../localization.js';
import { $, $$, esc } from '../utils.js';

export function init() {
  const render = () => {
    $('[data-principles]').innerHTML = t('about.principles').map((p, i) => `
      <li><span class="index-num">${String(i + 1).padStart(2, '0')}</span><h3>${esc(p.title)}</h3><p>${esc(p.text)}</p></li>`).join('');
  };
  render();
  applyInteriors();
  document.addEventListener('i18n:change', () => { render(); applyInteriors(); });
}

/** Use the admin-managed clinic interiors when available. */
function applyInteriors() {
  const photos = SITE.interiors || [];
  if (!photos.length) return;
  const hero = $('.page-hero + .section .media img');
  if (hero && photos[0]) { hero.removeAttribute('srcset'); hero.src = photos[0].src; hero.alt = tl(photos[0].alt); hero.removeAttribute('data-i18n-attr'); }
  $$('.space-gallery img').forEach((img, i) => {
    const p = photos[(i + 1) % photos.length];
    if (!p) return;
    img.src = p.src;
    img.alt = tl(p.alt);
    img.removeAttribute('data-i18n-attr');
  });
}
