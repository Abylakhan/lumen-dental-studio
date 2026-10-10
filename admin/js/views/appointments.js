// Appointments — list & calendar for every doctor; confirm, reschedule, cancel.
import { $, $$, esc, L, STATUS, busy, toast, confirmDialog, fmtDate, fmtTime, select, input, textarea, DAYS_SHORT } from '../ui.js';

const TZ = '+05:00'; // Asia/Almaty (Kazakhstan uses a single UTC+5 zone)
const todayIso = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Almaty' }).format(new Date());
const WINDOWS = { any: 'Любое время', morning: 'Утро (09–12)', day: 'День (12–16)', evening: 'Вечер (16–20)' };
const METHODS = { call: 'звонок', whatsapp: 'WhatsApp', sms: 'SMS' };
const ACTIVE = ['new', 'awaiting_confirmation', 'confirmed'];

export async function render(host, { api, refreshBadge }) {
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const state = {
    view: 'list',
    status: params.get('status') || 'active',
    doctor: '', service: '',
    from: params.get('date') || (params.get('status') ? '' : todayIso()),
    to: params.get('date') || '',
    month: (params.get('date') || todayIso()).slice(0, 7),
  };
  const [doctors, services, links] = await Promise.all([
    api.select('doctors', { order: [['sort_order']] }),
    api.select('services', { order: [['sort_order']] }),
    api.select('doctor_services'),
  ]);
  const docName = (id) => (id ? `${L(doctors.find((d) => d.id === id)?.name)} · ${L(doctors.find((d) => d.id === id)?.specialty)}` : 'Любой врач');
  const svcName = (id) => L(services.find((s) => s.id === id)?.title) || 'Консультация';
  const duration = (docId, svcId) => links.find((l) => l.doctor_id === docId && l.service_id === svcId)?.duration_override
    || services.find((s) => s.id === svcId)?.duration_minutes || doctors.find((d) => d.id === docId)?.appointment_minutes || 30;

  host.innerHTML = `
    <header class="adm-head"><div><h1>Записи</h1><p>Заявки пациентов по всем врачам. Пациенты не регистрируются — данные видит только администратор.</p></div>
      <div class="seg" role="group" aria-label="Вид"><button type="button" data-view="list" aria-pressed="true">Список</button><button type="button" data-view="calendar" aria-pressed="false">Календарь</button></div></header>
    <form class="adm-filters" data-filters>
      ${select('status', { active: 'Активные', all: 'Все статусы', ...STATUS }, state.status, { label: 'Статус' })}
      ${select('doctor', { '': 'Все врачи', ...Object.fromEntries(doctors.map((d) => [d.id, `${L(d.name)} · ${L(d.specialty)}${d.is_active ? '' : ' (неактивен)'}`])) }, '', { label: 'Врач' })}
      ${select('service', { '': 'Все услуги', ...Object.fromEntries(services.map((s) => [s.id, L(s.title)])) }, '', { label: 'Услуга' })}
      ${input('from', state.from, { type: 'date', label: 'С даты' })}
      ${input('to', state.to, { type: 'date', label: 'По дату' })}
    </form>
    <div data-results></div>`;

  const results = $('[data-results]', host);

  function query(extra = {}) {
    const opts = { eq: {}, in: {}, gte: {}, lte: {}, order: [['preferred_date'], ['slot_start'], ['created_at']] };
    if (state.status === 'active') opts.in.status = ACTIVE;
    else if (state.status !== 'all') opts.eq.status = state.status;
    if (state.doctor) opts.eq.doctor_id = state.doctor;
    if (state.service) opts.eq.service_id = state.service;
    Object.assign(opts.gte, extra.gte || (state.from ? { preferred_date: state.from } : {}));
    Object.assign(opts.lte, extra.lte || (state.to ? { preferred_date: state.to } : {}));
    return api.select('appointments', opts);
  }

  function card(a) {
    const when = a.slot_start ? `${fmtDate(a.preferred_date)}, ${fmtTime(a.slot_start)}–${fmtTime(a.slot_end)}` : `${fmtDate(a.preferred_date)} · ${WINDOWS[a.preferred_window] || 'Любое время'}`;
    const wa = `https://wa.me/${a.patient_phone.replace(/\D/g, '')}`;
    const timeVal = a.slot_start ? fmtTime(a.slot_start) : '';
    const docOptions = { '': 'Не назначен', ...Object.fromEntries(doctors.filter((d) => d.is_active || d.id === a.doctor_id).map((d) => [d.id, `${L(d.name)} · ${L(d.specialty)}`])) };
    return `
      <article class="appt" data-id="${a.id}">
        <div class="appt__top">
          <div><div class="appt__name">${esc(a.patient_name)}</div><div class="appt__ref">${esc(a.reference)} · создана ${esc(fmtDate(a.created_at, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }))}</div></div>
          <span class="st st--${a.status}">${esc(STATUS[a.status])}</span>
        </div>
        <dl class="appt__info">
          <div><dt>Когда</dt><dd>${esc(when)}${a.slot_start ? '' : ' <span class="adm-note">(пожелание)</span>'}</dd></div>
          <div><dt>Услуга</dt><dd>${esc(svcName(a.service_id))}</dd></div>
          <div><dt>Врач</dt><dd>${esc(docName(a.doctor_id))}</dd></div>
          <div><dt>Телефон · связь</dt><dd><a href="tel:${esc(a.patient_phone)}">${esc(a.patient_phone)}</a> · ${esc(METHODS[a.contact_method] || '')}</dd></div>
        </dl>
        ${a.comment ? `<p class="appt__comment">${esc(a.comment)}</p>` : ''}
        ${a.staff_notes ? `<p class="adm-note">Заметка: ${esc(a.staff_notes)}</p>` : ''}
        <div class="appt__actions">
          ${['new', 'awaiting_confirmation'].includes(a.status) ? '<button class="abtn abtn--primary" data-act="confirmed">Подтвердить</button>' : ''}
          ${a.status === 'confirmed' ? '<button class="abtn" data-act="completed">Пациент пришёл</button><button class="abtn" data-act="no_show">Неявка</button>' : ''}
          <button class="abtn" data-act="edit" aria-expanded="false">Перенести / изменить</button>
          <a class="abtn" href="tel:${esc(a.patient_phone)}">Позвонить</a>
          <a class="abtn" href="${esc(wa)}" target="_blank" rel="noopener noreferrer">WhatsApp</a>
          ${ACTIVE.includes(a.status) ? '<button class="abtn abtn--danger" data-act="cancelled">Отменить</button>' : ''}
        </div>
        <form class="appt__edit" data-edit hidden>
          <div class="adm-grid adm-grid--4">
            ${select('doctor_id', docOptions, a.doctor_id || '', { label: 'Врач' })}
            ${input('date', a.preferred_date, { type: 'date', label: 'Дата' })}
            ${input('time', timeVal, { type: 'time', label: 'Время', attrs: 'step="300"', hint: 'Пусто — время не назначено' })}
            ${select('status', STATUS, a.status, { label: 'Статус' })}
          </div>
          ${textarea('staff_notes', a.staff_notes || '', { rows: 2, label: 'Заметка для персонала (пациент не видит)', attrs: 'maxlength="2000"' })}
          <div class="adm-actions"><button class="abtn abtn--primary" type="submit">Сохранить</button><button class="abtn abtn--ghost" type="button" data-act="edit">Отмена</button></div>
        </form>
      </article>`;
  }

  async function renderList() {
    const rows = await query();
    results.innerHTML = rows.length
      ? `<p class="adm-note" style="margin-bottom:.75rem">Найдено: ${rows.length}</p><div class="adm-grid">${rows.map(card).join('')}</div>`
      : '<p class="adm-empty">По выбранным фильтрам записей нет.</p>';
  }

  async function renderCalendar() {
    const [y, m] = state.month.split('-').map(Number);
    const first = new Date(Date.UTC(y, m - 1, 1));
    const last = new Date(Date.UTC(y, m, 0));
    const iso = (d) => d.toISOString().slice(0, 10);
    const rows = await query({ gte: { preferred_date: iso(first) }, lte: { preferred_date: iso(last) } });
    const byDay = {};
    rows.forEach((r) => { (byDay[r.preferred_date] = byDay[r.preferred_date] || []).push(r); });
    const start = new Date(first);
    start.setUTCDate(start.getUTCDate() - ((first.getUTCDay() + 6) % 7)); // Monday first
    const cells = [];
    for (let d = new Date(start); d <= last || cells.length % 7; d.setUTCDate(d.getUTCDate() + 1)) {
      const key = iso(d);
      const list = (byDay[key] || []).sort((a, b) => String(a.slot_start).localeCompare(String(b.slot_start)));
      cells.push(`<button type="button" class="cal__day ${d.getUTCMonth() !== m - 1 ? 'is-out' : ''} ${key === todayIso() ? 'is-today' : ''}" data-day="${key}" aria-label="${esc(fmtDate(key))}: записей ${list.length}">
        <span class="cal__num">${d.getUTCDate()}</span>
        ${list.length ? `<span class="cal__count">${list.length}</span>` : ''}
        ${list.slice(0, 3).map((a) => `<span class="cal__item st--${a.status}">${a.slot_start ? fmtTime(a.slot_start) : '•'} ${esc(a.patient_name.split(' ')[0])}</span>`).join('')}
        ${list.length > 3 ? `<span class="adm-note">+${list.length - 3}</span>` : ''}
      </button>`);
      if (cells.length > 42) break;
    }
    const title = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(first);
    results.innerHTML = `<div class="cal">
      <div class="cal__head"><button class="abtn abtn--icon" data-month="-1" aria-label="Предыдущий месяц">‹</button><strong>${esc(title)}</strong><button class="abtn abtn--icon" data-month="1" aria-label="Следующий месяц">›</button></div>
      <div class="cal__grid">${[1, 2, 3, 4, 5, 6, 0].map((d) => `<span class="cal__dow">${DAYS_SHORT[d]}</span>`).join('')}${cells.join('')}</div>
      <p class="adm-note" style="margin-top:.75rem">Нажмите на день, чтобы открыть список записей.</p></div>`;
  }

  const refresh = () => busy(null, () => (state.view === 'list' ? renderList() : renderCalendar()));

  host.addEventListener('change', (e) => {
    const f = e.target.closest('[data-filters]');
    if (!f) return;
    Object.assign(state, { status: f.status.value, doctor: f.doctor.value, service: f.service.value, from: f.from.value, to: f.to.value });
    refresh();
  });

  host.addEventListener('click', async (e) => {
    const viewBtn = e.target.closest('[data-view]');
    if (viewBtn) {
      state.view = viewBtn.dataset.view;
      $$('[data-view]', host).forEach((b) => b.setAttribute('aria-pressed', String(b === viewBtn)));
      $('[data-filters] [name=from]', host).closest('.field').hidden = state.view === 'calendar';
      $('[data-filters] [name=to]', host).closest('.field').hidden = state.view === 'calendar';
      refresh();
      return;
    }
    const monthBtn = e.target.closest('[data-month]');
    if (monthBtn) {
      const [y, m] = state.month.split('-').map(Number);
      const d = new Date(Date.UTC(y, m - 1 + Number(monthBtn.dataset.month), 1));
      state.month = d.toISOString().slice(0, 7);
      refresh();
      return;
    }
    const day = e.target.closest('[data-day]');
    if (day) {
      state.view = 'list';
      state.from = state.to = day.dataset.day;
      const f = $('[data-filters]', host);
      f.from.value = f.to.value = day.dataset.day;
      f.from.closest('.field').hidden = f.to.closest('.field').hidden = false;
      $$('[data-view]', host).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === 'list')));
      refresh();
      return;
    }
    const act = e.target.closest('[data-act]');
    if (!act) return;
    const art = act.closest('.appt');
    const id = art.dataset.id;
    const kind = act.dataset.act;
    if (kind === 'edit') {
      const form = $('[data-edit]', art);
      form.hidden = !form.hidden;
      $('[data-act="edit"]', art).setAttribute('aria-expanded', String(!form.hidden));
      if (!form.hidden) $('select, input', form).focus();
      return;
    }
    if (kind === 'cancelled') {
      const name = $('.appt__name', art).textContent;
      if (!(await confirmDialog({ title: `Отменить запись: ${name}?`, text: 'Время освободится для других пациентов. Сообщите пациенту об отмене.', confirm: 'Отменить запись', danger: true }))) return;
    }
    await busy(act, async () => {
      await api.update('appointments', { id }, { status: kind });
      await refresh();
      refreshBadge();
    }, `Статус: ${STATUS[kind]}`);
  });

  host.addEventListener('submit', async (e) => {
    const form = e.target.closest('[data-edit]');
    if (!form) return;
    e.preventDefault();
    const id = form.closest('.appt').dataset.id;
    const doctorId = form.doctor_id.value || null;
    const date = form.date.value;
    const time = form.time.value;
    if (!date) { toast('Укажите дату.', 'error'); return; }
    if (time && !doctorId) { toast('Чтобы назначить время, выберите врача.', 'error'); return; }
    const current = (await api.select('appointments', { eq: { id } }))[0];
    let slotStart = null;
    let slotEnd = null;
    if (time) {
      const start = new Date(`${date}T${time}:00${TZ}`);
      slotStart = start.toISOString();
      slotEnd = new Date(start.getTime() + duration(doctorId, current?.service_id) * 60e3).toISOString();
    }
    await busy($('button[type=submit]', form), async () => {
      await api.update('appointments', { id }, {
        doctor_id: doctorId, preferred_date: date, slot_start: slotStart, slot_end: slotEnd,
        status: form.status.value, staff_notes: form.staff_notes.value.trim() || null,
      });
      await refresh();
      refreshBadge();
    }, 'Запись обновлена');
  });

  await refresh();
}
