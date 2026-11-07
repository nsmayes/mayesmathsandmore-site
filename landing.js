/* Mayes Maths & More: the landing page's motion. Pip walks a winding path as you scroll and lights it up, stops arrive
   as Pip reaches them, and the sky moves gently behind. Everything here is optional: the words and links are in the HTML,
   and with reduced motion set on the device the page simply shows its finished state. landing-head.js decides that first. */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement, MOVE = root.classList.contains('motion'), NS = 'http://www.w3.org/2000/svg';
  var trail = doc.getElementById('trail'), svg = doc.getElementById('path'), walker = doc.getElementById('walker'), bar = doc.getElementById('bar'), hero = doc.querySelector('.hero');
  window.__landing = true;
  function make(cls) { var p = doc.createElementNS(NS, 'path'); p.setAttribute('class', cls); return p; }
  function make2(name, attrs) { var e = doc.createElementNS(NS, name); Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); }); return e; }

  // ---------- the path, and Pip on it ----------
  var under = make('under'), track = make('track'), lit = make('dots'), defs = make2('defs', {}), clip = make2('clipPath', { id: 'litClip' }), litRect = make2('rect', { x: -200, y: 0, width: 4000, height: 0 });
  clip.appendChild(litRect); defs.appendChild(clip); svg.appendChild(defs); svg.appendChild(under); svg.appendChild(track); svg.appendChild(lit);
  lit.setAttribute('clip-path', 'url(#litClip)');
  var nodes = [].slice.call(trail.querySelectorAll('.node')), nodeY = [], length = 0, walked = 0, goal = 0, running = false, ticking = false;

  function draw() {
    var box = trail.getBoundingClientRect(), pts = nodes.map(function (n) { var r = n.getBoundingClientRect(); return [r.left + r.width / 2 - box.left, r.top + r.height / 2 - box.top]; });
    if (!pts.length) return;
    nodeY = pts.map(function (p) { return p[1]; });
    // from the foot of the hero, down through each stop in turn, swinging a little from side to side between them
    var swing = window.innerWidth > 900 ? 44 : 7, d = 'M' + pts[0][0] + ' 0L' + pts[0][0] + ' ' + pts[0][1];
    pts.slice(1).forEach(function (p, i) {
      var q = pts[i], gap = p[1] - q[1], s = i % 2 ? swing : -swing;
      d += 'C' + (q[0] + s) + ' ' + (q[1] + gap * 0.4) + ' ' + (p[0] - s) + ' ' + (p[1] - gap * 0.4) + ' ' + p[0] + ' ' + p[1];
    });
    [under, track, lit].forEach(function (p) { p.setAttribute('d', d); });
    svg.setAttribute('viewBox', '0 0 ' + box.width + ' ' + box.height);
    length = lit.getTotalLength();
    if (!MOVE) {
      litRect.setAttribute('height', box.height); nodes.forEach(function (n) { n.classList.add('reached'); });
      // with less motion asked for, Pip simply stands still on the path, a little above the first stop
      var stand = lit.getPointAtLength(Math.max(0, Math.min(length, nodeY[0] - (window.innerWidth > 900 ? 120 : 90))));
      walker.hidden = false; place(stand.x, stand.y, 0, 1, 1);
      return;
    }
    wake();
  }
  // where Pip should be: level with a point just past the middle of the screen. Until the path itself reaches that
  // point, Pip flies just above where it starts, so Pip is always in view; on the path Pip stops just before the end.
  function wantY() { return window.innerHeight * 0.55 - trail.getBoundingClientRect().top; }
  function target() {
    var want = wantY(), lo = 0, hi = Math.max(0, length - (window.innerWidth > 900 ? 96 : 84));
    for (var i = 0; i < 16; i++) { var mid = (lo + hi) / 2; if (lit.getPointAtLength(mid).y < want) lo = mid; else hi = mid; }
    return lo;
  }
  // Pip waits inside the logo at the top, and flies out of it the first time the page is scrolled
  var flown = false, at = null, flight = 0, snap = false;
  function logoSpot() {
    var mark = doc.querySelector('.hero .logo img'), box = trail.getBoundingClientRect();
    if (!mark) return null;
    var r = mark.getBoundingClientRect();
    return { x: r.left + r.width / 2 - box.left, y: r.top + r.height / 2 - box.top };
  }
  function place(x, y, lean, scale, show) {
    walker.style.transform = 'translate(' + (x - walker.offsetWidth / 2) + 'px,' + (y - walker.offsetHeight / 2) + 'px) rotate(' + lean.toFixed(2) + 'deg) scale(' + scale.toFixed(3) + ')';
    walker.style.opacity = show.toFixed(3);
  }
  function step() {
    if (!length) { running = false; return; }
    var home = logoSpot();
    if (!flown) {
      // perched out of sight in the logo until the page is scrolled down
      if (home) place(home.x, home.y, 0, 0.4, 0);
      running = false; return;
    }
    if (window.scrollY <= 4 && home) {
      // back at the top: Pip flies home into the logo
      if (!at) at = home;
      var hx = home.x - at.x, hy = home.y - at.y, left = Math.sqrt(hx * hx + hy * hy);
      if (left < 2) { flown = false; at = null; flight = 0; walked = 0; place(home.x, home.y, 0, 0.4, 0); running = false; return; }
      at = { x: at.x + hx * 0.14, y: at.y + hy * 0.14 };
      var near = Math.min(1, left / 160);
      place(at.x, at.y, Math.max(-24, Math.min(24, hx * 0.12)), 0.4 + 0.6 * near, near);
      requestAnimationFrame(step); return;
    }
    goal = target();
    if (snap) { walked = goal; snap = false; } // arrived part-way down: start Pip where it belongs, not at the top
    var gap = goal - walked, stride = Math.abs(gap) > 0.4 ? gap * 0.1 : gap;
    walked += stride;
    var pt = lit.getPointAtLength(walked), want = wantY(), dest = { x: pt.x, y: pt.y };
    if (walked < 0.5 && want < pt.y) dest.y = want; // the path has not reached the screen yet: hover above its start
    // at the end of the trail Pip flies into the big logo and becomes part of it; scrolling back up brings Pip out again
    var merge = 0, end = trail.querySelector('.node-end img');
    if (end) {
      var tb = trail.getBoundingClientRect(), er = end.getBoundingClientRect(), ex = er.left + er.width * 0.6675 - tb.left, ey = er.top + er.height * 0.34 - tb.top; // the little Pip on the logo's shoulder
      // the page may end before the middle of the screen reaches the logo, so the very bottom of the page always counts
      var bottomWant = window.innerHeight * 0.55 - (tb.top + window.scrollY - Math.max(0, root.scrollHeight - window.innerHeight)), fire = Math.min(ey - 40, bottomWant - 2);
      merge = Math.max(0, Math.min(1, (want - (fire - 150)) / 150));
      if (merge > 0) { var e = merge * merge * (3 - 2 * merge); dest = { x: dest.x + (ex - dest.x) * e, y: dest.y + (ey - dest.y) * e }; }
      var inside = merge >= 1;
      if (inside !== !!end.parentNode.classList.contains('merged')) end.parentNode.classList.toggle('merged', inside);
    }
    // swoop towards the spot (quickly during the flight from the logo, then simply following it)
    if (!at) at = flight < 1 && home ? home : dest; // the flight starts from the logo
    var dx = dest.x - at.x, dy = dest.y - at.y, far = Math.sqrt(dx * dx + dy * dy);
    flight = Math.min(1, flight + 0.022);
    var pull = far < 1.5 ? 1 : 0.06 + 0.12 * flight;
    at = { x: at.x + dx * pull, y: at.y + dy * pull };
    var pace = Math.min(1, Math.abs(stride) / 6), lean = far > 4 ? Math.max(-24, Math.min(24, dx * 0.12)) : Math.sin(walked / 26) * 9 * pace;
    // shrink to exactly the size of the logo's own Pip, then fade into it at the last moment
    var small = end ? Math.min(1, 0.4 * end.getBoundingClientRect().width / walker.offsetWidth) : 0.35, shrink = 1 - (1 - small) * merge, fade = merge < 0.85 ? 1 : Math.max(0, (1 - merge) / 0.15);
    place(at.x, at.y, lean * (1 - merge), (0.4 + 0.6 * Math.min(1, flight * 1.6)) * shrink, Math.min(1, flight * 3) * fade);
    litRect.setAttribute('height', Math.max(0, pt.y));
    // Pip stops just short of the last stop, so that one counts from a little further away
    nodes.forEach(function (n, i) { if (pt.y >= nodeY[i] - (i === nodes.length - 1 ? 130 : 40)) n.classList.add('reached'); else n.classList.remove('reached'); });
    if (Math.abs(goal - walked) > 0.2 || far >= 1.5 || flight < 1) requestAnimationFrame(step); else running = false;
  }
  function wake() { if (!running) { running = true; requestAnimationFrame(step); } }

  // ---------- depth: the sky and hills move a little slower than the page (decoration only, never words) ----------
  var layers = MOVE ? [].slice.call(doc.querySelectorAll('[data-depth]')).map(function (el) { return { el: el, depth: parseFloat(el.getAttribute('data-depth')) }; }) : [];
  function depth() {
    ticking = false;
    var h = window.innerHeight;
    layers.forEach(function (l) {
      var r = (l.box || l.el.parentNode).getBoundingClientRect(); if (r.bottom < -200 || r.top > h + 200) return;
      l.el.style.setProperty('--shift', ((r.top + r.height / 2 - h / 2) * -l.depth).toFixed(1) + 'px');
    });
  }
  function onScroll() {
    // a jump straight down the page (a restored reload, or a link to a section) puts Pip on the path without the flight
    if (MOVE) {
      if (!flown && window.scrollY > window.innerHeight) { flight = 1; at = null; snap = true; }
      if (window.scrollY > 4) flown = true; // only a real scroll down sends Pip out
      wake();
    }
    if (!ticking && layers.length) { ticking = true; requestAnimationFrame(depth); } }

  // ---------- each thing arrives once, as it comes into view ----------
  var items = [].slice.call(doc.querySelectorAll('.words, .shots > *, .finish > *, .foot, .promises li'));
  if (MOVE && 'IntersectionObserver' in window) {
    var seen = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); seen.unobserve(e.target); } }); }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    items.forEach(function (el) { el.classList.add('arrive'); seen.observe(el); });
    [].forEach.call(doc.querySelectorAll('.promises li'), function (li, i) { li.style.setProperty('--i', i); });
    [].forEach.call(doc.querySelectorAll('.shots > :nth-child(2)'), function (el) { el.style.setProperty('--i', 2); });
  }

  // ---------- the headline rises word by word ----------
  var h1 = doc.querySelector('.hero h1');
  if (MOVE && h1) {
    var said = h1.textContent; h1.setAttribute('aria-label', said); h1.textContent = '';
    said.split(' ').forEach(function (w, i, all) {
      var outer = doc.createElement('span'), inner = doc.createElement('span');
      outer.className = 'w'; outer.setAttribute('aria-hidden', 'true'); inner.textContent = w; inner.style.setProperty('--i', i);
      outer.appendChild(inner); h1.appendChild(outer); if (i < all.length - 1) h1.appendChild(doc.createTextNode(' '));
    });
    h1.classList.add('split');
  }

  // ---------- the phone in the hero leans towards the pointer ----------
  var tilt = doc.querySelector('.hero-phone');
  if (MOVE && tilt && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      tilt.style.setProperty('--rx', (-y * 7).toFixed(2) + 'deg'); tilt.style.setProperty('--ry', (x * 9).toFixed(2) + 'deg');
    });
    hero.addEventListener('pointerleave', function () { tilt.style.setProperty('--rx', '0deg'); tilt.style.setProperty('--ry', '0deg'); });
  }

  // ---------- phones play through real moments from the app while they are on screen ----------
  var cycles = [];
  [].forEach.call(doc.querySelectorAll('.cycle'), function (fig) {
    var c = { pics: [].slice.call(fig.querySelectorAll('img')), at: 0, seen: false };
    cycles.push(c);
    if (MOVE && 'IntersectionObserver' in window) new IntersectionObserver(function (es) { c.seen = es[0].isIntersecting; }, { threshold: 0.4 }).observe(fig);
  });
  if (MOVE) setInterval(function () {
    if (root.classList.contains('paused')) return;
    cycles.forEach(function (c) {
      if (!c.seen) return;
      c.at = (c.at + 1) % c.pics.length;
      c.pics.forEach(function (p, i) { if (i) p.classList.toggle('on', i <= c.at); });
    });
  }, 2800);

  // ---------- fireflies at night, like the app's own map ----------
  var sky = doc.querySelector('.fireflies');
  if (MOVE && sky) {
    var count = window.innerWidth > 900 ? 18 : 9, seed = 7, rnd = function () { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (var f = 0; f < count; f++) {
      var fly = doc.createElement('span'), st = fly.style;
      st.setProperty('--x', (rnd() * 100).toFixed(1) + '%'); st.setProperty('--y', (rnd() * 100).toFixed(1) + '%'); st.setProperty('--size', (4 + rnd() * 5).toFixed(1) + 'px');
      st.setProperty('--dx', ((rnd() - 0.5) * 90).toFixed(0) + 'px'); st.setProperty('--dy', ((rnd() - 0.5) * 90).toFixed(0) + 'px');
      st.setProperty('--t', (11 + rnd() * 12).toFixed(1) + 's'); st.setProperty('--d', (-rnd() * 20).toFixed(1) + 's');
      sky.appendChild(fly);
    }
  }

  // ---------- the bar with the button slides in once the hero has gone ----------
  if (bar && hero && 'IntersectionObserver' in window) new IntersectionObserver(function (es) { bar.classList.toggle('show', !es[0].isIntersecting); }, { rootMargin: '-40px 0px 0px 0px' }).observe(hero);

  // ---------- a way to stop the movement, remembered for next time ----------
  // one at the top of the page, where it is easy to find, and one in the footer; the words say what pressing it will do
  var pauses = [].slice.call(doc.querySelectorAll('.pause-motion'));
  function setPaused(on) { root.classList.toggle('paused', on); pauses.forEach(function (b) { b.textContent = on ? 'Play animations' : 'Pause animations'; }); }
  if (MOVE && pauses.length) {
    var was = false; try { was = localStorage.getItem('mm-paused') === '1'; } catch (e) { /* private window */ }
    setPaused(was);
    pauses.forEach(function (b) {
      b.hidden = false;
      b.addEventListener('click', function () { var on = !root.classList.contains('paused'); setPaused(on); try { localStorage.setItem('mm-paused', on ? '1' : '0'); } catch (e) { /* private window */ } });
    });
  }

  // while Pip is out of the logo, Pip blinks now and then (sometimes twice)
  function blink() {
    var next = 2600 + Math.random() * 4200;
    if (flown && !root.classList.contains('paused') && !doc.hidden && +walker.style.opacity > 0.5) {
      walker.classList.add('blink');
      setTimeout(function () { walker.classList.remove('blink'); }, 140);
      if (Math.random() < 0.25) setTimeout(function () { walker.classList.add('blink'); setTimeout(function () { walker.classList.remove('blink'); }, 120); }, 320);
    }
    setTimeout(blink, next);
  }
  if (MOVE) setTimeout(blink, 2000);
  if (MOVE) { walker.style.opacity = '0'; walker.hidden = false; } // unseen until Pip is placed in the logo
  // opened part-way down the page (a reload, or a link to a section): Pip is already out on the path
  if (window.scrollY > 40) { flown = true; flight = 1; snap = true; }
  draw(); depth();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () { draw(); depth(); });
  window.addEventListener('load', draw);
  // the pictures load as they come into view, and can move the stops when they do
  [].forEach.call(trail.querySelectorAll('img'), function (im) { if (!im.complete) im.addEventListener('load', draw); });
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(draw);
})();
