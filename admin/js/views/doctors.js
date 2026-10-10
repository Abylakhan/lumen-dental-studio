// Doctors — up to 10 active profiles: profile, photo, services & prices, schedule.
import {
  $, $$, esc, L, icon, img, busy, toast, confirmDialog, langField, bindLangTabs, readForm, cleanLang,
  input, toggle, imagePicker, bindImagePickers, pickedImage, slugify, DAYS, WEEK_ORDER, errorText,
} from '../ui.js';

const MAX_ACTIVE = 10;
const LANG_NAMES = { ru: 'Русский', kk: 'Қазақша', en: 'English' };

export async function render(host, ctx) {
  const id = new URLSearchParams(location.hash.split('?')[1] || '').get('id');
  if (id) return renderEditor(host, ctx, id);
  return renderList(host, ctx);
}

async function renderList(host, { api }) {
  const doctors = await api.select('doctors', { order: [['sort_order'], ['created_at']] });
  const active = doctors.filter((d) => d.is_active).length;
  host.innerHTML = `
    <header class="adm-head"><div><h1>Врачи</h1><p>Активно: <strong>${active} из ${MAX_ACTIVE}</strong>. Порядок здесь — порядок на сайте.</p></div>
      <div class="adm-actions"><a class="abtn abtn--primary" href="#doctors?id=new">${icon.plus}Добавить врача</a></div></header>
    ${active >= MAX_ACTIVE ? '<p class="adm-alert adm-alert--warn" style="margin-bottom:1rem">Достигнут лимит в 10 активных врачей. Новый врач будет создан неактивным.</p>' : ''}
    ${doctors.length ? `<ul class="adm-list">${doctors.map((d, i) => `
      <li class="adm-row ${d.is_active ? '' : 'is-inactive'}" data-id="${d.id}">
        <img class="adm-row__thumb" src="${esc(img(d.photo_path))}" alt="" loading="lazy">
        <div><div class="adm-row__title">${esc(L(d.name) || 'Без имени')}${d.is_placeholder ? ' <span class="tag tag--demo">Заглушка</span>' : ''}</div>
          <div class="adm-row__meta">${esc(L(d.specialty) || '—')}${d.whatsapp ? ' · WhatsApp ✓' : ''}</div></div>
        <div class="adm-row__tools">
          <label class="switch"><input type="checkbox" data-active ${d.is_active ? 'checked' : ''} aria-label="Показывать на сайте: ${esc(L(d.name))}"><span class="switch__track" aria-hidden="true"></span><span class="adm-note">На сайте</span></label>
          <button class="abtn abtn--icon" data-move="-1" aria-label="Выше" ${i === 0 ? 'disabled' : ''}>${icon.up}</button>
          <button class="abtn abtn--icon" data-move="1" aria-label="Ниже" ${i === doctors.length - 1 ? 'disabled' : ''}>${icon.down}</button>
          <a class="abtn" href="#doctors?id=${d.id}">${icon.edit}Изменить</a>
        </div>
      </li>`).join('')}</ul>` : '<p class="adm-empty">Врачей пока нет.</p>'}`;

  host.onchange = async (e) => {
    const box = e.target.closest('[data-active]');
    if (!box) return;
    const row = box.closest('[data-id]');
    const ok = await busy(null, () => api.update('doctors', { id: row.dataset.id }, { is_active: box.checked }), box.checked ? 'Врач показан на сайте' : 'Врач скрыт с сайта');
    if (ok === undefined) box.checked = !box.checked;
    else renderList(host, { api });
  };
  host.onclick = async (e) => {
    const mv = e.target.closest('[data-move]');
    if (!mv) return;
    const idx = doctors.findIndex((d) => d.id === mv.closest('[data-id]').dataset.id);
    const j = idx + Number(mv.dataset.move);
    if (j < 0 || j >= doctors.length) return;
    const order = doctors.map((d) => d.id);
    [order[idx], order[j]] = [order[j], order[idx]];
    await busy(mv, () => Promise.all(order.map((docId, n) => api.update('doctors', { id: docId }, { sort_order: n }))), 'Порядок сохранён');
    renderList(host, { api });
  };
}

async function renderEditor(host, { api, navigate }, id) {
  const isNew = id === 'new';
  const [docs, services, links, schedules] = await Promise.all([
    api.select('doctors', { order: [['sort_order']] }),
    api.select('services', { order: [['sort_order']] }),
    isNew ? [] : api.select('doctor_services', { eq: { doctor_id: id } }),
    isNew ? [] : api.select('doctor_schedules', { eq: { doctor_id: id } }),
  ]);
  const d = isNew
    ? { is_active: docs.filter((x) => x.is_active).length < MAX_ACTIVE, name: {}, specialty: {}, languages: [], appointment_minutes: 30, sort_order: docs.length }
    : docs.find((x) => x.id === id);
  if (!d) { host.innerHTML = '<p class="adm-alert">Врач не найден.</p>'; return; }
  const link = (svcId) => links.find((l) => l.service_id === svcId);
  const sched = (wd) => schedules.find((s) => s.weekday === wd);
  const hhmm = (t) => (t ? String(t).slice(0, 5) : '');

  host.innerHTML = `
    <header class="adm-head"><div><a class="adm-note" href="#doctors">${icon.back} Все врачи</a><h1>${isNew ? 'Новый врач' : esc(L(d.name) || 'Врач')}</h1></div></header>
    <form class="adm-form" data-doctor novalidate>
      <section class="adm-card"><h2>Профиль</h2>
        <div class="adm-grid adm-grid--2">
          ${langField('name', d.name, { label: 'Имя и фамилия', required: true })}
          ${langField('specialty', d.specialty, { label: 'Специализация', required: true })}
        </div>
        ${langField('bio', d.bio, { label: 'Биография', textarea: true, rows: 4 })}
        <div class="adm-grid adm-grid--2">
          ${langField('education', d.education, { label: 'Образование', textarea: true, rows: 2, hint: 'Только проверенные данные. Пусто — «Будет предоставлено клиникой».' })}
          ${langField('experience', d.experience, { label: 'Опыт', textarea: true, rows: 2 })}
        </div>
        <div class="field"><span class="field__label">Языки приёма</span>
          <div class="adm-checks">${Object.entries(LANG_NAMES).map(([code, n]) => `<label><input type="checkbox" name="lang_${code}" ${d.languages?.includes(code) ? 'checked' : ''}> ${n}</label>`).join('')}</div></div>
        <div class="adm-grid adm-grid--3">
          ${input('whatsapp', d.whatsapp || '', { label: 'WhatsApp врача', attrs: 'inputmode="numeric" placeholder="77011234567" pattern="[0-9]{10,15}"', hint: 'Только цифры, с кодом страны. Пусто — заявки уйдут на номер клиники.' })}
          ${input('slug', d.slug || '', { label: 'Адрес страницы (slug)', attrs: 'pattern="[a-z0-9][a-z0-9-]{1,48}"', hint: 'Латиница, цифры и дефис. Создаётся автоматически.' })}
          ${input('appointment_minutes', d.appointment_minutes, { type: 'number', label: 'Длительность приёма по умолчанию, мин', attrs: 'min="10" max="240" step="5"' })}
        </div>
        <div class="adm-checks">${toggle('is_active', d.is_active, 'Показывать на сайте')} ${toggle('is_placeholder', d.is_placeholder, 'Пометка «Заглушка» (демо-профиль)')}</div>
      </section>

      <section class="adm-card"><h2>Фотография</h2>
        ${imagePicker('photo', d.photo_path, { label: 'Портрет', hint: 'Вертикальное фото, лицо по центру. Сжимается автоматически.' })}
        ${langField('photo_alt', d.photo_alt, { label: 'Описание фото (для незрячих и SEO)' })}
      </section>

      <section class="adm-card"><h2>Услуги и цены врача</h2>
        <p class="adm-note" style="margin-bottom:.75rem">Отметьте услуги врача. Своя цена и длительность — только если отличаются от общих.</p>
        <div class="svc-assign">${services.map((s) => {
          const l = link(s.id);
          return `<div class="svc-assign__row">
            <label><input type="checkbox" name="svc_${s.id}" ${l ? 'checked' : ''}> ${esc(L(s.title))}${s.is_active ? '' : ' <span class="adm-note">(скрыта)</span>'}</label>
            <input class="input" type="number" min="0" step="500" name="price_${s.id}" value="${l?.price_override ?? ''}" placeholder="Цена, ₸" aria-label="Цена врача: ${esc(L(s.title))}">
            <input class="input" type="number" min="10" max="480" step="5" name="dur_${s.id}" value="${l?.duration_override ?? ''}" placeholder="${s.duration_minutes} мин" aria-label="Длительность: ${esc(L(s.title))}">
          </div>`;
        }).join('')}</div>
      </section>

      <section class="adm-card"><h2>Рабочее время</h2>
        <p class="adm-note" style="margin-bottom:.75rem">Используется для онлайн-записи по свободному времени. Перерыв — необязательно.</p>
        <div class="adm-table-wrap"><table class="adm-table">
          <thead><tr><th>День</th><th>Работает</th><th>Начало</th><th>Конец</th><th>Перерыв с</th><th>до</th></tr></thead>
          <tbody>${WEEK_ORDER.map((wd) => {
            const s = sched(wd);
            return `<tr><th scope="row">${DAYS[wd]}</th>
              <td><input type="checkbox" name="w${wd}_on" ${s ? 'checked' : ''} aria-label="${DAYS[wd]}: работает"></td>
              <td><input class="input" type="time" name="w${wd}_start" value="${hhmm(s?.starts_at) || '09:00'}" aria-label="${DAYS[wd]}: начало"></td>
              <td><input class="input" type="time" name="w${wd}_end" value="${hhmm(s?.ends_at) || '18:00'}" aria-label="${DAYS[wd]}: конец"></td>
              <td><input class="input" type="time" name="w${wd}_bs" value="${hhmm(s?.break_start)}" aria-label="${DAYS[wd]}: начало перерыва"></td>
              <td><input class="input" type="time" name="w${wd}_be" value="${hhmm(s?.break_end)}" aria-label="${DAYS[wd]}: конец перерыва"></td></tr>`;
          }).join('')}</tbody></table></div>
      </section>

      <div class="adm-sticky-save">
        ${isNew ? '' : '<button type="button" class="abtn abtn--danger" data-delete>Удалить врача</button>'}
        <a class="abtn" href="#doctors">Отмена</a>
        <button type="submit" class="abtn abtn--primary">Сохранить</button>
      </div>
    </form>`;

  const form = $('[data-doctor]', host);
  bindLangTabs(form);
  bindImagePickers(form);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = readForm(form);
    if (!v.name?.ru && !v.name?.kk && !v.name?.en) { toast('Укажите имя врача.', 'error'); return; }
    if (v.whatsapp && !/^[0-9]{10,15}$/.test(v.whatsapp.replace(/\D/g, ''))) { toast('WhatsApp: только цифры с кодом страны, например 77011234567.', 'error'); return; }
    const schedulesOut = [];
    for (const wd of WEEK_ORDER) {
      if (!v[`w${wd}_on`]) continue;
      const row = { weekday: wd, starts_at: v[`w${wd}_start`], ends_at: v[`w${wd}_end`], break_start: v[`w${wd}_bs`] || null, break_end: v[`w${wd}_be`] || null };
      if (!row.starts_at || !row.ends_at || row.starts_at >= row.ends_at) { toast(`${DAYS[wd]}: конец работы должен быть позже начала.`, 'error'); return; }
      if (!!row.break_start !== !!row.break_end) { toast(`${DAYS[wd]}: укажите и начало, и конец перерыва.`, 'error'); return; }
      if (row.break_start && (row.break_start >= row.break_end || row.break_start < row.starts_at || row.break_end > row.ends_at)) { toast(`${DAYS[wd]}: перерыв должен быть внутри рабочего времени.`, 'error'); return; }
      schedulesOut.push(row);
    }
    const btn = $('button[type=submit]', form);
    await busy(btn, async () => {
      const photo = pickedImage(form, 'photo');
      let photoPath = d.photo_path || null;
      if (photo) photoPath = await api.upload(photo, 'doctors');
      const row = {
        name: cleanLang(v.name), specialty: cleanLang(v.specialty), bio: cleanLang(v.bio), education: cleanLang(v.education),
        experience: cleanLang(v.experience), photo_alt: cleanLang(v.photo_alt), photo_path: photoPath,
        languages: Object.keys(LANG_NAMES).filter((c) => v[`lang_${c}`]),
        whatsapp: v.whatsapp ? v.whatsapp.replace(/\D/g, '') : null,
        slug: v.slug || slugify(v.name.en || v.name.ru || v.name.kk),
        appointment_minutes: v.appointment_minutes || 30,
        is_active: v.is_active, is_placeholder: v.is_placeholder,
      };
      let docId = id;
      try {
        if (isNew) {
          row.sort_order = d.sort_order;
          docId = (await api.insert('doctors', row)).id;
        } else {
          await api.update('doctors', { id }, row);
        }
      } catch (err) {
        if (photo) api.removeFile(photoPath).catch(() => {}); // don't leave an orphaned upload
        throw err;
      }
      const linkRows = services.filter((s) => v[`svc_${s.id}`]).map((s) => ({
        doctor_id: docId, service_id: s.id, price_override: v[`price_${s.id}`] ?? null, duration_override: v[`dur_${s.id}`] ?? null,
      }));
      await api.replace('doctor_services', { doctor_id: docId }, linkRows);
      await api.replace('doctor_schedules', { doctor_id: docId }, schedulesOut.map((s) => ({ ...s, doctor_id: docId })));
      if (photo && d.photo_path && d.photo_path !== photoPath) api.removeFile(d.photo_path).catch(() => {});
      toast('Врач сохранён. Изменения уже на сайте.');
      navigate('doctors');
    });
  });

  $('[data-delete]', host)?.addEventListener('click', async () => {
    const name = L(d.name) || 'врача';
    if (!(await confirmDialog({ title: `Удалить «${name}»?`, text: 'Профиль, график и привязка к услугам будут удалены. Записи пациентов сохранятся без врача. Чтобы просто скрыть врача, выключите «Показывать на сайте».', confirm: 'Удалить навсегда', danger: true }))) return;
    try {
      await api.remove('doctors', { id });
      if (d.photo_path) api.removeFile(d.photo_path).catch(() => {});
      toast('Врач удалён');
      navigate('doctors');
    } catch (err) { toast(errorText(err), 'error'); }
  });
}
