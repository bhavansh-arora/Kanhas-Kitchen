/* Dance Cart — site-wide behaviour.
   Preloader, page curtain, reveals, header, menu, cursor, magnetic buttons,
   counters, accordions, cart + drawer, quick view, program finder, testimonials. */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var DC = window.DC;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  var $ = function (sel, ctx) { return (ctx || doc).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); };
  var store = {
    get: function (k, fallback) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  var session = {
    get: function (k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} },
    del: function (k) { try { sessionStorage.removeItem(k); } catch (e) {} }
  };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var icon = function (name) { return '<svg class="i" aria-hidden="true"><use href="#i-' + name + '"/></svg>'; };

  /* ---------- Ready: preloader / curtain ---------- */
  var readyFns = [];
  var isReady = false;
  function onReady(fn) { isReady ? fn() : readyFns.push(fn); }
  function fireReady() {
    if (isReady) return;
    isReady = true;
    root.classList.add('motion-ready');
    readyFns.forEach(function (fn) { fn(); });
  }

  function startIntro() {
    var curtain = $('.curtain');
    if (root.classList.contains('is-loading')) {
      var pre = $('.preloader');
      setTimeout(function () {
        pre.classList.add('is-done');
        setTimeout(fireReady, 350);
        setTimeout(function () { root.classList.remove('is-loading'); }, 1050);
      }, 1850);
      session.set('dc-seen', '1');
    } else if (root.classList.contains('is-entering')) {
      session.del('dc-nav');
      requestAnimationFrame(function () {
        curtain.classList.add('is-out');
        root.classList.remove('is-entering');
        setTimeout(fireReady, 250);
        setTimeout(function () { curtain.classList.remove('is-out'); }, 1200);
      });
    } else {
      session.set('dc-seen', '1');
      fireReady();
    }
  }

  // Page curtain on internal navigation
  doc.addEventListener('click', function (e) {
    var a = e.target.closest('a[href]');
    if (!a || reduced) return;
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (a.target && a.target !== '_self') return;
    if (a.hasAttribute('download')) return;
    var href = a.getAttribute('href');
    if (!href || href.charAt(0) === '#' || /^(mailto|tel|https?):/i.test(href)) return;
    var url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname && url.hash) return;
    e.preventDefault();
    closeMenu();
    session.set('dc-nav', '1');
    $('.curtain').classList.add('is-in');
    setTimeout(function () { location.href = a.href; }, 780);
  });
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) { $('.curtain').classList.remove('is-in'); root.classList.remove('is-entering', 'is-loading'); }
  });

  /* ---------- Marquees: double each track so it always fills wide screens ---------- */
  $$('.marquee__track').forEach(function (t) { t.innerHTML += t.innerHTML; });

  /* ---------- Split text ---------- */
  $$('[data-split]').forEach(function (el) {
    $$(':scope > span', el).forEach(function (line, i) {
      line.style.setProperty('--i', i);
      line.innerHTML = '<span class="split-inner">' + line.innerHTML + '</span>';
    });
  });

  /* ---------- Reveal on scroll ---------- */
  var revealSel = '[data-reveal], [data-split], [data-clip], .fix, .steps, [data-count]';
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      reveal(en.target);
      io.unobserve(en.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }) : null;

  function reveal(el) {
    el.classList.add('is-in');
    if (el.hasAttribute('data-count')) countUp(el);
  }

  function observeReveals(scope) {
    $$(revealSel, scope).forEach(function (el) {
      if (el.classList.contains('is-in')) return;
      var inHero = el.closest('.hero, .page-hero');
      if (inHero) { onReady(function () { reveal(el); }); return; }
      io ? io.observe(el) : reveal(el);
    });
  }

  /* ---------- Counters ---------- */
  function countUp(el) {
    var end = parseFloat(el.getAttribute('data-count'));
    var prefix = el.getAttribute('data-prefix') || '';
    var suffix = el.getAttribute('data-suffix') || '';
    if (reduced) { el.textContent = prefix + end.toLocaleString('en-AU') + suffix; return; }
    var t0 = null, dur = 1800;
    function tick(t) {
      if (!t0) t0 = t;
      var p = Math.min((t - t0) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 4);
      el.textContent = prefix + Math.round(end * eased).toLocaleString('en-AU') + suffix;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* ---------- Header hide/show ---------- */
  var header = $('[data-header]');
  var lastY = window.scrollY;
  var ticking = false;
  function onScroll() {
    var y = window.scrollY;
    if (header && !root.classList.contains('is-menu-open')) {
      header.classList.toggle('is-hidden', y > 240 && y > lastY + 2);
      if (y < lastY - 2) header.classList.remove('is-hidden');
    }
    lastY = y;
    parallax();
    ticking = false;
  }
  window.addEventListener('scroll', function () { if (!ticking) { requestAnimationFrame(onScroll); ticking = true; } }, { passive: true });

  /* ---------- Parallax ---------- */
  var parallaxEls = reduced ? [] : $$('[data-parallax]');
  function parallax() {
    var vh = window.innerHeight;
    parallaxEls.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      var speed = parseFloat(el.getAttribute('data-parallax')) || 0.1;
      var offset = (r.top + r.height / 2 - vh / 2) * -speed;
      el.style.transform = 'translate3d(0,' + offset.toFixed(1) + 'px,0)';
    });
  }

  /* ---------- Mobile menu ---------- */
  var menu = $('#menu');
  var toggle = $('[data-menu-toggle]');
  $$('.menu__list a').forEach(function (a, i) { a.style.setProperty('--i', i); });
  var page = doc.body.getAttribute('data-page');
  $$('.menu__list a[data-nav="' + page + '"]').forEach(function (a) { a.setAttribute('aria-current', 'page'); });
  function openMenu() {
    root.classList.add('is-menu-open');
    doc.body.classList.add('is-locked');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close menu');
    menu.setAttribute('aria-hidden', 'false');
  }
  function closeMenu() {
    if (!root.classList.contains('is-menu-open')) return;
    root.classList.remove('is-menu-open');
    doc.body.classList.remove('is-locked');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open menu');
    menu.setAttribute('aria-hidden', 'true');
  }
  if (toggle) toggle.addEventListener('click', function () { root.classList.contains('is-menu-open') ? closeMenu() : openMenu(); });

  /* ---------- Cursor ---------- */
  if (finePointer && !reduced) {
    var cursor = $('.cursor');
    var label = $('.cursor__label');
    var cx = -100, cy = -100, tx = -100, ty = -100;
    root.classList.add('has-cursor');
    doc.addEventListener('mousemove', function (e) { tx = e.clientX; ty = e.clientY; }, { passive: true });
    (function loop() {
      cx += (tx - cx) * 0.22; cy += (ty - cy) * 0.22;
      cursor.style.transform = 'translate3d(' + cx + 'px,' + cy + 'px,0)';
      requestAnimationFrame(loop);
    })();
    doc.addEventListener('mouseover', function (e) {
      var t = e.target.closest('[data-cursor], a, button, input, select, textarea, label');
      cursor.classList.remove('is-hover', 'is-label', 'is-hidden');
      if (!t) return;
      if (t.matches('input, select, textarea')) { cursor.classList.add('is-hidden'); return; }
      var text = t.getAttribute('data-cursor');
      if (text) { label.textContent = text; cursor.classList.add('is-label'); }
      else cursor.classList.add('is-hover');
    });
    doc.addEventListener('mouseleave', function () { tx = ty = -100; });
  }

  /* ---------- Magnetic buttons ---------- */
  if (finePointer && !reduced) {
    $$('[data-magnetic]').forEach(function (el) {
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var x = e.clientX - r.left - r.width / 2;
        var y = e.clientY - r.top - r.height / 2;
        el.style.transform = 'translate(' + x * 0.18 + 'px,' + y * 0.28 + 'px)';
      });
      el.addEventListener('mouseleave', function () { el.style.transform = ''; });
    });
  }

  /* ---------- Accordions ---------- */
  doc.addEventListener('click', function (e) {
    var q = e.target.closest('.acc__q');
    if (!q) return;
    var acc = q.closest('.acc');
    var open = !acc.classList.contains('is-open');
    acc.classList.toggle('is-open', open);
    q.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  /* ---------- Toast ---------- */
  var toastEl = $('.toast');
  var toastTimer;
  function toast(msg, action) {
    toastEl.innerHTML = icon('check') + '<span>' + esc(msg) + '</span>' + (action ? '<button type="button" data-cart-open>' + esc(action) + '</button>' : '');
    toastEl.classList.add('is-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-show'); }, 3600);
  }

  /* ---------- Program art + cards (shared with other scripts) ---------- */
  var PHOTOS = {
    'candy': 'assets/img/candyland-862.webp',
    'photo-rainbow': 'assets/img/rainbow-studio-700.webp',
    'photo-jump': 'assets/img/studio-jump-800.webp',
    'photo-team': 'assets/img/team-600.webp'
  };
  var BIG = { 'of-prep': 'Prep', 'of-y12': '1–2', 'of-y34': '3–4', 'of-y56': '5–6', 'of-all': 'P–6', 'free-resources': 'Free' };

  function artHTML(p, extraClass) {
    var cls = 'pcard__art pcard__art--' + p.art + (extraClass ? ' ' + extraClass : '');
    var inner = '';
    if (PHOTOS[p.art]) inner = '<img src="' + PHOTOS[p.art] + '" alt="" loading="lazy" decoding="async">';
    else inner = '<svg class="pcard__star" aria-hidden="true"><use href="#i-star"/></svg><span class="pcard__big" aria-hidden="true">' + esc(BIG[p.id] || p.variant) + '</span>';
    var tags = p.tag ? '<span class="pcard__tags"><span class="chip chip--sun">' + icon('spark') + esc(p.tag) + '</span></span>' : '';
    return '<div class="' + cls + '">' + inner + tags + '<span class="chip chip--glass">' + esc(p.duration) + '</span></div>';
  }

  function priceHTML(p) {
    if (p.price === null) return '<div class="pcard__price">Quote<small>Tailored to your school</small></div>';
    if (p.price === 0) return '<div class="pcard__price">Free<small>For every teacher</small></div>';
    return '<div class="pcard__price">' + DC.money(p.price) + '<small>AUD &middot; ' + esc(p.family === 'online' ? 'per year' : 'per program') + '</small></div>';
  }

  function addLabel(p) { return p.price === null ? 'Request quote' : (p.price === 0 ? 'Get resources' : 'Add to enrolment'); }

  function cardHTML(p, i) {
    var inCart = Cart.has(p.id);
    return '<article class="pcard" style="--i:' + (i || 0) + '" data-id="' + p.id + '">' +
      artHTML(p) +
      '<div class="pcard__body">' +
        '<p class="pcard__mode"><i></i>' + esc(p.modeLabel) + ' &middot; ' + esc(p.bandLabel) + '</p>' +
        '<h3 class="pcard__name">' + esc(p.name) + '<span class="pcard__variant">' + esc(p.variant) + '</span></h3>' +
        '<p class="pcard__blurb">' + esc(p.blurb) + '</p>' +
        '<ul class="pcard__list">' + p.includes.slice(0, 3).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' +
      '</div>' +
      '<div class="pcard__foot">' + priceHTML(p) +
        '<div class="pcard__actions">' +
          '<button class="view-btn" type="button" data-quick="' + p.id + '" aria-label="Quick view: ' + esc(p.name + ' ' + p.variant) + '">' + icon('plus') + '</button>' +
          addBtnHTML(p, inCart) +
        '</div>' +
      '</div>' +
    '</article>';
  }

  function addBtnHTML(p, inCart) {
    return '<button class="add-btn' + (inCart ? ' is-added' : '') + '" type="button" data-add="' + p.id + '">' +
      icon(inCart ? 'check' : 'plus') + '<span>' + (inCart ? 'Added' : (p.price === null ? 'Quote' : 'Add')) + '</span></button>';
  }

  /* ---------- Cart ---------- */
  var listeners = [];
  var Cart = {
    get: function () {
      var ids = store.get('dc-cart', []);
      return Array.isArray(ids) ? ids.filter(function (id) { return DC.byId(id); }) : [];
    },
    set: function (ids) { store.set('dc-cart', ids); listeners.forEach(function (fn) { fn(ids); }); renderCart(); },
    has: function (id) { return Cart.get().indexOf(id) > -1; },
    add: function (id) {
      var ids = Cart.get();
      if (ids.indexOf(id) > -1) return false;
      if (DC.bandIds.indexOf(id) > -1 && ids.indexOf(DC.bundleId) > -1) {
        toast('The Whole School bundle already covers this band.', 'View cart');
        return false;
      }
      if (id === DC.bundleId) ids = ids.filter(function (x) { return DC.bandIds.indexOf(x) === -1; });
      ids.push(id);
      Cart.set(ids);
      return true;
    },
    remove: function (id) { Cart.set(Cart.get().filter(function (x) { return x !== id; })); },
    clear: function () { Cart.set([]); },
    subscribe: function (fn) { listeners.push(fn); },
    totals: function () {
      var ids = Cart.get();
      var paid = 0, quotes = 0, bands = 0;
      ids.forEach(function (id) {
        var p = DC.byId(id);
        if (p.price === null) quotes++; else paid += p.price;
        if (DC.bandIds.indexOf(id) > -1) bands++;
      });
      var saving = bands >= 2 ? bands * 799 - DC.byId(DC.bundleId).price : 0;
      return { ids: ids, paid: paid, quotes: quotes, bands: bands, saving: saving };
    },
    swapToBundle: function () {
      var ids = Cart.get().filter(function (x) { return DC.bandIds.indexOf(x) === -1; });
      ids.push(DC.bundleId);
      Cart.set(ids);
    }
  };

  function thumbHTML(p) {
    if (PHOTOS[p.art]) return '<span class="line__thumb"><img src="' + PHOTOS[p.art] + '" alt="" loading="lazy"></span>';
    var bg = { pink: 'var(--pink)', orange: 'var(--orange)', sun: 'var(--sun)', grad: 'var(--grad)', ink: 'var(--ink)' }[p.art] || 'var(--pink)';
    return '<span class="line__thumb" style="background:' + bg + (p.art === 'sun' ? ';color:var(--ink)' : '') + '">' + esc(BIG[p.id] || 'DC') + '</span>';
  }

  function lineHTML(p) {
    return '<div class="line">' + thumbHTML(p) +
      '<div><div class="line__name">' + esc(p.name) + ' &middot; ' + esc(p.variant) + '</div><div class="line__sub">' + esc(p.modeLabel + ' · ' + p.duration) + '</div></div>' +
      '<div class="line__price">' + (p.price === null ? 'Quote' : DC.money(p.price)) + '</div>' +
      '<button class="line__remove" type="button" data-remove="' + p.id + '" aria-label="Remove ' + esc(p.name + ' ' + p.variant) + '">' + icon('close') + '</button>' +
    '</div>';
  }

  function upsellHTML(t) {
    if (t.saving <= 0) return '';
    return '<div class="upsell"><div><strong>Switch to the Whole School bundle</strong><span>Every band for $1,499. You save ' + DC.money(t.saving) + '.</span></div>' +
      '<button class="add-btn" type="button" data-swap-bundle>' + icon('spark') + '<span>Switch &amp; save</span></button></div>';
  }

  function renderCart() {
    var t = Cart.totals();
    $$('[data-cart-count]').forEach(function (el) {
      el.textContent = t.ids.length;
      el.classList.toggle('has-items', t.ids.length > 0);
    });
    $$('[data-add]').forEach(function (btn) {
      var id = btn.getAttribute('data-add');
      var on = t.ids.indexOf(id) > -1;
      if (btn.classList.contains('add-btn')) {
        var p = DC.byId(id);
        btn.classList.toggle('is-added', on);
        btn.innerHTML = icon(on ? 'check' : 'plus') + '<span>' + (on ? 'Added' : (btn.hasAttribute('data-long') ? addLabel(p) : (p.price === null ? 'Quote' : 'Add'))) + '</span>';
      } else if (btn.querySelector('.btn__text')) {
        var txt = btn.querySelector('.btn__text');
        var base = btn.getAttribute('data-label') || txt.textContent;
        btn.setAttribute('data-label', base);
        var v = on ? 'Added to enrolment' : base;
        txt.textContent = v; txt.setAttribute('data-text', v);
      }
    });

    var lines = $('[data-cart-lines]');
    var foot = $('[data-cart-foot]');
    if (!lines) return;
    if (!t.ids.length) {
      lines.innerHTML = '<div class="empty"><div class="empty__icon">' + icon('cart') + '</div><strong>Your cart is empty</strong><p>Browse the catalogue and add a program or two.</p><a class="btn btn--dark btn--sm" href="programs.html"><span class="btn__text" data-text="Browse programs">Browse programs</span></a></div>';
      foot.innerHTML = '';
      return;
    }
    lines.innerHTML = '<div class="lines">' + t.ids.map(function (id) { return lineHTML(DC.byId(id)); }).join('') + '</div>' + upsellHTML(t);
    foot.innerHTML =
      '<div class="drawer__total"><span>Due today' + (t.quotes ? ' + ' + t.quotes + ' quote' + (t.quotes > 1 ? 's' : '') : '') + '</span><strong>' + DC.money(t.paid) + '</strong></div>' +
      '<p class="drawer__note">AUD. Pay by card, invoice or purchase order at the next step.</p>' +
      '<a class="btn btn--primary btn--block" href="enrol.html"><span class="btn__text" data-text="Continue to enrolment">Continue to enrolment</span><span class="btn__icon">' + icon('arrow') + '</span></a>';
  }

  /* ---------- Drawer ---------- */
  var drawer = $('[data-drawer]');
  function openDrawer() {
    if (!drawer) return;
    renderCart();
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    doc.body.classList.add('is-locked');
    setTimeout(function () { var c = $('.drawer__head .icon-btn', drawer); if (c) c.focus(); }, 300);
  }
  function closeDrawer() {
    if (!drawer || !drawer.classList.contains('is-open')) return;
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    if (!modal.classList.contains('is-open')) doc.body.classList.remove('is-locked');
  }

  /* ---------- Modal ---------- */
  var modal = $('[data-modal]');
  var modalBody = $('[data-modal-body]');
  var lastFocus = null;
  function openModal(html) {
    lastFocus = doc.activeElement;
    modalBody.innerHTML = html;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    doc.body.classList.add('is-locked');
    renderCart();
    setTimeout(function () { $('.modal__close', modal).focus(); }, 200);
  }
  function closeModal() {
    if (!modal.classList.contains('is-open')) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    if (!drawer.classList.contains('is-open')) doc.body.classList.remove('is-locked');
    if (lastFocus) lastFocus.focus();
  }
  function quickView(id) {
    var p = DC.byId(id);
    if (!p) return;
    openModal('<div class="qv">' + artHTML(p, 'qv__art') +
      '<div class="qv__body">' +
        '<p class="pcard__mode"><i></i>' + esc(p.modeLabel) + ' &middot; ' + esc(p.bandLabel) + '</p>' +
        '<h3 class="pcard__name">' + esc(p.name) + '<span class="pcard__variant">' + esc(p.variant) + '</span></h3>' +
        '<p class="pcard__blurb" style="font-size:1rem">' + esc(p.blurb) + '</p>' +
        '<ul class="ticks ticks--paper">' + p.includes.map(function (x) { return '<li>' + icon('check') + esc(x) + '</li>'; }).join('') + '</ul>' +
        '<div class="qv__price">' + priceHTML(p) + '<span class="chip">' + icon('clock') + esc(p.duration) + '</span></div>' +
        '<div class="qv__btns">' + addBtnHTML(p, Cart.has(p.id)).replace('class="add-btn', 'data-long class="add-btn') +
          '<a class="add-btn" style="background:transparent;color:var(--ink);border:1.5px solid var(--paper-line)" href="' + p.url + '">Full details ' + icon('arrow') + '</a>' +
        '</div>' +
      '</div></div>');
  }

  doc.addEventListener('click', function (e) {
    var t;
    if ((t = e.target.closest('[data-cart-open]'))) { e.preventDefault(); closeModal(); openDrawer(); return; }
    if (e.target.closest('[data-cart-close]')) { closeDrawer(); return; }
    if (e.target.closest('[data-modal-close]')) { closeModal(); return; }
    if ((t = e.target.closest('[data-quick]'))) { quickView(t.getAttribute('data-quick')); return; }
    if ((t = e.target.closest('[data-remove]'))) { Cart.remove(t.getAttribute('data-remove')); return; }
    if (e.target.closest('[data-swap-bundle]')) { Cart.swapToBundle(); toast('Switched to the Whole School bundle.'); return; }
    if ((t = e.target.closest('[data-add]'))) {
      e.preventDefault();
      var id = t.getAttribute('data-add');
      var p = DC.byId(id);
      if (Cart.has(id)) { openDrawer(); return; }
      if (Cart.add(id)) {
        if (header) header.classList.remove('is-hidden');
        $$('.cart-btn').forEach(function (b) { b.classList.remove('is-bump'); void b.offsetWidth; b.classList.add('is-bump'); });
        toast((p.price === null ? 'Quote request added: ' : 'Added: ') + p.name + ' · ' + p.variant, 'View cart');
      }
      return;
    }
    if ((t = e.target.closest('[data-video]'))) {
      e.preventDefault();
      openModal('<div class="video-modal"><img src="assets/img/rainbow-studio-1242.webp" alt=""><div><p class="label label--light">Content sneak preview</p><p class="h3" style="margin:16px 0 24px">Watch Dance Cart lessons on YouTube</p><a class="btn btn--primary" href="https://www.youtube.com/channel/UClw1FPyxZNXL_c0dzCB1tfg" target="_blank" rel="noopener"><span class="btn__text" data-text="Open the channel">Open the channel</span><span class="btn__icon">' + icon('play') + '</span></a></div></div>');
    }
  });

  doc.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeModal(); closeDrawer(); closeMenu(); }
  });

  /* ---------- Newsletter sign-up ---------- */
  $$('[data-signup]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = $('input[type="email"]', form);
      if (!input.checkValidity()) { input.reportValidity(); return; }
      form.classList.add('is-done');
      $('.signup__label', form).textContent = 'You’re in! Check your inbox for your first resources.';
      $('.signup__btn', form).innerHTML = icon('check');
      input.value = '';
    });
  });

  /* ---------- Program finder ---------- */
  function initFinder(box) {
    var answers = {};
    var steps = $$('.finder__step', box);
    var bars = $$('.finder__progress i', box);
    var result = $('.finder__result', box);
    var idx = 0;

    function show(i) {
      idx = i;
      steps.forEach(function (s, n) { s.classList.toggle('is-active', n === i); });
      result.classList.toggle('is-active', i === steps.length);
      bars.forEach(function (b, n) { b.classList.toggle('is-done', n < i); });
    }

    function pick() {
      if (answers.how === 'online') return answers.who === 'whole' ? 'of-all' : 'of-' + answers.who;
      if (answers.how === 'inschool') return 'in-school';
      return answers.who === 'y56' ? 'graduation' : 'fete';
    }

    function renderResult() {
      var p = DC.byId(pick());
      var when = { now: 'Lessons can start straight after enrolment.', next: 'We’ll pencil you in for next term.', year: 'Lock in your spot for next year now.' }[answers.when];
      if (p.mode !== 'online') when = 'We’ll confirm dates and a tailored quote. ' + ({ now: 'Ask about this term.', next: 'Next term works well.', year: 'Booking early secures the best dates.' }[answers.when]);
      $('[data-finder-out]', box).innerHTML =
        '<p class="label"><span class="label__num">Your match</span></p>' +
        '<div class="result-card">' +
          '<div class="result-card__head"><div><p class="pcard__mode" style="color:var(--muted-light)"><i></i>' + esc(p.modeLabel) + ' &middot; ' + esc(p.bandLabel) + '</p><p class="result-card__name" style="margin-top:8px">' + esc(p.name) + '<br><span class="serif" style="color:var(--pink-hot)">' + esc(p.variant) + '</span></p></div>' +
          '<div class="result-card__price">' + (p.price === null ? 'Quote' : DC.money(p.price)) + '</div></div>' +
          '<ul>' + p.includes.slice(0, 4).map(function (x) { return '<li>' + icon('check') + esc(x) + '</li>'; }).join('') + '</ul>' +
          '<p class="small" style="color:var(--muted-light)">' + esc(when) + '</p>' +
          '<div class="row">' + addBtnHTML(p, Cart.has(p.id)).replace('class="add-btn', 'data-long class="add-btn') +
          '<a class="add-btn" style="background:transparent;border:1.5px solid var(--ink-line)" href="' + p.url + '">Details ' + icon('arrow') + '</a></div>' +
        '</div>';
      renderCart();
    }

    box.addEventListener('click', function (e) {
      var opt = e.target.closest('.opt');
      if (opt) {
        var step = opt.closest('.finder__step');
        $$('.opt', step).forEach(function (o) { o.classList.remove('is-selected'); });
        opt.classList.add('is-selected');
        answers[step.getAttribute('data-q')] = opt.getAttribute('data-v');
        setTimeout(function () {
          if (idx + 1 === steps.length) renderResult();
          show(idx + 1);
        }, 260);
        return;
      }
      if (e.target.closest('[data-finder-back]')) { show(Math.max(0, idx - 1)); return; }
      if (e.target.closest('[data-finder-reset]')) { answers = {}; $$('.opt', box).forEach(function (o) { o.classList.remove('is-selected'); }); show(0); }
    });
    show(0);
  }
  $$('[data-finder]').forEach(initFinder);

  /* ---------- Testimonials ---------- */
  function initQuotes(wrap) {
    var stage = $('[data-quotes-stage]', wrap);
    var count = $('[data-quotes-count]', wrap);
    var bar = $('.quotes__bar i', wrap);
    var list = DC.testimonials;
    var cur = 0, timer;
    var DUR = 7000;

    stage.innerHTML = list.map(function (q, i) {
      var words = (q.quote + (q.more ? ' ' + q.more : '')).split(' ').map(function (w, n) { return '<span class="w" style="--w:' + n + '">' + esc(w) + '</span>'; }).join(' ');
      var logo = q.logo ? '<span class="quote__logo"><img src="' + q.logo + '" alt="" loading="lazy"></span>' : '<span class="quote__logo quote__logo--initial">' + esc(q.school.charAt(0)) + '</span>';
      return '<figure class="quote" data-i="' + i + '"><span class="quote__mark" aria-hidden="true">&ldquo;</span>' +
        '<blockquote class="quote__text">' + words + '</blockquote>' +
        '<figcaption class="quote__by">' + logo + '<span><span class="quote__name">' + esc(q.name) + '</span><br><span class="quote__role">' + esc(q.role) + ', ' + esc(q.school) + '</span></span></figcaption></figure>';
    }).join('');
    var items = $$('.quote', stage);

    function go(i) {
      cur = (i + list.length) % list.length;
      items.forEach(function (it, n) { it.classList.toggle('is-active', n === cur); it.classList.remove('is-shown'); });
      requestAnimationFrame(function () { requestAnimationFrame(function () { items[cur].classList.add('is-shown'); }); });
      count.textContent = String(cur + 1).padStart(2, '0') + ' / ' + String(list.length).padStart(2, '0');
      bar.classList.remove('is-running'); void bar.offsetWidth;
      if (!reduced) { bar.style.setProperty('--dur', DUR + 'ms'); bar.classList.add('is-running'); }
      clearTimeout(timer);
      if (!reduced) timer = setTimeout(function () { go(cur + 1); }, DUR);
    }
    $('[data-quotes-prev]', wrap).addEventListener('click', function () { go(cur - 1); });
    $('[data-quotes-next]', wrap).addEventListener('click', function () { go(cur + 1); });
    var started = false;
    var qio = new IntersectionObserver(function (en) {
      if (en[0].isIntersecting && !started) { started = true; go(0); }
    }, { threshold: 0.3 });
    qio.observe(wrap);
  }
  $$('[data-quotes]').forEach(initQuotes);

  /* ---------- Sub-nav active state ---------- */
  var subLinks = $$('.subnav__links a');
  if (subLinks.length && 'IntersectionObserver' in window) {
    var sio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        subLinks.forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('href') === '#' + en.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    subLinks.forEach(function (a) { var s = $(a.getAttribute('href')); if (s) sio.observe(s); });
  }

  /* ---------- Misc ---------- */
  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  // Expose helpers for page scripts
  window.DCUI = {
    $: $, $$: $$, esc: esc, icon: icon, store: store, toast: toast,
    cardHTML: cardHTML, artHTML: artHTML, lineHTML: lineHTML, upsellHTML: upsellHTML, thumbHTML: thumbHTML,
    Cart: Cart, renderCart: renderCart, observeReveals: observeReveals, onReady: onReady, openModal: openModal
  };

  observeReveals(doc);
  renderCart();
  parallax();
  startIntro();
})();
