/* Insight Transformational Coaching — scroll motion (GSAP + ScrollTrigger + Lenis).
   Everything here is an enhancement: if a library is missing or the visitor prefers
   reduced motion, the page stays complete and readable. */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var gsap = window.gsap, ST = window.ScrollTrigger;
  var IT = window.IT = window.IT || {};
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  if (reduce || !gsap || !ST) return;
  gsap.registerPlugin(ST);

  /* ---------- Smooth scrolling (desktop pointers only) ---------- */
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (fine && window.Lenis) {
    var lenis = new window.Lenis({ duration: 1.15, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }, smoothWheel: true });
    IT.lenis = lenis;
    lenis.on("scroll", ST.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
    if (document.documentElement.classList.contains("is-loading")) lenis.stop();
    // Smooth in-page anchor links
    document.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a || a.hasAttribute("data-top")) return;
      var id = a.getAttribute("href"); if (id.length < 2) return;
      var t = document.querySelector(id); if (!t) return;
      e.preventDefault(); lenis.scrollTo(t, { offset: -100 });
    });
    if (location.hash) {
      var target = document.querySelector(location.hash);
      if (target) window.addEventListener("load", function () { setTimeout(function () { lenis.scrollTo(target, { offset: -100, immediate: true }); }, 60); });
    }
  }

  /* ---------- Scroll-lit statements ---------- */
  function splitWords(el) {
    var frag = document.createDocumentFragment();
    Array.prototype.slice.call(el.childNodes).forEach(function (node) {
      if (node.nodeType === 3) {
        node.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) frag.appendChild(document.createTextNode(part));
          else { var s = document.createElement("span"); s.className = "w"; s.textContent = part; frag.appendChild(s); }
        });
      } else if (node.nodeType === 1 && node.classList.contains("ipill")) {
        node.classList.add("w"); frag.appendChild(node);
      } else if (node.nodeType === 1) {
        splitWords(node); frag.appendChild(node);
      } else frag.appendChild(node);
    });
    while (el.firstChild) el.removeChild(el.firstChild);
    el.appendChild(frag);
  }
  $$("[data-words]").forEach(function (el) {
    splitWords(el);
    var words = $$(".w", el);
    gsap.to(words, { opacity: 1, stagger: 0.12, ease: "none", scrollTrigger: { trigger: el, start: "top 82%", end: "bottom 48%", scrub: 0.6 } });
  });

  /* ---------- Image parallax ---------- */
  $$("[data-parallax]").forEach(function (img) {
    gsap.fromTo(img, { yPercent: -7 }, { yPercent: 7, ease: "none", scrollTrigger: { trigger: img.parentElement, start: "top bottom", end: "bottom top", scrub: true } });
  });

  /* ---------- Hero drift on scroll ---------- */
  var hero = document.querySelector("[data-hero]");
  if (hero) {
    gsap.to(hero.querySelector(".hero__copy"), { yPercent: -10, opacity: 0.35, ease: "none", scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true } });
    gsap.to(hero.querySelector(".hero__visual"), { yPercent: -6, ease: "none", scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true } });
  }
  $$(".phero__card").forEach(function (card) {
    var t = card.querySelector(".phero__title");
    if (t) gsap.to(t, { yPercent: -14, ease: "none", scrollTrigger: { trigger: card, start: "top top", end: "bottom top", scrub: true } });
  });

  /* ---------- Marquee leans with scroll velocity ---------- */
  $$(".marquee__track").forEach(function (track) {
    var skew = gsap.quickTo(track, "skewX", { duration: 0.5, ease: "power3" });
    ST.create({ trigger: track, start: "top bottom", end: "bottom top", onUpdate: function (self) { skew(gsap.utils.clamp(-8, 8, self.getVelocity() / -260)); } });
  });

  /* ---------- Journey: pinned sunrise (desktop) ---------- */
  var journey = document.querySelector("[data-journey]");
  if (journey) {
    var mm = gsap.matchMedia();
    mm.add("(min-width: 1025px) and (min-height: 640px)", function () {
      journey.classList.remove("journey--static");
      var words = $$(".journey__word", journey), panels = $$(".jpanel", journey), bars = $$(".journey__bar i", journey);
      var sun = journey.querySelector(".journey__sun"), last = -1;
      var st = ST.create({
        trigger: journey, start: "top top", end: "+=180%", pin: true, scrub: true, anticipatePin: 1,
        onUpdate: function (self) {
          var p = self.progress, idx = Math.min(2, Math.floor(p * 3 * 0.999));
          if (idx !== last) {
            words.forEach(function (w, i) { w.classList.toggle("is-active", i === idx); });
            panels.forEach(function (pn, i) { pn.classList.toggle("is-active", i === idx); });
            last = idx;
          }
          bars.forEach(function (b, i) { b.style.setProperty("--p", gsap.utils.clamp(0, 1, p * 3 - i)); });
          sun.style.setProperty("--sun-y", (32 - p * 44) + "%");
          sun.style.setProperty("--sun-s", (0.75 + p * 0.45).toFixed(3));
          sun.style.setProperty("--sun-o", (0.55 + p * 0.45).toFixed(3));
        }
      });
      return function () {
        st.kill();
        journey.classList.add("journey--static");
        $$(".jpanel", journey).forEach(function (pn) { pn.classList.add("is-active"); });
      };
    });
  }

  /* ---------- About: ontology circles breathe apart then together ---------- */
  var onto = document.querySelector("[data-onto]");
  if (onto) {
    var cs = $$(".onto__c", onto), off = [[0, -26], [-24, 18], [24, 18]];
    cs.forEach(function (c, i) {
      gsap.fromTo(c, { x: off[i][0] * 2.2, y: off[i][1] * 2.2 }, { x: 0, y: 0, ease: "none", scrollTrigger: { trigger: onto, start: "top 85%", end: "center 50%", scrub: 0.8 } });
    });
  }

  /* ---------- Footer sunrise ---------- */
  $$(".ftr__card").forEach(function (card) {
    gsap.fromTo(card, { "--rise": "45%" }, { "--rise": "-8%", ease: "none", scrollTrigger: { trigger: card, start: "top bottom", end: "top 20%", scrub: true } });
    var giant = card.querySelector(".ftr__giant span");
    if (giant) gsap.fromTo(giant, { yPercent: 45 }, { yPercent: 14, ease: "none", scrollTrigger: { trigger: giant, start: "top bottom", end: "bottom bottom", scrub: true } });
  });

  window.addEventListener("load", function () { ST.refresh(); if (IT.positionNotes) IT.positionNotes(); });
  if (document.fonts) document.fonts.ready.then(function () { ST.refresh(); });
  ST.addEventListener("refresh", function () { if (IT.positionNotes) IT.positionNotes(); });
})();
