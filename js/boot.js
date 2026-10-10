/* Runs synchronously in <head> before first paint: applies saved theme and
   language, flags JS / reduced motion, and prepares the arrival curtain.
   Fallback timers guarantee content becomes visible even if modules fail. */
(function () {
  var d = document.documentElement;
  d.classList.add('js');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) d.classList.add('no-motion');
  try {
    var theme = localStorage.getItem('lumen.theme');
    if (theme === 'light' || theme === 'dark' || theme === 'auto') d.setAttribute('data-theme', theme);
    var lang = localStorage.getItem('lumen.lang');
    if (lang === 'ru' || lang === 'kk' || lang === 'en') d.lang = lang;
    if (sessionStorage.getItem('lumen.pt')) {
      sessionStorage.removeItem('lumen.pt');
      if (!reduce) d.classList.add('pt-enter');
    }
  } catch (e) { /* storage unavailable */ }
  setTimeout(function () { d.classList.add('i18n', 'ready'); d.classList.remove('pt-enter'); }, 3000);
})();
