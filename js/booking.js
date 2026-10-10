/**
 * Appointment REQUEST form.
 *
 * A static site cannot confirm real availability, so every outcome is
 * presented as a request the clinic must confirm. Submission modes are set in
 * config.js → booking.mode:
 *   'demo'     — simulated; nothing is sent (the UI says so).
 *   'endpoint' — POST JSON to booking.endpoint (CRM, Formspree, serverless…).
 *
 *   'backend'  — set automatically when Supabase is configured: the request
 *                is validated and stored by the submit_appointment() database
 *                function. In real-time mode the patient picks a free slot
 *                that is held until the clinic confirms it.
 */
import SITE from '../config.js';
import { t, tl, getLang } from './localization.js';
import { $, $$, esc, icons, getParam, serviceById, doctorById, telHref, waHref } from './utils.js';
import { isClosedDay } from './hours.js';
import { motionOK, lenis } from './animations.js';
import { getApi, errorCode } from './api/index.js';

const form = () => $('[data-booking-form]');
const touched = new Set();
let submitted = false;
let sending = false;

/* ---- Dates (clinic time zone) ----------------------------------------- */
function clinicToday() {
  // 'en-CA' formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone: SITE.hours.timeZone }).format(new Date());
}
function addDays(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}
function weekday(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}
function formatDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const locale = { ru: 'ru-RU', kk: 'kk-KZ', en: 'en-GB' }[getLang()];
  return new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d)));
}

/* ---- Phone (Kazakhstan) ------------------------------------------------ */
export function phoneDigits(value) {
  let d = String(value || '').replace(/\D/g, '');
  if (d.startsWith('8')) d = `7${d.slice(1)}`;
  if (d && !d.startsWith('7')) d = `7${d}`;
  return d.slice(0, 11);
}
export const isKzPhone = (value) => /^7[67]\d{9}$/.test(phoneDigits(value));
function formatPhone(value) {
  const d = phoneDigits(value);
  if (!d) return '';
  const p = d.slice(1);
  let out = '+7';
  if (p.length) out += ` (${p.slice(0, 3)}`;
  if (p.length >= 3) out += ')';
  if (p.length > 3) out += ` ${p.slice(3, 6)}`;
  if (p.length > 6) out += `-${p.slice(6, 8)}`;
  if (p.length > 8) out += `-${p.slice(8, 10)}`;
  return out;
}

/* ---- Rendering --------------------------------------------------------- */
function renderStatic() {
  $('[data-next-steps]').innerHTML = t('booking.next').map((s, i) => `
    <li><span class="index-num">0${i + 1}</span><div><strong>${esc(s.title)}</strong><p>${esc(s.text)}</p></div></li>`).join('');
  $('[data-booking-contacts]').innerHTML = `
    <a class="btn btn--sm" href="${telHref()}">${icons.phone.replace('<svg', '<svg class="btn__icon"')}<span class="btn__label" data-text="${esc(SITE.contact.phoneDisplay)}"><span>${esc(SITE.contact.phoneDisplay)}</span></span></a>
    <a class="btn btn--sm" href="${waHref(t('booking.wa.general'))}" target="_blank" rel="noopener">${icons.whatsapp.replace('<svg', '<svg class="btn__icon"')}<span class="btn__label" data-text="WhatsApp"><span>WhatsApp</span></span></a>`;
}

function renderServiceOptions() {
  const select = $('#f-service');
  const current = select.value || getParam('service') || '';
  const doc = doctorById($('#f-doctor').value);
  const offered = doc ? SITE.services.filter((s) => doc.services.includes(s.id)) : SITE.services;
  const groups = SITE.serviceCategories.map((cat) => {
    const options = offered.filter((s) => s.category === cat.id)
      .map((s) => `<option value="${esc(s.id)}">${esc(tl(s.title))}</option>`).join('');
    return options ? `<optgroup label="${esc(tl(cat.label))}">${options}</optgroup>` : '';
  }).join('');
  select.innerHTML = `
    <option value="" disabled>${esc(t('booking.fields.servicePlaceholder'))}</option>
    <option value="consultation">${esc(t('booking.fields.consultation'))}</option>
    ${groups}`;
  select.value = [...select.options].some((o) => o.value === current) ? current : '';
  if (!select.value) select.selectedIndex = 0;
  const hint = $('[data-field="service"] .field__hint');
  if (hint) hint.remove();
  if (doc && !offered.length) {
    select.insertAdjacentHTML('afterend', `<p class="field__hint">${esc(t('booking.fields.noService'))}</p>`);
  }
}

function renderDoctorOptions() {
  const select = $('#f-doctor');
  // A doctor chosen on their profile page (?doctor=…) is preserved.
  const current = select.value || getParam('doctor') || 'any';
  select.innerHTML = `<option value="any">${esc(t('booking.fields.anyDoctor'))}</option>` +
    SITE.doctors.map((d) => `<option value="${esc(d.id)}">${esc(`${tl(d.role)} — ${tl(d.name)}`)}</option>`).join('');
  select.value = [...select.options].some((o) => o.value === current) ? current : 'any';
}

function renderRadios() {
  const timeHost = $('[data-time-options]');
  const time = timeHost.querySelector('input:checked')?.value || 'any';
  timeHost.innerHTML = [{ id: 'any', label: t('booking.fields.anyTime') },
    ...SITE.booking.timeWindows.map((w) => ({ id: w.id, label: tl(w.label), hint: `${w.from}–${w.to}` }))]
    .map((o) => `<label><input type="radio" name="time" value="${esc(o.id)}" ${o.id === time ? 'checked' : ''}><span>${esc(o.label)}${o.hint ? ` <small>${esc(o.hint)}</small>` : ''}</span></label>`).join('');

  const methodHost = $('[data-method-options]');
  const method = methodHost.querySelector('input:checked')?.value || SITE.booking.contactMethods[0];
  methodHost.innerHTML = SITE.booking.contactMethods
    .map((m) => `<label><input type="radio" name="method" value="${esc(m)}" ${m === method ? 'checked' : ''}><span>${esc(t(`booking.fields.methods.${m}`))}</span></label>`).join('');
}

/* ---- Real-time slots ---------------------------------------------------- */
let slotRequest = 0;

const slotsEnabled = () => SITE.booking.mode === 'backend' && SITE.booking.realtime;

function formatTime(iso) {
  const locale = { ru: 'ru-RU', kk: 'kk-KZ', en: 'en-GB' }[getLang()];
  return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', timeZone: SITE.hours.timeZone }).format(new Date(iso));
}

/** Show free times when a specific doctor, service and valid date are chosen;
 *  otherwise fall back to "preferred time of day". */
async function refreshSlots() {
  const slotField = $('[data-field="slot"]');
  const timeField = $('[data-field="time"]');
  const status = $('[data-slot-status]');
  const host = $('[data-slot-options]');
  const v = values();
  const doc = doctorById(v.doctor);
  const svc = SITE.services.find((x) => x.id === v.service);
  const applicable = slotsEnabled() && doc && svc;
  slotField.hidden = !applicable;
  timeField.hidden = !!applicable;
  showError('slot', '');
  if (!applicable) { host.innerHTML = ''; return; }
  if (!v.date || validators.date(v)) {
    host.innerHTML = '';
    status.textContent = t('booking.fields.slotPick');
    return;
  }
  const req = ++slotRequest;
  const previous = v.slot;
  host.innerHTML = '';
  status.textContent = t('booking.fields.slotLoading');
  try {
    const api = await getApi();
    const slots = await api.availableSlots(doc.uuid, svc.uuid, v.date);
    if (req !== slotRequest) return; // a newer request superseded this one
    host.innerHTML = slots.map((iso) => `<label><input type="radio" name="slot" value="${esc(iso)}" ${iso === previous ? 'checked' : ''}><span>${esc(formatTime(iso))}</span></label>`).join('');
    status.textContent = slots.length ? t('booking.fields.slotHint') : t('booking.fields.slotNone');
  } catch (err) {
    if (req !== slotRequest) return;
    console.warn('[booking] slots', err);
    status.textContent = t('booking.fields.slotFailed');
    slotField.hidden = true;
    timeField.hidden = false;
  }
  updateWhatsapp();
}

function setDateLimits() {
  const input = $('#f-date');
  const today = clinicToday();
  input.min = today;
  input.max = addDays(today, SITE.booking.maxDaysAhead);
}

/* ---- Data & validation ------------------------------------------------- */
function values() {
  const f = form();
  const data = new FormData(f);
  return {
    service: data.get('service') || '',
    doctor: data.get('doctor') || 'any',
    date: data.get('date') || '',
    time: data.get('time') || 'any',
    slot: data.get('slot') || '',
    name: String(data.get('name') || '').trim(),
    phone: String(data.get('phone') || ''),
    method: data.get('method') || 'call',
    comment: String(data.get('comment') || '').trim(),
    consent: data.get('consent') === 'on',
  };
}

const validators = {
  service: (v) => (v.service ? '' : t('booking.errors.service')),
  date: (v) => {
    if (!v.date) return t('booking.errors.date');
    const today = clinicToday();
    if (v.date < today) return t('booking.errors.datePast');
    if (v.date > addDays(today, SITE.booking.maxDaysAhead)) return t('booking.errors.dateFar', { n: SITE.booking.maxDaysAhead });
    if (isClosedDay(weekday(v.date))) return t('booking.errors.dateClosed');
    return '';
  },
  name: (v) => (v.name.length >= 2 && /\p{L}.*\p{L}/u.test(v.name) && !/\d/.test(v.name) ? '' : t('booking.errors.name')),
  phone: (v) => (isKzPhone(v.phone) ? '' : t('booking.errors.phone')),
  consent: (v) => (v.consent ? '' : t('booking.errors.consent')),
  slot: (v) => {
    const field = $('[data-field="slot"]');
    if (!field || field.hidden || !$('[data-slot-options] input', field)) return '';
    return v.slot ? '' : t('booking.errors.slot');
  },
};

function showError(name, message) {
  const field = $(`[data-field="${name}"]`);
  if (!field) return;
  const input = $('input, select, textarea', field);
  field.classList.toggle('is-invalid', Boolean(message));
  input?.setAttribute('aria-invalid', message ? 'true' : 'false');
  const el = $('.field__error', field);
  if (el) el.textContent = message;
}

function validateField(name) {
  const fn = validators[name];
  if (!fn) return true;
  const message = fn(values());
  showError(name, message);
  return !message;
}

function validateAll() {
  const invalid = Object.keys(validators).filter((name) => !validateField(name));
  const summary = $('[data-form-summary]');
  summary.textContent = invalid.length ? t('booking.errors.summary', { n: invalid.length }) : '';
  return invalid;
}

/* ---- WhatsApp message -------------------------------------------------- */
function whatsappMessage(v = values()) {
  const L = (k) => t(`booking.wa.${k}`);
  const service = v.service === 'consultation' ? t('booking.fields.consultation') : tl(serviceById(v.service)?.title);
  const doc = doctorById(v.doctor);
  const window = SITE.booking.timeWindows.find((w) => w.id === v.time);
  const lines = [L('greeting')];
  if (service) lines.push(`${L('service')}: ${service}`);
  lines.push(`${L('doctor')}: ${doc ? `${tl(doc.role)} — ${tl(doc.name)}` : t('booking.fields.anyDoctor')}`);
  if (v.date) lines.push(`${L('date')}: ${formatDate(v.date)}`);
  if (v.slot && !$('[data-field="slot"]').hidden) lines.push(`${L('time')}: ${formatTime(v.slot)}`);
  else lines.push(`${L('time')}: ${window ? `${tl(window.label)} (${window.from}–${window.to})` : t('booking.fields.anyTime')}`);
  if (v.name) lines.push(`${L('name')}: ${v.name}`);
  if (isKzPhone(v.phone)) lines.push(`${L('phone')}: ${formatPhone(v.phone)}`);
  lines.push(`${L('method')}: ${t(`booking.fields.methods.${v.method}`)}`);
  if (v.comment) lines.push(`${L('comment')}: ${v.comment}`);
  return lines.join('\n');
}

/** Messages go to the chosen doctor's WhatsApp, else the clinic's number. */
function whatsappNumber(v = values()) {
  return doctorById(v.doctor)?.whatsapp || '';
}

function updateWhatsapp() {
  $('[data-wa-booking]').href = waHref(whatsappMessage(), whatsappNumber());
}

/* ---- Submission -------------------------------------------------------- */
function payload(v) {
  return {
    type: 'appointment_request',
    status: 'pending_confirmation',
    service: v.service,
    serviceTitle: v.service === 'consultation' ? 'consultation' : serviceById(v.service)?.title?.ru,
    doctor: v.doctor,
    preferredDate: v.date,
    preferredTime: v.time,
    name: v.name,
    phone: `+${phoneDigits(v.phone)}`,
    contactMethod: v.method,
    comment: v.comment,
    consent: v.consent,
    language: getLang(),
    createdAt: new Date().toISOString(),
    source: window.location.href,
  };
}

async function send(data, v) {
  const { mode, endpoint, timeoutMs } = SITE.booking;
  if (mode === 'backend') {
    const api = await getApi();
    const doc = doctorById(v.doctor);
    const svc = SITE.services.find((x) => x.id === v.service);
    const useSlot = v.slot && !$('[data-field="slot"]').hidden;
    const res = await api.submitAppointment({
      doctor_id: doc ? doc.uuid : 'any',
      service_id: svc ? svc.uuid : 'consultation',
      date: v.date,
      window: useSlot ? 'any' : v.time,
      slot_start: useSlot ? v.slot : null,
      name: v.name,
      phone: data.phone,
      method: v.method,
      comment: v.comment,
      language: getLang(),
      consent: v.consent,
    });
    return { demo: false, reference: res.reference, slot: res.slot_start };
  }
  if (mode === 'endpoint' && endpoint) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data),
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { demo: false };
    } finally {
      clearTimeout(timer);
    }
  }
  await new Promise((r) => setTimeout(r, 1100)); // demo latency
  return { demo: true };
}

function setSending(on) {
  sending = on;
  const button = $('[data-submit]');
  button.disabled = on;
  button.classList.toggle('is-loading', on);
  button.setAttribute('aria-busy', String(on));
  const label = $('.btn__label', button);
  const text = t(on ? 'booking.sending' : 'booking.submit');
  label.dataset.text = text;
  $('span', label).textContent = text;
  $('span', label).dataset.i18n = on ? 'booking.sending' : 'booking.submit';
  form().setAttribute('aria-busy', String(on));
}

function reference() {
  const d = new Date();
  const stamp = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `REQ-${stamp}-${rand}`;
}

function showSuccess(v, result) {
  const box = $('[data-form-result]');
  const rawMethod = t(`booking.fields.methods.${v.method}`);
  const methodLabel = v.method === 'call' ? rawMethod.toLowerCase() : rawMethod;
  const svc = v.service === 'consultation' ? t('booking.fields.consultation') : tl(serviceById(v.service)?.title);
  box.className = 'form-result';
  box.innerHTML = `
    <span class="form-result__icon">${icons.check}</span>
    <h2>${esc(t('booking.success.title'))}</h2>
    <p class="lead" style="max-width:48ch">${esc(result.slot
      ? t('booking.success.textSlot', { method: methodLabel, time: `${formatDate(v.date)}, ${formatTime(result.slot)}` })
      : t('booking.success.text', { method: methodLabel }))}</p>
    <dl class="info-list" style="width:100%">
      <div><dt>${esc(t('booking.success.ref'))}</dt><dd class="ref">${esc(result.reference || reference())}</dd></div>
      <div><dt>${esc(t('booking.fields.service'))}</dt><dd>${esc(svc)}</dd></div>
      <div><dt>${esc(t('booking.fields.date'))}</dt><dd>${esc(formatDate(v.date))}</dd></div>
      <div><dt>${esc(t('booking.fields.phone'))}</dt><dd>${esc(formatPhone(v.phone))}</dd></div>
    </dl>
    ${result.demo ? `<p class="notice">${icons.alert}<span>${esc(t('booking.success.demo'))}</span></p>` : `<p class="muted">${esc(t('booking.success.sent'))}</p>`}
    <div class="cta-band__actions">
      <a class="btn btn--solid" href="${waHref(whatsappMessage(v), whatsappNumber(v))}" target="_blank" rel="noopener">${icons.whatsapp.replace('<svg', '<svg class="btn__icon"')}<span class="btn__label" data-text="${esc(t('booking.whatsappSend'))}"><span>${esc(t('booking.whatsappSend'))}</span></span></a>
      <button type="button" class="btn" data-again><span class="btn__label" data-text="${esc(t('booking.success.again'))}"><span>${esc(t('booking.success.again'))}</span></span></button>
    </div>`;
  form().hidden = true;
  box.hidden = false;
  box.focus({ preventScroll: true });
  const card = box.closest('.booking-card') || box;
  if (lenis) lenis.scrollTo(card, { offset: -110 });
  else window.scrollTo({ top: card.getBoundingClientRect().top + window.scrollY - 110, behavior: motionOK() ? 'smooth' : 'auto' });
  if (motionOK()) gsap.fromTo(box.children, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.06, ease: 'expo.out' });
  $('[data-again]', box).addEventListener('click', () => resetForm());
}

function showSendError() {
  const summary = $('[data-form-summary]');
  summary.innerHTML = `
    <strong>${esc(t('booking.error.title'))}</strong><br>${esc(t('booking.error.text'))}
    <div class="cta-band__actions" style="margin-top:var(--sp-3)">
      <button type="submit" class="btn btn--sm"><span class="btn__label" data-text="${esc(t('booking.error.retry'))}"><span>${esc(t('booking.error.retry'))}</span></span></button>
      <a class="btn btn--sm" href="${waHref(whatsappMessage(), whatsappNumber())}" target="_blank" rel="noopener"><span class="btn__label" data-text="WhatsApp"><span>WhatsApp</span></span></a>
    </div>`;
  summary.focus();
}

function resetForm() {
  const f = form();
  f.reset();
  touched.clear();
  submitted = false;
  Object.keys(validators).forEach((n) => showError(n, ''));
  $('[data-form-summary]').textContent = '';
  $('[data-comment-count]').textContent = `0/500`;
  renderDoctorOptions();
  renderServiceOptions();
  renderRadios();
  refreshSlots();
  updateWhatsapp();
  $('[data-form-result]').hidden = true;
  f.hidden = false;
  $('#f-doctor').focus();
}

async function onSubmit(e) {
  e.preventDefault();
  if (sending) return; // guards against double submission
  submitted = true;
  const invalid = validateAll();
  if (invalid.length) {
    const first = $(`[data-field="${invalid[0]}"] input, [data-field="${invalid[0]}"] select`);
    first?.focus();
    return;
  }
  const v = values();
  setSending(true);
  try {
    const result = await send(payload(v), v);
    showSuccess(v, result);
  } catch (err) {
    const code = errorCode(err);
    console.error('[booking]', code, err);
    if (code === 'SLOT_UNAVAILABLE' || code === 'SLOT_CONFLICT') {
      await refreshSlots();
      showError('slot', t('booking.errors.slotTaken'));
      $('[data-field="slot"]')?.scrollIntoView({ block: 'center' });
      $('[data-slot-options] input')?.focus();
    } else if (code === 'RATE_LIMITED') {
      $('[data-form-summary]').textContent = t('booking.errors.rateLimited');
      $('[data-form-summary]').focus();
    } else if (/^(INVALID_|DATE_|CONSENT_|SERVICE_|COMMENT_)/.test(code)) {
      $('[data-form-summary]').textContent = t('booking.errors.server');
      $('[data-form-summary]').focus();
    } else {
      showSendError();
    }
  } finally {
    setSending(false);
  }
}

/* ---- Init -------------------------------------------------------------- */
export function init() {
  const f = form();
  renderStatic();
  renderDoctorOptions();
  renderServiceOptions();
  renderRadios();
  setDateLimits();
  refreshSlots();
  updateWhatsapp();

  const phone = $('#f-phone');
  phone.addEventListener('input', () => {
    const atEnd = phone.selectionStart === phone.value.length;
    if (atEnd) phone.value = formatPhone(phone.value);
  });
  phone.addEventListener('blur', () => { phone.value = formatPhone(phone.value); });

  const comment = $('#f-comment');
  comment.addEventListener('input', () => {
    $('[data-comment-count]').textContent = t('booking.fields.chars', { n: comment.value.length, max: 500 });
  });

  $('#f-doctor').addEventListener('change', () => { renderServiceOptions(); refreshSlots(); });
  $('#f-service').addEventListener('change', refreshSlots);
  $('#f-date').addEventListener('change', refreshSlots);

  // Blur-first validation; once a field has been checked, errors clear live.
  f.addEventListener('focusout', (e) => {
    const name = e.target.name;
    if (!name || !validators[name]) return;
    if (e.target.value || submitted) { touched.add(name); validateField(name); }
  });
  const live = (e) => {
    const name = e.target.name;
    if (validators[name] && (touched.has(name) || submitted)) validateField(name);
    updateWhatsapp();
    if (submitted) {
      const n = Object.keys(validators).filter((k) => $(`[data-field="${k}"]`)?.classList.contains('is-invalid')).length;
      $('[data-form-summary]').textContent = n ? t('booking.errors.summary', { n }) : '';
    }
  };
  f.addEventListener('input', live);
  f.addEventListener('change', live);
  f.addEventListener('submit', onSubmit);

  // Keep the WhatsApp link fresh right before it is followed.
  $('[data-wa-booking]').addEventListener('click', updateWhatsapp);

  document.addEventListener('i18n:change', () => {
    renderStatic();
    renderDoctorOptions();
    renderServiceOptions();
    renderRadios();
    refreshSlots();
    updateWhatsapp();
    if (submitted) validateAll();
    else touched.forEach((n) => validateField(n));
  });
}
