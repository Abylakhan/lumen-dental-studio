// Opening hours — formatting and live "open now" status in the clinic's time zone.
import SITE from '../config.js';
import { t } from './localization.js';
import { esc } from './utils.js';

const ORDER = [1, 2, 3, 4, 5, 6, 0]; // Monday first

/** Current weekday and minutes in the clinic's time zone. */
function clinicNow() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: SITE.hours.timeZone, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date());
  const get = (type) => parts.find((p) => p.type === type)?.value;
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  const minutes = (parseInt(get('hour'), 10) % 24) * 60 + parseInt(get('minute'), 10);
  return { day, minutes };
}

const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };

export function isClosedDay(weekday) {
  return !SITE.hours.week[weekday];
}

export function openStatus() {
  const { day, minutes } = clinicNow();
  const today = SITE.hours.week[day];
  if (today && minutes >= toMin(today[0]) && minutes < toMin(today[1])) {
    return { open: true, text: t('hours.openNow', { time: today[1] }) };
  }
  // Find the next opening.
  for (let i = 0; i < 8; i += 1) {
    const d = (day + i) % 7;
    const h = SITE.hours.week[d];
    if (!h) continue;
    if (i === 0 && minutes >= toMin(h[0])) continue;
    const dayName = i === 0 ? t('hours.today') : i === 1 ? t('hours.tomorrow') : t('hours.days')[d].toLowerCase();
    return { open: false, text: t('hours.opensAt', { day: dayName, time: h[0] }) };
  }
  return { open: false, text: t('hours.closedNow') };
}

/** Compact list grouping consecutive days with identical hours. */
export function hoursRows() {
  const rows = [];
  ORDER.forEach((d) => {
    const h = SITE.hours.week[d];
    const value = h ? `${h[0]}–${h[1]}` : t('hours.closed');
    const last = rows[rows.length - 1];
    if (last && last.value === value) last.days.push(d);
    else rows.push({ days: [d], value });
  });
  const short = t('hours.daysShort');
  return rows.map((r) => ({
    label: r.days.length > 1 ? `${short[r.days[0]]}–${short[r.days[r.days.length - 1]]}` : short[r.days[0]],
    value: r.value,
  }));
}

export function hoursListHTML() {
  return hoursRows().map((r) => `<li><span>${esc(r.label)}</span> <span>${esc(r.value)}</span></li>`).join('');
}

/** Full weekly table rows with today highlighted. */
export function hoursTableHTML() {
  const { day } = clinicNow();
  const names = t('hours.days');
  return ORDER.map((d) => {
    const h = SITE.hours.week[d];
    const value = h ? `${h[0]}–${h[1]}` : t('hours.closed');
    const current = d === day ? ' aria-current="date" class="is-today"' : '';
    return `<tr${current}><th scope="row">${esc(names[d])}</th><td>${esc(value)}</td></tr>`;
  }).join('');
}
