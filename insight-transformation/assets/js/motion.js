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

  /* Smooth scrolling on desktop pointers */
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (fine && window.Lenis) {
    var lenis = new window.Lenis({ duration: 1.1, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }, smoothWheel: true });
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

  window.addEventListener("load", function () { ST.refresh(); if (IT.positionNotes) IT.positionNotes(); });
  if (document.fonts) document.fonts.ready.then(function () { ST.refresh(); });
  ST.addEventListener("refresh", function () { if (IT.positionNotes) IT.positionNotes(); });
})();
