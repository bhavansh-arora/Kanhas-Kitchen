/* Lasting Change Wellness — core interactions.
   Works on its own; motion.js layers GSAP choreography on top when available. */
(function () {
  'use strict';
  var html = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var LCW = window.LCW = { reduce: reduce, $: $, $$: $$ };

  /* ---------- Split headings into masked words ---------- */
  function splitWords(el) {
    if (el.dataset.split) return;
    el.dataset.split = '1';
    var i = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (c) {
        if (c.nodeType === 3) {
          var frag = document.createDocumentFragment();
          c.textContent.split(/(\s+)/).forEach(function (w) {
            if (!w) return;
            if (/^\s+$/.test(w)) { frag.appendChild(document.createTextNode(' ')); return; }
            var outer = document.createElement('span'); outer.className = 'word';
            var inner = document.createElement('span'); inner.textContent = w; inner.style.setProperty('--i', i++);
            outer.appendChild(inner); frag.appendChild(outer);
          });
          c.parentNode.replaceChild(frag, c);
        } else if (c.nodeType === 1 && c.tagName !== 'BR') walk(c);
      });
    })(el);
  }
  LCW.splitWords = splitWords;
  $$('.lines').forEach(splitWords);

  /* ---------- Reveal on scroll ---------- */
  var revealables = $$('.reveal, .reveal-img, .lines');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    revealables.forEach(function (el) { io.observe(el); });
  } else {
    revealables.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------- Header: glass bar after scroll, tucks away on fast scroll down ---------- */
  var header = $('[data-header]');
  var lastY = window.scrollY;
  function onScroll() {
    var y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 40);
    var d = y - lastY; // big jumps (anchor links, restored scroll) are not the user scrolling down
    if (d > 6 && d < 160 && y > 700 && !html.classList.contains('menu-open')) header.classList.add('is-hidden');
    else if (y < lastY - 6 || y < 300) header.classList.remove('is-hidden');
    lastY = y;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var bar = $('.scroll-progress');
    if (bar) bar.style.setProperty('--sp', max > 0 ? (y / max).toFixed(4) : 0);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Rolling text on nav links */
  $$('[data-roll]').forEach(function (a) {
    var t = a.textContent.trim();
    a.innerHTML = '<span class="roll"><span>' + t + '</span><span aria-hidden="true">' + t + '</span></span>' + (a.getAttribute('href') === 'experience.html' ? '<span class="spark" aria-hidden="true"></span>' : '');
    if (a.getAttribute('href') === 'experience.html') a.style.display = 'flex', a.style.alignItems = 'center';
  });

  /* ---------- Menu ---------- */
  var menuBtn = $('[data-menu-btn]');
  var menuLabel = $('[data-menu-label]');
  function setMenu(open) {
    html.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuLabel.textContent = open ? 'Close' : 'Menu';
    if (open) header.classList.remove('is-hidden');
  }
  menuBtn.addEventListener('click', function () { setMenu(!html.classList.contains('menu-open')); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && html.classList.contains('menu-open')) { setMenu(false); menuBtn.focus(); } });
  window.matchMedia('(min-width: 1181px)').addEventListener('change', function (e) { if (e.matches) setMenu(false); });

  /* ---------- Preloader ---------- */
  function finishLoading() {
    html.classList.remove('is-loading');
    try { sessionStorage.setItem('lcw-seen', '1'); } catch (e) {}
  }
  var started = false;
  var startHooks = [];
  LCW.onStart = function (fn) { if (started) fn(); else startHooks.push(fn); };
  function start() {
    if (started) return;
    started = true;
    startHooks.forEach(function (fn) { fn(); });
  }
  html.classList.add('motion-ready');
  if (html.classList.contains('is-loading')) {
    var count = $('[data-count-loader]');
    var lbar = $('.preloader__bar');
    var heroImg = $('.hero__slide img, .phero__media img');
    var loaded = !heroImg || heroImg.complete;
    if (heroImg && !loaded) { heroImg.addEventListener('load', function () { loaded = true; }); heroImg.addEventListener('error', function () { loaded = true; }); }
    var fontsReady = false;
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(function () { fontsReady = true; });
    var t0 = performance.now(), shown = 0, MIN = 1700, MAX = 3800;
    (function tick(now) {
      var elapsed = now - t0;
      var ready = (loaded && fontsReady) || elapsed > MAX;
      var target = ready ? 100 : Math.min(90, (elapsed / MIN) * 90);
      var cap = Math.min(100, (elapsed / MIN) * 100);
      shown += (Math.min(target, cap) - shown) * 0.12;
      if (ready && cap >= 100 && shown > 99.4) shown = 100;
      var n = Math.round(shown);
      if (count) count.textContent = ('00' + n).slice(-3);
      if (lbar) lbar.style.setProperty('--p', (shown / 100).toFixed(3));
      if (n < 100) { requestAnimationFrame(tick); return; }
      setTimeout(function () {
        html.classList.add('is-loaded');
        finishLoading();
        start();
        setTimeout(function () { html.classList.remove('is-loaded'); }, 1300);
      }, 200);
    })(t0);
  } else if (html.classList.contains('is-entering')) {
    try { sessionStorage.removeItem('lcw-nav'); } catch (e) {}
    // Hold the destination name on screen for a beat, then lift the curtain.
    setTimeout(function () {
      html.classList.add('is-entered');
      html.classList.remove('is-entering');
      start();
      setTimeout(function () { html.classList.remove('is-entered'); }, 1300);
    }, 320);
  } else {
    try { sessionStorage.setItem('lcw-seen', '1'); } catch (e) {}
    start();
  }

  /* ---------- Page transitions ---------- */
  var names = {
    'index.html': 'Expect <em>amazing</em>', 'method.html': 'The <em>Method</em>', 'coaching.html': '1:1 <em>Coaching</em>',
    'collective.html': 'The <em>Collective</em>', 'speaking.html': '<em>Speaking</em>', 'about.html': 'About <em>Lauren</em>',
    'experience.html': 'The <em>Experience</em>', 'resources.html': '<em>Resources</em>', 'contact.html': 'Let’s <em>talk</em>'
  };
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target === '_blank' || a.hasAttribute('download')) return;
    var url = new URL(a.getAttribute('href'), location.href);
    if (url.origin !== location.origin || !/\.html$|\/$/.test(url.pathname)) return;
    var file = url.pathname.split('/').pop() || 'index.html';
    var here = location.pathname.split('/').pop() || 'index.html';
    if (file === here) return; // same-page anchors scroll normally
    if (reduce) return;
    e.preventDefault();
    var nameEl = $('[data-curtain-name]');
    if (nameEl && names[file]) nameEl.innerHTML = names[file];
    try { sessionStorage.setItem('lcw-nav', '1'); } catch (err) {}
    if (html.classList.contains('menu-open')) setMenu(false);
    html.classList.add('is-leaving');
    setTimeout(function () { location.href = url.href; }, 760);
  });
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) html.classList.remove('is-leaving', 'is-entering', 'is-entered');
  });

  /* ---------- Home hero slideshow ---------- */
  LCW.onStart(function () {
    var wrap = $('[data-hero-slides]');
    if (!wrap) return;
    var slides = $$('.hero__slide', wrap);
    var idx = 0, current = $('[data-hero-current]'), index = $('.hero__index');
    slides.forEach(function (s, i) { if (i > 0) { var im = $('img', s); if (im) im.loading = 'eager'; } });
    function runBar() { if (!index) return; index.classList.remove('is-running'); void index.offsetWidth; index.classList.add('is-running'); }
    runBar();
    if (reduce) return;
    setInterval(function () {
      if (document.hidden || window.scrollY > window.innerHeight) return;
      var prev = slides[idx];
      idx = (idx + 1) % slides.length;
      slides.forEach(function (s) { s.classList.remove('is-prev', 'is-first'); });
      prev.classList.remove('is-active'); prev.classList.add('is-prev');
      slides[idx].classList.add('is-active');
      if (current) current.textContent = ('0' + (idx + 1)).slice(-2);
      runBar();
    }, 6000);
  });

  /* ---------- Flip the switch ---------- */
  $$('[data-flip]').forEach(function (root) {
    var pairs = JSON.parse(root.getAttribute('data-flip'));
    var btn = $('[data-flip-switch]', root), next = $('[data-flip-next]', root);
    var neg = $('.flip__neg', root), pos = $('.flip__pos', root), thought = $('.flip__thought', root);
    var dots = $$('.flip__dots i', root), status = $('[data-flip-status]', root);
    var i = 0;
    function render() {
      neg.textContent = pairs[i][0]; pos.textContent = pairs[i][1];
      dots.forEach(function (d, j) { d.classList.toggle('on', j === i); });
    }
    function set(on) {
      root.classList.toggle('is-on', on);
      btn.setAttribute('aria-checked', String(on));
      if (status) status.textContent = on ? 'Reframed thought: ' + pairs[i][1] : 'Thought: ' + pairs[i][0];
    }
    btn.addEventListener('click', function () { set(!root.classList.contains('is-on')); });
    next.addEventListener('click', function () {
      thought.classList.add('is-swapping');
      setTimeout(function () {
        i = (i + 1) % pairs.length; set(false); render();
        requestAnimationFrame(function () { thought.classList.remove('is-swapping'); });
      }, reduce ? 0 : 450);
    });
    render();
  });

  /* ---------- RISE readiness check ---------- */
  $$('[data-rise]').forEach(function (form) {
    var boxes = $$('input[type="checkbox"]', form);
    var bar = $('.rise__meter span', form), out = $('.rise__result', form);
    var msgs = ['Tick the ones that feel true today.', 'A first spark. A free call can show you what’s possible.', 'You’re warming up. Let’s talk about what’s holding you back.', 'Almost there. You’re closer to ready than you think.', 'You’re ready to shine. Let’s find a time to talk.'];
    function update() {
      var n = boxes.filter(function (b) { return b.checked; }).length;
      bar.style.transform = 'scaleX(' + n / boxes.length + ')';
      out.textContent = msgs[n];
    }
    boxes.forEach(function (b) { b.addEventListener('change', update); });
    form.addEventListener('submit', function (e) { e.preventDefault(); });
  });

  /* ---------- Method: sticky letter follows the step in view ---------- */
  var steps = $$('[data-step]');
  if (steps.length && 'IntersectionObserver' in window) {
    var letters = $$('[data-step-letter]'), bars = $$('[data-step-bars] li');
    var activate = function (i) {
      letters.forEach(function (l, j) { l.classList.toggle('is-active', j === i); });
      bars.forEach(function (b, j) { b.classList.toggle('done', j <= i); });
    };
    var sio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) activate(steps.indexOf(e.target)); });
    }, { rootMargin: '-45% 0px -45% 0px' });
    steps.forEach(function (s) { sio.observe(s); });
    activate(0);
  }

  /* ---------- Timeline line draws as you scroll ---------- */
  $$('[data-timeline]').forEach(function (tl) {
    var line = $('.timeline__line', tl), items = $$('li', tl);
    function upd() {
      var r = tl.getBoundingClientRect(), vh = window.innerHeight;
      var p = Math.min(1, Math.max(0, (vh * 0.6 - r.top) / r.height));
      line.style.setProperty('--tl', p.toFixed(3));
      items.forEach(function (li) { li.classList.toggle('is-on', li.getBoundingClientRect().top < vh * 0.6); });
    }
    window.addEventListener('scroll', upd, { passive: true }); window.addEventListener('resize', upd); upd();
  });

  /* ---------- Count-up numbers ---------- */
  var counters = $$('[data-count]');
  if ('IntersectionObserver' in window && counters.length && !reduce) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        cio.unobserve(en.target);
        var el = en.target, end = parseFloat(el.dataset.count), t0 = performance.now(), dur = 1800;
        (function step(now) {
          var p = Math.min(1, (now - t0) / dur), eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
          el.textContent = Math.round(end * eased);
          if (p < 1) requestAnimationFrame(step);
        })(t0);
      });
    }, { threshold: 0.6 });
    counters.forEach(function (c) { c.textContent = '0'; cio.observe(c); });
  }

  /* ---------- Contact: booking tabs swap the embedded scheduler ---------- */
  var tabs = $$('[data-book-tab]');
  if (tabs.length) {
    var frame = $('[data-book-frame]'), direct = $('[data-book-direct]');
    var select = function (tab, focus) {
      tabs.forEach(function (t) { var on = t === tab; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; });
      if (frame.getAttribute('src') !== tab.dataset.embed) frame.setAttribute('src', tab.dataset.embed);
      frame.title = 'Book: ' + tab.dataset.name;
      direct.href = tab.dataset.href;
      if (focus) tab.focus();
    };
    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { select(tab); });
      tab.addEventListener('keydown', function (e) {
        var d = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
        if (d) { e.preventDefault(); select(tabs[(i + d + tabs.length) % tabs.length], true); }
      });
    });
    var type = new URLSearchParams(location.search).get('type');
    var byType = tabs.filter(function (t) { return t.dataset.type === type; })[0];
    if (byType) select(byType);
  }

  /* ---------- Contact form: endpoint if configured, otherwise opens an email ---------- */
  $$('[data-contact-form]').forEach(function (form) {
    var status = $('.form__status', form);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      status.className = 'form__status';
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var data = {}; new FormData(form).forEach(function (v, k) { data[k] = v; });
      if (data.company) return;
      var endpoint = form.dataset.endpoint;
      if (endpoint) {
        var btn = $('button[type="submit"]', form); btn.disabled = true; status.textContent = 'Sending…';
        fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) })
          .then(function (r) { if (!r.ok) throw new Error(); form.reset(); status.textContent = 'Thank you. Lauren will be in touch within two business days.'; status.classList.add('ok'); })
          .catch(function () { status.textContent = 'Something went wrong. Please email ' + form.dataset.to + ' instead.'; status.classList.add('err'); })
          .then(function () { btn.disabled = false; });
        return;
      }
      location.href = 'mailto:' + form.dataset.to + '?subject=' + encodeURIComponent('Website enquiry: ' + data.topic) + '&body=' + encodeURIComponent(data.message + '\n\n' + data.name + '\n' + data.email);
      status.textContent = 'Your email app should open with your message ready to send.';
      status.classList.add('ok');
    });
  });

  /* ---------- Experience: guided breath ---------- */
  $$('[data-breathe]').forEach(function (root) {
    var btn = $('[data-breathe-start]', root), word = $('.orb__text', root), count = $('.breathe__count', root);
    var running = false, timers = [];
    function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
    btn.addEventListener('click', function () {
      if (running) { timers.forEach(clearTimeout); timers = []; running = false; root.classList.remove('is-in'); word.textContent = 'Ready?'; count.textContent = ''; btn.querySelector('[data-label]').textContent = 'Begin'; return; }
      running = true; btn.querySelector('[data-label]').textContent = 'Stop';
      var rounds = 3, t = 0;
      for (var r = 0; r < rounds; r++) {
        (function (r) {
          later(function () { root.classList.add('is-in'); word.textContent = 'Breathe in'; count.textContent = 'Breath ' + (r + 1) + ' of ' + rounds; }, t);
          later(function () { word.textContent = 'Hold'; }, t + 4000);
          later(function () { root.classList.remove('is-in'); word.textContent = 'Breathe out'; }, t + 5500);
        })(r);
        t += 10000;
      }
      later(function () { running = false; word.textContent = 'Beautiful.'; count.textContent = 'That calm is always available to you'; btn.querySelector('[data-label]').textContent = 'Again'; }, t);
    });
  });

  /* ---------- Experience: S.H.I.N.E. check-in + downloadable intention card ---------- */
  $$('[data-checkin]').forEach(function (root) {
    var data = JSON.parse(root.getAttribute('data-checkin'));
    var card = $('.intention', root), buttons = $$('[data-pick]', root), save = $('[data-save]', root);
    var L = $('.intention__letter', card), W = $('.intention__word', card), T = $('.intention__text', card), P = $('.intention__practice', card);
    var chosen = null;
    buttons.forEach(function (b) {
      b.addEventListener('click', function () {
        buttons.forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        chosen = data[b.dataset.pick];
        card.classList.add('is-swapping');
        setTimeout(function () {
          L.textContent = chosen.l; W.textContent = chosen.w; T.textContent = chosen.t; P.textContent = chosen.p;
          card.classList.remove('is-empty', 'is-swapping');
          save.disabled = false;
        }, reduce ? 0 : 450);
      });
    });
    save.addEventListener('click', function () {
      if (!chosen) return;
      var c = document.createElement('canvas'), w = 1080, h = 1350;
      c.width = w; c.height = h;
      var x = c.getContext('2d');
      var g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#F7F3EC'); g.addColorStop(1, '#DDF2EA'); x.fillStyle = g; x.fillRect(0, 0, w, h);
      var rg = x.createRadialGradient(w * 0.85, h * 0.1, 0, w * 0.85, h * 0.1, w * 0.8); rg.addColorStop(0, 'rgba(240,196,127,0.55)'); rg.addColorStop(1, 'rgba(240,196,127,0)'); x.fillStyle = rg; x.fillRect(0, 0, w, h);
      x.fillStyle = '#7C8885'; x.font = '400 24px "Geist Mono", monospace'; x.fillText('MY INTENTION FOR TODAY', 80, 110);
      x.fillStyle = '#14665A'; x.font = '500 520px "Inter Tight", sans-serif'; x.fillText(chosen.l, 60, 640);
      x.font = 'italic 400 64px "Instrument Serif", serif'; x.fillText(chosen.w, 84, 760);
      x.fillStyle = '#0F1F1D'; x.font = '500 68px "Inter Tight", sans-serif';
      wrap(x, chosen.t, 84, 880, w - 168, 74);
      x.fillStyle = '#7C8885'; x.font = '400 24px "Geist Mono", monospace'; x.fillText('LASTING CHANGE WELLNESS · S.H.I.N.E.', 84, h - 90);
      var a = document.createElement('a'); a.download = 'my-shine-intention.png'; a.href = c.toDataURL('image/png'); a.click();
    });
    function wrap(ctx, text, x0, y0, maxW, lh) {
      var words = text.split(' '), line = '', y = y0;
      words.forEach(function (wd) {
        var test = line ? line + ' ' + wd : wd;
        if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, x0, y); line = wd; y += lh; } else line = test;
      });
      ctx.fillText(line, x0, y);
    }
  });

  /* ---------- Experience hero: drifting motes of light ---------- */
  $$('[data-motes]').forEach(function (cv) {
    var ctx = cv.getContext('2d'), dpr = Math.min(2, window.devicePixelRatio || 1), W, H, motes = [], mx = -999, my = -999, visible = true;
    function size() { W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    size(); window.addEventListener('resize', size);
    var N = Math.round(Math.min(90, (W * H) / 16000));
    for (var k = 0; k < N; k++) motes.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 2.2 + 0.6, v: Math.random() * 0.35 + 0.08, p: Math.random() * Math.PI * 2, gold: Math.random() < 0.3 });
    cv.parentElement.addEventListener('mousemove', function (e) { var r = cv.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; });
    cv.parentElement.addEventListener('mouseleave', function () { mx = my = -999; });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }).observe(cv);
    (function frame(t) {
      requestAnimationFrame(frame);
      if (!visible) return;
      ctx.clearRect(0, 0, W, H);
      motes.forEach(function (m) {
        if (!reduce) { m.y -= m.v; m.x += Math.sin(t / 2400 + m.p) * 0.25; }
        if (m.y < -10) { m.y = H + 10; m.x = Math.random() * W; }
        var dx = m.x - mx, dy = m.y - my, d = Math.sqrt(dx * dx + dy * dy);
        if (d < 140 && !reduce) { m.x += dx / d * 1.4; m.y += dy / d * 1.4; }
        var tw = 0.55 + Math.sin(t / 900 + m.p) * 0.45;
        var col = m.gold ? '240,196,127' : '126,220,196';
        var gr = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r * 6);
        gr.addColorStop(0, 'rgba(' + col + ',' + (0.9 * tw) + ')'); gr.addColorStop(1, 'rgba(' + col + ',0)');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(m.x, m.y, m.r * 6, 0, Math.PI * 2); ctx.fill();
      });
    })(0);
  });

  /* ---------- Mobile booking dock ---------- */
  var dock = $('[data-dock]');
  if (dock && 'IntersectionObserver' in window && !document.body.classList.contains('no-dock')) {
    var blockers = new Set(), past = false;
    var render = function () { dock.classList.toggle('is-visible', past && blockers.size === 0); };
    window.addEventListener('scroll', function () { past = window.scrollY > window.innerHeight * 0.8; render(); }, { passive: true });
    var dio = new IntersectionObserver(function (en) { en.forEach(function (e) { if (e.isIntersecting) blockers.add(e.target); else blockers.delete(e.target); }); render(); });
    $$('.cta, .site-footer').forEach(function (el) { dio.observe(el); });
  }

  /* Back to top */
  $$('[data-top]').forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); }); });
})();
