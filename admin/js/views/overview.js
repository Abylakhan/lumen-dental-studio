// Overview — what needs attention today.
import { esc, L, STATUS, fmtDate, fmtTime } from '../ui.js';

const todayIso = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Almaty' }).format(new Date());

export async function render(host, { api }) {
  const today = todayIso();
  const [pending, todays, doctors, services, settings] = await Promise.all([
    api.select('appointments', { in: { status: ['new', 'awaiting_confirmation'] }, order: [['created_at', false]] }),
    api.select('appointments', { eq: { preferred_date: today }, in: { status: ['confirmed', 'awaiting_confirmation', 'new'] } }),
    api.select('doctors', { order: [['sort_order']] }),
    api.select('services', { columns: 'id,title,is_active' }),
    api.select('clinic_settings', { eq: { id: 1 } }),
  ]);
  const cfg = settings[0] || {};
  const docName = (id) => L(doctors.find((d) => d.id === id)?.name) || 'Любой врач';
  const svcName = (id) => L(services.find((s) => s.id === id)?.title) || 'Консультация';
  const active = doctors.filter((d) => d.is_active).length;

  host.innerHTML = `
    <header class="adm-head"><div><h1>Обзор</h1><p>Новые заявки, записи на сегодня и состояние сайта.</p></div>
      <div class="adm-actions"><a class="abtn abtn--primary" href="#appointments">Все записи</a></div></header>
    ${cfg.demo_mode ? '<p class="adm-alert adm-alert--warn" style="margin-bottom:1rem">Включён демо-режим: на сайте показывается пометка «Демо». Когда данные клиники проверены, выключите его в «Настройках клиники».</p>' : ''}
    <div class="adm-grid adm-grid--4">
      <a class="adm-card adm-kpi" href="#appointments?status=new"><strong>${pending.filter((a) => a.status === 'new').length}</strong><span>новых заявок</span></a>
      <a class="adm-card adm-kpi" href="#appointments?status=awaiting_confirmation"><strong>${pending.filter((a) => a.status === 'awaiting_confirmation').length}</strong><span>ждут подтверждения</span></a>
      <a class="adm-card adm-kpi" href="#appointments?date=${today}"><strong>${todays.length}</strong><span>записей на сегодня</span></a>
      <a class="adm-card adm-kpi" href="#doctors"><strong>${active}/10</strong><span>активных врачей</span></a>
    </div>
    <section class="adm-card" style="margin-top:1rem">
      <h2>Требуют ответа</h2>
      ${pending.length ? `<ul class="adm-list">${pending.slice(0, 8).map((a) => `
        <li><a class="adm-row" href="#appointments?status=${a.status}" style="grid-template-columns:minmax(0,1fr) auto">
          <div><div class="adm-row__title">${esc(a.patient_name)} · <span class="adm-row__meta">${esc(a.patient_phone)}</span></div>
          <div class="adm-row__meta">${esc(svcName(a.service_id))} · ${esc(docName(a.doctor_id))} · ${esc(fmtDate(a.preferred_date))}${a.slot_start ? `, ${esc(fmtTime(a.slot_start))}` : ''}</div></div>
          <span class="st st--${a.status}">${esc(STATUS[a.status])}</span></a></li>`).join('')}</ul>`
        : '<p class="adm-empty">Новых заявок нет.</p>'}
    </section>
    <section class="adm-card">
      <h2>Режим записи</h2>
      <p>${cfg.booking_mode === 'realtime'
        ? 'Онлайн-запись по свободному времени: пациент выбирает свободный слот, он резервируется до вашего подтверждения.'
        : 'Заявки: пациент указывает удобный день и время суток, вы подтверждаете время по телефону.'}
        <a class="adm-note" href="#hours" style="text-decoration:underline">Изменить</a></p>
    </section>`;
}
