/* Lasting Change Wellness — motion layer.
   GSAP + ScrollTrigger drive the scroll choreography. Native scrolling is kept on purpose
   (no scroll hijacking). Everything degrades gracefully if a library fails to load. */
(function () {
  'use strict';
  var html = document.documentElement;
  var LCW = window.LCW || {};
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var gsap = window.gsap, ST = window.ScrollTrigger;
  var hasGsap = !!(gsap && ST) && !reduce;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  if (reduce) return;
  if (hasGsap) { gsap.registerPlugin(ST); html.classList.add('has-gsap'); }

  /* ---------- Footer wordmark: split into letters ---------- */
  var wm = $('[data-wordmark]');
  if (wm) {
    wm.innerHTML = wm.textContent.trim().split(' ').map(function (word, wi) {
      return word.split('').map(function (ch) { return '<span class="fw-char' + (wi ? ' fw-serif' : '') + '">' + ch + '</span>'; }).join('');
    }).join('<span class="fw-char">&nbsp;</span>');
  }

  /* ---------- Velocity marquee ---------- */
  var lastY = window.scrollY, velocity = 0, direction = 1;
  (function sample() {
    var y = window.scrollY, d = y - lastY;
    velocity += (d - velocity) * 0.2;
    if (Math.abs(d) > 0.5) direction = d > 0 ? 1 : -1;
    lastY = y;
    requestAnimationFrame(sample);
  })();
  if (hasGsap) {
    $$('.marquee__track').forEach(function (track) {
      var x = 0, slow = track.closest('.logos') ? 0.35 : 0.6, visible = true;
      if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }).observe(track);
      (function loop() {
        requestAnimationFrame(loop);
        if (!visible) return;
        x -= (slow + Math.min(Math.abs(velocity) * 0.25, 14)) * direction;
        var half = track.scrollWidth / 2;
        if (x <= -half) x += half;
        if (x > 0) x -= half;
        track.style.transform = 'translate3d(' + x.toFixed(2) + 'px,0,0)';
      })();
    });
  }

  /* ---------- Custom cursor + magnetic buttons ---------- */
  if (fine) {
    html.classList.add('has-cursor');
    var cursor = $('.cursor'), ring = $('.cursor__ring'), dot = $('.cursor__dot'), label = $('.cursor__label');
    var mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
    // Carry the cursor over from the previous page so it doesn't vanish and pop back in.
    var restoreCursor = function () {
      try {
        var saved = (sessionStorage.getItem('lcw-cur') || '').split(',');
        if (saved.length === 2 && html.classList.contains('is-entering')) { rx = mx = +saved[0]; ry = my = +saved[1]; cursor.classList.add('is-ready'); }
      } catch (e) {}
    };
    if (document.prerendering) document.addEventListener('prerenderingchange', restoreCursor, { once: true }); else restoreCursor();
    var saveCursor = function () { try { sessionStorage.setItem('lcw-cur', Math.round(mx) + ',' + Math.round(my)); } catch (e) {} };
    window.addEventListener('pagehide', saveCursor);
    document.addEventListener('click', saveCursor, true);
    window.addEventListener('mousemove', function (e) {
      mx = e.clientX; my = e.clientY;
      if (!cursor.classList.contains('is-ready')) { rx = mx; ry = my; cursor.classList.add('is-ready'); }
      cursor.classList.remove('is-hidden');
    }, { passive: true });
    document.addEventListener('mouseleave', function () { cursor.classList.add('is-hidden'); });
    window.addEventListener('mousedown', function () { cursor.classList.add('is-down'); });
    window.addEventListener('mouseup', function () { cursor.classList.remove('is-down'); });
    (function follow() {
      rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
      dot.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0)';
      ring.style.transform = 'translate3d(' + rx + 'px,' + ry + 'px,0)';
      requestAnimationFrame(follow);
    })();
    var darkSel = '.hero__frame, .phero__frame, .is-dark, .shine__frame, .cta__frame, .site-footer, .theme-dark, .tile--dark, .tile--media, .menu, .exp-frame, .flip:not(.is-on) .flip__card, .price--feature';
    document.addEventListener('mouseover', function (e) {
      var t = e.target;
      var lab = t.closest('[data-cursor]');
      var hov = t.closest('a, button, summary, label, input, select, textarea, iframe');
      cursor.classList.toggle('on-dark', !!t.closest(darkSel) && !t.closest('.exp-frame--light, .intention'));
      if (lab) { label.textContent = lab.dataset.cursor; cursor.classList.add('is-label'); cursor.classList.remove('is-hover'); }
      else if (hov) { cursor.classList.add('is-hover'); cursor.classList.remove('is-label'); }
      else cursor.classList.remove('is-hover', 'is-label');
    });
    if (hasGsap) {
      $$('.btn, .circle-btn, .icon-btn, .menu-btn, .mini-arrow').forEach(function (el) {
        var strength = el.classList.contains('btn') ? 0.24 : 0.38;
        el.addEventListener('mousemove', function (e) {
          var r = el.getBoundingClientRect();
          gsap.to(el, { x: (e.clientX - (r.left + r.width / 2)) * strength, y: (e.clientY - (r.top + r.height / 2)) * strength, duration: 0.6, ease: 'power3.out' });
        });
        el.addEventListener('mouseleave', function () { gsap.to(el, { x: 0, y: 0, duration: 1, ease: 'elastic.out(1, 0.35)' }); });
      });
      /* Gentle 3D tilt on cards */
      $$('[data-tilt]').forEach(function (el) {
        el.style.transformPerspective = '900px';
        el.addEventListener('mousemove', function (e) {
          var r = el.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
          gsap.to(el, { rotateY: px * 6, rotateX: -py * 6, duration: 0.8, ease: 'power3.out', transformPerspective: 900 });
        });
        el.addEventListener('mouseleave', function () { gsap.to(el, { rotateY: 0, rotateX: 0, duration: 1.2, ease: 'elastic.out(1, 0.4)' }); });
      });
    }
  }

  if (!hasGsap) return;

  /* ====================== GSAP scroll choreography ====================== */
  var mm = gsap.matchMedia();

  // Hero frames ease back and the copy lifts away as you scroll.
  $$('.hero, .phero').forEach(function (hero) {
    var frame = $('.hero__frame, .phero__frame', hero), media = $('.hero__media, .phero__media', hero), content = $('.hero__content, .phero__content', hero), card = $('.hero__card', hero);
    var trig = { trigger: hero, start: 'top top', end: 'bottom top', scrub: true };
    // Set up now, while the page is still covered, so nothing is measured mid-reveal.
    gsap.to(frame, { scale: 0.92, yPercent: 6, ease: 'none', transformOrigin: '50% 0%', scrollTrigger: trig });
    gsap.to(media, { yPercent: 14, ease: 'none', scrollTrigger: trig });
    gsap.to(content, { yPercent: -16, opacity: 0, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom 20%', scrub: true } });
    if (card) gsap.to(card, { yPercent: -40, opacity: 0, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: '40% top', scrub: true } });
  });

  // Parallax inside image frames.
  $$('.media').forEach(function (m) {
    if (m.closest('.stack-card, .hero, .phero')) return;
    var im = $('img', m);
    if (!im) return;
    gsap.fromTo(im, { yPercent: -6, scale: 1.16 }, { yPercent: 6, scale: 1.16, ease: 'none', scrollTrigger: { trigger: m, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  $$('.tile--media > img').forEach(function (im) {
    gsap.fromTo(im, { yPercent: -5, scale: 1.14 }, { yPercent: 5, scale: 1.14, ease: 'none', scrollTrigger: { trigger: im.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  // Statement that lights up word by word.
  $$('[data-scrub-words]').forEach(function (el) {
    (function wrap(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (c) {
        if (c.nodeType === 3) {
          var f = document.createDocumentFragment();
          c.textContent.split(/(\s+)/).forEach(function (w) {
            if (!w) return;
            if (/^\s+$/.test(w)) { f.appendChild(document.createTextNode(' ')); return; }
            var s = document.createElement('span'); s.className = 'sw'; s.textContent = w; f.appendChild(s);
          });
          c.parentNode.replaceChild(f, c);
        } else if (c.nodeType === 1 && !c.classList.contains('inline-img')) wrap(c);
      });
    })(el);
    gsap.to($$('.sw, .inline-img', el), { opacity: 1, stagger: 0.12, ease: 'none', scrollTrigger: { trigger: el, start: 'top 82%', end: 'bottom 45%', scrub: 0.6 } });
  });

  // Bento + card grids rise in as rows enter.
  var risers = $$('[data-rise-in] > *');
  if (risers.length) {
    gsap.set(risers, { opacity: 0, y: 60 });
    ST.batch(risers, { start: 'top 92%', onEnter: function (b) { gsap.to(b, { opacity: 1, y: 0, duration: 1.2, ease: 'expo.out', stagger: 0.08, overwrite: true }); } });
  }

  // Pinned horizontal S.H.I.N.E. ride (desktop): the room gets brighter as you go.
  mm.add('(min-width: 1024px)', function () {
    var section = $('[data-hscroll]');
    if (!section) return;
    var track = $('.shine__track', section), prog = $('.shine__progress', section), frame = $('.shine__frame', section), cards = $$('.scard', section);
    section.classList.add('is-pinned');
    var dist = function () { return Math.max(0, track.scrollWidth - window.innerWidth + 2 * parseFloat(getComputedStyle(section).paddingLeft)); };
    var tween = gsap.to(track, {
      x: function () { return -dist(); }, ease: 'none',
      scrollTrigger: {
        trigger: section, start: 'top top', end: function () { return '+=' + dist(); }, pin: true, scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1,
        onUpdate: function (self) {
          if (prog) prog.style.setProperty('--hp', self.progress.toFixed(4));
          frame.style.setProperty('--glow', (0.3 + self.progress * 0.9).toFixed(3));
        }
      }
    });
    cards.forEach(function (c) {
      ST.create({ trigger: c, containerAnimation: tween, start: 'left 70%', end: 'right 30%', toggleClass: 'is-lit' });
      gsap.fromTo($('.scard__letter', c), { xPercent: 18 }, { xPercent: -10, ease: 'none', scrollTrigger: { trigger: c, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } });
    });
    return function () { section.classList.remove('is-pinned'); gsap.set(track, { x: 0 }); cards.forEach(function (c) { c.classList.remove('is-lit'); }); };
  });
  mm.add('(max-width: 1023px)', function () {
    $$('.scard').forEach(function (c) { c.classList.add('is-lit'); });
    // On touch screens the row is swiped, so the room brightens as you swipe.
    var section = $('[data-hscroll]');
    if (!section) return;
    var track = $('.shine__track', section), prog = $('.shine__progress', section), frame = $('.shine__frame', section);
    var onScroll = function () {
      var max = track.scrollWidth - track.clientWidth, pr = max > 0 ? Math.min(1, Math.max(0, track.scrollLeft / max)) : 0;
      if (prog) prog.style.setProperty('--hp', pr.toFixed(4));
      frame.style.setProperty('--glow', (0.3 + pr * 0.9).toFixed(3));
    };
    track.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return function () { track.removeEventListener('scroll', onScroll); frame.style.removeProperty('--glow'); if (prog) prog.style.removeProperty('--hp'); };
  });

  // Stacking process cards: each covered card eases back and dims.
  mm.add('(min-width: 900px)', function () {
    var cards = $$('[data-stack] .stack-card');
    cards.forEach(function (card, i) {
      card.style.setProperty('--i', i);
      var next = cards[i + 1];
      if (!next) return;
      var trig = { trigger: next, start: 'top bottom', end: 'top ' + (104 + (i + 1) * 22) + 'px', scrub: true };
      gsap.to(card, { scale: 0.93, ease: 'none', scrollTrigger: trig });
      gsap.to($('.stack-card__shade', card), { opacity: 0.5, ease: 'none', scrollTrigger: { trigger: next, start: 'top bottom', end: 'top ' + (104 + (i + 1) * 22) + 'px', scrub: true } });
    });
  });

  // Big numbers and statements drift for depth.
  mm.add('(min-width: 900px)', function () {
    $$('.head--split .h-lg, .head--split .h-xl, .thero__title').forEach(function (h) {
      gsap.fromTo(h, { y: 20 }, { y: -20, ease: 'none', scrollTrigger: { trigger: h, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    $$('[data-float]').forEach(function (el) {
      var amt = parseFloat(el.dataset.float) || 40;
      gsap.fromTo(el, { y: amt }, { y: -amt, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  });

  // CTA: the panel's corners soften as it arrives.
  $$('.cta__frame').forEach(function (f) {
    gsap.fromTo(f, { borderRadius: '64px' }, { borderRadius: getComputedStyle(f).borderRadius, ease: 'none', scrollTrigger: { trigger: f, start: 'top bottom', end: 'top 40%', scrub: true } });
  });

  // Footer: giant wordmark letters rise into place.
  if (wm) gsap.from($$('.fw-char', wm), { yPercent: 110, duration: 1.4, ease: 'expo.out', stagger: 0.035, scrollTrigger: { trigger: wm, start: 'top 98%' } });

  // Re-measure scroll effects before the page is revealed (called by main.js), and afterwards
  // only if the page height actually changed, so a late refresh never causes a visible jump.
  var lastH = 0;
  function refreshIfChanged() {
    var h = document.documentElement.scrollHeight;
    if (Math.abs(h - lastH) > 2) { lastH = h; ST.refresh(); }
  }
  LCW.prime = function () { ST.refresh(); lastH = document.documentElement.scrollHeight; };
  window.addEventListener('load', function () { setTimeout(refreshIfChanged, 1600); });
  if (document.fonts) document.fonts.ready.then(function () { setTimeout(refreshIfChanged, 1600); });
})();
