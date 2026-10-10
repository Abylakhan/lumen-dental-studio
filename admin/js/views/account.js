// Account — change password (re-verifies the current one) and sign out.
import { $, esc, busy, toast } from '../ui.js';

const MIN_LENGTH = 10;

function strength(pw) {
  let score = 0;
  if (pw.length >= MIN_LENGTH) score++;
  if (pw.length >= 14) score++;
  if (/[a-zа-я]/.test(pw) && /[A-ZА-Я]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-zА-Яа-я0-9]/.test(pw)) score++;
  return ['Очень слабый', 'Слабый', 'Средний', 'Хороший', 'Надёжный', 'Отличный'][score];
}

export async function render(host, { api, session }) {
  host.innerHTML = `
    <header class="adm-head"><div><h1>Пароль и вход</h1><p>Учётная запись: <strong>${esc(session?.user?.email || '')}</strong></p></div></header>
    <section class="adm-card" style="max-width:560px">
      <h2>Сменить пароль</h2>
      <form class="adm-form" data-password novalidate>
        <div class="field"><label class="field__label" for="pw-current">Текущий пароль</label>
          <input class="input" id="pw-current" type="password" autocomplete="current-password" required></div>
        <div class="field"><label class="field__label" for="pw-new">Новый пароль</label>
          <input class="input" id="pw-new" type="password" autocomplete="new-password" minlength="${MIN_LENGTH}" required aria-describedby="pw-hint">
          <p class="field__hint" id="pw-hint">Не меньше ${MIN_LENGTH} символов. Лучше фраза из нескольких слов. <span data-strength></span></p></div>
        <div class="field"><label class="field__label" for="pw-repeat">Повторите новый пароль</label>
          <input class="input" id="pw-repeat" type="password" autocomplete="new-password" required></div>
        <p class="adm-alert" role="alert" hidden data-pw-error></p>
        <button class="abtn abtn--primary" type="submit">Сменить пароль</button>
      </form>
    </section>
    <section class="adm-card" style="max-width:560px">
      <h2>Выход</h2>
      <p class="adm-note" style="margin-bottom:.75rem">Сеанс завершается автоматически после 30 минут бездействия.</p>
      <div class="adm-actions">
        <button class="abtn" data-signout="local">Выйти на этом устройстве</button>
        <button class="abtn abtn--danger" data-signout="global">Выйти на всех устройствах</button>
      </div>
    </section>`;

  const form = $('[data-password]', host);
  const err = $('[data-pw-error]', host);
  const fail = (msg) => { err.hidden = false; err.textContent = msg; };
  $('#pw-new').addEventListener('input', (e) => { $('[data-strength]', host).textContent = e.target.value ? `Надёжность: ${strength(e.target.value)}.` : ''; });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.hidden = true;
    const current = $('#pw-current').value;
    const next = $('#pw-new').value;
    if (!current) return fail('Введите текущий пароль.');
    if (next.length < MIN_LENGTH) return fail(`Новый пароль должен быть не короче ${MIN_LENGTH} символов.`);
    if (next !== $('#pw-repeat').value) return fail('Пароли не совпадают.');
    if (next === current) return fail('Новый пароль совпадает с текущим.');
    const ok = await busy($('button[type=submit]', form), async () => { await api.changePassword(current, next); return true; });
    form.reset();
    $('[data-strength]', host).textContent = '';
    if (ok) toast('Пароль изменён.');
  });

  host.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-signout]');
    if (!b) return;
    await api.signOut(b.dataset.signout);
    toast('Вы вышли из системы');
    location.reload();
  });
}
