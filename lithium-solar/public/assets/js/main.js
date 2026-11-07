/* Lithium — site motion and interactions. */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var hasGsap = !!(window.gsap && window.ScrollTrigger);
  var CFG = window.LITHIUM_CONFIG || {};
  var lenis = null;
  var introDone = false;
  var heroQueue = [];

  if (hasGsap) {
    gsap.registerPlugin(ScrollTrigger);
    if (window.SplitText) gsap.registerPlugin(SplitText);
  }

  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };

  /* ---------- Smooth scroll ---------- */
  function initLenis() {
    if (reduce || !window.Lenis || !hasGsap) return;
    lenis = new Lenis({ duration: 1.15, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  function scrollTo(target) {
    if (lenis) lenis.scrollTo(target, { offset: typeof target === 'number' ? 0 : -90, duration: 1.4 });
    else if (typeof target === 'number') window.scrollTo({ top: target, behavior: reduce ? 'auto' : 'smooth' });
    else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  }

  /* ---------- Intro: first-visit preloader, curtain on later pages ---------- */
  function intro() {
    var pre = $('.preloader');
    var curtain = $('.curtain');
    var returning = root.classList.contains('is-returning');
    try { sessionStorage.setItem('li-visited', '1'); } catch (e) {}

    if (!hasGsap) {
      if (pre) pre.remove();
      if (curtain) curtain.style.transform = 'translateY(100%)';
      ready();
      return;
    }

    if (returning || reduce || !pre) {
      if (pre) pre.remove();
      gsap.set(curtain, { yPercent: 0, y: 0 });
      gsap.to(curtain, { yPercent: -100, duration: reduce ? 0 : 0.95, ease: 'expo.inOut', delay: 0.05, onComplete: function () { gsap.set(curtain, { yPercent: 100, visibility: 'hidden' }); } });
      setTimeout(ready, reduce ? 0 : 380);
      return;
    }

    gsap.set(curtain, { yPercent: 100, visibility: 'hidden' });
    if (lenis) lenis.stop();
    var count = $('[data-preload-count]', pre);
    var o = { v: 0 };
    var tl = gsap.timeline({ onComplete: function () { pre.remove(); if (lenis) lenis.start(); } });
    tl.to(o, { v: 100, duration: 2.0, ease: 'power2.inOut', onUpdate: function () { count.textContent = String(Math.round(o.v)).padStart(3, '0'); } })
      .to($('.preloader__bar i', pre), { scaleX: 1, duration: 2.0, ease: 'power2.inOut' }, 0)
      .to($('.preloader__sun', pre), { scale: 3.4, duration: 1.15, ease: 'expo.in' }, 1.45)
      .to($$('.preloader__count, .preloader__top, .preloader__bottom', pre), { opacity: 0, duration: 0.35 }, 2.05)
      .to(pre, { clipPath: 'inset(0% 0% 100% 0%)', duration: 1.15, ease: 'expo.inOut' }, 2.45)
      .add(ready, 2.7);
  }

  function ready() {
    if (introDone) return;
    introDone = true;
    heroQueue.forEach(function (fn) { fn(); });
    heroQueue = [];
    root.classList.add('is-ready');
  }

  function onReady(fn) { if (introDone) fn(); else heroQueue.push(fn); }

  /* ---------- Page transitions ---------- */
  function initTransitions() {
    var curtain = $('.curtain');
    if (!hasGsap || reduce || !curtain) return;
    doc.addEventListener('click', function (e) {
      var a = e.target.closest('a');
      if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      var href = a.getAttribute('href');
      if (!href || a.target === '_blank' || a.hasAttribute('download') || /^(mailto:|tel:|sms:|#|javascript:)/.test(href)) return;
      var url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.hash) return;
      e.preventDefault();
      closeMenu();
      gsap.fromTo(curtain, { yPercent: 100, visibility: 'visible' }, { yPercent: 0, duration: 0.75, ease: 'expo.inOut', onComplete: function () { location.href = url.href; } });
    });
    window.addEventListener('pageshow', function (e) { if (e.persisted) gsap.set(curtain, { yPercent: 100, visibility: 'hidden' }); });
  }

  /* ---------- Header ---------- */
  function initHeader() {
    var header = $('[data-header]');
    var dock = $('[data-dock]');
    if (!header) return;
    var last = 0;
    function onScroll() {
      var y = window.scrollY || window.pageYOffset;
      header.classList.toggle('is-solid', y > 40);
      var hide = y > last && y > 320 && !root.classList.contains('menu-open');
      header.classList.toggle('is-hidden', hide);
      if (dock) dock.classList.toggle('is-visible', y > window.innerHeight * 0.55);
      last = y;
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    $$('[data-to-top]').forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); scrollTo(0); }); });
    $$('a[href^="#"]').forEach(function (a) {
      var id = a.getAttribute('href');
      if (id.length < 2 || a.hasAttribute('data-to-top')) return;
      a.addEventListener('click', function (e) { var t = $(id); if (t) { e.preventDefault(); scrollTo(t); } });
    });
  }

  /* ---------- Mobile menu ---------- */
  var menuTl = null;
  function initMenu() {
    var btn = $('[data-menu-toggle]');
    var menu = $('[data-menu]');
    if (!btn || !menu) return;
    btn.addEventListener('click', function () { root.classList.contains('menu-open') ? closeMenu() : openMenu(); });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
  }
  function openMenu() {
    var menu = $('[data-menu]'), btn = $('[data-menu-toggle]');
    root.classList.add('menu-open');
    btn.setAttribute('aria-expanded', 'true');
    menu.setAttribute('aria-hidden', 'false');
    if (lenis) lenis.stop();
    if (!hasGsap) { menu.style.visibility = 'visible'; menu.style.clipPath = 'none'; return; }
    if (menuTl) menuTl.kill();
    menuTl = gsap.timeline()
      .set(menu, { visibility: 'visible' })
      .fromTo(menu, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.9, ease: 'expo.inOut' })
      .fromTo($$('.menu__nav a', menu), { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.9, stagger: 0.05, ease: 'expo.out' }, 0.35)
      .fromTo($('.menu__foot', menu), { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out' }, 0.6);
  }
  function closeMenu() {
    var menu = $('[data-menu]'), btn = $('[data-menu-toggle]');
    if (!menu || !root.classList.contains('menu-open')) return;
    root.classList.remove('menu-open');
    btn.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-hidden', 'true');
    if (lenis) lenis.start();
    if (!hasGsap) { menu.style.visibility = 'hidden'; return; }
    if (menuTl) menuTl.kill();
    menuTl = gsap.timeline()
      .to(menu, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.7, ease: 'expo.inOut' })
      .set(menu, { visibility: 'hidden' });
  }

  /* ---------- Cursor ---------- */
  function initCursor() {
    if (!fine || reduce || !hasGsap) return;
    var c = $('.cursor');
    if (!c) return;
    root.classList.add('has-cursor');
    var dot = $('.cursor__dot', c), ring = $('.cursor__ring', c), label = $('.cursor__label', c);
    var dx = gsap.quickTo(dot, 'x', { duration: 0.12, ease: 'power3' }), dy = gsap.quickTo(dot, 'y', { duration: 0.12, ease: 'power3' });
    var rx = gsap.quickTo(ring, 'x', { duration: 0.5, ease: 'power3' }), ry = gsap.quickTo(ring, 'y', { duration: 0.5, ease: 'power3' });
    var shown = false;
    window.addEventListener('pointermove', function (e) {
      if (!shown) { shown = true; gsap.set([dot, ring], { x: e.clientX, y: e.clientY }); gsap.to(c, { opacity: 1, duration: 0.4 }); }
      dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY);
    }, { passive: true });
    doc.addEventListener('pointerover', function (e) {
      var t = e.target.closest('[data-cursor]');
      var link = e.target.closest('a, button, label, input[type="range"], select');
      c.classList.toggle('is-label', !!t);
      c.classList.toggle('is-hover', !t && !!link);
      label.textContent = t ? t.getAttribute('data-cursor') : '';
    });
    doc.addEventListener('pointerleave', function () { gsap.to(c, { opacity: 0, duration: 0.3 }); });
    doc.addEventListener('pointerenter', function () { gsap.to(c, { opacity: 1, duration: 0.3 }); });
  }

  /* ---------- Magnetic ---------- */
  function initMagnetic() {
    if (!fine || reduce || !hasGsap) return;
    $$('[data-magnetic]').forEach(function (el) {
      var x = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
      var y = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        x((e.clientX - r.left - r.width / 2) * 0.28);
        y((e.clientY - r.top - r.height / 2) * 0.35);
      });
      el.addEventListener('pointerleave', function () { x(0); y(0); });
    });
  }

  /* ---------- Split-line headings ---------- */
  function initSplit() {
    var els = $$('[data-split]');
    if (!hasGsap || !window.SplitText || reduce) { els.forEach(function (el) { el.classList.add('is-split'); }); return; }
    els.forEach(function (el) {
      var isHero = el.getAttribute('data-split') === 'hero';
      var played = false;
      SplitText.create(el, {
        type: 'lines',
        mask: 'lines',
        linesClass: 'split-line',
        autoSplit: true,
        onSplit: function (self) {
          el.classList.add('is-split');
          if (played) return;
          var anim = gsap.from(self.lines, {
            yPercent: 135,
            rotate: 2.5,
            transformOrigin: '0% 100%',
            duration: 1.35,
            ease: 'expo.out',
            stagger: 0.1,
            paused: true,
            onComplete: function () { played = true; }
          });
          if (isHero) onReady(function () { anim.play(); });
          else ScrollTrigger.create({ trigger: el, start: 'top 88%', once: true, onEnter: function () { anim.play(); } });
          return anim;
        }
      });
    });
  }

  /* ---------- Reveals ---------- */
  function initReveal() {
    var els = $$('[data-reveal]');
    if (!('IntersectionObserver' in window) || reduce) { els.forEach(function (el) { el.classList.add('is-in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        var delay = parseFloat(el.getAttribute('data-delay') || 0);
        if (delay) el.style.transitionDelay = delay + 's';
        el.classList.add('is-in');
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (el) {
      // Above-the-fold intro content waits for the preloader, then reveals together.
      if (el.closest('.hero, .page-hero, .funnel')) {
        onReady(function () {
          var delay = parseFloat(el.getAttribute('data-delay') || 0);
          if (delay) el.style.transitionDelay = delay + 's';
          el.classList.add('is-in');
        });
      } else io.observe(el);
    });
  }

  function initClip() {
    if (!hasGsap || reduce) return;
    $$('[data-clip]').forEach(function (el) {
      gsap.to(el, { clipPath: 'inset(0% 0% 0% 0% round ' + getComputedStyle(el).borderRadius + ')', duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
    });
  }

  function initParallax() {
    if (!hasGsap || reduce) return;
    $$('[data-parallax]').forEach(function (el) {
      var img = el.tagName === 'IMG' ? el : $('img', el);
      var amt = parseFloat(el.getAttribute('data-parallax')) || 8;
      gsap.fromTo(img, { yPercent: -amt }, { yPercent: amt, ease: 'none', scrollTrigger: { trigger: el.closest('section') || el, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  }

  /* ---------- Counters ---------- */
  function initCounters() {
    $$('[data-count]').forEach(function (el) {
      var end = parseFloat(el.getAttribute('data-count'));
      var dec = parseInt(el.getAttribute('data-decimals') || '0', 10);
      var fmt = function (v) { return v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }); };
      if (!hasGsap || reduce) { el.textContent = fmt(end); return; }
      el.textContent = fmt(0);
      var o = { v: 0 };
      ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true, onEnter: function () {
        gsap.to(o, { v: end, duration: 2.2, ease: 'expo.out', onUpdate: function () { el.textContent = fmt(o.v); } });
      } });
    });
  }

  /* ---------- Scroll-scrubbed words ---------- */
  function wrapWords(node) {
    Array.prototype.slice.call(node.childNodes).forEach(function (child) {
      if (child.nodeType === 3) {
        var frag = doc.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(doc.createTextNode(part)); return; }
          var s = doc.createElement('span');
          s.className = 'scrub-word';
          s.textContent = part;
          frag.appendChild(s);
        });
        child.parentNode.replaceChild(frag, child);
      } else if (child.nodeType === 1) wrapWords(child);
    });
  }
  function initScrub() {
    $$('[data-scrub]').forEach(function (el) {
      wrapWords(el);
      var words = $$('.scrub-word', el);
      if (!hasGsap || reduce) { words.forEach(function (w) { w.style.opacity = 1; }); return; }
      gsap.to(words, { opacity: 1, ease: 'none', stagger: 0.1, scrollTrigger: { trigger: el, start: 'top 82%', end: 'bottom 50%', scrub: 0.6 } });
    });
  }

  /* ---------- Horizontal process ---------- */
  function initHScroll() {
    if (!hasGsap) return;
    $$('[data-hscroll]').forEach(function (sec) {
      var track = $('.hscroll__track', sec);
      var bar = $('.hscroll__progress i', sec);
      var mm = gsap.matchMedia();
      mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', function () {
        sec.classList.add('is-pinned');
        root.classList.add('has-hscroll');
        var dist = function () { return Math.max(0, track.scrollWidth - window.innerWidth); };
        var tw = gsap.to(track, {
          x: function () { return -dist(); },
          ease: 'none',
          scrollTrigger: {
            trigger: sec, start: 'top top', end: function () { return '+=' + dist(); }, pin: true, scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1,
            onUpdate: function (self) { if (bar) bar.style.transform = 'scaleX(' + self.progress + ')'; }
          }
        });
        return function () { tw.kill(); gsap.set(track, { x: 0 }); sec.classList.remove('is-pinned'); root.classList.remove('has-hscroll'); };
      });
    });
  }

  /* ---------- Process timeline ---------- */
  function initTimeline() {
    var tl = $('[data-timeline]');
    if (!tl || !hasGsap) return;
    var rail = $('.timeline__rail i', tl);
    if (!reduce) gsap.to(rail, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: tl, start: 'top 60%', end: 'bottom 60%', scrub: true } });
    else rail.style.transform = 'none';
    $$('.tl-step', tl).forEach(function (step) {
      ScrollTrigger.create({ trigger: step, start: 'top 60%', end: 'bottom 60%', toggleClass: 'is-active' });
    });
  }

  /* ---------- Marquee ---------- */
  function initMarquee() {
    if (!hasGsap) return;
    $$('[data-marquee]').forEach(function (m) {
      var track = $('.marquee__track', m);
      var group = $('.marquee__group', track);
      if (!group) return;
      track.appendChild(group.cloneNode(true)).setAttribute('aria-hidden', 'true');
      if (reduce) return;
      var dir = m.getAttribute('data-marquee') === 'right' ? 1 : -1;
      var tw = gsap.fromTo(track, { xPercent: dir < 0 ? 0 : -50 }, { xPercent: dir < 0 ? -50 : 0, duration: parseFloat(m.getAttribute('data-speed')) || 34, ease: 'none', repeat: -1 });
      if (lenis) {
        lenis.on('scroll', function (e) {
          var boost = 1 + Math.min(Math.abs(e.velocity) / 6, 5);
          gsap.to(tw, { timeScale: boost, duration: 0.2, overwrite: true, onComplete: function () { gsap.to(tw, { timeScale: 1, duration: 1.2 }); } });
        });
      }
    });
  }

  /* ---------- Accordion ---------- */
  function initAccordion() {
    $$('.acc').forEach(function (acc) {
      var btn = $('.acc__btn', acc), panel = $('.acc__panel', acc);
      btn.addEventListener('click', function () {
        var open = !acc.classList.contains('is-open');
        acc.classList.toggle('is-open', open);
        btn.setAttribute('aria-expanded', String(open));
        if (hasGsap && !reduce) gsap.to(panel, { height: open ? 'auto' : 0, duration: 0.7, ease: 'expo.out', onComplete: function () { ScrollTrigger.refresh(); } });
        else panel.style.height = open ? 'auto' : '0px';
      });
    });
  }

  /* ---------- Hover image preview ---------- */
  function initPreview() {
    var list = $('[data-preview-list]');
    var box = $('.preview');
    if (!list || !box || !fine || !hasGsap) return;
    var imgs = $$('img', box);
    var x = gsap.quickTo(box, 'x', { duration: 0.6, ease: 'power3' }), y = gsap.quickTo(box, 'y', { duration: 0.6, ease: 'power3' });
    list.addEventListener('pointermove', function (e) { x(e.clientX + 30); y(e.clientY - 190); });
    $$('[data-preview]', list).forEach(function (row) {
      row.addEventListener('pointerenter', function () {
        var i = +row.getAttribute('data-preview');
        imgs.forEach(function (im, k) { im.classList.toggle('is-on', k === i); });
        gsap.to(box, { opacity: 1, scale: 1, rotate: (i % 2 ? 4 : -4), duration: 0.6, ease: 'expo.out' });
      });
    });
    list.addEventListener('pointerleave', function () { gsap.to(box, { opacity: 0, scale: 0.6, duration: 0.5, ease: 'expo.out' }); });
  }

  /* ---------- Testimonials ---------- */
  function initQuotes() {
    $$('[data-quotes]').forEach(function (wrap) {
      var items = $$('.quote', wrap);
      var count = $('.quotes__count', wrap);
      var i = 0, timer;
      function show(n) {
        var prev = items[i];
        i = (n + items.length) % items.length;
        var next = items[i];
        if (count) count.textContent = String(i + 1).padStart(2, '0') + ' / ' + String(items.length).padStart(2, '0');
        if (prev === next) return;
        if (hasGsap && !reduce) {
          gsap.to(prev, { opacity: 0, y: -20, duration: 0.45, ease: 'power2.in', onComplete: function () { prev.classList.remove('is-active'); next.classList.add('is-active'); gsap.fromTo(next, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.9, ease: 'expo.out' }); } });
        } else { prev.classList.remove('is-active'); next.classList.add('is-active'); next.style.opacity = 1; }
      }
      function auto() { clearInterval(timer); timer = setInterval(function () { show(i + 1); }, 7000); }
      var p = $('[data-prev]', wrap), n = $('[data-next]', wrap);
      if (p) p.addEventListener('click', function () { show(i - 1); auto(); });
      if (n) n.addEventListener('click', function () { show(i + 1); auto(); });
      show(0);
      if (!reduce) auto();
    });
  }

  /* ---------- Sun clock (Yucaipa sunrise / sunset, computed live) ---------- */
  function sunTimes(date, lat, lng) {
    var rad = Math.PI / 180;
    var J = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12) / 86400000 + 2440587.5;
    var n = Math.round(J - 2451545.0 + 0.0008);
    var Js = n - lng / 360;
    var M = (357.5291 + 0.98560028 * Js) % 360;
    var C = 1.9148 * Math.sin(M * rad) + 0.02 * Math.sin(2 * M * rad) + 0.0003 * Math.sin(3 * M * rad);
    var L = (M + C + 180 + 102.9372) % 360;
    var Jt = 2451545.0 + Js + 0.0053 * Math.sin(M * rad) - 0.0069 * Math.sin(2 * L * rad);
    var dec = Math.asin(Math.sin(L * rad) * Math.sin(23.44 * rad));
    var cosW = (Math.sin(-0.833 * rad) - Math.sin(lat * rad) * Math.sin(dec)) / (Math.cos(lat * rad) * Math.cos(dec));
    var w = Math.acos(Math.max(-1, Math.min(1, cosW))) / rad;
    var toDate = function (j) { return new Date((j - 2440587.5) * 86400000); };
    return { rise: toDate(Jt - w / 360), set: toDate(Jt + w / 360) };
  }
  function initSunclock() {
    var els = $$('[data-sunclock]');
    if (!els.length) return;
    var tz = CFG.timezone || 'America/Los_Angeles';
    var fmt;
    try { fmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: tz }); } catch (e) { fmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }); }
    function tick() {
      var now = new Date();
      var t = sunTimes(now, CFG.lat || 34.0336, CFG.lng || -117.0431);
      var up = now > t.rise && now < t.set;
      var mins = Math.round((t.set - t.rise) / 60000);
      els.forEach(function (el) {
        var kind = el.getAttribute('data-sunclock');
        if (kind === 'footer') el.textContent = 'Yucaipa, CA · ' + fmt.format(now) + ' PT';
        else if (kind === 'status') {
          el.innerHTML = '<span class="pulse-dot" style="background:' + (up ? '#3ddc84' : '#f2b236') + '"></span>' + (up ? 'Sun is up in Yucaipa · panels producing' : 'Sun is down in Yucaipa · batteries on duty');
        } else {
          el.innerHTML = 'Sunrise <b>' + fmt.format(t.rise) + '</b> · Sunset <b>' + fmt.format(t.set) + '</b> · <b>' + Math.floor(mins / 60) + 'h ' + (mins % 60) + 'm</b> of sun today';
        }
      });
    }
    tick();
    setInterval(tick, 30000);
  }

  /* ---------- Instant estimator ---------- */
  function animateNumber(el, to, formatter) {
    var from = parseFloat(el.getAttribute('data-v') || '0');
    el.setAttribute('data-v', to);
    if (!hasGsap || reduce) { el.textContent = formatter(to); return; }
    var o = { v: from };
    gsap.to(o, { v: to, duration: 0.8, ease: 'expo.out', overwrite: true, onUpdate: function () { el.textContent = formatter(o.v); } });
  }
  function setRangeFill(r) {
    var p = ((r.value - r.min) / (r.max - r.min)) * 100;
    r.style.setProperty('--p', p + '%');
  }
  function initEstimator() {
    $$('[data-estimator]').forEach(function (box) {
      var range = $('input[type="range"]', box);
      var billEl = $('[data-bill]', box);
      var go = $('[data-estimate-go]', box);
      if (!range || !window.LithiumCalc) return;
      function update() {
        setRangeFill(range);
        var bill = +range.value;
        var r = LithiumCalc.estimate(bill);
        billEl.textContent = '$' + bill.toLocaleString('en-US');
        var m = LithiumCalc.money;
        $$('[data-out]', box).forEach(function (el) {
          var k = el.getAttribute('data-out');
          if (k === 'systemKw') animateNumber(el, r.systemKw, function (v) { return v.toFixed(1) + ' kW'; });
          if (k === 'panels') animateNumber(el, r.panels, function (v) { return Math.round(v) + ''; });
          if (k === 'year1') animateNumber(el, r.year1, function (v) { return m(v); });
          if (k === 'net') animateNumber(el, r.net, function (v) { return m(v); });
          if (k === 'payback') animateNumber(el, r.payback || 0, function (v) { return v.toFixed(1) + ' yrs'; });
        });
      }
      range.addEventListener('input', update);
      update();
      if (go) go.addEventListener('click', function () {
        try {
          var s = JSON.parse(localStorage.getItem('li-quote') || '{}');
          s.bill = +range.value;
          localStorage.setItem('li-quote', JSON.stringify(s));
        } catch (e) {}
      });
    });
    $$('input[type="range"].range').forEach(function (r) { setRangeFill(r); r.addEventListener('input', function () { setRangeFill(r); }); });
  }

  /* ---------- Boot ---------- */
  function boot() {
    initLenis();
    initHeader();
    initMenu();
    initCursor();
    initMagnetic();
    initTransitions();
    initReveal();
    initClip();
    initParallax();
    initCounters();
    initScrub();
    initHScroll();
    initTimeline();
    initMarquee();
    initAccordion();
    initPreview();
    initQuotes();
    initSunclock();
    initEstimator();
    var fontsReady = doc.fonts && doc.fonts.ready ? doc.fonts.ready : Promise.resolve();
    fontsReady.then(function () { initSplit(); intro(); if (hasGsap) ScrollTrigger.refresh(); });
    window.addEventListener('load', function () { if (hasGsap) ScrollTrigger.refresh(); });
    window.Lithium = { scrollTo: scrollTo, onReady: onReady, lenis: function () { return lenis; }, animateNumber: animateNumber, setRangeFill: setRangeFill };
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot); else boot();
})();
