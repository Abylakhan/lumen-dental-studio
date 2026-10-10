# Admin panel & database — setup guide

This connects the website to **Supabase** for the database, the
administrator login and photo storage. Plan on about 20 minutes. The free
Supabase plan is enough for a small clinic.

The result:

- One **administrator** account manages doctors, services, prices, photos, hours
  and appointments at `/admin/`.
- **Patients never register.** Booking stays open to everyone.
- Every change in the admin panel appears on the website immediately.

---

## 1. Create the Supabase project

1. Sign up at https://supabase.com and click **New project**.
2. Name it (e.g. `lumen-dental`), set a strong **database password** and store
   it in a password manager.
3. **Region:** choose the one closest to Kazakhstan (e.g. *Frankfurt*).
4. Wait about 2 minutes for the project to start.

## 2. Create the database (migrations)

Open **SQL Editor → New query**. Paste and **Run** each file from
`supabase/migrations/`, **in this order**:

| File | What it does |
|---|---|
| `20261010000001_schema.sql` | Tables: settings, hours, doctors, services, prices, schedules, gallery, staff, appointments |
| `20261010000002_security.sql` | Row Level Security, the 10-doctor limit, double-booking protection, the photo bucket |
| `20261010000003_functions.sql` | Public booking and free-slot functions, validated on the server |
| `20261010000004_seed_demo.sql` | *Optional:* the current demo content, so the site looks the same right away |

Each should finish with "Success. No rows returned".

> If you use the Supabase CLI, run `supabase link` and `supabase db push`
> instead. The files are in the standard `supabase/migrations` layout.

## 3. Lock down sign-ups (important)

**Authentication → Sign In / Providers → Email:**

- **Allow new users to sign up: OFF**. Nobody can create an account.
- **Confirm email: ON**.
- **Secure password change: ON**. Changing the password then requires a recent
  login.
- Optional: in **Authentication → Policies (Passwords)**, set the minimum
  password length to **10** and require letters and digits.

Even if a stranger somehow got an account, they could not see or change
anything. Access requires a row in `staff_users`, and only an existing admin
can add one. The tests in `supabase/tests` prove this.

## 4. Create the administrator account

1. **Authentication → Users → Add user → Create new user**
   - Email: the owner's real email.
   - Password: a strong passphrase of 14+ characters. Supabase stores only a
     bcrypt hash.
   - Tick **Auto Confirm User**.
2. **SQL Editor:** open `supabase/create_first_admin.sql`, replace
   `owner@example.com` with that email and **Run** it. It should return one row
   with `role = admin`.

That's the only account. Doctors don't need accounts. The schema keeps a
`staff_role` type, so another role (e.g. reception) can be added later with a
single migration.

## 5. Connect the website

**Project Settings → API**, copy:

- **Project URL**
- **anon public** key, which is safe to publish because it only allows what the
  security rules permit.

Paste both into `js/backend-config.js`:

```js
export default {
  supabaseUrl: 'https://YOURPROJECT.supabase.co',
  supabaseAnonKey: 'eyJhbGciOi…',
  bucket: 'media',
};
```

> ⚠️ **Never** put the `service_role` key, the database password or the admin
> password into any website file. The site does not need them.

## 6. Deploy

Upload the whole `dental-website` folder to any static host (GitHub Pages,
Netlify, Vercel, Cloudflare Pages). There's no build step.

Then:

1. In Supabase **Authentication → URL Configuration**, set **Site URL** to your
   domain.
2. Replace `https://example.com` with your domain in the HTML `<link
   rel="canonical">` / `og:url` tags, `sitemap.xml` and `robots.txt`.
3. **Recommended:** send these security headers from your host. On Netlify and
   Cloudflare Pages, put them in a `_headers` file:
   ```
   /admin/*
     X-Frame-Options: DENY
     Content-Security-Policy: frame-ancestors 'none'
     Referrer-Policy: no-referrer
   ```

## 7. First login & daily use

Open `https://your-domain/admin/` and sign in.

1. **Настройки клиники:** enter the real phone, WhatsApp, address, map
   coordinates and social links, then switch **Демо-режим off** once everything
   is verified.
2. **Часы работы:** set the clinic hours and choose the booking mode:
   - **Заявка** (request): the patient picks a day and time of day, and you
     confirm by phone.
   - **По свободному времени** (real-time): the patient picks a free slot from
     the doctor's schedule, and the slot is held until you confirm it.
3. **Врачи:** replace the placeholder profiles. Upload photos, assign services,
   set doctor-specific prices, working hours with breaks and WhatsApp numbers.
   At most 10 doctors can be active.
4. **Услуги / Цены / Галерея:** edit the content in RU / KZ / EN. Photos are
   compressed automatically on the phone before upload.
5. **Записи:** a list and a calendar of all requests. Filter by doctor, service,
   status or date; confirm, reschedule or cancel. The database refuses
   overlapping appointments for the same doctor.

Sessions end after 30 minutes of inactivity. **Пароль** lets you change the
password, which requires the current one, and sign out on all devices.

## Patient photos (before/after)

A real patient case **cannot be published** unless "written consent obtained"
and "consent to publish on the website" are both ticked. The database enforces
this rule, not just the form. Keep the signed consent form at the clinic and
record its number in the case.

---

## Testing locally (developers)

**Security tests**, against a real throwaway PostgreSQL with no Supabase
account. They apply all migrations and check 58 rules for anonymous visitors,
signed-in non-admins and the admin.

Set up a virtual environment:

```bash
python3 -m venv .venv
```

Install the test dependencies:

```bash
.venv/bin/pip install pgserver psycopg2-binary
```

Run the tests:

```bash
.venv/bin/python supabase/tests/run_security_tests.py
```

**The UI without Supabase:** serve the folder and open
`http://localhost:8080/admin/?mock=1`. This uses an in-browser fake backend
seeded with the demo data (login `admin@demo.local` / `demo-admin-2026`). It
works only on `localhost`, never on a real domain, and is ignored once
`backend-config.js` is filled in. `?mock=0` switches it off.

## What is protected, and where

| Rule | Enforced by |
|---|---|
| Only the admin can read appointments / patient data | RLS on `appointments` |
| Visitors can only create appointments through validated `submit_appointment()` (consent, KZ phone, date window, open day, doctor offers service, rate limit) | No insert policy for `anon` + `SECURITY DEFINER` function |
| Only the admin can change content, prices, photos and settings | RLS `is_admin()` policies + storage policies |
| Nobody can make themselves admin | RLS on `staff_users` |
| Max 10 active doctors | Trigger with a lock |
| No overlapping appointments per doctor | Trigger with a per-doctor lock |
| Unpublished photos and real cases without consent are never public | RLS + check constraint |
| Admin can't lock themselves out | Trigger |
