/**
 * ============================================================================
 *  SITE CONFIGURATION — the single place to customise the clinic website.
 * ============================================================================
 *
 *  Everything clinic-specific lives here: contacts, hours, services, prices,
 *  doctors, cases and booking behaviour. HTML pages never need editing for
 *  these details.
 *
 *  Localised fields use the shape { ru: '…', kk: '…', en: '…' }.
 *
 *  ⚠️  PLACEHOLDERS
 *  Every value marked `placeholder: true` (or listed in `demo`) is DEMO DATA.
 *  The site shows a visible "demo data" notice while `demo.enabled` is true.
 *  Replace contacts, prices, doctors and cases with verified clinic
 *  information, then set `demo.enabled = false`.
 *
 *  Never publish: invented licences, qualifications, testimonials, ratings,
 *  clinical statistics or patient photos without written consent.
 */

const SITE = {
  /* ---------------------------------------------------------------------- */
  demo: {
    // Shows the "demonstration website" notice in the footer and on pages
    // with placeholder data (prices, doctors, cases).
    enabled: true,
  },

  /* ---------------------------------------------------------------------- */
  clinic: {
    name: 'Lumen Dental Studio',
    shortName: 'Lumen',
    // Logo: the wordmark is rendered as text + an inline SVG mark.
    // To use an image instead, set a path, e.g. 'assets/icons/logo.svg'.
    logo: null,
    tagline: {
      ru: 'Стоматология, продуманная до деталей',
      kk: 'Әр детальге мән беретін стоматология',
      en: 'Dentistry considered down to the detail',
    },
    // Canonical public URL (no trailing slash). Also update sitemap.xml,
    // robots.txt and the <link rel="canonical"> tags when deploying.
    url: 'https://abylakhan.github.io/lumen-dental-studio',
    // Set to true only once ALL contact data below is verified. Structured
    // data (Schema.org) includes address/phone/hours only when true.
    dataVerified: false,
    // Medical licence — leave null until the clinic supplies the real record.
    license: null, // e.g. { number: '…', issuedBy: { ru, kk, en }, date: 'YYYY-MM-DD' }
  },

  /* ---------------------------------------------------------------------- */
  contact: {
    placeholder: true,
    // Display format and E.164 digits. '000-00-00' marks an obvious placeholder.
    phoneDisplay: '+7 (700) 000-00-00',
    phone: '+77000000000',
    whatsapp: '77000000000', // digits only, international format, no '+'
    email: 'hello@example.com',
    address: {
      ru: 'г. Алматы, адрес клиники будет указан',
      kk: 'Алматы қ., клиника мекенжайы көрсетіледі',
      en: 'Almaty, clinic address to be confirmed',
    },
    city: { ru: 'Алматы', kk: 'Алматы', en: 'Almaty' },
    country: 'KZ',
    // Map: approximate city-centre coordinates until the real location is set.
    coordinates: { lat: 43.238949, lng: 76.889709 },
    mapZoom: 15,
  },

  /* ---------------------------------------------------------------------- */
  // 0 = Sunday … 6 = Saturday. `null` = closed. 24h "HH:MM".
  hours: {
    placeholder: true,
    timeZone: 'Asia/Almaty',
    week: {
      1: ['09:00', '20:00'],
      2: ['09:00', '20:00'],
      3: ['09:00', '20:00'],
      4: ['09:00', '20:00'],
      5: ['09:00', '20:00'],
      6: ['10:00', '17:00'],
      0: null,
    },
  },

  /* ---------------------------------------------------------------------- */
  // Leave url empty to hide a network. Only add accounts that really exist.
  social: [
    { id: 'instagram', label: 'Instagram', url: '' },
    { id: 'telegram', label: 'Telegram', url: '' },
    { id: '2gis', label: '2GIS', url: '' },
  ],

  // Public review platforms where verified patients can leave feedback.
  reviewPlatforms: [
    { id: '2gis', label: '2GIS', url: '' },
    { id: 'google', label: 'Google Maps', url: '' },
  ],

  /* ---------------------------------------------------------------------- */
  brand: {
    // Mirrors css/base.css tokens; used by JS (meta theme-color etc.).
    white: '#FFFFFF',
    black: '#080808',
    offWhite: '#F2F2F0',
    graphite: '#171717',
    accent: '#A9D2EA', // icy blue
  },

  languages: {
    default: 'ru',
    supported: [
      { code: 'ru', label: 'RU', name: 'Русский', htmlLang: 'ru' },
      { code: 'kk', label: 'KZ', name: 'Қазақша', htmlLang: 'kk' },
    ],
  },

  currency: { code: 'KZT', symbol: '₸', locale: 'ru-KZ' },

  /* ---------------------------------------------------------------------- */
  booking: {
    /**
     * mode:
     *  'demo'     — simulates submission. Nothing is sent. The success screen
     *               says so and suggests WhatsApp or a phone call.
     *  'endpoint' — POSTs JSON to `endpoint` (e.g. your CRM, Formspree,
     *               a serverless function). Expects a 2xx response.
     */
    mode: 'demo',
    endpoint: '',
    timeoutMs: 12000,
    // How many days ahead a patient can request.
    maxDaysAhead: 60,
    // Preferred time windows. These are PREFERENCES, not live availability.
    timeWindows: [
      { id: 'morning', from: '09:00', to: '12:00', label: { ru: 'Утро', kk: 'Таңертең', en: 'Morning' } },
      { id: 'day', from: '12:00', to: '16:00', label: { ru: 'День', kk: 'Күндіз', en: 'Afternoon' } },
      { id: 'evening', from: '16:00', to: '20:00', label: { ru: 'Вечер', kk: 'Кешке', en: 'Evening' } },
    ],
    contactMethods: ['call', 'whatsapp', 'sms'],
  },

  /* ---------------------------------------------------------------------- */
  serviceCategories: [
    { id: 'therapy', label: { ru: 'Терапия', kk: 'Терапия', en: 'Therapy' } },
    { id: 'surgery', label: { ru: 'Хирургия и имплантация', kk: 'Хирургия және имплантация', en: 'Surgery & implants' } },
    { id: 'orthodontics', label: { ru: 'Ортодонтия', kk: 'Ортодонтия', en: 'Orthodontics' } },
    { id: 'aesthetics', label: { ru: 'Эстетика', kk: 'Эстетика', en: 'Aesthetics' } },
    { id: 'prevention', label: { ru: 'Профилактика', kk: 'Профилактика', en: 'Prevention' } },
    { id: 'kids', label: { ru: 'Детям', kk: 'Балаларға', en: 'Children' } },
  ],

  services: [
    {
      id: 'general',
      category: 'therapy',
      image: 'assets/images/photos/exam-mirror.webp',
      imageAlt: { ru: 'Осмотр зубов стоматологическим зеркалом', kk: 'Тісті стоматологиялық айнамен тексеру', en: 'Dental examination with a mouth mirror' },
      title: { ru: 'Общая стоматология', kk: 'Жалпы стоматология', en: 'General Dentistry' },
      short: {
        ru: 'Осмотр, диагностика и лечение — основа здоровой улыбки.',
        kk: 'Тексеру, диагностика және емдеу — сау күлкінің негізі.',
        en: 'Examinations, diagnostics and treatment — the foundation of a healthy smile.',
      },
      intro: {
        ru: 'Мы начинаем с внимательного осмотра и разговора: что вас беспокоит, какие ожидания, какой опыт лечения уже был. План лечения составляется только после диагностики и обсуждается с вами заранее.',
        kk: 'Біз мұқият тексеруден және әңгімеден бастаймыз: сізді не мазалайды, қандай күтулеріңіз бар, бұрын қандай ем алдыңыз. Емдеу жоспары тек диагностикадан кейін құрылып, сізбен алдын ала талқыланады.',
        en: 'We begin with a careful examination and a conversation: what concerns you, what you expect, and what treatment you have had before. A treatment plan is drawn up only after diagnostics and agreed with you in advance.',
      },
      duration: { ru: '45–60 мин', kk: '45–60 мин', en: '45–60 min' },
      steps: [
        { ru: 'Консультация и сбор жалоб', kk: 'Кеңес және шағымдарды тыңдау', en: 'Consultation and history' },
        { ru: 'Осмотр и диагностика', kk: 'Тексеру және диагностика', en: 'Examination and diagnostics' },
        { ru: 'План лечения и его стоимость', kk: 'Емдеу жоспары және оның құны', en: 'Treatment plan and cost estimate' },
        { ru: 'Лечение и рекомендации', kk: 'Емдеу және ұсыныстар', en: 'Treatment and aftercare advice' },
      ],
      prep: [
        { ru: 'Возьмите снимки и выписки, если они есть.', kk: 'Бар болса, рентген суреттері мен анықтамаларды ала келіңіз.', en: 'Bring any previous X-rays or records you have.' },
        { ru: 'Сообщите врачу о принимаемых лекарствах и аллергиях.', kk: 'Қабылдап жүрген дәрілеріңіз бен аллергияңыз туралы дәрігерге айтыңыз.', en: 'Tell the dentist about any medication or allergies.' },
      ],
    },
    {
      id: 'implants',
      category: 'surgery',
      image: 'assets/images/photos/implant-hand.webp',
      imageAlt: { ru: 'Дентальный имплант и коронка в руке врача', kk: 'Дәрігер қолындағы дентальды имплант пен коронка', en: 'A dental implant and crown held by a gloved hand' },
      title: { ru: 'Имплантация зубов', kk: 'Тіс имплантациясы', en: 'Dental Implants' },
      short: {
        ru: 'Восстановление утраченных зубов с тщательным планированием.',
        kk: 'Жоғалған тістерді мұқият жоспарлаумен қалпына келтіру.',
        en: 'Replacing missing teeth with careful, step-by-step planning.',
      },
      intro: {
        ru: 'Имплантация — многоэтапное лечение. Возможность, сроки и метод определяет врач после обследования и снимков. Мы подробно объясняем каждый этап и альтернативы.',
        kk: 'Имплантация — бірнеше кезеңнен тұратын ем. Мүмкіндігін, мерзімі мен әдісін дәрігер тексеру мен суреттерден кейін анықтайды. Әр кезеңді және балама жолдарды толық түсіндіреміз.',
        en: 'Implant treatment happens in several stages. Suitability, timing and technique are decided by the dentist after an examination and imaging. We explain every stage and the alternatives.',
      },
      duration: { ru: 'Несколько визитов', kk: 'Бірнеше келу', en: 'Several visits' },
      steps: [
        { ru: 'Консультация и обследование', kk: 'Кеңес және тексеру', en: 'Consultation and assessment' },
        { ru: 'Цифровое планирование', kk: 'Цифрлық жоспарлау', en: 'Digital planning' },
        { ru: 'Установка импланта', kk: 'Имплантты орнату', en: 'Implant placement' },
        { ru: 'Протезирование и контроль', kk: 'Протездеу және бақылау', en: 'Restoration and follow-up' },
      ],
      prep: [
        { ru: 'Пройдите обследование, назначенное врачом.', kk: 'Дәрігер тағайындаған тексеруден өтіңіз.', en: 'Complete the assessment your dentist recommends.' },
        { ru: 'Обсудите с врачом хронические заболевания.', kk: 'Созылмалы ауруларыңызды дәрігермен талқылаңыз.', en: 'Discuss any chronic conditions with your dentist.' },
      ],
    },
    {
      id: 'orthodontics',
      category: 'orthodontics',
      image: 'assets/images/photos/aligners.webp',
      imageAlt: { ru: 'Прозрачные элайнеры и футляр в руках', kk: 'Қолдағы мөлдір элайнерлер мен қорап', en: 'Hands holding clear aligners and a case' },
      title: { ru: 'Ортодонтия и брекеты', kk: 'Ортодонтия және брекеттер', en: 'Orthodontics & Braces' },
      short: {
        ru: 'Брекеты и элайнеры для ровной улыбки и правильного прикуса.',
        kk: 'Түзу күлкі мен дұрыс тістесу үшін брекеттер мен элайнерлер.',
        en: 'Braces and aligners for straighter teeth and a healthier bite.',
      },
      intro: {
        ru: 'Ортодонтическое лечение подбирается индивидуально: брекет-системы или элайнеры. Врач оценивает прикус, показывает план и объясняет, как будет проходить лечение.',
        kk: 'Ортодонтиялық ем жеке таңдалады: брекет-жүйелер немесе элайнерлер. Дәрігер тістесуді бағалап, жоспарды көрсетеді және емнің қалай өтетінін түсіндіреді.',
        en: 'Orthodontic treatment is chosen individually — braces or clear aligners. The orthodontist assesses your bite, shows you the plan and explains how treatment will progress.',
      },
      duration: { ru: 'Индивидуально', kk: 'Жеке', en: 'Individual' },
      steps: [
        { ru: 'Консультация ортодонта', kk: 'Ортодонт кеңесі', en: 'Orthodontic consultation' },
        { ru: 'Слепки или сканирование', kk: 'Қалып алу немесе сканерлеу', en: 'Impressions or digital scan' },
        { ru: 'План и выбор системы', kk: 'Жоспар және жүйені таңдау', en: 'Plan and choice of system' },
        { ru: 'Лечение и регулярный контроль', kk: 'Емдеу және тұрақты бақылау', en: 'Treatment and regular check-ups' },
      ],
      prep: [
        { ru: 'Перед установкой рекомендуется профессиональная гигиена.', kk: 'Орнатар алдында кәсіби гигиена ұсынылады.', en: 'A professional clean is recommended beforehand.' },
      ],
    },
    {
      id: 'cosmetic',
      category: 'aesthetics',
      image: 'assets/images/photos/smile-closeup.webp',
      imageAlt: { ru: 'Крупный план улыбки', kk: 'Күлкінің жақын көрінісі', en: 'Close-up of a smile' },
      title: { ru: 'Эстетическая стоматология', kk: 'Эстетикалық стоматология', en: 'Cosmetic Dentistry' },
      short: {
        ru: 'Форма, цвет и пропорции улыбки — в гармонии с лицом.',
        kk: 'Күлкінің пішіні, түсі мен пропорциясы — бет әлпетімен үйлесімде.',
        en: 'Shape, shade and proportion of a smile — in harmony with your face.',
      },
      intro: {
        ru: 'Эстетическое лечение начинается с анализа улыбки и обсуждения ваших пожеланий. Врач предлагает варианты и честно говорит о возможностях и ограничениях каждого.',
        kk: 'Эстетикалық ем күлкіні талдаудан және тілектеріңізді талқылаудан басталады. Дәрігер нұсқаларды ұсынып, әрқайсысының мүмкіндіктері мен шектеулері туралы ашық айтады.',
        en: 'Cosmetic treatment starts with a smile analysis and a conversation about your wishes. Your dentist suggests options and is honest about what each can and cannot achieve.',
      },
      duration: { ru: 'От 1 визита', kk: '1 келуден бастап', en: 'From 1 visit' },
      steps: [
        { ru: 'Анализ улыбки', kk: 'Күлкіні талдау', en: 'Smile analysis' },
        { ru: 'Обсуждение вариантов', kk: 'Нұсқаларды талқылау', en: 'Discussing options' },
        { ru: 'Пробная модель (при необходимости)', kk: 'Сынама модель (қажет болса)', en: 'Mock-up (if needed)' },
        { ru: 'Лечение и рекомендации', kk: 'Емдеу және ұсыныстар', en: 'Treatment and aftercare' },
      ],
      prep: [
        { ru: 'Подумайте, что именно вы хотели бы изменить.', kk: 'Нақты нені өзгерткіңіз келетінін ойластырыңыз.', en: 'Think about what exactly you would like to change.' },
      ],
    },
    {
      id: 'cleaning',
      category: 'prevention',
      image: 'assets/images/photos/mirror-explorer.webp',
      imageAlt: { ru: 'Стоматологическое зеркало и зонд на белом фоне', kk: 'Ақ фондағы стоматологиялық айна мен зонд', en: 'Dental mirror and explorer on a white surface' },
      title: { ru: 'Профессиональная гигиена', kk: 'Кәсіби гигиена', en: 'Professional Cleaning' },
      short: {
        ru: 'Бережное удаление налёта и зубного камня, советы по уходу.',
        kk: 'Тіс қағы мен тас шөгіндісін ұқыпты тазалау, күтім бойынша кеңес.',
        en: 'Gentle removal of plaque and tartar, with personal care advice.',
      },
      intro: {
        ru: 'Регулярная профессиональная гигиена помогает поддерживать здоровье зубов и дёсен. Гигиенист подберёт средства ухода и покажет технику чистки.',
        kk: 'Тұрақты кәсіби гигиена тіс пен қызыл иектің саулығын сақтауға көмектеседі. Гигиенист күтім құралдарын таңдап, тазалау әдісін көрсетеді.',
        en: 'Regular professional cleaning helps keep teeth and gums healthy. The hygienist will recommend care products and show you brushing technique.',
      },
      duration: { ru: '60 мин', kk: '60 мин', en: '60 min' },
      steps: [
        { ru: 'Осмотр полости рта', kk: 'Ауыз қуысын тексеру', en: 'Oral check' },
        { ru: 'Удаление зубного камня', kk: 'Тіс тасын кетіру', en: 'Tartar removal' },
        { ru: 'Полировка', kk: 'Жылтырату', en: 'Polishing' },
        { ru: 'Рекомендации по уходу', kk: 'Күтім бойынша ұсыныстар', en: 'Home-care advice' },
      ],
      prep: [
        { ru: 'Специальной подготовки не требуется.', kk: 'Арнайы дайындық қажет емес.', en: 'No special preparation is needed.' },
      ],
    },
    {
      id: 'whitening',
      category: 'aesthetics',
      image: 'assets/images/photos/smile-portrait.webp',
      imageAlt: { ru: 'Улыбающаяся женщина', kk: 'Күлімсіреген әйел', en: 'A smiling woman' },
      title: { ru: 'Отбеливание зубов', kk: 'Тісті ағарту', en: 'Teeth Whitening' },
      short: {
        ru: 'Осветление эмали под контролем врача.',
        kk: 'Дәрігер бақылауымен эмальді ағарту.',
        en: 'Dentist-supervised brightening of natural enamel.',
      },
      intro: {
        ru: 'Перед отбеливанием врач оценивает состояние зубов и проводит гигиену. Результат индивидуален и зависит от исходного цвета эмали — врач обсудит реалистичные ожидания.',
        kk: 'Ағарту алдында дәрігер тістің жағдайын бағалап, гигиена жүргізеді. Нәтиже жеке және эмальдің бастапқы түсіне байланысты — дәрігер шынайы күтулерді талқылайды.',
        en: 'Before whitening, the dentist checks your teeth and performs a clean. Results vary with your natural enamel shade — your dentist will discuss realistic expectations.',
      },
      duration: { ru: '60–90 мин', kk: '60–90 мин', en: '60–90 min' },
      steps: [
        { ru: 'Осмотр и гигиена', kk: 'Тексеру және гигиена', en: 'Check-up and cleaning' },
        { ru: 'Определение исходного оттенка', kk: 'Бастапқы реңкті анықтау', en: 'Recording your starting shade' },
        { ru: 'Процедура отбеливания', kk: 'Ағарту процедурасы', en: 'Whitening procedure' },
        { ru: 'Рекомендации после', kk: 'Кейінгі ұсыныстар', en: 'Aftercare advice' },
      ],
      prep: [
        { ru: 'За 1–2 недели рекомендуется профгигиена.', kk: '1–2 апта бұрын кәсіби гигиена ұсынылады.', en: 'A professional clean 1–2 weeks before is recommended.' },
      ],
    },
    {
      id: 'veneers',
      category: 'aesthetics',
      image: 'assets/images/photos/implant-model.webp',
      imageAlt: { ru: 'Модели зубов и коронок', kk: 'Тіс және коронка модельдері', en: 'Models of teeth and crowns' },
      title: { ru: 'Виниры', kk: 'Винирлер', en: 'Veneers' },
      short: {
        ru: 'Тонкие керамические накладки для формы и цвета.',
        kk: 'Пішін мен түс үшін жұқа керамикалық қаптамалар.',
        en: 'Thin ceramic shells that refine shape and shade.',
      },
      intro: {
        ru: 'Виниры подходят не всем. Решение принимается после диагностики, анализа улыбки и обсуждения альтернатив. Мы показываем будущий результат на пробной модели до начала работы.',
        kk: 'Винирлер барлығына сәйкес келе бермейді. Шешім диагностика, күлкіні талдау және балама жолдарды талқылаудан кейін қабылданады. Жұмыс басталмас бұрын болашақ нәтижені сынама модельде көрсетеміз.',
        en: 'Veneers are not right for everyone. The decision follows diagnostics, smile analysis and a discussion of alternatives. We preview the outcome on a mock-up before any work begins.',
      },
      duration: { ru: '2–3 визита', kk: '2–3 келу', en: '2–3 visits' },
      steps: [
        { ru: 'Диагностика и анализ улыбки', kk: 'Диагностика және күлкіні талдау', en: 'Diagnostics and smile analysis' },
        { ru: 'Пробная модель', kk: 'Сынама модель', en: 'Mock-up' },
        { ru: 'Подготовка и изготовление', kk: 'Дайындау және жасау', en: 'Preparation and fabrication' },
        { ru: 'Фиксация и контроль', kk: 'Бекіту және бақылау', en: 'Fitting and follow-up' },
      ],
      prep: [
        { ru: 'Сначала необходимо вылечить кариес и дёсны.', kk: 'Алдымен тісжегі мен қызыл иекті емдеу қажет.', en: 'Any decay or gum problems must be treated first.' },
      ],
    },
    {
      id: 'pediatric',
      category: 'kids',
      image: 'assets/images/photos/kids-brushing.webp',
      imageAlt: { ru: 'Дети чистят зубы', kk: 'Балалар тісін тазалап жатыр', en: 'Children brushing their teeth' },
      title: { ru: 'Детская стоматология', kk: 'Балалар стоматологиясы', en: 'Pediatric Dentistry' },
      short: {
        ru: 'Спокойные визиты, которые формируют доверие к врачу.',
        kk: 'Дәрігерге сенім қалыптастыратын тыныш қабылдаулар.',
        en: 'Calm visits that help children trust the dentist.',
      },
      intro: {
        ru: 'Первый визит — знакомство: ребёнок осматривается в кабинете, а врач объясняет всё простыми словами. Мы не торопимся и всегда держим родителей в курсе.',
        kk: 'Алғашқы келу — танысу: бала кабинетпен танысады, ал дәрігер бәрін қарапайым сөзбен түсіндіреді. Біз асықпаймыз және ата-аналарды үнемі хабардар етеміз.',
        en: 'The first visit is an introduction: your child gets to know the room while the dentist explains everything in simple words. We never rush, and parents are always kept informed.',
      },
      duration: { ru: '30–45 мин', kk: '30–45 мин', en: '30–45 min' },
      steps: [
        { ru: 'Знакомство', kk: 'Танысу', en: 'Getting acquainted' },
        { ru: 'Бережный осмотр', kk: 'Ұқыпты тексеру', en: 'Gentle check-up' },
        { ru: 'Рекомендации родителям', kk: 'Ата-аналарға ұсыныстар', en: 'Advice for parents' },
        { ru: 'План профилактики', kk: 'Профилактика жоспары', en: 'Prevention plan' },
      ],
      prep: [
        { ru: 'Расскажите ребёнку о визите спокойно и без страшилок.', kk: 'Балаға келу туралы сабырмен, қорқытпай айтыңыз.', en: 'Talk to your child about the visit calmly and positively.' },
      ],
    },
  ],

  /* ---------------------------------------------------------------------- */
  // DEMONSTRATION PRICES. Replace with the clinic's approved price list.
  prices: {
    placeholder: true,
    categories: [
      { id: 'diagnostics', label: { ru: 'Диагностика', kk: 'Диагностика', en: 'Diagnostics' } },
      { id: 'therapy', label: { ru: 'Терапия', kk: 'Терапия', en: 'Therapy' } },
      { id: 'hygiene', label: { ru: 'Гигиена', kk: 'Гигиена', en: 'Hygiene' } },
      { id: 'aesthetics', label: { ru: 'Эстетика', kk: 'Эстетика', en: 'Aesthetics' } },
      { id: 'orthodontics', label: { ru: 'Ортодонтия', kk: 'Ортодонтия', en: 'Orthodontics' } },
      { id: 'surgery', label: { ru: 'Имплантация', kk: 'Имплантация', en: 'Implants' } },
      { id: 'kids', label: { ru: 'Детям', kk: 'Балаларға', en: 'Children' } },
    ],
    items: [
      { id: 'consult', category: 'diagnostics', service: 'general', popular: true, price: 5000, from: false,
        title: { ru: 'Консультация стоматолога', kk: 'Стоматолог кеңесі', en: 'Dental consultation' },
        note: { ru: 'Осмотр и план лечения', kk: 'Тексеру және емдеу жоспары', en: 'Examination and treatment plan' } },
      { id: 'xray', category: 'diagnostics', service: 'general', price: 3000, from: false,
        title: { ru: 'Прицельный снимок', kk: 'Нысаналы сурет', en: 'Periapical X-ray' },
        note: { ru: 'Один зуб', kk: 'Бір тіс', en: 'Single tooth' } },
      { id: 'scan', category: 'diagnostics', service: 'general', price: 15000, from: true,
        title: { ru: '3D-диагностика', kk: '3D диагностика', en: '3D imaging' },
        note: { ru: 'По назначению врача', kk: 'Дәрігер тағайындауы бойынша', en: 'When indicated by the dentist' } },
      { id: 'filling', category: 'therapy', service: 'general', popular: true, price: 18000, from: true,
        title: { ru: 'Лечение кариеса', kk: 'Тісжегіні емдеу', en: 'Cavity treatment' },
        note: { ru: 'Пломба, в зависимости от объёма', kk: 'Пломба, көлеміне қарай', en: 'Filling, depending on extent' } },
      { id: 'endo', category: 'therapy', service: 'general', price: 45000, from: true,
        title: { ru: 'Лечение каналов', kk: 'Түбір өзегін емдеу', en: 'Root canal treatment' },
        note: { ru: 'Зависит от количества каналов', kk: 'Өзектер санына байланысты', en: 'Depends on the number of canals' } },
      { id: 'hygiene', category: 'hygiene', service: 'cleaning', popular: true, price: 20000, from: false,
        title: { ru: 'Профессиональная гигиена', kk: 'Кәсіби гигиена', en: 'Professional cleaning' },
        note: { ru: 'Ультразвук, Air Flow, полировка', kk: 'Ультрадыбыс, Air Flow, жылтырату', en: 'Ultrasonic scaling, air polishing, polish' } },
      { id: 'fluoride', category: 'hygiene', service: 'cleaning', price: 6000, from: false,
        title: { ru: 'Реминерализация', kk: 'Реминерализация', en: 'Remineralisation' },
        note: { ru: 'Покрытие эмали', kk: 'Эмальді жабу', en: 'Enamel treatment' } },
      { id: 'whitening', category: 'aesthetics', service: 'whitening', popular: true, price: 60000, from: true,
        title: { ru: 'Отбеливание в клинике', kk: 'Клиникада ағарту', en: 'In-clinic whitening' },
        note: { ru: 'После осмотра врача', kk: 'Дәрігер тексергеннен кейін', en: 'After a dental check' } },
      { id: 'veneer', category: 'aesthetics', service: 'veneers', price: 150000, from: true,
        title: { ru: 'Керамический винир', kk: 'Керамикалық винир', en: 'Ceramic veneer' },
        note: { ru: 'За единицу', kk: 'Бір бірлік үшін', en: 'Per tooth' } },
      { id: 'restoration', category: 'aesthetics', service: 'cosmetic', price: 35000, from: true,
        title: { ru: 'Художественная реставрация', kk: 'Көркем реставрация', en: 'Aesthetic restoration' },
        note: { ru: 'Композитный материал', kk: 'Композитті материал', en: 'Composite material' } },
      { id: 'braces', category: 'orthodontics', service: 'orthodontics', price: 350000, from: true,
        title: { ru: 'Брекет-система', kk: 'Брекет-жүйе', en: 'Braces' },
        note: { ru: 'Одна челюсть', kk: 'Бір жақ', en: 'One arch' } },
      { id: 'aligners', category: 'orthodontics', service: 'orthodontics', popular: true, price: 600000, from: true,
        title: { ru: 'Элайнеры', kk: 'Элайнерлер', en: 'Clear aligners' },
        note: { ru: 'Курс лечения, по плану', kk: 'Ем курсы, жоспар бойынша', en: 'Full course, per plan' } },
      { id: 'implant', category: 'surgery', service: 'implants', popular: true, price: 250000, from: true,
        title: { ru: 'Установка импланта', kk: 'Имплант орнату', en: 'Implant placement' },
        note: { ru: 'Без учёта коронки', kk: 'Коронкасыз', en: 'Crown not included' } },
      { id: 'crown', category: 'surgery', service: 'implants', price: 120000, from: true,
        title: { ru: 'Коронка на имплант', kk: 'Имплантқа коронка', en: 'Implant crown' },
        note: { ru: 'Циркониевая', kk: 'Цирконийлі', en: 'Zirconia' } },
      { id: 'kids-visit', category: 'kids', service: 'pediatric', price: 4000, from: false,
        title: { ru: 'Детский осмотр', kk: 'Балаларды тексеру', en: 'Child check-up' },
        note: { ru: 'Знакомство и консультация', kk: 'Танысу және кеңес', en: 'Introduction and advice' } },
      { id: 'sealant', category: 'kids', service: 'pediatric', price: 9000, from: false,
        title: { ru: 'Герметизация фиссур', kk: 'Фиссураларды герметизациялау', en: 'Fissure sealant' },
        note: { ru: 'Один зуб', kk: 'Бір тіс', en: 'Single tooth' } },
    ],
  },

  /* ---------------------------------------------------------------------- */
  // PLACEHOLDER PROFILES. Replace with real doctors. Leave a field `null`
  // to show "to be provided by the clinic" rather than inventing details.
  doctors: [
    {
      id: 'doctor-1',
      placeholder: true,
      name: { ru: 'Имя Фамилия', kk: 'Аты-жөні', en: 'Name Surname' },
      role: { ru: 'Стоматолог-терапевт', kk: 'Стоматолог-терапевт', en: 'General Dentist' },
      photo: 'assets/images/photos/dentist-mask4.webp',
      photoAlt: { ru: 'Фото-заглушка: специалист в маске', kk: 'Уақытша фото: маска киген маман', en: 'Placeholder photo: specialist wearing a mask' },
      bio: null,
      education: null,
      experience: null,
      languages: null, // e.g. ['ru', 'kk', 'en']
      services: ['general', 'cleaning', 'whitening'],
    },
    {
      id: 'doctor-2',
      placeholder: true,
      name: { ru: 'Имя Фамилия', kk: 'Аты-жөні', en: 'Name Surname' },
      role: { ru: 'Ортодонт', kk: 'Ортодонт', en: 'Orthodontist' },
      photo: 'assets/images/photos/dentist-bw.webp',
      photoAlt: { ru: 'Фото-заглушка: специалист в маске', kk: 'Уақытша фото: маска киген маман', en: 'Placeholder photo: specialist wearing a mask' },
      bio: null, education: null, experience: null, languages: null,
      services: ['orthodontics'],
    },
    {
      id: 'doctor-3',
      placeholder: true,
      name: { ru: 'Имя Фамилия', kk: 'Аты-жөні', en: 'Name Surname' },
      role: { ru: 'Хирург-имплантолог', kk: 'Хирург-имплантолог', en: 'Implant Surgeon' },
      photo: 'assets/images/photos/dentist-mask3.webp',
      photoAlt: { ru: 'Фото-заглушка: специалист в маске', kk: 'Уақытша фото: маска киген маман', en: 'Placeholder photo: specialist wearing a mask' },
      bio: null, education: null, experience: null, languages: null,
      services: ['implants', 'general'],
    },
    {
      id: 'doctor-4',
      placeholder: true,
      name: { ru: 'Имя Фамилия', kk: 'Аты-жөні', en: 'Name Surname' },
      role: { ru: 'Детский стоматолог', kk: 'Балалар стоматологы', en: 'Pediatric Dentist' },
      photo: 'assets/images/photos/dentist-mask1.webp',
      photoAlt: { ru: 'Фото-заглушка: специалист за работой', kk: 'Уақытша фото: жұмыс үстіндегі маман', en: 'Placeholder photo: specialist at work' },
      bio: null, education: null, experience: null, languages: null,
      services: ['pediatric', 'cleaning'],
    },
  ],

  /* ---------------------------------------------------------------------- */
  /**
   * BEFORE & AFTER CASES
   *
   * `demo: true` cases are visual SIMULATIONS built from licensed stock
   * photography (the "before" is a digitally altered copy). They are always
   * labelled as demonstrations and never presented as patient outcomes.
   *
   * Real cases (`demo: false`) are rendered ONLY when
   *   consent.obtained === true AND consent.scope includes 'website'.
   * Keep the signed consent form on file and reference it in `documentRef`.
   * Crop or blur identifying features unless the consent explicitly allows.
   */
  cases: [
    {
      id: 'case-whitening', demo: true, category: 'whitening', service: 'whitening',
      before: 'assets/images/photos/smile-closeup.webp', after: 'assets/images/photos/smile-closeup.webp',
      simulateBefore: 'stain',
      title: { ru: 'Отбеливание', kk: 'Ағарту', en: 'Whitening' },
      text: {
        ru: 'Демонстрация интерфейса сравнения на стоковом фото: «до» — цифровая имитация.',
        kk: 'Салыстыру интерфейсінің стоктық фотодағы көрсетілімі: «дейін» — цифрлық имитация.',
        en: 'Comparison interface demo on stock photography: the “before” is a digital simulation.',
      },
      consent: { obtained: false, date: null, scope: [], documentRef: '' },
    },
    {
      id: 'case-restoration', demo: true, category: 'restoration', service: 'cosmetic',
      before: 'assets/images/photos/smile-closeup2.webp', after: 'assets/images/photos/smile-closeup2.webp',
      simulateBefore: 'dull',
      title: { ru: 'Эстетическая реставрация', kk: 'Эстетикалық реставрация', en: 'Cosmetic restoration' },
      text: {
        ru: 'Пример раскладки кейса. Замените на фото клиники с письменным согласием пациента.',
        kk: 'Кейс орналасуының үлгісі. Пациенттің жазбаша келісімімен клиника фотосына ауыстырыңыз.',
        en: 'Case layout example. Replace with clinic photos backed by written patient consent.',
      },
      consent: { obtained: false, date: null, scope: [], documentRef: '' },
    },
    {
      id: 'case-orthodontics', demo: true, category: 'orthodontics', service: 'orthodontics',
      before: 'assets/images/photos/hero-smile.webp', after: 'assets/images/photos/hero-smile.webp',
      simulateBefore: 'dull',
      title: { ru: 'Ортодонтия', kk: 'Ортодонтия', en: 'Orthodontics' },
      text: {
        ru: 'Демонстрационный слот для ортодонтического кейса — реальные снимки добавляются в config.js.',
        kk: 'Ортодонтиялық кейске арналған демо-орын — нақты суреттер config.js файлына қосылады.',
        en: 'Demo slot for an orthodontic case — real photographs are added in config.js.',
      },
      consent: { obtained: false, date: null, scope: [], documentRef: '' },
    },
    {
      id: 'case-veneers', demo: true, category: 'veneers', service: 'veneers',
      before: 'assets/images/photos/smile-portrait.webp', after: 'assets/images/photos/smile-portrait.webp',
      simulateBefore: 'stain',
      title: { ru: 'Виниры', kk: 'Винирлер', en: 'Veneers' },
      text: {
        ru: 'Иллюстрация формата. Результаты лечения индивидуальны и не гарантируются.',
        kk: 'Формат иллюстрациясы. Ем нәтижелері жеке және кепілдік берілмейді.',
        en: 'Format illustration. Treatment results vary and are never guaranteed.',
      },
      consent: { obtained: false, date: null, scope: [], documentRef: '' },
    },
  ],
  caseCategories: [
    { id: 'whitening', label: { ru: 'Отбеливание', kk: 'Ағарту', en: 'Whitening' } },
    { id: 'restoration', label: { ru: 'Реставрация', kk: 'Реставрация', en: 'Restoration' } },
    { id: 'orthodontics', label: { ru: 'Ортодонтия', kk: 'Ортодонтия', en: 'Orthodontics' } },
    { id: 'veneers', label: { ru: 'Виниры', kk: 'Винирлер', en: 'Veneers' } },
  ],

  /* ---------------------------------------------------------------------- */
  // Verified reviews only. Each: { name, date: 'YYYY-MM-DD', text: {ru,kk,en} | 'text',
  // source: '2GIS' | 'Google' | 'Clinic', sourceUrl, consent: true }
  reviews: [],
};

export default SITE;
