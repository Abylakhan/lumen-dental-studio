// Prices — quick edits that work well on a phone, promotions, new items.
import {
  $, esc, L, icon, busy, toast, confirmDialog, langField, bindLangTabs, readForm, cleanLang,
  input, select, toggle, slugify, PRICE_CATEGORIES, errorText,
} from '../ui.js';

export async function render(host, { api }) {
  const [prices, services] = await Promise.all([
    api.select('prices', { order: [['category'], ['sort_order']] }),
    api.select('services', { order: [['sort_order']] }),
  ]);
  const svcOptions = { '': '— без услуги —', ...Object.fromEntries(services.map((s) => [s.id, L(s.title)])) };

  const item = (p) => `
    <li class="adm-card" data-id="${p.id}" style="margin:0">
      <form class="adm-form" data-price novalidate style="gap:var(--sp-3)">
        <div class="appt__top"><div><div class="adm-row__title">${esc(L(p.title))}</div><div class="adm-row__meta">${esc(L(p.note))}</div></div>
          <div class="adm-actions">${toggle('is_active', p.is_active, 'На сайте')}${toggle('is_popular', p.is_popular, 'Популярная')}</div></div>
        <div class="adm-grid adm-grid--4">
          ${input('price', p.price, { type: 'number', label: 'Цена, ₸', attrs: 'min="0" step="500" inputmode="numeric" required' })}
          ${input('promo_price', p.promo_price ?? '', { type: 'number', label: 'Акционная цена, ₸', attrs: 'min="0" step="500" inputmode="numeric"', hint: 'Пусто — без акции' })}
          ${input('promo_until', p.promo_until || '', { type: 'date', label: 'Акция до', hint: 'Пусто — бессрочно' })}
          <div class="field"><span class="field__label">Формат</span>${toggle('is_from', p.is_from, 'Цена «от»')}</div>
        </div>
        <details><summary class="adm-note" style="cursor:pointer;min-height:44px;display:flex;align-items:center">Название, описание, категория…</summary>
          <div class="adm-grid" style="margin-top:.75rem">
            ${langField('title', p.title, { label: 'Название', required: true })}
            ${langField('note', p.note, { label: 'Пояснение' })}
            <div class="adm-grid adm-grid--2">${select('category', PRICE_CATEGORIES, p.category, { label: 'Категория' })}${select('service_id', svcOptions, p.service_id || '', { label: 'Связанная услуга (для кнопки «Записаться»)' })}</div>
          </div></details>
        <div class="adm-actions" style="justify-content:flex-end">
          <button type="button" class="abtn abtn--danger" data-delete>${icon.trash}Удалить</button>
          <button type="submit" class="abtn abtn--primary">Сохранить</button>
        </div>
      </form>
    </li>`;

  const groups = Object.entries(PRICE_CATEGORIES).map(([cat, label]) => {
    const list = prices.filter((p) => p.category === cat);
    return list.length ? `<section style="margin-top:var(--sp-6)"><h2 style="font-size:var(--fs-lg);margin-bottom:var(--sp-3)">${esc(label)}</h2><ul class="adm-list">${list.map(item).join('')}</ul></section>` : '';
  }).join('');

  host.innerHTML = `
    <header class="adm-head"><div><h1>Цены</h1><p>Меняйте цену и нажимайте «Сохранить» — сайт обновится сразу. Акция показывает старую цену зачёркнутой.</p></div>
      <div class="adm-actions"><button class="abtn abtn--primary" data-add>${icon.plus}Добавить позицию</button></div></header>
    <div data-new hidden></div>
    ${groups || '<p class="adm-empty">Цен пока нет.</p>'}`;
  bindLangTabs(host);

  const save = async (form, id) => {
    const v = readForm(form);
    if (v.price == null || v.price < 0) { toast('Укажите цену.', 'error'); return; }
    if (v.promo_price != null && v.promo_price >= v.price) { toast('Акционная цена должна быть ниже обычной.', 'error'); return; }
    const row = {
      price: v.price, promo_price: v.promo_price ?? null, promo_until: v.promo_until || null,
      is_from: v.is_from, is_popular: v.is_popular, is_active: v.is_active,
    };
    if (v.title) Object.assign(row, { title: cleanLang(v.title), note: cleanLang(v.note), category: v.category, service_id: v.service_id || null });
    if (!id) {
      if (!row.title?.ru && !row.title?.kk && !row.title?.en) { toast('Укажите название.', 'error'); return; }
      row.slug = slugify(`${row.title.en || row.title.ru}-${Date.now().toString(36).slice(-4)}`);
      row.sort_order = prices.length;
    }
    await busy($('button[type=submit]', form), async () => {
      if (id) await api.update('prices', { id }, row);
      else await api.insert('prices', row);
    }, 'Цена сохранена. Изменения уже на сайте.');
    if (!id) render(host, { api });
  };

  host.onsubmit = (e) => {
    const form = e.target.closest('[data-price], [data-price-new]');
    if (!form) return;
    e.preventDefault();
    save(form, form.closest('[data-id]')?.dataset.id);
  };
  host.onclick = async (e) => {
    if (e.target.closest('[data-add]')) {
      const box = $('[data-new]', host);
      box.hidden = false;
      box.innerHTML = `<section class="adm-card"><h2>Новая позиция</h2><form class="adm-form" data-price-new novalidate>
        ${langField('title', {}, { label: 'Название', required: true })}
        ${langField('note', {}, { label: 'Пояснение' })}
        <div class="adm-grid adm-grid--3">${select('category', PRICE_CATEGORIES, 'therapy', { label: 'Категория' })}${select('service_id', svcOptions, '', { label: 'Связанная услуга' })}${input('price', '', { type: 'number', label: 'Цена, ₸', attrs: 'min="0" step="500" required' })}</div>
        <div class="adm-actions">${toggle('is_from', true, 'Цена «от»')}${toggle('is_popular', false, 'Популярная')}${toggle('is_active', true, 'На сайте')}</div>
        <div class="adm-actions" style="justify-content:flex-end"><button type="button" class="abtn" data-cancel-new>Отмена</button><button type="submit" class="abtn abtn--primary">Добавить</button></div>
      </form></section>`;
      $('input', box).focus();
      return;
    }
    if (e.target.closest('[data-cancel-new]')) { $('[data-new]', host).hidden = true; return; }
    const del = e.target.closest('[data-delete]');
    if (del) {
      const li = del.closest('[data-id]');
      const p = prices.find((x) => x.id === li.dataset.id);
      if (!(await confirmDialog({ title: `Удалить «${L(p.title)}»?`, text: 'Позиция исчезнет из прайс-листа. Чтобы временно скрыть, выключите «На сайте».', confirm: 'Удалить', danger: true }))) return;
      try { await api.remove('prices', { id: p.id }); li.remove(); toast('Позиция удалена'); } catch (err) { toast(errorText(err), 'error'); }
    }
  };
}
