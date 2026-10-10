# Lumen Dental Studio — cinematic dental clinic website

A static, multi-page, trilingual (RU / KZ / EN) dental clinic website with
scroll-driven storytelling, automatic light/dark scenes, an accessible
before-and-after slider and a real appointment-request flow.

**Stack:** HTML5, CSS custom properties, vanilla ES modules, GSAP 3.12 +
ScrollTrigger, Lenis (smooth scroll). No build step, no framework.

> ⚠️ **Demonstration content.** The contacts, prices, doctor profiles and
> before/after cases are placeholders. A "Demo" notice is shown site-wide while
> `demo.enabled` is `true` in `config.js`. Replace them with verified clinic
> data before publishing.

---

## Admin panel & database

The site can be connected to **Supabase** (database, administrator login and
photo storage) for a secure admin panel at **`/admin/`**.

- One administrator account; patients never register.
- Manage doctors (max 10 active), services, prices and promotions, the gallery,
  clinic hours, settings and all appointments (list + calendar).
- Optional real-time booking with server-validated free slots.

Without Supabase, the site keeps running from `config.js` exactly as before.

👉 **Setup guide:** [SETUP.md](SETUP.md). Schema, security policies and tests
are in [`supabase/`](supabase/).

## Run locally

ES modules need an HTTP server (opening the files with `file://` won't work):

```bash
python3 -m http.server 8080
```

Then open http://localhost:8080.

## Project structure

```
index.html            Home — 8 cinematic scenes
services.html         Searchable, filterable service index
service.html?id=…     Service detail (rendered from config)
doctors.html          Team
doctor.html?id=…      Doctor profile (rendered from config)
before-after.html     Comparison gallery + consent workflow
prices.html           Full price list with search and scroll-spy
booking.html          Appointment request form + WhatsApp
about.html  reviews.html  contacts.html  faq.html  privacy.html  404.html
config.js             ← ALL clinic data lives here
css/  base · layout · components · animations · pages · responsive
js/   main (entry) · boot (pre-paint) · localization · i18n/{ru,kk,en}
      navigation · scenes · animations · before-after · booking · hours
      render · seo · utils · pages/*.js (one module per page)
assets/images/photos  WebP photography (Unsplash, demo)
```

## Customising the clinic

Everything lives in **`config.js`**; no HTML editing is needed.

| What | Where in `config.js` |
|---|---|
| Name, logo, canonical URL, licence | `clinic` |
| Phone, WhatsApp, email, address, map coordinates | `contact` |
| Opening hours (drives "open now", booking date validation) | `hours.week` |
| Social / review platform links (empty = hidden) | `social`, `reviewPlatforms` |
| Services (text, images, steps, preparation) | `services` |
| Prices and categories | `prices` |
| Doctors (`null` fields show "to be provided") | `doctors` |
| Before/after cases + consent records | `cases` |
| Verified reviews | `reviews` |
| Booking mode, endpoint, time windows | `booking` |

Interface copy lives in `js/i18n/ru.js`, `kk.js` and `en.js`. All three share
an identical key structure (420 keys).

### Launch checklist

1. Replace `contact.*` with real details and set `contact.placeholder = false`.
2. Replace `hours.week` with verified hours.
3. Replace prices and set `prices.placeholder = false`.
4. Replace doctor profiles (photos, names, education, experience, languages) and
   set `placeholder: false` on each.
5. Add real cases **only with signed consent** (see below).
6. Set `clinic.url`, then update `<link rel="canonical">` / `og:url` in each HTML
   file, plus `sitemap.xml` and `robots.txt` (search-replace `https://example.com`).
7. When everything is verified, set `clinic.dataVerified = true`. This enables
   the full Schema.org `Dentist` structured data with address, phone and hours.
8. Set `demo.enabled = false`.

## Booking

The form validates:

- the service;
- the date, which must fall within the booking window and on an open day;
- the name;
- a Kazakhstan phone number (`+7 7XX XXX XX XX`), with an input mask that
  accepts `8…` and `+7…`;
- consent.

It shows inline and summary errors, and a loading state that guards against
double submits.

**It always submits a request, never a confirmed appointment.**

- `booking.mode = 'demo'` (default): the submission is simulated. The success
  screen states clearly that nothing was sent and offers WhatsApp or a call.
- `booking.mode = 'endpoint'`: POSTs JSON to `booking.endpoint` (your CRM,
  Formspree, a serverless function or a scheduling API). Any non-2xx response
  shows a recoverable error. The data stays in the form and a WhatsApp fallback
  is offered.

Payload:

```json
{
  "type": "appointment_request", "status": "pending_confirmation",
  "service": "whitening", "doctor": "any", "preferredDate": "2026-10-12",
  "preferredTime": "evening", "name": "…", "phone": "+77011234567",
  "contactMethod": "whatsapp", "comment": "…", "consent": true,
  "language": "ru", "createdAt": "…", "source": "…"
}
```

The **WhatsApp** button builds a prefilled message in the visitor's language
from the form, using `contact.whatsapp`.

## Patient photographs & consent

`before-after.js → publishableCases()` renders a case only if it is:

- `demo: true`: always labelled "Demo simulation"; the "before" is a CSS filter
  on stock photography, **never** presented as a patient result; or
- `demo: false` **and** `consent.obtained === true` **and**
  `consent.scope` includes `'website'`.

Keep the signed form on file and reference it in `consent.documentRef`. The
public consent policy is on `before-after.html` and `privacy.html`.

## Theme & scenes

- Sections declare `data-scene="light | dark | soft"`. In **Cinematic (auto)**
  mode the site alternates scenes, and `data-morph-from` sections scrub their
  colours on scroll (hero → dark approach, finale).
- The header picks up the scene beneath it.
- The theme toggle cycles **Cinematic → Light → Dark**. A manual choice
  overrides every scene, is never changed by scrolling and persists across
  pages.

## Motion & accessibility

- Reveals are declarative: `data-reveal="up | fade | lines | words | clip |
  stagger | scale | line | draw"`, plus `data-parallax` and `data-count`.
- Content is fully visible without JS, without GSAP and under
  `prefers-reduced-motion`. In those cases there are no pins, no smooth
  scrolling and no hidden states, and the services gallery becomes native
  horizontal scrolling.
- Pinned scenes (close-up, horizontal services) are desktop-only through
  `gsap.matchMedia`. Mobile gets lighter, non-pinned versions.
- Keyboard and screen readers:
  - skip link and visible focus rings;
  - the menu traps focus, closes on Esc, locks background scroll and restores
    focus;
  - the slider is an ARIA slider;
  - hotspots are buttons with `aria-expanded`;
  - forms use `aria-invalid` and `aria-describedby`.
- The mobile action bar (Call / Book) reserves space at the bottom of the page
  and hides while a field is focused.

## Deployment

Any static host works: GitHub Pages, Netlify, Vercel or S3.

For GitHub Pages, push the folder and enable Pages. `404.html` uses relative
asset paths, so if it is served from nested URLs, add
`<base href="/your-repo/">` to its `<head>`.

## Credits

Photography: [Unsplash](https://unsplash.com) (free licence), used as demo
imagery. Replace it with the clinic's own photographs. Fonts: Inter Tight and
Cormorant Garamond (Google Fonts).
