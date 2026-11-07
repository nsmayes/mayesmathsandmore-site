/* Runs before the page is drawn, so nothing flashes. Motion is on unless the device asks for less; adding ?motion=on to the
   address shows it anyway, for checking the page on a computer with animations turned off. If landing.js fails to run,
   the page drops back to showing everything as it is. */
(function () {
  var root = document.documentElement, reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduce || /[?&]motion=on\b/.test(location.search)) root.classList.add('motion');
  setTimeout(function () { if (!window.__landing) root.classList.remove('motion'); }, 4000);
})();
