// Clinic opening hours + how online booking works.
import { $, busy, toast, readForm, input, DAYS, WEEK_ORDER } from '../ui.js';

const hhmm = (t) => (t ? String(t).slice(0, 5) : '');

export async function render(host, { api }) {
  const [hours, settings] = await Promise.all([api.select('clinic_hours'), api.select('clinic_settings', { eq: { id: 1 } })]);
  const cfg = settings[0] || {};
  const h = (wd) => hours.find((x) => x.weekday === wd) || { is_open: false };

  host.innerHTML = `
    <header class="adm-head"><div><h1>Часы работы</h1><p>Часы клиники показываются на сайте и ограничивают выбор даты при записи. График каждого врача — в разделе «Врачи».</p></div></header>
    <form class="adm-form" data-hours novalidate>
      <section class="adm-card"><h2>Часы клиники</h2>
        <div class="adm-table-wrap"><table class="adm-table">
          <thead><tr><th>День</th><th>Открыто</th><th>С</th><th>До</th></tr></thead>
          <tbody>${WEEK_ORDER.map((wd) => `<tr><th scope="row">${DAYS[wd]}</th>
            <td><input type="checkbox" name="d${wd}_open" ${h(wd).is_open ? 'checked' : ''} aria-label="${DAYS[wd]}: открыто"></td>
            <td><input class="input" type="time" name="d${wd}_from" value="${hhmm(h(wd).opens) || '09:00'}" aria-label="${DAYS[wd]}: открытие"></td>
            <td><input class="input" type="time" name="d${wd}_to" value="${hhmm(h(wd).closes) || '18:00'}" aria-label="${DAYS[wd]}: закрытие"></td></tr>`).join('')}
          </tbody></table></div>
      </section>
      <section class="adm-card"><h2>Онлайн-запись</h2>
        <div class="adm-checks" role="radiogroup" aria-label="Режим записи" style="flex-direction:column;align-items:flex-start">
          <label><input type="radio" name="booking_mode" value="request" ${cfg.booking_mode !== 'realtime' ? 'checked' : ''}> <span><strong>Заявка</strong> — пациент выбирает день и удобное время суток, администратор подтверждает время.</span></label>
          <label><input type="radio" name="booking_mode" value="realtime" ${cfg.booking_mode === 'realtime' ? 'checked' : ''}> <span><strong>По свободному времени</strong> — пациент видит свободные слоты по графику врача; слот резервируется до подтверждения.</span></label>
        </div>
        <div class="adm-grid adm-grid--3" style="margin-top:var(--sp-4)">
          ${input('slot_step_minutes', cfg.slot_step_minutes ?? 15, { type: 'number', label: 'Шаг расписания, мин', attrs: 'min="5" max="120" step="5"' })}
          ${input('min_lead_minutes', cfg.min_lead_minutes ?? 120, { type: 'number', label: 'Не раньше чем через, мин', attrs: 'min="0" max="10080" step="15"', hint: 'Минимальное время до приёма.' })}
          ${input('max_days_ahead', cfg.max_days_ahead ?? 60, { type: 'number', label: 'Запись на дней вперёд', attrs: 'min="1" max="365"' })}
        </div>
      </section>
      <div class="adm-sticky-save"><button type="submit" class="abtn abtn--primary">Сохранить</button></div>
    </form>`;

  const form = $('[data-hours]', host);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = readForm(form);
    const rows = [];
    for (const wd of WEEK_ORDER) {
      const open = v[`d${wd}_open`];
      if (open && !(v[`d${wd}_from`] < v[`d${wd}_to`])) { toast(`${DAYS[wd]}: время закрытия должно быть позже открытия.`, 'error'); return; }
      rows.push({ weekday: wd, is_open: open, opens: open ? v[`d${wd}_from`] : null, closes: open ? v[`d${wd}_to`] : null });
    }
    await busy($('button[type=submit]', form), async () => {
      await api.upsert('clinic_hours', rows, 'weekday');
      await api.update('clinic_settings', { id: 1 }, {
        booking_mode: v.booking_mode, slot_step_minutes: v.slot_step_minutes, min_lead_minutes: v.min_lead_minutes, max_days_ahead: v.max_days_ahead,
      });
    }, 'Сохранено. Изменения уже на сайте.');
  });
}
