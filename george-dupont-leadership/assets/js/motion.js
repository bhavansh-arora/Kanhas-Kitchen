/* George Dupont Leadership — motion layer (GSAP + ScrollTrigger + Lenis). */
(function () {
  "use strict";
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var loader = $(".loader");
  var CFG = window.GDL || {};

  // Helix and embers draw without GSAP, so set them up first.
  initHelix();
  initEmbers();

  if (!window.gsap || !window.ScrollTrigger) {
    if (loader) loader.classList.add("is-done");
    return;
  }
  var gsap = window.gsap;
  var ST = window.ScrollTrigger;
  gsap.registerPlugin(ST);
  gsap.config({ nullTargetWarn: false });

  /* ---------- smooth scroll ---------- */
  if (!reduced && window.Lenis) {
    var lenis = new window.Lenis({ lerp: 0.105, wheelMultiplier: 1, smoothWheel: true });
    window.__lenis = lenis;
    lenis.on("scroll", ST.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }
  $$('a[href^="#"], a[href*=".html#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var href = a.getAttribute("href");
      var hash = href.slice(href.indexOf("#"));
      var path = href.split("#")[0];
      if (path && path !== location.pathname.split("/").pop() && !(path === "index.html" && /\/$|index\.html$/.test(location.pathname))) return;
      var target = hash === "#main" || hash === "#" ? document.body : document.querySelector(hash);
      if (!target) return;
      e.preventDefault();
      if (window.__lenis) window.__lenis.scrollTo(target === document.body ? 0 : target, { offset: -90, duration: 1.4 });
      else target === document.body ? window.scrollTo(0, 0) : target.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
    });
  });

  /* ---------- scroll progress ---------- */
  var prog = $(".progress span");
  if (prog) gsap.to(prog, { scaleX: 1, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: 0.3 } });

  /* ---------- text splitting ---------- */
  function splitWords(el) {
    if (el.__split) return el.__split;
    var words = [];
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var parts = n.textContent.split(/(\s+)/);
          var frag = document.createDocumentFragment();
          parts.forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
            var w = document.createElement("span"); w.className = "sw";
            var i = document.createElement("span"); i.textContent = p;
            w.appendChild(i); frag.appendChild(w); words.push(i);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1 && !n.classList.contains("tm")) {
          walk(n);
        }
      });
    })(el);
    el.__split = words;
    return words;
  }

  /* ---------- preloader + hero intro ---------- */
  function heroIntro() {
    var tl = gsap.timeline({ defaults: { ease: "expo.out" } });
    var title = $("[data-hero-title]");
    if (title) {
      var lines = $$(".line", title).map(function (l) {
        var w = document.createElement("span"); w.className = "sw"; w.style.display = "block";
        var i = document.createElement("span"); i.style.display = "block";
        while (l.firstChild) i.appendChild(l.firstChild);
        w.appendChild(i); l.appendChild(w); return i;
      });
      tl.from(lines, { yPercent: 110, rotate: 2, duration: 1.4, stagger: 0.09 }, 0);
    }
    var word = $("[data-hero-word]");
    if (word) tl.from(word, { opacity: 0, scale: 1.12, duration: 2, ease: "power3.out" }, 0);
    var fig = $("[data-hero-figure]");
    if (fig) tl.from(fig, { y: 80, opacity: 0, duration: 1.6 }, 0.15);
    tl.from("[data-hero-in]", { y: 28, opacity: 0, duration: 1.2, stagger: 0.08 }, 0.35);
    tl.from(".hero__badge", { scale: 0.6, opacity: 0, duration: 1.2 }, 0.6);
    var ph = $$(".phero [data-split], .phero [data-reveal], .phero .crumbs");
    if (ph.length) {
      $$(".phero [data-split]").forEach(function (h) { tl.from(splitWords(h), { yPercent: 110, duration: 1.3, stagger: 0.035 }, 0.05); h.__done = true; });
      tl.from($$(".phero [data-reveal], .phero .crumbs"), { y: 26, opacity: 0, duration: 1.1, stagger: 0.08 }, 0.3);
      $$(".phero [data-reveal]").forEach(function (e) { e.__done = true; });
      var pf = $(".phero__figure");
      if (pf) tl.from(pf, { y: 60, opacity: 0, duration: 1.5 }, 0.2);
    }
    return tl;
  }

  function runLoader(done) {
    if (!loader) return done();
    var seen = false;
    try { seen = sessionStorage.getItem("gdl-seen") === "1"; sessionStorage.setItem("gdl-seen", "1"); } catch (e) {}
    var panels = $$(".loader__panel", loader), inner = $(".loader__inner", loader);
    if (seen || reduced) {
      gsap.to(loader, { opacity: 0, duration: 0.45, ease: "power2.out", onComplete: function () { loader.classList.add("is-done"); } });
      return done(0.05);
    }
    var count = $(".loader__count", loader), bar = $(".loader__bar i", loader);
    var o = { v: 0 };
    var tl = gsap.timeline();
    tl.from(inner.children, { y: 16, opacity: 0, duration: 0.7, stagger: 0.06, ease: "power3.out" })
      .to(o, { v: 100, duration: 1.5, ease: "power2.inOut", onUpdate: function () {
        count.textContent = String(Math.round(o.v)).padStart(3, "0");
        bar.style.transform = "scaleX(" + o.v / 100 + ")";
      } }, 0.1)
      .to(inner, { opacity: 0, y: -16, duration: 0.5, ease: "power2.in" })
      .to(panels[0], { yPercent: -100, duration: 1.05, ease: "expo.inOut" }, ">-0.1")
      .to(panels[1], { yPercent: 100, duration: 1.05, ease: "expo.inOut" }, "<")
      .add(function () { done(); }, "<0.35")
      .add(function () { loader.classList.add("is-done"); });
  }

  var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  // Build intro once fonts are ready so split measurements are right.
  Promise.race([fontsReady, new Promise(function (r) { setTimeout(r, 1500); })]).then(function () {
    var intro = reduced ? null : heroIntro();
    if (intro) intro.pause(0);
    runLoader(function () { if (intro) intro.play(0); });
    initScroll();
  });

  /* ---------- scroll-driven reveals ---------- */
  function initScroll() {
    if (reduced) {
      $$("[data-count]").forEach(function (el) { el.textContent = el.getAttribute("data-count"); });
      return;
    }

    $$("[data-split]").forEach(function (h) {
      if (h.__done) return;
      var words = splitWords(h);
      gsap.from(words, { yPercent: 110, duration: 1.2, ease: "expo.out", stagger: 0.03, scrollTrigger: { trigger: h, start: "top 88%" } });
    });

    $$("[data-reveal]").forEach(function (el) {
      if (el.__done) return;
      gsap.from(el, { y: 44, opacity: 0, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 90%" } });
    });

    $$("[data-stagger]").forEach(function (el) {
      gsap.from(el.children, { y: 40, opacity: 0, duration: 1.1, ease: "expo.out", stagger: 0.08, scrollTrigger: { trigger: el, start: "top 86%" } });
    });

    $$("[data-count]").forEach(function (el) {
      var end = parseFloat(el.getAttribute("data-count"));
      var dec = parseInt(el.getAttribute("data-decimals") || "0", 10);
      var o = { v: 0 };
      el.textContent = (0).toFixed(dec);
      gsap.to(o, { v: end, duration: 2, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 90%" },
        onUpdate: function () { el.textContent = o.v.toFixed(dec); } });
    });

    $$("[data-parallax]").forEach(function (img) {
      gsap.fromTo(img, { yPercent: -8 }, { yPercent: 6, ease: "none", scrollTrigger: { trigger: img.parentElement, start: "top bottom", end: "bottom top", scrub: true } });
    });

    $$("[data-panel]").forEach(function (p) {
      gsap.fromTo(p, { scale: 0.955, y: 40 }, { scale: 1, y: 0, ease: "none", scrollTrigger: { trigger: p, start: "top bottom", end: "top 35%", scrub: true } });
    });

    $$("[data-highlight]").forEach(function (el) {
      var words = splitWords(el).map(function (w) { return w.parentNode; });
      words.forEach(function (w) { w.style.overflow = "visible"; });
      gsap.fromTo(words, { opacity: 0.16 }, { opacity: 1, stagger: 0.1, ease: "none", scrollTrigger: { trigger: el, start: "top 82%", end: "bottom 45%", scrub: true } });
    });

    // hero scroll depth
    var fig = $("[data-hero-figure]");
    if (fig) gsap.to(fig, { yPercent: 10, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
    var word = $("[data-hero-word]");
    if (word) gsap.to(word, { xPercent: -14, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
    var pbg = $(".phero__bg img");
    if (pbg) gsap.to(pbg, { yPercent: 14, scale: 1.08, ease: "none", scrollTrigger: { trigger: ".phero", start: "top top", end: "bottom top", scrub: true } });

    // 90-day timeline line
    var fill = $("[data-timeline-fill]");
    if (fill) gsap.to(fill, { scaleY: 1, ease: "none", scrollTrigger: { trigger: "[data-timeline]", start: "top 70%", end: "bottom 60%", scrub: 0.4 } });

    // footer word
    var fw = $(".ftr__word");
    if (fw) gsap.from(fw, { yPercent: 40, opacity: 0, ease: "none", scrollTrigger: { trigger: ".ftr", start: "top bottom", end: "bottom bottom", scrub: true } });

    initMarquee();
    if (fine) { initCursor(); initMagnetic(); initFloatList(); }
    window.addEventListener("load", function () { ST.refresh(); });
  }

  /* ---------- marquee ---------- */
  function initMarquee() {
    $$("[data-marquee]").forEach(function (m) {
      var track = $(".marquee__track", m), group = $(".marquee__group", m);
      if (!group) return;
      var w = group.offsetWidth;
      var copies = Math.ceil((window.innerWidth * 2) / w) + 1;
      for (var i = 0; i < copies; i++) track.appendChild(group.cloneNode(true));
      var dir = m.hasAttribute("data-reverse") ? 1 : -1;
      var tween = gsap.fromTo(track, { x: dir < 0 ? 0 : -w }, { x: dir < 0 ? -w : 0, duration: w / 70, ease: "none", repeat: -1 });
      var speed = { v: 1 };
      ST.create({
        trigger: m, start: "top bottom", end: "bottom top",
        onUpdate: function (self) {
          var v = Math.min(Math.abs(self.getVelocity()) / 400, 5);
          gsap.to(speed, { v: 1 + v, duration: 0.2, overwrite: true, onUpdate: function () { tween.timeScale(speed.v); } });
          gsap.to(speed, { v: 1, duration: 1.2, delay: 0.2, ease: "power2.out", onUpdate: function () { tween.timeScale(speed.v); } });
        },
      });
    });
  }

  /* ---------- custom cursor ---------- */
  function initCursor() {
    var c = $(".cursor");
    if (!c) return;
    document.documentElement.classList.add("has-cursor");
    var dot = $(".cursor__dot", c), ring = $(".cursor__ring", c), lab = $(".cursor__ring span", c);
    var dx = gsap.quickTo(dot, "x", { duration: 0.08 }), dy = gsap.quickTo(dot, "y", { duration: 0.08 });
    var rx = gsap.quickTo(ring, "x", { duration: 0.45, ease: "power3" }), ry = gsap.quickTo(ring, "y", { duration: 0.45, ease: "power3" });
    window.addEventListener("mousemove", function (e) { dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY); c.classList.remove("is-hidden"); }, { passive: true });
    document.addEventListener("mouseleave", function () { c.classList.add("is-hidden"); });
    document.addEventListener("mouseover", function (e) {
      var t = e.target.closest("[data-cursor], a, button, label, input, select, textarea");
      c.classList.remove("is-link", "is-label");
      if (!t) return;
      if (t.hasAttribute("data-cursor")) { lab.textContent = t.getAttribute("data-cursor"); c.classList.add("is-label"); }
      else if (!/INPUT|SELECT|TEXTAREA/.test(t.tagName)) c.classList.add("is-link");
    });
  }

  /* ---------- magnetic buttons ---------- */
  function initMagnetic() {
    $$("[data-magnetic]").forEach(function (b) {
      var x = gsap.quickTo(b, "x", { duration: 0.6, ease: "elastic.out(1,0.4)" }), y = gsap.quickTo(b, "y", { duration: 0.6, ease: "elastic.out(1,0.4)" });
      b.addEventListener("mousemove", function (e) {
        var r = b.getBoundingClientRect();
        x((e.clientX - r.left - r.width / 2) * 0.22); y((e.clientY - r.top - r.height / 2) * 0.3);
      });
      b.addEventListener("mouseleave", function () { x(0); y(0); });
    });
  }

  /* ---------- floating image on keynote list ---------- */
  function initFloatList() {
    $$("[data-float-list]").forEach(function (list) {
      var box = document.createElement("div"); box.className = "float-img"; box.setAttribute("aria-hidden", "true");
      var img = document.createElement("img"); img.alt = ""; box.appendChild(img); document.body.appendChild(box);
      var x = gsap.quickTo(box, "x", { duration: 0.6, ease: "power3" }), y = gsap.quickTo(box, "y", { duration: 0.6, ease: "power3" });
      var rot = gsap.quickTo(box, "rotate", { duration: 0.8, ease: "power3" });
      var lastX = 0;
      list.addEventListener("mousemove", function (e) {
        x(e.clientX + 32); y(e.clientY - 160); rot(Math.max(-8, Math.min(8, (e.clientX - lastX) * 0.6))); lastX = e.clientX;
      });
      $$("[data-img]", list).forEach(function (row) {
        row.addEventListener("mouseenter", function () {
          img.src = row.getAttribute("data-img");
          gsap.to(box, { opacity: 1, scale: 1, duration: 0.5, ease: "power3.out" });
        });
      });
      list.addEventListener("mouseleave", function () { gsap.to(box, { opacity: 0, scale: 0.6, duration: 0.4, ease: "power3.in" }); });
    });
  }

  /* ---------- DNA helix ---------- */
  function initHelix() {
    var svg = $("[data-helix]");
    if (!svg) return;
    var NS = "http://www.w3.org/2000/svg";
    var dna = CFG.dna || [];
    var rungs = [];
    dna.forEach(function (d) { d.items.forEach(function (name) { rungs.push({ domain: d.key, dname: d.name, color: d.color, name: name }); }); });
    var W = 720, H = 700, CX = 360, A = 128, TOP = 46, STEP = (H - 2 * TOP) / (rungs.length - 1);
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    var mk = function (tag, attrs, parent) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); (parent || svg).appendChild(e); return e; };
    var defs = mk("defs", {});
    var grad = mk("linearGradient", { id: "hx-g", x1: "0", y1: "0", x2: "0", y2: "1" }, defs);
    mk("stop", { offset: "0", "stop-color": "#f2cf7c" }, grad);
    mk("stop", { offset: "1", "stop-color": "#a87d2c" }, grad);
    var back = mk("g", {}), mid = mk("g", {}), front = mk("g", {}), labels = mk("g", {});
    var pathA = mk("path", { fill: "none", stroke: "url(#hx-g)", "stroke-width": "2", opacity: ".9" }, back);
    var pathB = mk("path", { fill: "none", stroke: "url(#hx-g)", "stroke-width": "2", opacity: ".55" }, back);
    var BEADS = 46;
    var beads = [];
    for (var b = 0; b < BEADS * 2; b++) beads.push(mk("circle", { r: "2", fill: "#d6aa4f" }, back));
    var R = rungs.map(function (r, i) {
      var y = TOP + i * STEP;
      var line = mk("line", { y1: y, y2: y, stroke: r.color, "stroke-width": "2.4", "stroke-linecap": "round" }, mid);
      var a = mk("circle", { cy: y, r: "6", fill: r.color }, front);
      var c = mk("circle", { cy: y, r: "6", fill: r.color }, front);
      var left = i % 2 === 0;
      var tx = mk("text", { x: left ? CX - A - 44 : CX + A + 44, y: y + 5, "text-anchor": left ? "end" : "start" }, labels);
      tx.textContent = r.name;
      var num = mk("text", { class: "n", x: left ? CX - A - 20 : CX + A + 20, y: y + 4, "text-anchor": "middle", fill: r.color }, labels);
      num.textContent = String(i + 1).padStart(2, "0");
      num.style.fill = r.color;
      return { y: y, line: line, a: a, c: c, tx: tx, num: num, data: r };
    });

    var active = (document.querySelector(".domain.is-active") || {}).dataset;
    active = active ? active.domain : null;
    var hover = -1;
    document.addEventListener("dna:domain", function (e) { active = e.detail; });

    var tip = $("[data-helix-tip]");
    var stage = svg.parentElement;
    function pick(clientY, clientX) {
      var r = svg.getBoundingClientRect();
      var sy = ((clientY - r.top) / r.height) * H;
      var sx = ((clientX - r.left) / r.width) * W;
      var best = -1, bd = 1e9;
      R.forEach(function (o, i) { var d = Math.abs(o.y - sy); if (d < bd) { bd = d; best = i; } });
      if (bd > STEP / 2 || Math.abs(sx - CX) > A + 230) return -1;
      return best;
    }
    function showTip(i) {
      hover = i;
      if (!tip) return;
      if (i < 0) { tip.classList.remove("is-on"); return; }
      var o = R[i], r = svg.getBoundingClientRect(), sr = stage.getBoundingClientRect();
      tip.innerHTML = "<small>" + String(i + 1).padStart(2, "0") + " · " + o.data.dname + "</small>" + o.data.name;
      tip.style.left = (r.left - sr.left + (CX / W) * r.width) + "px";
      tip.style.top = (r.top - sr.top + (o.y / H) * r.height) + "px";
      tip.classList.add("is-on");
    }
    svg.addEventListener("mousemove", function (e) { showTip(pick(e.clientY, e.clientX)); });
    svg.addEventListener("mouseleave", function () { showTip(-1); });
    svg.addEventListener("click", function (e) { showTip(pick(e.clientY, e.clientX)); });

    var t = 0, speed = 1, target = 1, visible = true, last = performance.now();
    svg.addEventListener("mouseenter", function () { target = 0.35; });
    svg.addEventListener("mouseleave", function () { target = 1; });
    if ("IntersectionObserver" in window) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }).observe(svg);

    function draw() {
      var dA = "", dB = "";
      for (var k = 0; k <= 80; k++) {
        var yy = TOP - 20 + (k / 80) * (H - 2 * TOP + 40);
        var ph = (yy - TOP) / STEP * 0.62 + t;
        var xa = CX + A * Math.sin(ph), xb = CX - A * Math.sin(ph);
        dA += (k ? "L" : "M") + xa.toFixed(1) + " " + yy.toFixed(1);
        dB += (k ? "L" : "M") + xb.toFixed(1) + " " + yy.toFixed(1);
      }
      pathA.setAttribute("d", dA); pathB.setAttribute("d", dB);
      for (var j = 0; j < BEADS; j++) {
        var by = TOP - 10 + (j / (BEADS - 1)) * (H - 2 * TOP + 20);
        var bp = (by - TOP) / STEP * 0.62 + t;
        var z = Math.cos(bp);
        beads[j].setAttribute("cx", (CX + A * Math.sin(bp)).toFixed(1)); beads[j].setAttribute("cy", by.toFixed(1));
        beads[j].setAttribute("r", (1.4 + (z + 1) * 1.2).toFixed(2)); beads[j].setAttribute("opacity", (0.25 + (z + 1) * 0.35).toFixed(2));
        var b2 = beads[j + BEADS];
        b2.setAttribute("cx", (CX - A * Math.sin(bp)).toFixed(1)); b2.setAttribute("cy", by.toFixed(1));
        b2.setAttribute("r", (1.4 + (1 - z) * 1.2).toFixed(2)); b2.setAttribute("opacity", (0.25 + (1 - z) * 0.35).toFixed(2));
      }
      R.forEach(function (o, i) {
        var ph = i * 0.62 + t;
        var s = Math.sin(ph), z = Math.cos(ph);
        var xa = CX + A * s, xb = CX - A * s;
        var on = (!active || o.data.domain === active);
        var hot = hover === i;
        var base = on ? 1 : 0.18;
        o.line.setAttribute("x1", xa.toFixed(1)); o.line.setAttribute("x2", xb.toFixed(1));
        o.line.setAttribute("opacity", (base * (hot ? 1 : 0.55 + 0.35 * Math.abs(s))).toFixed(2));
        o.line.setAttribute("stroke-width", hot ? "4" : "2.4");
        o.a.setAttribute("cx", xa.toFixed(1)); o.c.setAttribute("cx", xb.toFixed(1));
        o.a.setAttribute("r", ((hot ? 8 : 4.5) + (z + 1) * 1.6).toFixed(2));
        o.c.setAttribute("r", ((hot ? 8 : 4.5) + (1 - z) * 1.6).toFixed(2));
        o.a.setAttribute("opacity", (base * (0.55 + (z + 1) * 0.22)).toFixed(2));
        o.c.setAttribute("opacity", (base * (0.55 + (1 - z) * 0.22)).toFixed(2));
        o.tx.style.fill = hot ? "#f3ece0" : on && active ? "rgba(243,236,224,.9)" : on ? "rgba(243,236,224,.62)" : "rgba(243,236,224,.2)";
        o.num.style.opacity = on ? 1 : 0.25;
      });
    }
    function loop(now) {
      var dt = Math.min(now - last, 50) / 1000; last = now;
      speed += (target - speed) * 0.06;
      if (visible && !reduced) { t += dt * 0.55 * speed; draw(); }
      requestAnimationFrame(loop);
    }
    t = 0.4; draw();
    requestAnimationFrame(loop);
  }

  /* ---------- hero embers ---------- */
  function initEmbers() {
    var cv = $("[data-embers]");
    if (!cv || reduced) return;
    var ctx = cv.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w, h, parts = [], visible = true;
    function size() {
      w = cv.clientWidth; h = cv.clientHeight;
      cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    size(); window.addEventListener("resize", size);
    var N = window.innerWidth < 760 ? 26 : 60;
    function spawn(p, init) {
      p.x = w * (0.35 + Math.random() * 0.65);
      p.y = init ? Math.random() * h : h + 10;
      p.r = 0.6 + Math.random() * 1.8;
      p.vy = 0.25 + Math.random() * 0.7;
      p.vx = (Math.random() - 0.5) * 0.25;
      p.life = 0; p.max = 300 + Math.random() * 400;
      p.hue = Math.random() < 0.2 ? "228,83,44" : "242,207,124";
      return p;
    }
    for (var i = 0; i < N; i++) parts.push(spawn({}, true));
    if ("IntersectionObserver" in window) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }).observe(cv);
    (function frame() {
      if (visible) {
        ctx.clearRect(0, 0, w, h);
        parts.forEach(function (p) {
          p.life++; p.y -= p.vy; p.x += p.vx + Math.sin((p.life + p.r * 100) / 40) * 0.15;
          var a = Math.sin(Math.min(p.life / p.max, 1) * Math.PI) * 0.8;
          if (p.life > p.max || p.y < -10) spawn(p);
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(" + p.hue + "," + a.toFixed(3) + ")";
          ctx.shadowBlur = 8; ctx.shadowColor = "rgba(" + p.hue + ",.8)";
          ctx.fill();
        });
      }
      requestAnimationFrame(frame);
    })();
  }
})();
