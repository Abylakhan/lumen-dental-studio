// Privacy notice — sections rendered from the dictionary.
import { t } from '../localization.js';
import { $, esc } from '../utils.js';

export function init() {
  const render = () => {
    $('[data-legal]').innerHTML = t('privacy.sections')
      .map((s) => `<section><h2>${esc(s.title)}</h2><p>${esc(s.text)}</p></section>`).join('');
  };
  render();
  document.addEventListener('i18n:change', render);
}
