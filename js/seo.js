// Structured data (Schema.org). Contact, address and hours are included only
// when `clinic.dataVerified` is true in config.js — never placeholder data.
import SITE from '../config.js';

const DAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function injectStructuredData() {
  if (document.body.dataset.page !== 'home' && document.body.dataset.page !== 'contacts') return;
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Dentist',
    name: SITE.clinic.name,
    url: SITE.clinic.url,
    image: `${SITE.clinic.url}/assets/images/og-image.jpg`,
  };
  if (SITE.clinic.dataVerified) {
    Object.assign(data, {
      telephone: SITE.contact.phone,
      email: SITE.contact.email,
      address: { '@type': 'PostalAddress', streetAddress: SITE.contact.address.ru, addressLocality: SITE.contact.city.ru, addressCountry: SITE.contact.country },
      geo: { '@type': 'GeoCoordinates', latitude: SITE.contact.coordinates.lat, longitude: SITE.contact.coordinates.lng },
      openingHoursSpecification: Object.entries(SITE.hours.week)
        .filter(([, h]) => h)
        .map(([d, h]) => ({ '@type': 'OpeningHoursSpecification', dayOfWeek: DAY[d], opens: h[0], closes: h[1] })),
      sameAs: SITE.social.filter((s) => s.url).map((s) => s.url),
    });
  }
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
}
