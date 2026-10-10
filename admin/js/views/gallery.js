// Gallery — clinic interiors, other images and before/after cases.
import {
  $, esc, L, icon, img, busy, toast, confirmDialog, langField, bindLangTabs, readForm, cleanLang,
  input, select, toggle, imagePicker, bindImagePickers, pickedImage, CASE_CATEGORIES, errorText,
} from '../ui.js';

const KINDS = { interior: 'Интерьер клиники', case: 'До и после', general: 'Другие фото' };

export async function render(host, ctx) {
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const kind = KINDS[params.get('kind')] ? params.get('kind') : 'interior';
  const id = params.get('id');
  return id ? renderEditor(host, ctx, kind, id) : renderList(host, ctx, kind);
}

async function renderList(host, { api }, kind) {
  const items = await api.select('gallery_images', { eq: { kind }, order: [['sort_order'], ['created_at']] });
  host.innerHTML = `
    <header class="adm-head"><div><h1>Галерея</h1><p>Загружайте, заменяйте, публикуйте и упорядочивайте фотографии.</p></div>
      <div class="adm-actions"><a class="abtn abtn--primary" href="#gallery?kind=${kind}&id=new">${icon.plus}Добавить</a></div></header>
    <div class="seg" role="group" aria-label="Тип фото" style="margin-bottom:var(--sp-5)">
      ${Object.entries(KINDS).map(([k, l]) => `<a class="abtn abtn--ghost" href="#gallery?kind=${k}" aria-pressed="${k === kind}" style="${k === kind ? 'background:var(--c-black);color:#fff' : ''}">${l}</a>`).join('')}
    </div>
    ${kind === 'case' ? '<p class="adm-alert adm-alert--info" style="margin-bottom:1rem">Реальные фото пациентов публикуются только с письменного согласия пациента на публикацию на сайте — без отметки о согласии база данных не позволит их опубликовать. Загружайте фото пациентов только после получения согласия.</p>' : ''}
    ${items.length ? `<ul class="gal">${items.map((g, i) => `
      <li class="gal__item" data-id="${g.id}">
        <div class="gal__media">${g.kind === 'case'
          ? `<img src="${esc(img(g.before_path))}" alt="До" loading="lazy" ${g.simulate_before ? 'style="filter:sepia(.5) saturate(.8)"' : ''}><img src="${esc(img(g.after_path))}" alt="После" loading="lazy">`
          : `<img src="${esc(img(g.image_path))}" alt="" loading="lazy">`}</div>
        <div class="gal__body">
          <div class="adm-row__title">${esc(L(g.title) || L(g.alt) || 'Без названия')} ${g.is_demo ? '<span class="tag tag--demo">Демо</span>' : ''}</div>
          ${g.kind === 'case' && !g.is_demo ? `<div class="adm-note">${g.consent_obtained ? '✓ Согласие получено' : '✗ Нет согласия'}</div>` : ''}
          <div class="gal__tools">
            <label class="switch"><input type="checkbox" data-publish ${g.is_published ? 'checked' : ''} aria-label="Опубликовано"><span class="switch__track" aria-hidden="true"></span><span class="adm-note">Опубликовано</span></label>
          </div>
          <div class="gal__tools">
            <button class="abtn abtn--icon" data-move="-1" aria-label="Раньше" ${i === 0 ? 'disabled' : ''}>${icon.up}</button>
            <button class="abtn abtn--icon" data-move="1" aria-label="Позже" ${i === items.length - 1 ? 'disabled' : ''}>${icon.down}</button>
            <a class="abtn" href="#gallery?kind=${kind}&id=${g.id}">${icon.edit}Изменить</a>
            <button class="abtn abtn--icon abtn--danger" data-delete aria-label="Удалить">${icon.trash}</button>
          </div>
        </div>
      </li>`).join('')}</ul>` : '<p class="adm-empty">Фотографий пока нет.</p>'}`;

  host.onchange = async (e) => {
    const box = e.target.closest('[data-publish]');
    if (!box) return;
    const r = await busy(null, () => api.update('gallery_images', { id: box.closest('[data-id]').dataset.id }, { is_published: box.checked }), box.checked ? 'Опубликовано' : 'Снято с публикации');
    if (r === undefined) box.checked = !box.checked;
  };
  host.onclick = async (e) => {
    const mv = e.target.closest('[data-move]');
    const del = e.target.closest('[data-delete]');
    if (mv) {
      const idx = items.findIndex((g) => g.id === mv.closest('[data-id]').dataset.id);
      const j = idx + Number(mv.dataset.move);
      const order = items.map((g) => g.id);
      [order[idx], order[j]] = [order[j], order[idx]];
      await busy(mv, () => Promise.all(order.map((gid, n) => api.update('gallery_images', { id: gid }, { sort_order: n }))), 'Порядок сохранён');
      renderList(host, { api }, kind);
    }
    if (del) {
      const g = items.find((x) => x.id === del.closest('[data-id]').dataset.id);
      if (!(await confirmDialog({ title: 'Удалить фотографию?', text: 'Фото будет удалено с сайта и из хранилища без возможности восстановления.', confirm: 'Удалить', danger: true }))) return;
      try {
        await api.remove('gallery_images', { id: g.id });
        [g.image_path, g.before_path, g.after_path].forEach((p) => p && api.removeFile(p).catch(() => {}));
        toast('Фотография удалена');
        renderList(host, { api }, kind);
      } catch (err) { toast(errorText(err), 'error'); }
    }
  };
}

async function renderEditor(host, { api, navigate }, kind, id) {
  const isNew = id === 'new';
  const [items, services] = await Promise.all([
    api.select('gallery_images', { eq: { kind }, order: [['sort_order']] }),
    kind === 'case' ? api.select('services', { order: [['sort_order']] }) : [],
  ]);
  const g = isNew ? { kind, is_published: kind !== 'case', title: {}, caption: {}, alt: {}, consent_scope: [], sort_order: items.length } : items.find((x) => x.id === id);
  if (!g) { host.innerHTML = '<p class="adm-alert">Фото не найдено.</p>'; return; }
  const svcOptions = { '': '—', ...Object.fromEntries(services.map((s) => [s.id, L(s.title)])) };

  host.innerHTML = `
    <header class="adm-head"><div><a class="adm-note" href="#gallery?kind=${kind}">${icon.back} ${KINDS[kind]}</a><h1>${isNew ? 'Новое фото' : 'Изменить фото'}</h1></div></header>
    <form class="adm-form" data-gallery novalidate>
      <section class="adm-card"><h2>Изображение</h2>
        ${kind === 'case'
          ? `<div class="adm-grid adm-grid--2">${imagePicker('before', g.before_path, { label: 'До лечения' })}${imagePicker('after', g.after_path, { label: 'После лечения' })}</div>`
          : imagePicker('image', g.image_path, { label: 'Фото' })}
        ${langField('alt', g.alt, { label: 'Описание изображения (для незрячих и SEO)' })}
      </section>
      <section class="adm-card"><h2>Подпись</h2>
        ${langField('title', g.title, { label: 'Заголовок' })}
        ${langField('caption', g.caption, { label: 'Описание', textarea: true, rows: 3 })}
        ${kind === 'case' ? `<div class="adm-grid adm-grid--2">${select('category', CASE_CATEGORIES, g.category || 'restoration', { label: 'Категория' })}${select('service_id', svcOptions, g.service_id || '', { label: 'Услуга' })}</div>` : ''}
      </section>
      ${kind === 'case' && !g.is_demo ? `<section class="adm-card"><h2>Согласие пациента</h2>
        <p class="adm-note" style="margin-bottom:.75rem">Обязательно для публикации. Храните подписанное согласие в клинике.</p>
        <div class="adm-checks">${toggle('consent_obtained', g.consent_obtained, 'Письменное согласие получено')}${toggle('consent_website', (g.consent_scope || []).includes('website'), 'Согласие на публикацию на сайте')}</div>
        <div class="adm-grid adm-grid--2">${input('consent_date', g.consent_date || '', { type: 'date', label: 'Дата согласия' })}${input('consent_ref', g.consent_ref || '', { label: 'Номер документа согласия' })}</div>
      </section>` : ''}
      ${g.is_demo ? '<p class="adm-alert adm-alert--info">Это демонстрационный пример (стоковое фото с имитацией «до»). На сайте он помечен как «Демо-симуляция».</p>' : ''}
      ${toggle('is_published', g.is_published, 'Опубликовать на сайте')}
      <div class="adm-sticky-save"><a class="abtn" href="#gallery?kind=${kind}">Отмена</a><button type="submit" class="abtn abtn--primary">Сохранить</button></div>
    </form>`;
  const form = $('[data-gallery]', host);
  bindLangTabs(form);
  bindImagePickers(form);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = readForm(form);
    const files = kind === 'case' ? { before: pickedImage(form, 'before'), after: pickedImage(form, 'after') } : { image: pickedImage(form, 'image') };
    if (kind === 'case' && ((!g.before_path && !files.before) || (!g.after_path && !files.after))) { toast('Загрузите фото «до» и «после».', 'error'); return; }
    if (kind !== 'case' && !g.image_path && !files.image) { toast('Загрузите фотографию.', 'error'); return; }
    if (kind === 'case' && !g.is_demo && v.is_published && !(v.consent_obtained && v.consent_website)) {
      toast('Нельзя опубликовать случай без письменного согласия пациента на публикацию на сайте.', 'error'); return;
    }
    await busy($('button[type=submit]', form), async () => {
      const row = { title: cleanLang(v.title), caption: cleanLang(v.caption), alt: cleanLang(v.alt), is_published: v.is_published };
      const replaced = [];
      for (const [key, blob] of Object.entries(files)) {
        if (!blob) continue;
        const col = `${key}_path`;
        row[col] = await api.upload(blob, kind === 'case' ? 'cases' : 'gallery');
        if (g[col]) replaced.push(g[col]);
        if (key === 'before') row.simulate_before = null; // a real photo replaces any demo simulation
      }
      if (kind === 'case') {
        Object.assign(row, { category: v.category, service_id: v.service_id || null });
        // Real photos uploaded into a demo slot make it a real patient case:
        // it can only stay published with recorded consent.
        if (g.is_demo && (files.before || files.after)) {
          row.is_demo = false;
          if (row.is_published) { row.is_published = false; toast('Фото сохранены как реальный случай и сняты с публикации — отметьте согласие пациента, чтобы опубликовать.'); }
        }
        if (!g.is_demo) Object.assign(row, { consent_obtained: v.consent_obtained, consent_scope: v.consent_website ? ['website'] : [], consent_date: v.consent_date || null, consent_ref: v.consent_ref || null });
      }
      try {
        if (isNew) await api.insert('gallery_images', { ...row, kind, sort_order: g.sort_order });
        else await api.update('gallery_images', { id }, row);
      } catch (err) {
        Object.keys(files).forEach((k) => row[`${k}_path`] && files[k] && api.removeFile(row[`${k}_path`]).catch(() => {}));
        throw err;
      }
      replaced.forEach((p) => api.removeFile(p).catch(() => {}));
      toast('Сохранено');
      navigate(`gallery?kind=${kind}`);
    });
  });
}
