// Clinic settings — contacts, address, map, social links, demo mode.
import { $, busy, toast, langField, bindLangTabs, readForm, cleanLang, input, toggle } from '../ui.js';

const SOCIAL = [['instagram', 'Instagram'], ['telegram', 'Telegram'], ['2gis', '2GIS']];
const REVIEWS = [['2gis', '2GIS'], ['google', 'Google Maps']];
const urlOf = (list, id) => (list || []).find((x) => x.id === id)?.url || '';

export async function render(host, { api }) {
  const cfg = (await api.select('clinic_settings', { eq: { id: 1 } }))[0] || {};
  host.innerHTML = `
    <header class="adm-head"><div><h1>Настройки клиники</h1><p>Контакты и адрес отображаются в шапке, подвале, на странице контактов и в сообщениях WhatsApp.</p></div></header>
    <form class="adm-form" data-settings novalidate>
      <section class="adm-card"><h2>Клиника</h2>
        <div class="adm-grid adm-grid--2">
          ${input('name', cfg.name || '', { label: 'Название', attrs: 'required maxlength="80"' })}
          ${input('short_name', cfg.short_name || '', { label: 'Короткое название (логотип)', attrs: 'maxlength="24"' })}
        </div>
        ${toggle('demo_mode', cfg.demo_mode, 'Демо-режим: показывать пометку «Демо» на сайте (контакты, цены и профили не проверены)')}
      </section>
      <section class="adm-card"><h2>Контакты</h2>
        <div class="adm-grid adm-grid--2">
          ${input('phone', cfg.phone || '', { label: 'Телефон для звонка', attrs: 'inputmode="tel" placeholder="+77012345678"', hint: 'Формат +7XXXXXXXXXX — для кнопки «Позвонить».' })}
          ${input('phone_display', cfg.phone_display || '', { label: 'Телефон — как показывать', attrs: 'placeholder="+7 (701) 234-56-78"' })}
          ${input('whatsapp', cfg.whatsapp || '', { label: 'WhatsApp клиники', attrs: 'inputmode="numeric" placeholder="77012345678"', hint: 'Только цифры с кодом страны. Используется, если у врача нет своего номера.' })}
          ${input('email', cfg.email || '', { type: 'email', label: 'Email' })}
        </div>
      </section>
      <section class="adm-card"><h2>Адрес и карта</h2>
        ${langField('address', cfg.address, { label: 'Адрес' })}
        ${langField('city', cfg.city, { label: 'Город' })}
        <div class="adm-grid adm-grid--3">
          ${input('latitude', cfg.latitude ?? '', { type: 'number', label: 'Широта', attrs: 'step="0.000001" min="-90" max="90"' })}
          ${input('longitude', cfg.longitude ?? '', { type: 'number', label: 'Долгота', attrs: 'step="0.000001" min="-180" max="180"' })}
          ${input('map_zoom', cfg.map_zoom ?? 15, { type: 'number', label: 'Масштаб карты', attrs: 'min="10" max="19"' })}
        </div>
        <p class="adm-note">Координаты: откройте адрес в 2GIS или Google Maps и скопируйте числа вида 43.238949, 76.889709.</p>
      </section>
      <section class="adm-card"><h2>Соцсети и отзывы</h2>
        <p class="adm-note" style="margin-bottom:.75rem">Пустые ссылки не показываются на сайте. Указывайте только существующие аккаунты.</p>
        <div class="adm-grid adm-grid--3">${SOCIAL.map(([id, l]) => input(`social_${id}`, urlOf(cfg.social, id), { type: 'url', label: l, attrs: 'placeholder="https://…"' })).join('')}</div>
        <div class="adm-grid adm-grid--2">${REVIEWS.map(([id, l]) => input(`review_${id}`, urlOf(cfg.review_platforms, id), { type: 'url', label: `Отзывы: ${l}`, attrs: 'placeholder="https://…"' })).join('')}</div>
      </section>
      <div class="adm-sticky-save"><button type="submit" class="abtn abtn--primary">Сохранить</button></div>
    </form>`;
  const form = $('[data-settings]', host);
  bindLangTabs(form);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = readForm(form);
    const phone = v.phone ? `+${v.phone.replace(/\D/g, '')}` : null;
    const wa = v.whatsapp ? v.whatsapp.replace(/\D/g, '') : null;
    if (!v.name) { toast('Укажите название клиники.', 'error'); return; }
    if (phone && !/^\+[0-9]{10,15}$/.test(phone)) { toast('Телефон: формат +7XXXXXXXXXX.', 'error'); return; }
    if (wa && !/^[0-9]{10,15}$/.test(wa)) { toast('WhatsApp: только цифры с кодом страны.', 'error'); return; }
    const urls = [...SOCIAL.map(([id]) => v[`social_${id}`]), ...REVIEWS.map(([id]) => v[`review_${id}`])].filter(Boolean);
    if (urls.some((u) => !/^https:\/\//.test(u))) { toast('Ссылки должны начинаться с https://', 'error'); return; }
    await busy($('button[type=submit]', form), () => api.update('clinic_settings', { id: 1 }, {
      name: v.name, short_name: v.short_name || null, demo_mode: v.demo_mode, phone, phone_display: v.phone_display || phone,
      whatsapp: wa, email: v.email || null, address: cleanLang(v.address), city: cleanLang(v.city),
      latitude: v.latitude, longitude: v.longitude, map_zoom: v.map_zoom || 15,
      social: SOCIAL.map(([id, label]) => ({ id, label, url: v[`social_${id}`] || '' })),
      review_platforms: REVIEWS.map(([id, label]) => ({ id, label, url: v[`review_${id}`] || '' })),
    }), 'Настройки сохранены. Изменения уже на сайте.');
  });
}
