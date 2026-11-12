/* Insight Transformational Coaching — scroll motion (GSAP + ScrollTrigger + Lenis).
   Quiet, editorial movement. Everything here is optional: without the libraries,
   or with reduced motion, the page is complete and readable. */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var gsap = window.gsap, ST = window.ScrollTrigger;
  var IT = window.IT = window.IT || {};
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  if (reduce || !gsap || !ST) return;
  gsap.registerPlugin(ST);
  ST.config({ ignoreMobileResize: true });
  gsap.config({ force3D: true });

  /* Smooth scrolling on desktop pointers */
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (fine && window.Lenis) {
    var lenis = new window.Lenis({ lerp: 0.12, wheelMultiplier: 1, smoothWheel: true });
    IT.lenis = lenis;
    lenis.on("scroll", ST.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
    document.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a || a.hasAttribute("data-top")) return;
      var id = a.getAttribute("href"); if (id.length < 2) return;
      var t = document.querySelector(id); if (!t) return;
      e.preventDefault(); lenis.scrollTo(t, { offset: -90 });
    });
    if (location.hash) {
      var target = document.querySelector(location.hash);
      if (target) window.addEventListener("load", function () { setTimeout(function () { lenis.scrollTo(target, { offset: -90, immediate: true }); }, 60); });
    }
  }

  /* Statements light up word by word */
  function splitWords(el) {
    var frag = document.createDocumentFragment();
    Array.prototype.slice.call(el.childNodes).forEach(function (node) {
      if (node.nodeType === 3) {
        node.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) frag.appendChild(document.createTextNode(part));
          else { var s = document.createElement("span"); s.className = "w"; s.textContent = part; frag.appendChild(s); }
        });
      } else if (node.nodeType === 1) { splitWords(node); frag.appendChild(node); }
      else frag.appendChild(node);
    });
    while (el.firstChild) el.removeChild(el.firstChild);
    el.appendChild(frag);
  }
  $$("[data-words]").forEach(function (el) {
    splitWords(el);
    gsap.to($$(".w", el), { opacity: 1, stagger: 0.12, ease: "none", scrollTrigger: { trigger: el, start: "top 82%", end: "bottom 50%", scrub: 0.6 } });
  });

  /* Gentle image parallax */
  $$("[data-parallax]").forEach(function (img) {
    gsap.fromTo(img, { yPercent: -6 }, { yPercent: 6, ease: "none", scrollTrigger: { trigger: img.parentElement, start: "top bottom", end: "bottom top", scrub: true } });
  });

  /* Hero: headline, portrait and photo tile drift apart as you scroll away */
  var hero = document.querySelector("[data-hero]");
  if (hero) {
    var ht = hero.querySelector(".vhero__title"), hi = hero.querySelector(".vhero__img img");
    if (ht) gsap.to(ht, { yPercent: -14, ease: "none", scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true } });
    if (hi) gsap.fromTo(hi, { scale: 1.06 }, { scale: 1.16, yPercent: 6, ease: "none", scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true } });
  }

  /* Gandhi lines slide in from alternating sides */
  $$(".gandhi p").forEach(function (line, i) {
    gsap.fromTo(line, { xPercent: i % 2 ? 10 : -10 }, { xPercent: 0, ease: "none", scrollTrigger: { trigger: line, start: "top bottom", end: "top 55%", scrub: 0.6 } });
  });

  /* Big CTA headline scales up into view */
  var big = document.querySelector(".bigcta h2");
  if (big) gsap.fromTo(big, { scale: .84 }, { scale: 1, ease: "none", scrollTrigger: { trigger: big, start: "top bottom", end: "center 55%", scrub: 0.6 } });

  /* Marquee leans with scroll speed */
  $$(".mq__track").forEach(function (track) {
    var skew = gsap.quickTo(track, "skewX", { duration: 0.5, ease: "power3" });
    ST.create({ trigger: track, start: "top bottom", end: "bottom top", onUpdate: function (self) { skew(gsap.utils.clamp(-10, 10, self.getVelocity() / -220)); } });
  });

  /* About: the three circles drift together */
  var onto = document.querySelector("[data-onto]");
  if (onto) {
    var off = [[0, -26], [-24, 18], [24, 18]];
    $$(".onto__c", onto).forEach(function (c, i) {
      gsap.fromTo(c, { x: off[i][0] * 2, y: off[i][1] * 2 }, { x: 0, y: 0, ease: "none", scrollTrigger: { trigger: onto, start: "top 85%", end: "center 55%", scrub: 0.8 } });
    });
  }

  var desktop = window.matchMedia("(min-width: 1025px)").matches;
  var settle = function (el) { el.removeAttribute("data-reveal"); el.classList.add("is-in"); };

  /* Scroll progress bar */
  var bar = document.querySelector(".progress i");
  if (bar) gsap.to(bar, { scaleX: 1, ease: "none", scrollTrigger: { trigger: document.documentElement, start: "top top", end: "bottom bottom", scrub: 0.3 } });

  /* Section headings rise word by word from behind a mask */
  function maskWords(el) {
    Array.prototype.slice.call(el.childNodes).forEach(function (node) {
      if (node.nodeType === 3) {
        var frag = document.createDocumentFragment();
        node.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
          var o = document.createElement("span"), i = document.createElement("span");
          o.className = "wm"; i.textContent = part; o.appendChild(i); frag.appendChild(o);
        });
        el.replaceChild(frag, node);
      } else if (node.nodeType === 1 && node.tagName !== "BR") maskWords(node);
    });
  }
  $$(".section h2.h2, .method__intro h2, .bigcta h2, .qtile--accent h3").forEach(function (h) {
    if (h.closest("[data-words]")) return;
    settle(h);
    maskWords(h);
    gsap.from($$(".wm > span", h), { yPercent: 115, rotate: 4, duration: 1.1, ease: "power4.out", stagger: 0.045, scrollTrigger: { trigger: h, start: "top 86%" } });
  });

  /* Photos reveal upward from a clip and settle from a zoom */
  $$(".tile--photo img, .signs__img img, .meet__img .arch img, .tabpanel__media img, .who__img img, .process__img img, .jcard__img img").forEach(function (img) {
    gsap.fromTo(img, { clipPath: "inset(100% 0% 0% 0%)", scale: 1.3 }, { clipPath: "inset(0% 0% 0% 0%)", scale: 1, duration: 1.5, ease: "expo.out", clearProps: "transform", scrollTrigger: { trigger: img.parentElement, start: "top 88%" } });
  });

  /* Card groups cascade in */
  [[".ptiles", ".ptile"], [".bento", ".tile"], [".qtiles", ".qtile"], [".plans", ".plan"], [".values", ".value"], [".who", ".who__card"], [".outcomes", ".outcome"]].forEach(function (pair) {
    $$(pair[0]).forEach(function (wrap) {
      var items = $$(pair[1], wrap); items.forEach(settle);
      gsap.from(items, { y: 70, opacity: 0, duration: 1.1, ease: "power3.out", stagger: 0.07, clearProps: "transform,opacity", scrollTrigger: { trigger: wrap, start: "top 85%" } });
    });
  });

  /* Inline photo pills pop in with the statement */
  $$(".pill").forEach(function (p) {
    gsap.from(p, { scale: 0, rotate: -12, duration: 1, ease: "back.out(2.2)", scrollTrigger: { trigger: p, start: "top 82%" } });
  });

  /* Method: cards drift at different speeds, letters rise */
  var mcards = $$(".mc");
  mcards.forEach(function (c, i) {
    settle(c);
    gsap.from(c.querySelector(".mc__letter"), { yPercent: 70, opacity: 0, duration: 1.2, ease: "power4.out", scrollTrigger: { trigger: c, start: "top 82%" } });
    if (desktop) gsap.fromTo(c, { y: 60 + i * 50 }, { y: 0, ease: "none", scrollTrigger: { trigger: c.parentElement, start: "top bottom", end: "top 25%", scrub: 0.8 } });
  });

  /* How it works: stacking cards shrink as the next one slides over */
  if (desktop) {
    var steps = $$(".pstep");
    steps.forEach(function (card, i) {
      settle(card);
      var next = steps[i + 1]; if (!next) return;
      gsap.to(card, { scale: 0.94 - (steps.length - i - 2) * 0.02, ease: "none", scrollTrigger: { trigger: next, start: "top bottom", end: "top 30%", scrub: true } });
    });
  }

  /* Word band: two rows of giant words slide in opposite directions */
  var band = document.querySelector("[data-wordband]");
  if (band) {
    gsap.fromTo(band.querySelector(".wordband__row--a"), { xPercent: 0 }, { xPercent: -28, ease: "none", scrollTrigger: { trigger: band, start: "top bottom", end: "bottom top", scrub: 0.4 } });
    gsap.fromTo(band.querySelector(".wordband__row--b"), { xPercent: -28 }, { xPercent: 0, ease: "none", scrollTrigger: { trigger: band, start: "top bottom", end: "bottom top", scrub: 0.4 } });
    gsap.fromTo(band.querySelector(".wordband__img img"), { yPercent: -12 }, { yPercent: 0, ease: "none", scrollTrigger: { trigger: band, start: "top bottom", end: "bottom top", scrub: true } });
    gsap.fromTo(band, { scale: 0.92 }, { scale: 1, ease: "none", scrollTrigger: { trigger: band, start: "top bottom", end: "top 35%", scrub: 0.6 } });
  }

  /* "Is this you?": each line brightens as it reaches the middle of the screen */
  var signs = document.querySelector("[data-signs]");
  if (signs) {
    signs.classList.add("is-live");
    $$(".sign", signs).forEach(function (li) {
      ST.create({ trigger: li, start: "top 62%", end: "bottom 38%", toggleClass: { targets: li, className: "is-on" } });
      gsap.from(li.querySelector("p"), { x: 40, duration: 1, ease: "power3.out", scrollTrigger: { trigger: li, start: "top 88%" } });
    });
  }

  /* "How it works": the path draws itself, stops light up, photos swing in */
  var route = document.querySelector("[data-route]");
  if (route) {
    var fill = route.querySelector(".route__line i");
    gsap.to(fill, { scaleY: 1, ease: "none", scrollTrigger: { trigger: route, start: "top 60%", end: "bottom 60%", scrub: 0.5 } });
    $$(".stop", route).forEach(function (stop, i) {
      ST.create({ trigger: stop, start: "top 60%", onEnter: function () { stop.classList.add("is-on"); }, onLeaveBack: function () { stop.classList.remove("is-on"); } });
      var dir = i % 2 ? -1 : 1;
      gsap.from(stop.querySelector(".stop__media"), { x: 80 * dir, rotate: 6 * dir, opacity: 0, duration: 1.3, ease: "power4.out", scrollTrigger: { trigger: stop, start: "top 80%" } });
      gsap.from(stop.querySelector(".stop__body"), { x: -50 * dir, opacity: 0, duration: 1.1, ease: "power3.out", scrollTrigger: { trigger: stop, start: "top 80%" } });
    });
  }

  /* Meet: stats count and rise */
  $$(".meet__stats div, .tile__big").forEach(function (el, i) {
    gsap.from(el, { y: 40, opacity: 0, duration: 1, ease: "power3.out", delay: (i % 3) * 0.08, scrollTrigger: { trigger: el, start: "top 90%" } });
  });

  /* Footer wordmark lifts into place */
  var word = document.querySelector(".ftr__word");
  if (word) gsap.fromTo(word, { yPercent: 55, opacity: .2 }, { yPercent: 0, opacity: 1, ease: "none", scrollTrigger: { trigger: word, start: "top bottom", end: "bottom bottom", scrub: 0.6 } });

  /* Pointer-led depth: hero photo follows the mouse, cards tilt */
  if (fine) {
    var hcard = document.querySelector(".vhero__card"), himg = document.querySelector(".vhero__img");
    if (hcard && himg) {
      var mx = gsap.quickTo(himg, "x", { duration: 1.2, ease: "power3" }), my = gsap.quickTo(himg, "y", { duration: 1.2, ease: "power3" });
      hcard.addEventListener("mousemove", function (e) { var r = hcard.getBoundingClientRect(); mx(((e.clientX - r.left) / r.width - 0.5) * -24); my(((e.clientY - r.top) / r.height - 0.5) * -16); });
    }
    $$(".tile--photo, .qtile--accent").forEach(function (card) {
      var rx = gsap.quickTo(card, "rotationX", { duration: 0.6, ease: "power3" }), ry = gsap.quickTo(card, "rotationY", { duration: 0.6, ease: "power3" });
      gsap.set(card, { transformPerspective: 900 });
      card.addEventListener("mousemove", function (e) { var r = card.getBoundingClientRect(); ry(((e.clientX - r.left) / r.width - 0.5) * 7); rx(((e.clientY - r.top) / r.height - 0.5) * -7); });
      card.addEventListener("mouseleave", function () { rx(0); ry(0); });
    });
  }

  window.addEventListener("load", function () { ST.refresh(); if (IT.positionNotes) IT.positionNotes(); });
  if (document.fonts) document.fonts.ready.then(function () { ST.refresh(); });
  ST.addEventListener("refresh", function () { if (IT.positionNotes) IT.positionNotes(); });
})();
