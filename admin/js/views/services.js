// Services — content in RU/KZ/EN, photo, duration, steps & preparation.
import {
  $, esc, L, icon, img, busy, toast, confirmDialog, langField, bindLangTabs, readForm, cleanLang,
  input, select, toggle, imagePicker, bindImagePickers, pickedImage, slugify, SERVICE_CATEGORIES, errorText, LANGS,
} from '../ui.js';

export async function render(host, ctx) {
  const id = new URLSearchParams(location.hash.split('?')[1] || '').get('id');
  return id ? renderEditor(host, ctx, id) : renderList(host, ctx);
}

async function renderList(host, { api }) {
  const services = await api.select('services', { order: [['sort_order'], ['created_at']] });
  host.innerHTML = `
    <header class="adm-head"><div><h1>Услуги</h1><p>Порядок здесь — порядок на сайте. Скрытые услуги не видны пациентам.</p></div>
      <div class="adm-actions"><a class="abtn abtn--primary" href="#services?id=new">${icon.plus}Добавить услугу</a></div></header>
    <ul class="adm-list">${services.map((s, i) => `
      <li class="adm-row ${s.is_active ? '' : 'is-inactive'}" data-id="${s.id}">
        <img class="adm-row__thumb" src="${esc(img(s.image_path))}" alt="" loading="lazy">
        <div><div class="adm-row__title">${esc(L(s.title))}</div><div class="adm-row__meta">${esc(SERVICE_CATEGORIES[s.category] || s.category)} · ${s.duration_minutes} мин</div></div>
        <div class="adm-row__tools">
          <label class="switch"><input type="checkbox" data-active ${s.is_active ? 'checked' : ''} aria-label="Показывать на сайте: ${esc(L(s.title))}"><span class="switch__track" aria-hidden="true"></span><span class="adm-note">На сайте</span></label>
          <button class="abtn abtn--icon" data-move="-1" aria-label="Выше" ${i === 0 ? 'disabled' : ''}>${icon.up}</button>
          <button class="abtn abtn--icon" data-move="1" aria-label="Ниже" ${i === services.length - 1 ? 'disabled' : ''}>${icon.down}</button>
          <a class="abtn" href="#services?id=${s.id}">${icon.edit}Изменить</a>
        </div></li>`).join('')}</ul>`;
  host.onchange = async (e) => {
    const box = e.target.closest('[data-active]');
    if (!box) return;
    const r = await busy(null, () => api.update('services', { id: box.closest('[data-id]').dataset.id }, { is_active: box.checked }), box.checked ? 'Услуга показана' : 'Услуга скрыта');
    if (r === undefined) box.checked = !box.checked;
    else renderList(host, { api });
  };
  host.onclick = async (e) => {
    const mv = e.target.closest('[data-move]');
    if (!mv) return;
    const idx = services.findIndex((s) => s.id === mv.closest('[data-id]').dataset.id);
    const j = idx + Number(mv.dataset.move);
    const order = services.map((s) => s.id);
    [order[idx], order[j]] = [order[j], order[idx]];
    await busy(mv, () => Promise.all(order.map((sid, n) => api.update('services', { id: sid }, { sort_order: n }))), 'Порядок сохранён');
    renderList(host, { api });
  };
}

/** Lists (steps, preparation) are edited as one item per line, per language. */
const toLines = (arr, code) => (arr || []).map((x) => x?.[code] || '').join('\n');
function fromLines(v, key) {
  const per = Object.fromEntries(LANGS.map(([c]) => [c, String(v[key]?.[c] || '').split('\n').map((x) => x.trim()).filter(Boolean)]));
  const n = Math.max(...Object.values(per).map((a) => a.length));
  return Array.from({ length: n }, (_, i) => cleanLang(Object.fromEntries(LANGS.map(([c]) => [c, per[c][i] || '']))));
}

async function renderEditor(host, { api, navigate }, id) {
  const isNew = id === 'new';
  const all = await api.select('services', { order: [['sort_order']] });
  const s = isNew ? { is_active: true, category: 'therapy', duration_minutes: 60, title: {}, steps: [], prep: [], sort_order: all.length } : all.find((x) => x.id === id);
  if (!s) { host.innerHTML = '<p class="adm-alert">Услуга не найдена.</p>'; return; }
  const linesField = (key, label) => langField(key, Object.fromEntries(LANGS.map(([c]) => [c, toLines(s[key], c)])), { label, textarea: true, rows: 4, hint: 'Каждый пункт — с новой строки.' });

  host.innerHTML = `
    <header class="adm-head"><div><a class="adm-note" href="#services">${icon.back} Все услуги</a><h1>${isNew ? 'Новая услуга' : esc(L(s.title))}</h1></div></header>
    <form class="adm-form" data-service novalidate>
      <section class="adm-card"><h2>Основное</h2>
        ${langField('title', s.title, { label: 'Название', required: true })}
        ${langField('short', s.short, { label: 'Короткое описание (карточка)', textarea: true, rows: 2 })}
        ${langField('intro', s.intro, { label: 'Подробное описание', textarea: true, rows: 5 })}
        <div class="adm-grid adm-grid--3">
          ${select('category', SERVICE_CATEGORIES, s.category, { label: 'Направление' })}
          ${input('duration_minutes', s.duration_minutes, { type: 'number', label: 'Длительность, мин', attrs: 'min="10" max="480" step="5" required', hint: 'Используется для расчёта свободного времени.' })}
          ${input('slug', s.slug || '', { label: 'Адрес страницы (slug)', attrs: 'pattern="[a-z0-9][a-z0-9-]{1,48}"' })}
        </div>
        ${langField('duration_label', s.duration_label, { label: 'Длительность — текст на сайте (необязательно)', hint: 'Например «Несколько визитов». Пусто — «60 мин».' })}
        ${toggle('is_active', s.is_active, 'Показывать на сайте')}
      </section>
      <section class="adm-card"><h2>Фотография</h2>
        ${imagePicker('image', s.image_path, { label: 'Фото услуги', hint: 'Вертикальное или квадратное. Сжимается автоматически.' })}
        ${langField('image_alt', s.image_alt, { label: 'Описание фото' })}
      </section>
      <section class="adm-card"><h2>Как проходит лечение и подготовка</h2>
        ${linesField('steps', 'Этапы лечения')}
        ${linesField('prep', 'Перед визитом')}
      </section>
      <div class="adm-sticky-save">
        ${isNew ? '' : '<button type="button" class="abtn abtn--danger" data-delete>Удалить</button>'}
        <a class="abtn" href="#services">Отмена</a>
        <button type="submit" class="abtn abtn--primary">Сохранить</button>
      </div>
    </form>`;
  const form = $('[data-service]', host);
  bindLangTabs(form);
  bindImagePickers(form);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = readForm(form);
    if (!v.title?.ru && !v.title?.kk && !v.title?.en) { toast('Укажите название услуги.', 'error'); return; }
    if (!v.duration_minutes || v.duration_minutes < 10) { toast('Длительность — не меньше 10 минут.', 'error'); return; }
    await busy($('button[type=submit]', form), async () => {
      const pic = pickedImage(form, 'image');
      const path = pic ? await api.upload(pic, 'services') : s.image_path || null;
      const row = {
        title: cleanLang(v.title), short: cleanLang(v.short), intro: cleanLang(v.intro), category: v.category,
        duration_minutes: v.duration_minutes, duration_label: Object.keys(cleanLang(v.duration_label)).length ? cleanLang(v.duration_label) : null,
        slug: v.slug || slugify(v.title.en || v.title.ru), is_active: v.is_active, image_path: path, image_alt: cleanLang(v.image_alt),
        steps: fromLines(v, 'steps'), prep: fromLines(v, 'prep'),
      };
      try {
        if (isNew) await api.insert('services', { ...row, sort_order: s.sort_order });
        else await api.update('services', { id }, row);
      } catch (err) {
        if (pic) api.removeFile(path).catch(() => {});
        throw err;
      }
      if (pic && s.image_path && s.image_path !== path) api.removeFile(s.image_path).catch(() => {});
      toast('Услуга сохранена. Изменения уже на сайте.');
      navigate('services');
    });
  });
  $('[data-delete]', host)?.addEventListener('click', async () => {
    if (!(await confirmDialog({ title: `Удалить услугу «${L(s.title)}»?`, text: 'Цены останутся, но потеряют связь с услугой. Чтобы просто скрыть услугу, выключите «Показывать на сайте».', confirm: 'Удалить навсегда', danger: true }))) return;
    try {
      await api.remove('services', { id });
      if (s.image_path) api.removeFile(s.image_path).catch(() => {});
      toast('Услуга удалена');
      navigate('services');
    } catch (err) { toast(errorText(err), 'error'); }
  });
}
